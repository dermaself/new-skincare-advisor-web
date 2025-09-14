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
  capturedImage: string | null;
  activeTab: 'results' | 'routine';
  onTabChange: (tab: 'results' | 'routine') => void;
}

export default function ResultsStep({
  analysisData,
  routine,
  routineType,
  onRoutineTypeChange,
  onRestart,
  capturedImage,
  activeTab,
  onTabChange
}: ResultsStepProps) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Tab Content */}
      <div className="flex-1 py-4">
        {activeTab === 'results' && (
          <div>
            {/* AI Photo Analysis Section */}
            <div className="mb-6">
              <div className="relative">
                <div className="text-center">
                  {/* Analysis Image */}
                  <div className="relative mb-4">
                    <Suspense fallback={
                      <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                    }>
                      <SkinAnalysisImage 
                        imageUrl={capturedImage || analysisData?.image_url || ''} 
                        analysisData={analysisData}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && routine && (
          <div className="px-4">
            {/* Routine Steps */}
            <div className="space-y-4">
              {routine[routineType] && routine[routineType].length > 0 ? (
                routine[routineType].map((step, index) => (
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
                ))
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-gray-500">No routine data available</p>
                  <p className="text-sm text-gray-400 mt-2">Please try the analysis again</p>
                </div>
              )}
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
