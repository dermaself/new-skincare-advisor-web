import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import DesktopPhotoReceiver from './DesktopPhotoReceiver';

export default function DesktopQRCodeStep() {
  const [session, setSession] = useState<string>('');
  useEffect(() => {
    setSession(uuidv4());
  }, []);

  const mobileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/mobile-capture?session=${session}`
    : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h2 className="text-xl font-bold mb-2">Scan QR code with your phone to take a photo</h2>
  {session && <QRCodeSVG value={mobileUrl} size={200} />}
      <p className="mt-2">Or visit: <span className="font-mono">{mobileUrl}</span></p>
      <div className="mt-8">
        <DesktopPhotoReceiver session={session} />
      </div>
    </div>
  );
}
