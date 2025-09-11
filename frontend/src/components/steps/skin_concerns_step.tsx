"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { ASSETS } from '../../lib/assets';

interface SkinConcern {
  id: string;
  name: string;
  icon: string;
}

interface SkinConcernsStepProps {
  selectedConcerns: string[];
  onConcernToggle: (concernId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const skinConcerns: SkinConcern[] = [
  {
    id: 'wrinkles',
    name: 'Visible wrinkles and lack of tone',
    icon: ASSETS.images.icons.wrinkles
  },
  {
    id: 'eyebags',
    name: 'Bags and dark circles',
    icon: ASSETS.images.icons.eyebags
  },
  {
    id: 'dullSkin',
    name: 'Dull complexion',
    icon: ASSETS.images.icons.dullSkin
  },
  {
    id: 'aging',
    name: 'First signs of aging',
    icon: ASSETS.images.icons.aging
  },
  {
    id: 'pores',
    name: 'Visible pores and blackheads',
    icon: ASSETS.images.icons.poreDilation
  },
  {
    id: 'none',
    name: 'No specific concerns',
    icon: ''
  }
];

export default function SkinConcernsStep({ selectedConcerns, onConcernToggle, onNext, onBack }: SkinConcernsStepProps) {
  return (
    <motion.div
      key="skin-concerns"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-bg2 bg-cover bg-center h-full flex flex-col"
    >
      {/* Skin Concerns Selection */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            What do you think about your skin? Indicate what are the main concerns of your skin, if any.
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {skinConcerns.map((concern) => (
            <div 
              key={concern.id} 
              role="checkbox"
              aria-checked={selectedConcerns.includes(concern.id)}
              tabIndex={0}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedConcerns.includes(concern.id) 
                  ? 'transform scale-[1.02]' 
                  : 'hover:transform hover:scale-[1.01]'
              }`}
              onClick={() => onConcernToggle(concern.id)}
            >
              <div className={`relative rounded-2xl overflow-hidden h-full border-2 transition-all duration-200 ${
                selectedConcerns.includes(concern.id)
                  ? 'border-pink-500 shadow-lg shadow-pink-100'
                  : 'border-transparent hover:border-pink-300'
              }`}>
                <div className="flex h-full bg-white">
                  <div className="w-16 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {concern.icon ? (
                      <img
                        src={concern.icon}
                        alt={concern.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          console.error(`Failed to load icon: ${concern.icon}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 px-3 flex flex-col justify-center items-center">
                    <div className="font-semibold text-gray-900 text-sm mb-1">
                      {concern.name}
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
            disabled={selectedConcerns.length === 0}
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-pink-600 text-white hover:bg-pink-700 shadow-lg w-full md:w-48 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Next
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
