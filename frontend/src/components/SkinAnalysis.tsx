'use client';
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import ImageUpload from './ImageUpload';
import CameraCapture from './CameraCapture';
import AnalysisResults from './AnalysisResults';
import { analyzeSkin } from '@/lib/api';

export type SkinConcern = {
  name: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
};

export type AnalysisResult = {
  concerns: SkinConcern[];
  recommendations: string[];
  overallHealth: number;
  imageUrl: string;
};

export default function SkinAnalysis() {
  const [step, setStep] = useState<'upload' | 'camera' | 'analyzing' | 'results'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleImageSelect = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
    setError(null);
  }, []);

  const handleAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setStep('analyzing');
    setError(null);

    try {
      const result = await analyzeSkin(selectedImage);
      setAnalysisResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
      setStep('upload');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setStep('upload');
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="card"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Start Your Skin Analysis
              </h2>
              <p className="text-gray-600">
                Upload a clear selfie or take a photo to get personalized skincare recommendations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Upload Photo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a photo from your device
                  </p>
                  <ImageUpload onImageSelect={handleImageSelect} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Take Photo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Use your camera to take a new photo
                  </p>
                  <button
                    onClick={() => setStep('camera')}
                    className="btn-primary w-full"
                  >
                    Open Camera
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </motion.div>
            )}

            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="relative inline-block">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-primary-200"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAnalysis}
                    className="btn-primary w-full md:w-auto"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Analyze Skin
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CameraCapture
              onCapture={handleImageSelect}
              onClose={() => setStep('upload')}
            />
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card text-center"
          >
            <div className="flex flex-col items-center space-y-6">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Analyzing Your Skin
                </h3>
                <p className="text-gray-600">
                  Our AI is examining your skin for concerns and generating personalized recommendations...
                </p>
              </div>

              <div className="w-full max-w-md">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="progress-bar h-2 rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Image Processing</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  </div>
                  <span>AI Analysis</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                  </div>
                  <span>Recommendations</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'results' && analysisResult && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <AnalysisResults
              result={analysisResult}
              onReset={resetAnalysis}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 