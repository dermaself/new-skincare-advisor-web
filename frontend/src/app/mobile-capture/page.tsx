'use client';
import { Suspense } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
function MobileCapturePageInner() {
  

  const searchParams = useSearchParams();
  const session = searchParams.get('session');
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera on mount
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        setError('Unable to access camera.');
      }
    }
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
    setImage(dataUrl);
    setCameraActive(false);
    // Stop camera stream
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    uploadPhoto(dataUrl);
  };

  const uploadPhoto = async (base64: string) => {
    if (!session) return;
    setStatus('uploading');
    try {
      const res = await fetch('/api/photo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, image: base64 }),
      });
      if (res.ok) setStatus('done');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Take a Selfie</h1>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {cameraActive && (
        <div className="flex flex-col items-center">
          <video ref={videoRef} autoPlay playsInline className="rounded max-w-xs mb-4" />
          <button
            onClick={capturePhoto}
            className="bg-purple-600 text-white px-6 py-2 rounded shadow"
          >
            Capture Photo
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      {status === 'uploading' && <p>Uploading...</p>}
      {status === 'done' && <p>Photo uploaded! You can return to your desktop.</p>}
      {status === 'error' && <p className="text-red-500">Upload failed. Try again.</p>}
      {image && <img src={image} alt="Preview" className="mt-4 max-w-xs rounded" />}
    </main>
  );
}

export default function MobileCapturePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MobileCapturePageInner />
    </Suspense>
  );
}
