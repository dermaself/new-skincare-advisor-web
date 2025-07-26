'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, FileText, Sparkles, Heart, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'onboarding' | 'quiz' | 'scan' | 'results';

const steps = [
  { id: 'onboarding', title: 'WELCOME', icon: '🎯' },
  { id: 'quiz', title: 'QUIZ', icon: '📝' },
  { id: 'scan', title: 'SCAN', icon: '📸' },
  { id: 'results', title: 'RESULTS', icon: '✨' }
];

export default function SkinAnalysisModal({ isOpen, onClose }: SkinAnalysisModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('onboarding');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const skinTypeRef = useRef<HTMLDivElement>(null);
  const ageGroupRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('onboarding');
      setSelectedConcerns([]);
      setSelectedSkinType('');
      setSelectedAgeGroup('');
      setCapturedImage(null);
      setShowCamera(false);
      setOpenInfo(null);
    }
  }, [isOpen]);

  // Auto-scroll to skin type after 2 concerns selected
  useEffect(() => {
    if (selectedConcerns.length === 2 && skinTypeRef.current) {
      setTimeout(() => {
        const modalContent = document.querySelector('.modal-content') as HTMLElement;
        const targetElement = skinTypeRef.current as HTMLElement;
        if (modalContent && targetElement) {
          const targetPosition = targetElement.offsetTop - modalContent.offsetTop;
          modalContent.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 800);
    }
  }, [selectedConcerns]);

  // Auto-scroll to age group after skin type selected
  useEffect(() => {
    if (selectedSkinType && ageGroupRef.current) {
      setTimeout(() => {
        const modalContent = document.querySelector('.modal-content') as HTMLElement;
        const targetElement = ageGroupRef.current as HTMLElement;
        if (modalContent && targetElement) {
          const targetPosition = targetElement.offsetTop - modalContent.offsetTop;
          modalContent.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 800);
    }
  }, [selectedSkinType]);

  // Auto-scroll to buttons after age group selected
  useEffect(() => {
    if (selectedAgeGroup && buttonsRef.current) {
      setTimeout(() => {
        const modalContent = document.querySelector('.modal-content') as HTMLElement;
        const targetElement = buttonsRef.current as HTMLElement;
        if (modalContent && targetElement) {
          const targetPosition = targetElement.offsetTop - modalContent.offsetTop;
          modalContent.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 800);
    }
  }, [selectedAgeGroup]);

  // Scroll to top when entering quiz step
  useEffect(() => {
    if (currentStep === 'quiz') {
      setTimeout(() => {
        const modalContent = document.querySelector('.modal-content') as HTMLElement;
        if (modalContent) {
          modalContent.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        }
      }, 300);
    }
  }, [currentStep]);

  const skinConcerns = [
    {
      name: 'Fine Lines & Wrinkles',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/4d08972d-5783-49f8-bfbe-eaa672a50774-e7f6ce05-67a4-469e-8c34-c735cef5607b-1d131331-c42a-4c48-a492-1e5b05f93f8a-img-answer-1x1-fine-lines.png',
      icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/2884557d-251f-4068-b02e-e0e2086c605a-wrinkle-3.svg',
      description: 'Small crevices & folds in the skin creating a crepe-like surface signal a breakdown of collagen in the skin, resulting in fine lines & wrinkles.'
    },
    {
      name: 'Dehydration',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/9df5d603-535c-4a15-a427-3c3f0204f813-023eaa32-67c8-4ea2-89eb-974498123b3d-a854d24b-d572-4e0c-a6dd-65df5253e86c-img-answer-1-x-1-wrinkles-3x.png',
      icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/eff7f7f1-7c71-475f-926c-85cd3dff0c9b-hydration-3.svg',
      description: 'Dehydrated skin appears dull, rough, and lacks elasticity, and can sometimes be accompanied by excess oil.'
    },
    {
      name: 'Dark Spots & Uneven Tone',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/396605ab-5dd3-4554-ab9e-1e9b89b54694-dd18ab3d-7704-4d23-a438-cb87ee0fa758-89ed0f76-54b3-4768-af1d-0ea6dff63e82-img-answer-1x1-dark-circles.png',
      icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/5e7eeb01-3d1b-45ea-9d36-8168c1558901-dark-spot-3.svg',
      description: 'Uneven skin tone is characterised by hyperpigmentation and dark spots; Areas or patches of skin can appear darker, lighter, redder or browner than your overall complexion.'
    },
    {
      name: 'Acne & Blemishes',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/6094bd0d-b97b-424f-a011-767bbd6ceb7c-439bd91d-5703-4b32-9c70-f21334d4544f-5cfef3e2-6c04-4a06-80e8-124d76943f0e-img-answer-1x1-male-acne.png',
      icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/1dc95b48-dbc7-4fdb-a4be-ef0dca1beec9-spot-3.svg',
      description: 'Acne and blemish-prone skin is characterised by excessive oil production, clogged pores, inflammation, and the presence of whiteheads, blackheads, pimples, and sometimes cystic lesions.'
    },
    {
      name: 'Dark Circles / Eye Bags',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/f1da9fa3-ddcb-4621-acac-c3f2174a0421-a0244e0f-96f3-4fb5-8b21-ae8c8e9279dd-img-answer-1x1-eye-darkcircles.png',
      icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/1dc95b48-dbc7-4fdb-a4be-ef0dca1beec9-spot-3.svg',
      description: 'Discoloured, shadowy areas often characterised by bluish-purple, brownish, or blackish pigmentation below the lower eyelids that can make you appear fatigued or older.'
    }
  ];

  const skinTypes = [
    {
      name: 'Normal/Combination',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/fcb5fcd5-268c-45c5-a503-2558df86585d-b410b0db-66b9-42aa-8b05-836d7f67eed1-d86bfb45-1893-4dc0-828a-dcfb2bd618ed-img-answer-1x1-normal-skin.png',
      description: 'Normal skin may appear as though it doesn\'t need any care, but it\'s essential to preserve your skin health.'
    },
    {
      name: 'Oily',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/f0ac5088-edfa-4d21-8517-f92b259dc128-dbd9d8ce-cadf-43fe-8076-622bebf5cacf-2d4e648a-1405-4471-94d7-a1d5eb5fc041-img-answer-1x1-combination.png',
      description: 'Oily skin produces excess oils, often affecting the t-zone the most.'
    },
    {
      name: 'Dry and/or Sensitive',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/71b03d54-5e56-4f15-94ce-edc3ecce9fd5-2e8c0bfa-ea13-4e6e-af7c-e51a3cf3bae8-7bb50cea-91ad-4e27-99c2-0c9e8cf836aa-img-answer-1-x-1-dry-3x.png',
      description: 'Dry / sensitive skin has typically been stripped of it\'s natural oils, and can appear flaky, dull and be prone to redness.'
    }
  ];

  const ageGroups = [
    {
      name: 'Less then 20',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/532619ee-ba0e-4a33-87fc-95ed95b6ab07-998ed1d4-c0de-4d8f-8884-bfd3e06e5bd3-Group%252047.png',
      description: 'Normal skin may appear as though it doesn\'t need any care, but it\'s essential to preserve your skin health.'
    },
    {
      name: '20-35',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/8cf866b0-4626-4a19-af1a-1abcf2f768f4-6840591b-b2de-4cce-a41c-8a9f22fd42c0-Group%252048.png',
      description: 'Oily skin produces excess oils, often affecting the t-zone the most.'
    },
    {
      name: 'More than 35',
      image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/26935305-d3fe-4de1-b87d-f58f4632811b-67dbe5dc-42be-4b6b-bf68-aa43e45ab6da-Group%252046.png',
      description: 'Dry / sensitive skin has typically been stripped of it\'s natural oils, and can appear flaky, dull and be prone to redness.'
    }
  ];

  const handleConcernToggle = (concern: string) => {
    if (selectedConcerns.includes(concern)) {
      setSelectedConcerns(selectedConcerns.filter(c => c !== concern));
    } else if (selectedConcerns.length < 2) {
      setSelectedConcerns([...selectedConcerns, concern]);
    }
  };

  const handleNext = () => {
    const stepOrder: Step[] = ['onboarding', 'quiz', 'scan', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['onboarding', 'quiz', 'scan', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleClose = () => {
    setCurrentStep('onboarding');
    setSelectedConcerns([]);
    setSelectedSkinType('');
    setSelectedAgeGroup('');
    setOpenInfo(null);
    onClose();
  };

  const handleStartScan = () => {
    setShowCamera(true);
  };

  const handleImageCapture = (imageData: string) => {
    setCapturedImage(imageData);
    setShowCamera(false);
    // Auto-advance to results after a short delay
    setTimeout(() => {
      setCurrentStep('results');
    }, 1000);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
  };

  const toggleInfo = (concern: string) => {
    setOpenInfo(openInfo === concern ? null : concern);
  };

  if (!isOpen) return null;

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleImageCapture}
        onClose={handleCameraClose}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[540px] max-h-[95vh] bg-white shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-primary-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">DermaSelf</h2>
                  <p className="text-white/80 text-sm">AI Skin Analysis</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center justify-center space-x-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                        steps.findIndex(s => s.id === currentStep) >= index
                          ? 'bg-white text-primary-600'
                          : 'bg-white/30 text-white'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <p className="text-xs text-white/80 mt-1 font-medium">{step.title}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-6 h-0.5 mx-2 transition-all duration-200 ${
                        steps.findIndex(s => s.id === currentStep) > index
                          ? 'bg-white'
                          : 'bg-white/30'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="modal-content p-6 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentStep === 'onboarding' && (
                <motion.div
                  key="onboarding"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="mb-6">
                    <img
                      src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                      alt="Skin Analysis"
                      className="w-full h-48 object-cover mb-6"
                    />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Get Your Virtual Skincare Consultation
                  </h3>
                  
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Complete a short assessment, take a photo, and receive personalized 
                    skincare recommendations powered by AI technology.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                      { icon: '📝', title: 'Assessment', desc: 'Answer questions about your skin' },
                      { icon: '📸', title: 'Photo', desc: 'Take a photo for AI analysis' },
                      { icon: '✨', title: 'Results', desc: 'Get personalized recommendations' }
                    ].map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-50 p-4 border border-gray-200"
                      >
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  <motion.button
                    onClick={handleNext}
                    className="btn-primary w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Start Assessment
                  </motion.button>
                </motion.div>
              )}

              {currentStep === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-0"
                >
                  {/* Skin Concerns */}
                  <div className="question min-h-[60vh] flex flex-col justify-center">
                    <h1 className="question__header-text">
                      SELECT TWO SKIN CONCERNS YOU WOULD LIKE TO FOCUS ON
                    </h1>
                    <div className="answers">
                      {skinConcerns.map((concern) => (
                        <div key={concern.name} className="answer-container">
                          <label className={`answer ${selectedConcerns.includes(concern.name) ? 'selected gradient-border' : ''}`}>
                            <input
                              type="checkbox"
                              className="answer__checkbox"
                              checked={selectedConcerns.includes(concern.name)}
                              onChange={() => handleConcernToggle(concern.name)}
                            />
                            <img
                              src={concern.image}
                              alt={concern.name}
                              className="answer__image h-48 w-full object-cover"
                            />
                            <div className="answer__footer-wrapper">
                              <img src={concern.icon} alt="" className="answer__icon" />
                              <p className="answer__text">{concern.name}</p>
                            </div>
                          </label>
                          
                          <div className={`answer__info ${openInfo === concern.name ? 'show' : ''}`}>
                            <div className="answer__footer-wrapper">
                              <img src={concern.icon} alt="" className="answer__icon" />
                              <p className="answer__text">{concern.name}</p>
                            </div>
                            <p className="answer__info-text">{concern.description}</p>
                          </div>
                          
                          <button
                            className="answer__info-button"
                            onClick={() => toggleInfo(concern.name)}
                          >
                            <Info className="info-image-closed" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skin Type */}
                  <div className="question min-h-[60vh] flex flex-col justify-center" ref={skinTypeRef}>
                    <h1 className="question__header-text">
                      WHAT IS YOUR SKIN TYPE?
                    </h1>
                    <div className="answers">
                      {skinTypes.map((type) => (
                        <div key={type.name} className="answer-container">
                          <label className={`answer ${selectedSkinType === type.name ? 'selected gradient-border' : ''}`}>
                            <input
                              type="radio"
                              name="skinType"
                              className="answer__checkbox"
                              checked={selectedSkinType === type.name}
                              onChange={() => setSelectedSkinType(type.name)}
                            />
                            <img
                              src={type.image}
                              alt={type.name}
                              className="answer__image h-48 w-full object-cover"
                            />
                            <div className="answer__footer-wrapper">
                              <p className="answer__text">{type.name}</p>
                            </div>
                          </label>
                          
                          <div className={`answer__info ${openInfo === type.name ? 'show' : ''}`}>
                            <div className="answer__footer-wrapper">
                              <p className="answer__text">{type.name}</p>
                            </div>
                            <p className="answer__info-text">{type.description}</p>
                          </div>
                          
                          <button
                            className="answer__info-button"
                            onClick={() => toggleInfo(type.name)}
                          >
                            <Info className="info-image-closed" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Age Group */}
                  <div className="question min-h-[60vh] flex flex-col justify-center" ref={ageGroupRef}>
                    <h1 className="question__header-text">
                      WHAT IS YOUR AGE GROUP?
                    </h1>
                    <div className="answers">
                      {ageGroups.map((age) => (
                        <div key={age.name} className="answer-container">
                          <label className={`answer ${selectedAgeGroup === age.name ? 'selected gradient-border' : ''}`}>
                            <input
                              type="radio"
                              name="ageGroup"
                              className="answer__checkbox"
                              checked={selectedAgeGroup === age.name}
                              onChange={() => setSelectedAgeGroup(age.name)}
                            />
                            <img
                              src={age.image}
                              alt={age.name}
                              className="answer__image h-48 w-full object-cover"
                            />
                            <div className="answer__footer-wrapper">
                              <p className="answer__text">{age.name}</p>
                            </div>
                          </label>
                          
                          <div className={`answer__info ${openInfo === age.name ? 'show' : ''}`}>
                            <div className="answer__footer-wrapper">
                              <p className="answer__text">{age.name}</p>
                            </div>
                            <p className="answer__info-text">{age.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-6" ref={buttonsRef}>
                    <motion.button
                      onClick={handleBack}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Back
                    </motion.button>
                    <motion.button
                      onClick={handleNext}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={selectedConcerns.length !== 2 || !selectedSkinType || !selectedAgeGroup}
                    >
                      Continue to Photo
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Scan Step */}
              {currentStep === 'scan' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-primary-100 mx-auto mb-4 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-primary-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Ready to Scan Your Skin</h2>
                    <p className="text-gray-600 mb-6">
                      Let's capture a clear photo of your skin for analysis. 
                      Make sure you're in a well-lit area with your face clearly visible.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 mb-6">
                    <h3 className="font-semibold mb-4 text-left">Tips for Best Results:</h3>
                    <ul className="text-left space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 mt-2 mr-3 flex-shrink-0"></span>
                        Ensure good lighting - natural light works best
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 mt-2 mr-3 flex-shrink-0"></span>
                        Remove makeup and skincare products
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 mt-2 mr-3 flex-shrink-0"></span>
                        Keep your face steady and look directly at the camera
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-primary-600 mt-2 mr-3 flex-shrink-0"></span>
                        Avoid shadows and reflections on your face
                      </li>
                    </ul>
                  </div>

                  {capturedImage && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Captured Image:</h3>
                      <div className="relative inline-block">
                        <img
                          src={capturedImage}
                          alt="Captured skin"
                          className="w-48 h-48 object-cover border-2 border-gray-200"
                        />
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-6" ref={buttonsRef}>
                    <motion.button
                      onClick={handleBack}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </motion.button>
                    
                    <motion.button
                      onClick={handleStartScan}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {capturedImage ? 'Retake Photo' : 'Start Camera'}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Results Step */}
              {currentStep === 'results' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Analysis Complete!</h2>
                    <p className="text-gray-600 mb-6">
                      We've analyzed your skin and prepared personalized recommendations.
                    </p>
                  </div>

                  {capturedImage && (
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Your Skin Analysis:</h3>
                      <div className="flex justify-center mb-4">
                        <img
                          src={capturedImage}
                          alt="Analyzed skin"
                          className="w-32 h-32 object-cover border-2 border-gray-200"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-6 mb-6 text-left">
                    <h3 className="font-semibold mb-4">Your Profile:</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Skin Concerns:</span> {selectedConcerns.join(', ')}</p>
                      <p><span className="font-medium">Skin Type:</span> {selectedSkinType}</p>
                      <p><span className="font-medium">Age Group:</span> {selectedAgeGroup}</p>
                    </div>
                  </div>

                  <div className="bg-primary-50 p-6 mb-6">
                    <h3 className="font-semibold mb-3 text-primary-800">Recommended Products:</h3>
                    <div className="space-y-3 text-sm text-primary-700">
                      <div className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        <span>Gentle Cleanser for {selectedSkinType} skin</span>
                      </div>
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 mr-2" />
                        <span>Hydrating Serum for {selectedConcerns[0]?.toLowerCase()}</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        <span>Custom Skincare Routine</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <motion.button
                      onClick={handleBack}
                      className="btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </motion.button>
                    
                    <motion.button
                      onClick={onClose}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Get Recommendations
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              DermaSelf processes all data locally on your device. No personal information is collected or stored. 
              See our{' '}
              <a href="#" className="text-primary-600 hover:underline">
                Privacy Policy
              </a>
              {' '}for details.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}   