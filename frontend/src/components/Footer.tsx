'use client';

import { Camera, Shield, Zap, Users } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">DermaSelf</h3>
                <p className="text-gray-400">AI-Powered Skin Analysis</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Advanced AI technology that analyzes your skin and provides personalized 
              skincare recommendations. Get professional insights from the comfort of your home.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Zap className="w-5 h-5" />
                <span>Instant Results</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Users className="w-5 h-5" />
                <span>Expert Backed</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 DermaSelf. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 