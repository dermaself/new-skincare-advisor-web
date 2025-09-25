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
  
  // Helper: map severities to numeric levels
  const severityToLevel = (severity?: string, levels: number = 4) => {
    const map4: Record<string, number> = {
      None: 1,
      Mild: 2,
      Moderate: 3,
      Severe: 4
    };
    if (!severity) return 1;
    const s = severity as keyof typeof map4;
    const lvl = map4[s] || 1;
    // If different scale requested, clamp
    return Math.max(1, Math.min(levels, lvl));
  };

  // Stable random based on inference id to avoid flicker between renders
  const seededRandoms = React.useMemo(() => {
    const seedBase = String(analysisData?.inference_id || 'seed');
    let h = 0;
    for (let i = 0; i < seedBase.length; i++) {
      h = Math.imul(31, h) + seedBase.charCodeAt(i) | 0;
    }
    const rand = () => {
      // xorshift32
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      return ((h >>> 0) % 1000) / 1000;
    };
    return { rand };
  }, [analysisData?.inference_id]);

  const levelToPercent = (level: number, maxLevel: number) => (level / maxLevel) * 100;

  // Build metrics with required vertices and scales
  const getMetrics = () => {
    // Acne (4 livelli) from analysisData.acne.severity
    const acneLevels = 4;
    const acneLevel = severityToLevel(analysisData?.acne?.severity, acneLevels);

    // Dryness (5 livelli) - not available => random 1..5
    const drynessLevels = 5;
    const drynessLevel = Math.max(1, Math.min(drynessLevels, Math.floor(seededRandoms.rand() * drynessLevels) + 1));

    // Wrinkles (4 livelli) from analysisData.wrinkles.severity
    const wrinklesLevels = 4;
    const wrinklesLevel = severityToLevel(analysisData?.wrinkles?.severity, wrinklesLevels);

    // Dark Spots (4 livelli) - not available => random 1..4
    const darkSpotsLevels = 4;
    const darkSpotsLevel = Math.max(1, Math.min(darkSpotsLevels, Math.floor(seededRandoms.rand() * darkSpotsLevels) + 1));

    // Large Pores (4 livelli) - not available => random 1..4
    const poresLevels = 4;
    const poresLevel = Math.max(1, Math.min(poresLevels, Math.floor(seededRandoms.rand() * poresLevels) + 1));

    // Redness (5 livelli) from redness.redness_perc (0..100)
    const rednessLevels = 5;
    const rednessPerc: number = analysisData?.redness?.redness_perc ?? 0;
    const rednessLevel = Math.max(1, Math.min(rednessLevels, Math.ceil((rednessPerc + 0.0001) / (100 / rednessLevels))));

    // Skin Laxity (4 livelli) - not available => random 1..4
    const laxityLevels = 4;
    const laxityLevel = Math.max(1, Math.min(laxityLevels, Math.floor(seededRandoms.rand() * laxityLevels) + 1));

    const metrics = [
      { label: 'Acne', level: acneLevel, max: acneLevels, color: '#ef4444' },
      { label: 'Secchezza', level: drynessLevel, max: drynessLevels, color: '#3b82f6' },
      { label: 'Rughe', level: wrinklesLevel, max: wrinklesLevels, color: '#f59e0b' },
      { label: 'Discromie', level: darkSpotsLevel, max: darkSpotsLevels, color: '#8b5cf6' },
      { label: 'Pori', level: poresLevel, max: poresLevels, color: '#10b981' },
      { label: 'Rossore', level: rednessLevel, max: rednessLevels, color: '#ec4899' },
      { label: 'Lassità\nCutanea', level: laxityLevel, max: laxityLevels, color: '#06b6d4' }
    ];

    // Convert to percentage value for plotting
    return metrics.map(m => ({
      label: m.label,
      level: m.level,
      max: m.max,
      value: levelToPercent(m.level, m.max),
      color: m.color
    }));
  };

  const metrics = getMetrics();
  
  // Reference profile based on age and gender (baseline/ideal lower is better)
  const referenceLevels = React.useMemo(() => {
    // Defaults
    let ref = {
      Acne: 1,
      Secchezza: 2,
      Rughe: 2,
      'Discromie': 2,
      'Pori': 3,
      Rossore: 2,
      'Lassità\nCutanea': 2,
    } as Record<string, number>;

    // Example of branching for other ages/genders in future
    if (userGender?.toLowerCase() === 'female' && userAge === 30) {
      // Use the provided mapping (already set in defaults)
    }

    return ref;
  }, [userAge, userGender]);

  const referenceMetrics = metrics.map(m => ({
    label: m.label,
    level: referenceLevels[m.label] ?? Math.max(1, Math.round(m.max / 2)),
    max: m.max,
    value: ((referenceLevels[m.label] ?? Math.max(1, Math.round(m.max / 2))) / m.max) * 100,
    color: '#22c55e' // green
  }));
  // Increase canvas and padding to avoid label clipping at the edges
  const centerX = 130;
  const centerY = 130;
  const radius = 88;

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

  const getReferencePolygonPoints = () => {
    return referenceMetrics.map((metric, index) => {
      const angle = (index * 2 * Math.PI) / referenceMetrics.length - Math.PI / 2;
      const value = metric.value / 100;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calculate label positions
  const getLabelPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / metrics.length - Math.PI / 2;
    const labelRadius = radius + 28; // extra padding for labels
    const x = centerX + Math.cos(angle) * labelRadius;
    const y = centerY + Math.sin(angle) * labelRadius;
    return { x, y };
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Panoramica Analisi della Pelle</h3>
      
      <div className="flex items-center justify-center w-full">
        <motion.svg
          width="100%"
          height="auto"
          viewBox="0 0 260 260"
          preserveAspectRatio="xMidYMid meet"
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

          {/* Reference polygon (green) */}
          <motion.polygon
            points={getReferencePolygonPoints()}
            fill="rgba(34,197,94,0.15)"
            stroke="#22c55e"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />

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

          {/* Reference points */}
          {referenceMetrics.map((metric, index) => {
            const angle = (index * 2 * Math.PI) / referenceMetrics.length - Math.PI / 2;
            const value = metric.value / 100;
            const x = centerX + Math.cos(angle) * radius * value;
            const y = centerY + Math.sin(angle) * radius * value;
            
            return (
              <motion.circle
                key={`ref-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#22c55e"
                stroke="white"
                strokeWidth="1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.25 + index * 0.1 }}
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
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={index}
            className="flex items-center space-x-3 p-2 rounded-lg border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
              <circle cx="6" cy="6" r="6" fill={metric.color} />
            </svg>
            <span className="text-sm text-gray-600">{metric.label}</span>
            <span className="ml-auto flex items-center space-x-2">
              {metric.level <= (referenceLevels[metric.label] ?? metric.max) ? (
                <span className="inline-flex items-center text-green-600 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 6.973-9.764a.75.75 0 011.057-.196z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Ok</span>
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-600 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.335-.213 2.99-1.743 2.99H3.482c-1.53 0-2.492-1.655-1.743-2.99L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-.25-6.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Da Migliorare</span>
                </span>
              )}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
