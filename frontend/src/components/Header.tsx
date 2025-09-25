'use client';

import { Camera, Sparkles, Heart } from 'lucide-react';
import CartIcon from './CartIcon';

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dermaself</h1>
              <p className="text-sm text-gray-500">Analisi della Pelle AI</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
              Funzionalità
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">
              Come Funziona
            </a>
            <a href="#about" className="text-gray-600 hover:text-primary-600 transition-colors">
              Chi Siamo
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors">
              <Heart className="w-5 h-5" />
              <span className="hidden sm:inline">Preferiti</span>
            </button>
            <CartIcon />
            <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              <Sparkles className="w-5 h-5" />
              <span>Prova Analisi</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 