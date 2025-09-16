'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SpideringChartProps {
  analysisData: any;
  userAge?: number;
  userGender?: string;
}

export default function SpideringChart({ 
  analysisData, 
  userAge = 30, 
  userGender = 'female' 
}: SpideringChartProps) {
  
  // Extract analysis metrics for the chart
  const getMetrics = () => {
    const metrics = [
      {
        label: 'Skin Health',
        value: analysisData?.overallHealth || 75,
        color: '#ff6b9d'
      },
      {
        label: 'Hydration',
        value: analysisData?.redness ? Math.max(0, 100 - (analysisData.redness.redness_perc || 0)) : 80,
        color: '#4ade80'
      },
      {
        label: 'Clarity',
        value: analysisData?.acne?.severity === 'None' ? 90 : 
               analysisData?.acne?.severity === 'Mild' ? 70 :
               analysisData?.acne?.severity === 'Moderate' ? 50 : 30,
        color: '#3b82f6'
      },
      {
        label: 'Texture',
        value: analysisData?.wrinkles?.severity === 'None' ? 85 :
               analysisData?.wrinkles?.severity === 'Mild' ? 65 :
               analysisData?.wrinkles?.severity === 'Moderate' ? 45 : 25,
        color: '#f59e0b'
      },
      {
        label: 'Radiance',
        value: 70, // Default value since we don't have specific radiance data
        color: '#8b5cf6'
      }
    ];

    return metrics;
  };

  const metrics = getMetrics();
  const centerX = 120;
  const centerY = 120;
  const radius = 80;

  // Calculate points for the polygon
  const getPolygonPoints = () => {
    return metrics.map((metric, index) => {
      const angle = (index * 2 * Math.PI) / metrics.length - Math.PI / 2;
      const value = metric.value / 100;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calculate label positions
  const getLabelPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / metrics.length - Math.PI / 2;
    const labelRadius = radius + 20;
    const x = centerX + Math.cos(angle) * labelRadius;
    const y = centerY + Math.sin(angle) * labelRadius;
    return { x, y };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Skin Analysis Overview</h3>
      
      <div className="flex items-center justify-center">
        <motion.svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Background circles */}
          {[20, 40, 60, 80].map((r, index) => (
            <circle
              key={index}
              cx={centerX}
              cy={centerY}
              r={r}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {metrics.map((_, index) => {
            const angle = (index * 2 * Math.PI) / metrics.length - Math.PI / 2;
            const endX = centerX + Math.cos(angle) * radius;
            const endY = centerY + Math.sin(angle) * radius;
            return (
              <line
                key={index}
                x1={centerX}
                y1={centerY}
                x2={endX}
                y2={endY}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon */}
          <motion.polygon
            points={getPolygonPoints()}
            fill="rgba(255, 107, 157, 0.2)"
            stroke="#ff6b9d"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />

          {/* Data points */}
          {metrics.map((metric, index) => {
            const angle = (index * 2 * Math.PI) / metrics.length - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            
            return (
              <motion.circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={metric.color}
                stroke="white"
                strokeWidth="2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              />
            );
          })}

          {/* Labels */}
          {metrics.map((metric, index) => {
            const pos = getLabelPosition(index);
            return (
              <text
                key={index}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-gray-600"
              >
                {metric.label}
              </text>
            );
          })}
        </motion.svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
          >
            <div
              className="w-3 h-3 rounded-full bg-pink-500"
            />
            <span className="text-sm text-gray-600">{metric.label}</span>
            <span className="text-sm font-semibold text-gray-800 ml-auto">
              {metric.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
