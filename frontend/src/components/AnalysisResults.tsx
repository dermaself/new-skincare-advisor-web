'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, ArrowLeft, Share2, Download, Heart } from 'lucide-react';
import { AnalysisResult, SkinConcern } from './SkinAnalysis';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
}

export default function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Your Skin Analysis Results
        </h2>
        <p className="text-gray-600">
          Based on AI analysis of your skin, here are your personalized insights
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image and Health Score */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="card">
            <div className="relative mb-4">
              <img
                src={result.imageUrl}
                alt="Analyzed skin"
                className="w-full h-48 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-2">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Overall Skin Health
              </h3>
              <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor(result.overallHealth)}`}>
                {result.overallHealth}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    result.overallHealth >= 80 ? 'bg-green-500' :
                    result.overallHealth >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.overallHealth}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {result.overallHealth >= 80 ? 'Excellent skin health!' :
                 result.overallHealth >= 60 ? 'Good skin health with room for improvement' :
                 'Some concerns detected - see recommendations below'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Concerns and Recommendations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Skin Concerns */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Detected Skin Concerns
            </h3>
            
            {result.concerns.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No significant skin concerns detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.concerns.map((concern, index) => (
                  <motion.div
                    key={concern.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(concern.severity)}`}>
                          {getSeverityIcon(concern.severity)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{concern.name}</h4>
                          <p className="text-sm text-gray-600">{concern.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {Math.round(concern.confidence)}% confidence
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(concern.severity)}`}>
                          {concern.severity} severity
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Personalized Recommendations
            </h3>
            
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">{recommendation}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4"
      >
        <button
          onClick={onReset}
          className="btn-secondary"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          New Analysis
        </button>
        
        <button className="btn-secondary">
          <Share2 className="w-5 h-5 mr-2" />
          Share Results
        </button>
        
        <button className="btn-primary">
          <Download className="w-5 h-5 mr-2" />
          Download Report
        </button>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-gray-500 bg-gray-50 p-4 rounded-lg"
      >
        <p>
          This analysis is for informational purposes only and should not replace professional medical advice. 
          Always consult with a dermatologist for medical concerns.
        </p>
      </motion.div>
    </div>
  );
} 