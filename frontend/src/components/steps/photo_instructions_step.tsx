"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

interface PhotoInstruction {
  id: string;
  icon: string;
  text: string;
}

interface PhotoInstructionsStepProps {
  onNext: () => void;
  onBack: () => void;
}

const photoInstructions: PhotoInstruction[] = [
  {
    id: 'glasses',
    icon: 'glasses',
    text: 'Remove glasses'
  },
  {
    id: 'hair',
    icon: 'hair',
    text: 'Pull back hair'
  },
  {
    id: 'position',
    icon: 'position',
    text: 'Position yourself in front of the camera'
  },
  {
    id: 'expression',
    icon: 'expression',
    text: 'Maintain a neutral expression'
  }
];

export default function PhotoInstructionsStep({ onNext, onBack }: PhotoInstructionsStepProps) {
  return (
    <motion.div
      key="photo-instructions"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-[url('/assets/images/backgrounds/bg-main.jpg')] bg-cover bg-center h-full flex flex-col"
    >
      {/* Photo Instructions */}
      <div className="flex flex-col px-4 py-4 overflow-y-auto bg-white/50 backdrop-blur-sm p-4 overflow-y-auto mt-auto mx-4 mb-4 rounded-lg">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Your photo will allow us to better analyze your skin and recommend the most suitable products
          </h1>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {photoInstructions.map((instruction) => (
            <div 
              key={instruction.id}
              className="flex flex-col justify-center items-center bg-transparent"
            >
              <div className="w-12 h-12 bg-transparent rounded-lg flex items-center justify-center flex-shrink-0">
                <img 
                  src={`/assets/images/icons/${instruction.icon}.svg`}
                  alt={instruction.text}
                  className="w-8 h-8 text-gray-700"
                  onError={(e) => {
                    console.error(`Failed to load icon: ${instruction.icon}.svg`);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-900">
                  {instruction.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 justify-center items-center">
          <motion.button
            onClick={onNext}
            className="py-3 px-8 rounded-lg transition-all duration-200 bg-pink-600 text-white hover:bg-pink-700 shadow-lg w-full md:w-48 flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Camera className="w-5 h-5 mr-2" />
            Go to selfie
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
