'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, CheckCircle, Users, TrendingUp, Shield, Heart, Star } from 'lucide-react';
import SkinAnalysisModal from '@/components/SkinAnalysisModal';

export default function Home() {
  const [showModal, setShowModal] = useState(false);

  const handleTryNow = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation Header */}
      <motion.header 
        className="bg-white border-b border-gray-200 sticky top-0 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.a 
              href="/" 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              aria-label="home"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-primary-600 shadow-sm">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DermaSelf</h1>
                <p className="text-sm text-gray-500">AI Skin Analysis</p>
              </div>
            </motion.a>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <motion.a
                href="/"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                Home
              </motion.a>
              <motion.a
                href="/about"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                About
              </motion.a>
              
              {/* Dropdown Menu */}
              <motion.div
                className="relative group"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <button className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium">
                  <span>Try Now</span>
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <a href="/skin-analysis" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors duration-200">
                    Skin Analysis
                  </a>
                  <a href="/product-recommendations" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors duration-200">
                    Product Recommendations
                  </a>
                  <a href="/skincare-routine" className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors duration-200">
                    Skincare Routine
                  </a>
                </div>
              </motion.div>
              
              <motion.a
                href="/solutions"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                Solutions
              </motion.a>
              <motion.a
                href="/pricing"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                Pricing
              </motion.a>
              <motion.a
                href="/blog"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                Blog
              </motion.a>
              <motion.a
                href="/contact"
                className="text-gray-600 hover:text-primary-600 transition-colors duration-200 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                Contact Us
              </motion.a>
            </nav>
            
            {/* Mobile Menu Button */}
            <motion.button
              className="lg:hidden w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              DERMASELF - AI SKINCARE
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Advanced AI technology that analyzes your skin and provides personalized 
              skincare recommendations. Get professional insights from the comfort of your home.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <motion.button
                onClick={handleTryNow}
                className="btn-primary px-12 py-3 tracking-wide text-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                TRY IT NOW
              </motion.button>
              <motion.button 
                className="btn-secondary px-12 py-3 tracking-wide text-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                CONTACT US
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="AI Skin Analysis"
                  className="w-full h-96 object-cover shadow-lg"
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Accurate AI Analysis
              </motion.h2>
              <motion.p 
                className="text-lg text-gray-600 mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Our advanced AI technology detects multiple skin concerns and provides 
                personalized recommendations tailored to your unique skin profile.
              </motion.p>
              <div className="space-y-4">
                {[
                  'Detects 10+ skin concerns',
                  'Personalized recommendations',
                  'Privacy-focused analysis'
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-center justify-center w-6 h-6 bg-primary-600 rounded-full">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-6 tracking-widest"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                PREMIUM-QUALITY, AFFORDABLE, SCALABLE.
              </motion.h2>
              <div className="space-y-6 text-gray-600">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <p>Dermaself is powered by the latest AI technology, detecting 10 of the most common skin concerns.</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <p>Our AI skin-health solution processes all user data instantly and within user’s device, never collecting, storing or sharing personal user data.</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  <p>The app is fully customisable, cross platform in-browser, and scales as your business grows.</p>
                </motion.div>
              </div>
              <motion.button 
                className="btn-primary mt-8 px-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Learn More
              </motion.button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="AI Technology"
                  className="w-full h-96 object-cover shadow-lg"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 bg-gradient-to-r from-[#a1399f] to-[#f1426e] text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: '+20%', label: 'Add to Cart' },
              { value: '+300%', label: 'Conversion Rate' },
              { value: '+21.3%', label: 'Brand Awareness' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <motion.h2 
                className="text-3xl font-bold text-gray-900 mb-4 text-center tracking-widest max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                YOUR BEAUTY JOURNEY STARTS HERE
              </motion.h2>
              <motion.p 
                className="text-gray-600 mb-8 text-lg leading-relaxed text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Experience the power of AI-driven skin analysis and discover your 
                personalized skincare routine today.
              </motion.p>
              <motion.button 
                className="btn-primary mx-auto px-12 block"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                BOOK DEMO
              </motion.button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="card">
                <motion.h3 
                  className="text-2xl font-bold text-gray-900 mb-6 text-center tracking-widest"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  GET IN TOUCH
                </motion.h3>
                <form className="space-y-4">
                  <motion.input
                    type="text"
                    placeholder="Name"
                    className="input-field border border-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-orange-500 hover:border-orange-500 hover:placeholder-orange-500 transition-colors duration-200"
                    style={{
                      background: 'white',
                      boxShadow: 'none',
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    viewport={{ once: true }}
                  />
                  <motion.input
                    type="email"
                    placeholder="Email"
                    className="input-field border border-black placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-orange-500 hover:border-orange-500 hover:placeholder-orange-500 transition-colors duration-200"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    viewport={{ once: true }}
                  />
                  <motion.button
                    type="submit"
                    className="btn-primary w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    SUBMIT
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <motion.div 
                className="flex items-center space-x-3 mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center justify-center w-10 h-10 bg-primary-600">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">DermaSelf</h3>
                  <p className="text-gray-400">AI-Powered Skin Analysis</p>
                </div>
              </motion.div>
              <motion.p 
                className="text-gray-400 mb-6 max-w-md leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Advanced AI technology that analyzes your skin and provides personalized 
                skincare recommendations. Get professional insights from the comfort of your home.
              </motion.p>
              <div className="flex space-x-6">
                {[
                  { icon: Shield, text: 'Secure & Private' },
                  { icon: TrendingUp, text: 'Instant Results' },
                  { icon: Users, text: 'Expert Backed' }
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    className="flex items-center space-x-2 text-gray-400"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {[
              { title: 'Product', items: ['Features', 'Pricing', 'API', 'Integrations'] },
              { title: 'Company', items: ['About', 'Blog', 'Careers', 'Contact'] }
            ].map((section, sectionIndex) => (
              <div key={section.title}>
                <motion.h4 
                  className="font-semibold mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
                  viewport={{ once: true }}
                >
                  {section.title}
                </motion.h4>
                <ul className="space-y-2 text-gray-400">
                  {section.items.map((item, index) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: (sectionIndex * 0.1) + (index * 0.05) }}
                      viewport={{ once: true }}
                    >
                      <a href="#" className="hover:text-white transition-colors duration-200 text-sm">
                        {item}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <motion.div 
            className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-400 text-sm">
              © 2024 DermaSelf. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item, index) => (
                <a 
                  key={item}
                  href="#" 
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </footer>

      {/* Modal */}
      <SkinAnalysisModal isOpen={showModal} onClose={handleCloseModal} />
    </main>
  );
}
