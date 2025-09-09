"use client";
import React from 'react';

interface ModalFooterProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ModalFooter({
  currentStep,
  totalSteps,
  className = ""
}: ModalFooterProps) {
  return (
    <div className={`border-t border-gray-200 bg-white px-4 py-3 ${className}`}>
      {/* Progress Indicator */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index < currentStep ? 'bg-pink-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <p className="pt-2 text-center text-gray-500 text-sm">
        Powered by DermaSelf
      </p>
    </div>
  );
}
