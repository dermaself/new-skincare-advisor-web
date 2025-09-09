"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface SkinType {
  name: string;
  image: string;
  description: string;
}

interface SkinTypeStepProps {
  selectedSkinType: string;
  onSkinTypeSelect: (skinType: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinTypes: SkinType[] = [
  {
    name: 'Normale',
    image: ASSETS.images.skinTypes.normal,
    description: 'Grana cutanea regolare che non presenta problemi significativi'
  },
  {
    name: 'Secca',
    image: ASSETS.images.skinTypes.dry,
    description: 'Spenta, a volta tesa e irritata'
  },
  {
    name: 'Grassa',
    image: ASSETS.images.skinTypes.oily,
    description: 'Lucida nella zona T, con pori visibili e punti neri.'
  },
  {
    name: 'Mista',
    image: ASSETS.images.skinTypes.combination,
    description: 'Grassa nella zona T (fronte, naso e mento) e secca o normale sulle guance.'
  },
  {
    name: 'Non lo so',
    image: ASSETS.images.skinTypes.dontKnow,
    description: 'Scopriamolo!'
  }
];

export default function SkinTypeStep({ selectedSkinType, onSkinTypeSelect, onNext, onBack }: SkinTypeStepProps) {
  return (
    <motion.div
      key="skin-type"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Skin Type Selection */}
      <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Qual è il tuo tipo di pelle?
          </h1>
        </div>
        
        
        <div className="flex flex-col gap-3">
          {skinTypes.map((type) => (
            <div 
              key={type.name} 
              role="radio"
              aria-checked={selectedSkinType === type.name}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedSkinType === type.name 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onSkinTypeSelect(type.name)}
            >
              <div className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                selectedSkinType === type.name
                  ? 'border-pink-500 shadow-lg shadow-pink-100'
                  : 'border-pink-200 hover:border-pink-300'
              }`}>
                <div className="flex items-center">
                  <div className="w-16 h-16 overflow-hidden flex-shrink-0">
                    <img
                      src={type.image}
                      alt={type.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 px-3">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {type.name}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {type.description}
                    </div>
                  </div>
                  <div className={`w-5 h-5 mr-5 rounded-full border-2 transition-all duration-200 ${
                    selectedSkinType === type.name
                      ? 'bg-pink-500 border-pink-500'
                      : 'border-gray-300'
                  } flex items-center justify-center flex-shrink-0`}>
                    {selectedSkinType === type.name && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        
        <div className="flex justify-between space-x-3 mt-6">
          <motion.button
            onClick={onBack}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </motion.button>
          <motion.button
            disabled={!selectedSkinType}
            onClick={onNext}
            className="flex-1 py-2 px-4 font-medium rounded-lg transition-all duration-200 bg-pink-600 text-white hover:bg-pink-700 shadow-lg flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Avanti
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
