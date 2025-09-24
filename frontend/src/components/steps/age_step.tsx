"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';
import { t } from '../../lib/i18n';

interface AgeOption {
  id: string;
  name: string;
}

interface AgeStepProps {
  selectedAge: string;
  onAgeSelect: (age: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ageOptions: AgeOption[] = [
  {
    id: '18-24',
    name: t('steps.age.18_24')
  },
  {
    id: '25-34',
    name: t('steps.age.25_34')
  },
  {
    id: '35-44',
    name: t('steps.age.35_44')
  },
  {
    id: '45-54',
    name: t('steps.age.45_54')
  },
  {
    id: '55+',
    name: t('steps.age.55_plus')
  }
];

export default function AgeStep({ selectedAge, onAgeSelect, onNext, onBack }: AgeStepProps) {
  return (
    <motion.div
      key="age"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-main bg-cover bg-center h-full flex flex-col"
    >
      {/* Age Selection */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t('steps.age.title')}
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {ageOptions.map((option) => (
            <div 
              key={option.id} 
              role="radio"
              aria-checked={selectedAge === option.id}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedAge === option.id 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onAgeSelect(option.id)}
            >
              <div className={`relative rounded-2xl overflow-hidden h-full border-2 transition-all duration-200 ${
                selectedAge === option.id
                  ? 'border-pink-500 shadow-lg shadow-pink-100'
                  : 'border-transparent hover:border-pink-300'
              }`}>
                <div className="flex h-full bg-white">
                  <div className="flex-1 min-w-0 px-6 py-4 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {option.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex justify-center mt-6">
          <motion.button
            onClick={onNext}
            disabled={!selectedAge}
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-pink-600 text-white hover:bg-pink-700 shadow-lg w-full md:w-48 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t('common.next')}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
