'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Info, AlertTriangle, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

// Test comment to verify compilation
interface Prediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
}

type RednessPolygon = Array<[number, number]>;

interface AnalysisData {
  predictions: Prediction[];
  redness: {
    num_polygons: number;
    polygons: RednessPolygon[];
    analysis_width: number;
    analysis_height: number;
    erythema: boolean;
    redness_perc: number;
  };
  image: {
    width: number;
    height: number;
  };
}

interface SkinAnalysisImageProps {
  imageUrl: string;
  analysisData: AnalysisData;
  className?: string;
}

// Updated color codes as requested
const ACNE_COLORS = {
  "Post-Acne Spot": "#7547f2",
  "Comedones": "#000000",
  "Microcysts": "#45cdf8",
  "Post-Acne Scar": "#737373",
  "Mole": "#b0fdc9",
  "Papules": "#f845dc",
  "Pustules": "#fff985",
  "Cistic": "#ff7875",
  "Nodules": "#ff914d",
  "Freckles": "green",
  "Cysts": "#ff7875",
};

const REDNESS_COLOR = '#FF4757';
const REDNESS_OPACITY = 0.8;

export default function SkinAnalysisImage({ 
  imageUrl, 
  analysisData, 
  className = '' 
}: SkinAnalysisImageProps) {
  const [currentView, setCurrentView] = useState<'acne' | 'redness'>('acne');
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ 
    width: 0, 
    height: 0, 
    offsetX: 0, 
    offsetY: 0 
  });

  // Create multiple images for carousel (analysis versions only)
  const carouselImages = [
    { url: imageUrl, label: 'Acne Analysis', view: 'acne' as const },
    { url: imageUrl, label: 'Redness Analysis', view: 'redness' as const }
  ];

  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      
      // Since we now capture at displayed size, use natural dimensions (which are the captured dimensions)
      const displayWidth = img.naturalWidth;
      const displayHeight = img.naturalHeight;
      const offsetX = 0;
      const offsetY = 0;
      
      console.log('SkinAnalysisImage - Using captured dimensions:', {
        displayWidth: displayWidth,
        displayHeight: displayHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        offsetWidth: img.offsetWidth,
        offsetHeight: img.offsetHeight
      });
      console.log('=== IMAGE DISPLAY COMPLETE ===');
      
      setImageDimensions({
        width: displayWidth,
        height: displayHeight,
        offsetX,
        offsetY
      });
    }
  }, [imageLoaded]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    
    // Debug: Log the actual image dimensions
    if (imageRef.current) {
      const img = imageRef.current;
      console.log('=== IMAGE DISPLAY ===');
      console.log('SkinAnalysisImage - Captured dimensions (natural):', img.naturalWidth, 'x', img.naturalHeight);
      console.log('SkinAnalysisImage - Displayed dimensions (rendered):', img.offsetWidth, 'x', img.offsetHeight);
      console.log('SkinAnalysisImage - Analysis data image dimensions:', analysisData.image.width, 'x', analysisData.image.height);
      console.log('SkinAnalysisImage - Dimensions match:', img.naturalWidth === analysisData.image.width && img.naturalHeight === analysisData.image.height);
    }
  };

  const scaleCoordinates = (x: number, y: number, width: number, height: number) => {
    if (!imageDimensions.width || !imageDimensions.height) return { x: 0, y: 0, width: 0, height: 0 };
    
    // Since we now capture at displayed size, coordinates should match directly
    // No scaling needed - use coordinates as-is
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  };

  const scalePolygon = (polygon: [number, number][]) => {
    if (!imageDimensions.width || !imageDimensions.height) return [];
    
    // Since we now capture at displayed size, coordinates should match directly
    // No scaling needed - use coordinates as-is
    return polygon.map(([x, y]) => [x, y]);
  };

  const getAcneColor = (className: string) => {
    return ACNE_COLORS[className as keyof typeof ACNE_COLORS] || '#FF6B6B';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const nextImage = () => {
    setCurrentImageIndex((prev: number) => (prev + 1) % carouselImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev: number) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    setCurrentView(carouselImages[index].view);
  };

  // Sync view with current image when image changes
  useEffect(() => {
    setCurrentView(carouselImages[currentImageIndex].view);
  }, [currentImageIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl hidden md:block font-bold text-gray-900">Skin Analysis Results</h3>
        
        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className={`flex w-full mx-4 md:mx-0 md:w-auto items-center justify-center space-x-2 px-3 py-2 rounded-md transition-colors ${
            showOverlays 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
        >
          {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="text-sm font-medium">Overlays</span>
        </button>
      </div>

      {/* Image Carousel */}
      <div className="relative mb-6">
        <div className="relative overflow-hidden bg-gray-100">
          {/* Carousel Images */}
          <div className="relative w-full flex justify-center items-center bg-gray-50 overflow-auto" style={{ 
            minHeight: '384px'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <img
                  ref={imageRef}
                  src={carouselImages[currentImageIndex].url}
                  alt={carouselImages[currentImageIndex].label}
                  style={{ 
                    width: 'auto',
                    height: 'auto'
                  }}
                  onLoad={handleImageLoad}
                />

                {/* SVG Overlay */}
                {imageLoaded && showOverlays && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{ 
                      width: imageDimensions.width, 
                      height: imageDimensions.height,
                      left: 0,
                      top: 0
                    }}
                  >
                    {/* Redness Polygons - only show in redness view */}
                    {currentView === 'redness' && analysisData.redness.polygons && 
                      analysisData.redness.polygons.map((polygon, index) => {
                        if (polygon.length === 1) {
                          const [x, y] = polygon[0];
                          const scaled = scaleCoordinates(x, y, 4, 4);
                          
                          return (
                            <g key={`redness-point-${index}`}>
                              <motion.circle
                                cx={scaled.x + scaled.width / 2}
                                cy={scaled.y + scaled.height / 2}
                                r="3"
                                fill={REDNESS_COLOR}
                                fillOpacity={REDNESS_OPACITY}
                                stroke="white"
                                strokeWidth="1"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: REDNESS_OPACITY, scale: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </g>
                          );
                        } else if (polygon.length >= 3) {
                          const scaledPolygon = scalePolygon(polygon);
                          const points = scaledPolygon.map(([x, y]) => `${x},${y}`).join(' ');
                          
                          return (
                            <g key={`redness-polygon-${index}`}>
                              <motion.polygon
                                points={points}
                                fill={REDNESS_COLOR}
                                fillOpacity={REDNESS_OPACITY}
                                stroke="white"
                                strokeWidth="1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: REDNESS_OPACITY }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </g>
                          );
                        }
                        return null;
                      })
                    }

                    {/* Acne Detection Boxes - only show in acne view */}
                    {currentView === 'acne' && analysisData.predictions.map((prediction, index) => {
                      const scaled = scaleCoordinates(
                        prediction.x - prediction.width / 2,
                        prediction.y - prediction.height / 2,
                        prediction.width,
                        prediction.height
                      );
                      
                      const color = getAcneColor(prediction.class);
                      const isHovered = hoveredDetection === prediction.detection_id;
                      
                      return (
                        <g key={prediction.detection_id}>
                          {/* Bounding Box */}
                          <motion.rect
                            x={scaled.x}
                            y={scaled.y}
                            width={scaled.width}
                            height={scaled.height}
                            fill="none"
                            stroke={color}
                            strokeWidth={isHovered ? "3" : "2"}
                            strokeDasharray={isHovered ? "none" : "5,5"}
                            className="pointer-events-auto cursor-pointer"
                            onMouseEnter={() => setHoveredDetection(prediction.detection_id)}
                            onMouseLeave={() => setHoveredDetection(null)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          />
                          
                          {/* Label Background */}
                          <motion.rect
                            x={scaled.x}
                            y={scaled.y - 25}
                            width={Math.max(80, prediction.class.length * 8)}
                            height="20"
                            fill={color}
                            rx="3"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
                          />
                          
                          {/* Label Text */}
                          <motion.text
                            x={scaled.x + 5}
                            y={scaled.y - 10}
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                          >
                            {prediction.class}
                          </motion.text>
                          
                          {/* Confidence Score */}
                          <motion.text
                            x={scaled.x + scaled.width + 5}
                            y={scaled.y + scaled.height / 2}
                            fill={color}
                            fontSize="10"
                            fontWeight="bold"
                            className={`${getConfidenceColor(prediction.confidence)}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.3 }}
                          >
                            {Math.round(prediction.confidence * 100)}%
                          </motion.text>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Navigation */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <button
              onClick={prevImage}
              className="bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button
              onClick={nextImage}
              className="bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-white shadow-lg'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Image Label */}
          <div className="absolute top-4 left-4">
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
              {carouselImages[currentImageIndex].label}
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredDetection && (
        <div className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none z-10">
          {(() => {
            const prediction = analysisData.predictions.find(p => p.detection_id === hoveredDetection);
            if (!prediction) return null;
            
            return (
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{prediction.class}</div>
                <div className="text-gray-600">
                  Confidence: {Math.round(prediction.confidence * 100)}%
                </div>
                <div className="text-gray-600">
                  Size: {Math.round(prediction.width)} × {Math.round(prediction.height)}px
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Analysis Summary Cards */}
      <div className="grid grid-cols-1 gap-4 p-2">
        {/* Redness Analysis Card */}
        <motion.div 
          className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-red-900">Redness Analysis</h4>
              <p className="text-xs text-red-600">Erythema Detection</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-red-700">Coverage:</span>
              <span className="text-sm font-semibold text-red-900">
                {Math.round(analysisData.redness.redness_perc * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-700">Areas:</span>
              <span className="text-sm font-semibold text-red-900">
                {analysisData.redness.num_polygons}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-red-700">Erythema:</span>
              <span className={`text-sm font-semibold ${analysisData.redness.erythema ? 'text-red-900' : 'text-gray-600'}`}>
                {analysisData.redness.erythema ? 'Detected' : 'Not detected'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Acne Detection Card */}
        <motion.div 
          className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900">Acne Detection</h4>
              <p className="text-xs text-purple-600">AI-Powered Analysis</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Total:</span>
              <span className="text-sm font-semibold text-purple-900">
                {analysisData.predictions.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Types:</span>
              <span className="text-sm font-semibold text-purple-900">
                {new Set(analysisData.predictions.map(p => p.class)).size}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Avg Confidence:</span>
              <span className="text-sm font-semibold text-purple-900">
                {Math.round(
                  analysisData.predictions.reduce((sum, p) => sum + p.confidence, 0) / 
                  Math.max(analysisData.predictions.length, 1) * 100
                )}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Image Info Card */}
        <motion.div 
          className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Info className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Image Info</h4>
              <p className="text-xs text-blue-600">Technical Details</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Captured:</span>
              <span className="text-sm font-semibold text-blue-900">
                {analysisData.image.width} × {analysisData.image.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Displayed:</span>
              <span className="text-sm font-semibold text-blue-900">
                {imageLoaded ? `${Math.round(imageDimensions.width)} × ${Math.round(imageDimensions.height)}` : 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Status:</span>
              <span className="text-sm font-semibold text-blue-900">
                {analysisData.predictions.length > 0 ? 'Completed' : 'Processing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Redness Areas:</span>
              <span className="text-sm font-semibold text-blue-900">
                {analysisData.redness.polygons?.length || 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 