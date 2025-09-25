'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CartDebug() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testCartConfiguration = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/shopify/cart/test');
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      setTestResults({
        success: false,
        error: 'Failed to test cart configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCartCreation = async () => {
    setIsLoading(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/shopify/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_cart',
          variantId: 'gid://shopify/ProductVariant/123456789', // Test variant ID
          quantity: 1
        }),
      });

      const data = await response.json();
      setTestResults({
        success: response.ok,
        data: data,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error) {
      setTestResults({
        success: false,
        error: 'Failed to test cart creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
          <Bug className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Debug Carrello</h2>
          <p className="text-gray-600">Testa la configurazione del carrello e l'API</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <button
          onClick={testCartConfiguration}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span>Testa Configurazione Carrello</span>
        </button>

        <button
          onClick={testCartCreation}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>Testa Creazione Carrello</span>
        </button>
      </div>

      {testResults && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Risultati del Test</h3>
          <div className={`p-3 rounded-lg mb-3 ${
            testResults.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              {testResults.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                {testResults.success ? 'Successo' : 'Errore'}
              </span>
            </div>
            
            {testResults.error && (
              <p className="text-sm text-red-600 mb-2">
                Errore: {testResults.error}
              </p>
            )}
            
            {testResults.details && (
              <p className="text-sm text-gray-600 mb-2">
                Dettagli: {testResults.details}
              </p>
            )}

            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 