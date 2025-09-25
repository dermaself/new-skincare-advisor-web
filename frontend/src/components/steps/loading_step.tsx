"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingStepProps {
  // Add any props you might need for loading state
}

export default function LoadingStep({}: LoadingStepProps) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 h-full flex flex-col items-center justify-center"
    >
      <div className="flex flex-col items-center justify-center py-12 px-4 flex-1">
        <div className="loader__wrapper">
          <div className="loader">&nbsp;</div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 mt-4">Analizzando la Tua Foto</h2>
        <p className="text-gray-600 text-center max-w-md">
          La nostra AI sta analizzando la tua pelle e creando raccomandazioni personalizzate...
        </p>
      </div>
    </motion.div>
  );
}
