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

interface WrinklesPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  detection_id?: string;
  points?: Array<{ x: number; y: number }>;
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
    scaling_factors: { x: number; y: number }; 
    original_resolution: { width: number; height: number };
  };
  wrinkles?: {
    predictions: WrinklesPrediction[];
    image: { width: number; height: number };
    scaling_factors?: { x: number; y: number };
    original_resolution?: { width: number; height: number };
    counts?: Record<string, number>;
    severity?: string;
    has_forehead_wrinkles?: boolean;
    has_expression_lines?: boolean;
    has_under_eye_concerns?: boolean;
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

// NEW: Wrinkles color mapping
const WRINKLES_COLORS = {
  'forehead': '#9900ff',
  'crows_feet': '#ff6600', 
  'nasolabial_fold': '#00ccff',
  'frown': '#ff0066',
  'tear_through': '#66ff00',
  'mental_crease': '#ffcc00',
  'bunny_line': '#ff9900',
  'droppy_eyelid': '#cc00ff',
  'marionette_line': '#00ffcc',
  'neck_lines': '#ffff00',
  'purse_string': '#ff00cc'
};

const getWrinkleColor = (className: string) => {
  return WRINKLES_COLORS[className as keyof typeof WRINKLES_COLORS] || '#ffffff';
};

export default function SkinAnalysisImage({ 
  imageUrl, 
  analysisData, 
  className = '' 
}: SkinAnalysisImageProps) {
  const [currentView, setCurrentView] = useState<'acne' | 'redness' | 'wrinkles'>('acne');
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ 
    width: 0, 
    height: 0, 
    offsetX: 0, 
    offsetY: 0 
  });
  const [calculatedHeight, setCalculatedHeight] = useState<number>(384);

  // Create multiple images for carousel (analysis versions only)
  const carouselImages = [
    { url: imageUrl, label: 'Acne Analysis', view: 'acne' as const },
    { url: imageUrl, label: 'Redness Analysis', view: 'redness' as const },
    { url: imageUrl, label: 'Wrinkles Analysis', view: 'wrinkles' as const }
  ];

  useEffect(() => {
    if (imageRef.current && imageLoaded && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Use natural dimensions (original captured dimensions)
      const displayWidth = img.naturalWidth;
      const displayHeight = img.naturalHeight;
      const offsetX = 0;
      const offsetY = 0;
      
      // Calculate height based on image aspect ratio and container width
      const containerWidth = container.offsetWidth;
      const calculatedHeight = Math.max(384, (displayHeight * containerWidth) / displayWidth);
      
      console.log('SkinAnalysisImage - Using captured dimensions:', {
        displayWidth: displayWidth,
        displayHeight: displayHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        offsetWidth: img.offsetWidth,
        offsetHeight: img.offsetHeight,
        containerWidth: containerWidth,
        calculatedHeight: calculatedHeight,
        scaleX: containerWidth / displayWidth,
        scaleY: calculatedHeight / displayHeight
      });
      console.log('=== IMAGE DISPLAY COMPLETE ===');
      
      setImageDimensions({
        width: displayWidth,
        height: displayHeight,
        offsetX,
        offsetY
      });
      
      setCalculatedHeight(calculatedHeight);
    }
  }, [imageLoaded]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    
    if (imageRef.current) {
      const img = imageRef.current;
      console.log('=== IMAGE RENDERING DEBUG ===');
      console.log('1. Captured dimensions (natural):', img.naturalWidth, 'x', img.naturalHeight);
      console.log('2. Analysis dimensions from API:', analysisData.image.width, 'x', analysisData.image.height);
      console.log('3. Redness scaling factors:', analysisData.redness.scaling_factors);
      console.log('4. Wrinkles scaling factors:', analysisData.wrinkles?.scaling_factors);
      
      // Verify dimensions match
      const dimensionsMatch = img.naturalWidth === analysisData.image.width && 
                            img.naturalHeight === analysisData.image.height;
      console.log('5. Dimensions match:', dimensionsMatch);
      
      if (!dimensionsMatch) {
        console.warn('⚠️ Image dimensions mismatch - annotations may not align correctly');
      }
      
      // Force re-render with proper scaling
      setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          const containerWidth = container.offsetWidth;
          const calculatedHeight = Math.max(384, (img.naturalHeight * containerWidth) / img.naturalWidth);
          
          setImageDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
            offsetX: 0,
            offsetY: 0
          });
          
          setCalculatedHeight(calculatedHeight);
          console.log('6. Final scaling setup complete');
        }
      }, 100);
    }
  };

  const scaleCoordinates = (x: number, y: number, width: number, height: number) => {
    if (!imageDimensions.width || !imageDimensions.height || !containerRef.current) {
      console.warn('Scale coordinates: Missing dimensions');
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    // Scale from original image dimensions to displayed container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = calculatedHeight;
    
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;
    
    return {
      x: x * scaleX,
      y: y * scaleY,
      width: width * scaleX,
      height: height * scaleY
    };
  };

  // NEW: Enhanced polygon scaling with support for scaling_factors
  const scalePolygon = (polygon: [number, number][], scalingFactors?: { x: number; y: number }) => {
    if (!imageDimensions.width || !imageDimensions.height || !containerRef.current) {
      console.warn('Scale polygon: Missing dimensions');
      return [];
    }
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = calculatedHeight;
    
    // First, scale from API resolution to original image resolution if needed
    let adjustedPolygon = polygon;
    if (scalingFactors && (scalingFactors.x !== 1 || scalingFactors.y !== 1)) {
      adjustedPolygon = polygon.map(([x, y]) => [
        x * scalingFactors.x,
        y * scalingFactors.y
      ]);
    }
    
    // Then scale from original image to display container
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;
    
    return adjustedPolygon.map(([x, y]) => [x * scaleX, y * scaleY]);
  };

  // NEW: Scale wrinkles points with support for detailed point arrays
  const scaleWrinklePoints = (points: Array<{ x: number; y: number }>, scalingFactors?: { x: number; y: number }) => {
    if (!imageDimensions.width || !imageDimensions.height || !containerRef.current) {
      return [];
    }
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = calculatedHeight;
    
    // First, scale from API resolution to original image resolution if needed
    let adjustedPoints = points;
    if (scalingFactors && (scalingFactors.x !== 1 || scalingFactors.y !== 1)) {
      adjustedPoints = points.map(point => ({
        x: point.x * scalingFactors.x,
        y: point.y * scalingFactors.y
      }));
    }
    
    // Then scale from original image to display container
    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;
    
    return adjustedPoints.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));
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
    console.log('Carousel image changed:', {
      currentImageIndex,
      view: carouselImages[currentImageIndex].view,
      currentView
    });
    setCurrentView(carouselImages[currentImageIndex].view);
  }, [currentImageIndex]);

  useEffect(() => {
    if (analysisData && analysisData.predictions && analysisData.predictions.length > 0) {
      console.log('Setting acne view on first load:', {
        predictionsCount: analysisData.predictions.length,
        currentView,
        currentImageIndex
      });
      if (currentImageIndex === 0) {
        setCurrentView('acne');
      }
    }
  }, [analysisData, currentImageIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Image Carousel */}
      <div className="relative mb-6">
        {/* Carousel Navigation */}
        
        <div className="relative overflow-hidden bg-gray-100">
          {/* Carousel Images */}
          <div 
            ref={containerRef}
            className="relative w-full flex justify-center items-center bg-gray-50" 
            style={{ 
              minHeight: '384px',
              height: `${calculatedHeight}px`
            }}
          >
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
                  className="w-full h-full object-contain"
                  onLoad={handleImageLoad}
                  key={`${carouselImages[currentImageIndex].url}-${currentImageIndex}`}
                />

                {/* SVG Overlay */}
                {imageLoaded && showOverlays && (
                  <svg
                    className="absolute pointer-events-none w-full h-full"
                    style={{ 
                      left: 0,
                      top: 0
                    }}
                  >
                    {/* Redness Polygons - only show in redness view */}
                    {currentView === 'redness' && analysisData.redness.polygons && 
                      analysisData.redness.polygons.map((polygon, index) => {
                        // Use the new scaling function with scaling_factors
                        const scaledPolygon = scalePolygon(polygon, analysisData.redness.scaling_factors);
                        
                        if (polygon.length === 1) {
                          // Single point
                          const [x, y] = scaledPolygon[0];
                          return (
                            <g key={`redness-point-${index}`}>
                              <motion.circle
                                cx={x}
                                cy={y}
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
                          // Polygon
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

                    {/* Acne Detection Areas - only show in acne view */}
                    {currentView === 'acne' && analysisData.predictions && analysisData.predictions.length > 0 && (
                      <>
                        {analysisData.predictions.map((prediction, index) => {
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
                              {/* Filled Detection Area - Circle */}
                              <motion.circle
                                cx={scaled.x + scaled.width / 2}
                                cy={scaled.y + scaled.height / 2}
                                r={Math.max(scaled.width, scaled.height) / 2}
                                fill={color}
                                fillOpacity={isHovered ? 0.8 : 0.6}
                                stroke={color}
                                strokeWidth={isHovered ? "3" : "2"}
                                strokeOpacity={isHovered ? 1 : 0.8}
                                className="pointer-events-auto cursor-pointer"
                                onMouseEnter={() => setHoveredDetection(prediction.detection_id)}
                                onMouseLeave={() => setHoveredDetection(null)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                              />
                              
                              {/* Border highlight on hover */}
                              {isHovered && (
                                <motion.circle
                                  cx={scaled.x + scaled.width / 2}
                                  cy={scaled.y + scaled.height / 2}
                                  r={Math.max(scaled.width, scaled.height) / 2 + 3}
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeDasharray="5,5"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                />
                              )}
                            </g>
                          );
                        })}
                      </>
                    )}

                    {/* NEW: Wrinkles Detection - only show in wrinkles view */}
                    {currentView === 'wrinkles' && analysisData.wrinkles?.predictions && 
                      analysisData.wrinkles.predictions.map((prediction, index) => {
                        const color = getWrinkleColor(prediction.class);
                        
                        if (prediction.points && prediction.points.length > 0) {
                          // Render detailed wrinkle lines using points
                          const scaledPoints = scaleWrinklePoints(prediction.points, analysisData.wrinkles?.scaling_factors);
                          const pointsString = scaledPoints.map(point => `${point.x},${point.y}`).join(' ');
                          
                          return (
                            <g key={`wrinkle-line-${index}`}>
                              <motion.polyline
                                points={pointsString}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="pointer-events-auto cursor-pointer"
                                onMouseEnter={() => setHoveredDetection(prediction.detection_id || `wrinkle-${index}`)}
                                onMouseLeave={() => setHoveredDetection(null)}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                              />
                            </g>
                          );
                        } else {
                          // Fallback: render bounding box for wrinkles without detailed points
                          const scaled = scaleCoordinates(
                            prediction.x - prediction.width / 2,
                            prediction.y - prediction.height / 2,
                            prediction.width,
                            prediction.height
                          );
                          
                          return (
                            <g key={`wrinkle-bbox-${index}`}>
                              <motion.rect
                                x={scaled.x}
                                y={scaled.y}
                                width={scaled.width}
                                height={scaled.height}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                className="pointer-events-auto cursor-pointer"
                                onMouseEnter={() => setHoveredDetection(prediction.detection_id || `wrinkle-${index}`)}
                                onMouseLeave={() => setHoveredDetection(null)}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.8 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                              />
                            </g>
                          );
                        }
                      })
                    }
                  </svg>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Navigation */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <button
              onClick={prevImage}
              className="bg-white/20 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button
              onClick={nextImage}
              className="bg-white/20 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
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
        </div>

        <div className="flex justify-center mb-4">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border">
            {carouselImages.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentImageIndex === index
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {image.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 