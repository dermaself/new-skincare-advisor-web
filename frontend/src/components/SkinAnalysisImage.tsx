'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Info, AlertTriangle } from 'lucide-react';

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

const ACNE_COLORS = {
  'Comedones': '#FF6B6B',
  'Cysts': '#FF8E53',
  'Microcysts': '#FFB347',
  'Nodules': '#FFD93D',
  'Papules': '#6BCF7F',
  'Pustules': '#4ECDC4'
};

const REDNESS_COLOR = '#FF4757';
const REDNESS_OPACITY = 0.3;

export default function SkinAnalysisImage({ 
  imageUrl, 
  analysisData, 
  className = '' 
}: SkinAnalysisImageProps) {
  const [showRedness, setShowRedness] = useState(true);
  const [showAcne, setShowAcne] = useState(true);
  const [hoveredDetection, setHoveredDetection] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      const rect = imageRef.current.getBoundingClientRect();
      setImageDimensions({
        width: rect.width,
        height: rect.height
      });
    }
  }, [imageLoaded]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const scaleCoordinates = (x: number, y: number, width: number, height: number) => {
    if (!imageDimensions.width || !imageDimensions.height) return { x: 0, y: 0, width: 0, height: 0 };
    
    const scaleX = imageDimensions.width / analysisData.image.width;
    const scaleY = imageDimensions.height / analysisData.image.height;
    
    return {
      x: x * scaleX,
      y: y * scaleY,
      width: width * scaleX,
      height: height * scaleY
    };
  };

  const scalePolygon = (polygon: [number, number][]) => {
    if (!imageDimensions.width || !imageDimensions.height) return [];
    
    const scaleX = imageDimensions.width / analysisData.image.width;
    const scaleY = imageDimensions.height / analysisData.image.height;
    
    return polygon.map(([x, y]) => [x * scaleX, y * scaleY]);
  };

  const getAcneColor = (className: string) => {
    return ACNE_COLORS[className as keyof typeof ACNE_COLORS] || '#FF6B6B';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowRedness(!showRedness)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showRedness 
                ? 'bg-red-100 text-red-700 border border-red-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {showRedness ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-sm font-medium">Redness</span>
          </button>
          
          <button
            onClick={() => setShowAcne(!showAcne)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showAcne 
                ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {showAcne ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="text-sm font-medium">Acne</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-30"></div>
            <span>Redness ({Math.round(analysisData.redness.redness_perc * 100)}% - {analysisData.redness.polygons?.length || 0} areas)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Acne ({analysisData.predictions.length} detected)</span>
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Skin analysis"
          className="max-w-full h-auto rounded-lg shadow-lg"
          onLoad={handleImageLoad}
        />

        {/* SVG Overlay */}
        {imageLoaded && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ width: imageDimensions.width, height: imageDimensions.height }}
          >
            {/* Redness Polygons */}
            {showRedness && analysisData.redness.polygons && 
              analysisData.redness.polygons.map((polygon, index) => {
                // Handle different polygon types
                if (polygon.length === 1) {
                  // Single point - render as a small circle with label
                  const [x, y] = polygon[0];
                  const scaled = scaleCoordinates(x, y, 4, 4); // 4x4 pixel circle
                  
                  return (
                    <g key={`redness-point-${index}`}>
                      <motion.circle
                        cx={scaled.x + scaled.width / 2}
                        cy={scaled.y + scaled.height / 2}
                        r="2"
                        fill={REDNESS_COLOR}
                        fillOpacity={REDNESS_OPACITY}
                        stroke={REDNESS_COLOR}
                        strokeWidth="1"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: REDNESS_OPACITY, scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                      
                      {/* Label Background */}
                      <motion.rect
                        x={scaled.x - 30}
                        y={scaled.y - 35}
                        width="60"
                        height="20"
                        fill={REDNESS_COLOR}
                        rx="3"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
                      />
                      
                      {/* Label Text */}
                      <motion.text
                        x={scaled.x}
                        y={scaled.y - 20}
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                      >
                        Redness
                      </motion.text>
                    </g>
                  );
                } else if (polygon.length === 2) {
                  // Two points - render as a line with label
                  const [x1, y1] = polygon[0];
                  const [x2, y2] = polygon[1];
                  const scaled1 = scaleCoordinates(x1, y1, 0, 0);
                  const scaled2 = scaleCoordinates(x2, y2, 0, 0);
                  const midX = (scaled1.x + scaled2.x) / 2;
                  const midY = (scaled1.y + scaled2.y) / 2;
                  
                  return (
                    <g key={`redness-line-${index}`}>
                      <motion.line
                        x1={scaled1.x}
                        y1={scaled1.y}
                        x2={scaled2.x}
                        y2={scaled2.y}
                        stroke={REDNESS_COLOR}
                        strokeWidth="2"
                        strokeOpacity={REDNESS_OPACITY}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: REDNESS_OPACITY }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                      
                      {/* Label Background */}
                      <motion.rect
                        x={midX - 30}
                        y={midY - 35}
                        width="60"
                        height="20"
                        fill={REDNESS_COLOR}
                        rx="3"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
                      />
                      
                      {/* Label Text */}
                      <motion.text
                        x={midX}
                        y={midY - 20}
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                      >
                        Redness
                      </motion.text>
                    </g>
                  );
                } else if (polygon.length >= 3) {
                  // Valid polygon - render as polygon with label
                  const scaledPolygon = scalePolygon(polygon);
                  const points = scaledPolygon.map(([x, y]) => `${x},${y}`).join(' ');
                  
                  // Calculate center of polygon for label placement
                  const centerX = scaledPolygon.reduce((sum, [x]) => sum + x, 0) / scaledPolygon.length;
                  const centerY = scaledPolygon.reduce((sum, [y]) => sum + y, 0) / scaledPolygon.length;
                  
                  return (
                    <g key={`redness-polygon-${index}`}>
                      <motion.polygon
                        points={points}
                        fill={REDNESS_COLOR}
                        fillOpacity={REDNESS_OPACITY}
                        stroke={REDNESS_COLOR}
                        strokeWidth="1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: REDNESS_OPACITY }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      />
                      
                      {/* Label Background */}
                      <motion.rect
                        x={centerX - 30}
                        y={centerY - 35}
                        width="60"
                        height="20"
                        fill={REDNESS_COLOR}
                        rx="3"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.1 }}
                      />
                      
                      {/* Label Text */}
                      <motion.text
                        x={centerX}
                        y={centerY - 20}
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                      >
                        Redness
                      </motion.text>
                    </g>
                  );
                }
                
                return null;
              })
            }

            {/* Acne Detection Boxes */}
            {showAcne && analysisData.predictions.map((prediction, index) => {
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
      </div>

      {/* Analysis Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-800">Redness Analysis</span>
          </div>
          <div className="text-sm text-red-700">
            <div>Coverage: {Math.round(analysisData.redness.redness_perc * 100)}%</div>
            <div>Areas: {analysisData.redness.num_polygons}</div>
            <div>Erythema: {analysisData.redness.erythema ? 'Detected' : 'Not detected'}</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="w-4 h-4 text-orange-600" />
            <span className="font-semibold text-orange-800">Acne Detection</span>
          </div>
          <div className="text-sm text-orange-700">
            <div>Total: {analysisData.predictions.length}</div>
            <div>Types: {new Set(analysisData.predictions.map(p => p.class)).size}</div>
            <div>Avg Confidence: {Math.round(
              analysisData.predictions.reduce((sum, p) => sum + p.confidence, 0) / 
              Math.max(analysisData.predictions.length, 1) * 100
            )}%</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-800">Image Info</span>
          </div>
          <div className="text-sm text-blue-700">
            <div>Dimensions: {analysisData.image.width} × {analysisData.image.height}</div>
            <div>Analysis Time: {analysisData.predictions.length > 0 ? 'Completed' : 'Processing'}</div>
            <div>Redness Areas: {analysisData.redness.polygons?.length || 0}</div>
            {analysisData.redness.polygons && analysisData.redness.polygons.length > 0 && (
              <div className="mt-1 text-xs">
                <div>Polygon types:</div>
                {analysisData.redness.polygons.map((polygon, i) => (
                  <div key={i} className="text-gray-600">
                    Area {i + 1}: {polygon.length} point{polygon.length !== 1 ? 's' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 