"use client";
import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

// Lazy load heavy components
const RoutineProductCard = lazy(() => import('../RoutineProductCard'));
const SkinAnalysisImage = lazy(() => import('../SkinAnalysisImage'));

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: string;
  description: string;
  tags: string[];
  usage: 'morning' | 'evening' | 'both';
  step: 'cleanse' | 'moisturise' | 'protect' | 'addon';
  skinTypes: string[];
  shopifyProductId?: string;
  shopifyVariantId?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

interface RoutineStep {
  step: string;
  title: string;
  products: Product[];
}

interface SkinRoutine {
  essential: RoutineStep[];
  expert: RoutineStep[];
  addons: Product[];
}

interface ResultsStepProps {
  analysisData: any;
  routine: SkinRoutine | null;
  routineType: 'essential' | 'expert';
  onRoutineTypeChange: (type: 'essential' | 'expert') => void;
  onRestart: () => void;
}

export default function ResultsStep({
  analysisData,
  routine,
  routineType,
  onRoutineTypeChange,
  onRestart
}: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'routine'>('results');

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Tab Navigation */}
      <div className="routine-btns w-full flex">
        <button
          onClick={() => setActiveTab('results')}
          className={activeTab === 'results' ? 'w-full flex flex-col items-center justify-center bg-black text-white' : 'w-full flex flex-col items-center justify-center bg-gray-200 text-black'}
        >
          <img 
            src={ASSETS.images.icons.results} 
            alt=""
            width={30}
            height={30}
            style={{ filter: activeTab === 'results' ? 'invert(1)' : 'invert(0)' }}
          />
          <p className="heading-4">RESULTS</p>
        </button>
        <button
          onClick={() => setActiveTab('routine')}
          className={activeTab === 'routine' ? 'w-full flex flex-col items-center justify-center bg-black text-white' : 'w-full flex flex-col items-center justify-center bg-gray-200 text-black'}
        >
          <img 
            src={ASSETS.images.icons.routine} 
            alt="" 
            width={30}
            height={30}
            style={{ filter: activeTab === 'routine' ? 'invert(1)' : 'invert(0)' }}
          />
          <p className="heading-4">ROUTINE</p>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 py-4">
        {activeTab === 'results' && (
          <div>
            {/* AI Photo Analysis Section */}
            <div className="px-4 mb-6">
              <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">AI Photo Analysis</h3>
                  <p className="text-sm text-gray-600 mb-4">Your personalized skin analysis results</p>
                  
                  {/* Analysis Image */}
                  <div className="relative inline-block mb-4">
                    <Suspense fallback={
                      <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                    }>
                      <SkinAnalysisImage 
                        imageUrl={analysisData?.image_url || ''} 
                        analysisData={analysisData}
                      />
                    </Suspense>
                  </div>

                  {/* Analysis Results */}
                  {analysisData && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-700">
                        <strong>Skin Type:</strong> {analysisData.skin_type || 'Normal'}
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Concerns:</strong> {analysisData.concerns?.join(', ') || 'None detected'}
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Recommendations:</strong> {analysisData.recommendations || 'Personalized routine suggested'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && routine && (
          <div className="px-4">
            {/* Routine Type Selector */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onRoutineTypeChange('essential')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  routineType === 'essential'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Essential Routine
              </button>
              <button
                onClick={() => onRoutineTypeChange('expert')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  routineType === 'expert'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Expert Routine
              </button>
            </div>

            {/* Routine Steps */}
            <div className="space-y-4">
              {routine[routineType]?.map((step, index) => (
                <div key={step.step} className="bg-white rounded-xl border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{step.title}</h4>
                  <div className="space-y-3">
                    {step.products.map((product) => (
                      <Suspense key={product.id} fallback={
                        <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
                      }>
                        <RoutineProductCard
                          product={product as any}
                          stepNumber={index + 1}
                          stepTitle={step.title}
                          categoryTitle={step.step}
                        />
                      </Suspense>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Restart Button */}
      <div className="px-4 py-4 border-t border-gray-200">
        <motion.button
          onClick={onRestart}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start Over
        </motion.button>
      </div>
    </motion.div>
  );
}
