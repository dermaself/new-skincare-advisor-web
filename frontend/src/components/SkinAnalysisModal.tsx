"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, FileText, Sparkles, Heart, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import CameraCapture from './CameraCapture';
import RoutineProductCard from './RoutineProductCard';

interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'onboarding' | 'quiz' | 'scan' | 'results';

// Product data interfaces
interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: string;
  description: string;
  tags: string[];
  usage: 'morning' | 'evening' | 'both';
  step: 'cleanse' | 'moisturise' | 'protect' | 'addon';
  skinTypes: string[];
  skinConcerns: string[];
  shopifyProductId?: string; // Shopify product ID for cart integration
  shopifyVariantId?: string; // Shopify variant ID
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

interface RoutineStep {
  step: string;
  title: string;
  products: Product[];
}

interface SkinRoutine {
  essential: RoutineStep[];
  expert: RoutineStep[];
  addons: Product[];
}

// Mock product data - replace with API calls later
const mockProducts: Product[] = [
  {
    id: 'cleanse-001',
    name: 'Purifying Cleanser',
    brand: 'Brand 2',
    image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/7d1c1d06-d642-4552-ad1c-0b098cb4870b-product02_Cleanse_purple.png',
    price: 11,
    size: '20 ml',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis volutpat elit, in tincidunt enim volutpat a.',
    tags: ['Oily'],
    usage: 'both',
    step: 'cleanse',
    skinTypes: ['Oily', 'Normal/Combination'],
    skinConcerns: ['Acne & Blemishes', 'Dehydration'],
    shopifyProductId: 'gid://shopify/Product/123456789',
    shopifyVariantId: 'gid://shopify/ProductVariant/987654321',
    inStock: true,
    rating: 4.5,
    reviewCount: 127
  },
  {
    id: 'moisturise-001',
    name: 'Hydrating Moisturiser',
    brand: 'Brand 2',
    image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/7b0b10fa-0b88-483a-8fa3-1445a815edf1-product01_Moisturiser_blue3.jpg',
    price: 30,
    size: '20 ml',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis volutpat elit, in tincidunt enim volutpat a.',
    tags: ['Dehydration'],
    usage: 'morning',
    step: 'moisturise',
    skinTypes: ['Dry and/or Sensitive', 'Normal/Combination'],
    skinConcerns: ['Dehydration', 'Fine Lines & Wrinkles'],
    shopifyProductId: 'gid://shopify/Product/123456790',
    shopifyVariantId: 'gid://shopify/ProductVariant/987654322',
    inStock: true,
    rating: 4.8,
    reviewCount: 89
  },
  {
    id: 'protect-001',
    name: 'Calming Sunscreen SPF 50+',
    brand: 'Brand 3',
    image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/c9e4fb4f-4791-4fb3-94b2-e0b38af4887c-product07_protect_green.png',
    price: 13,
    size: '20 ml',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis volutpat elit, in tincidunt enim volutpat a.',
    tags: [],
    usage: 'morning',
    step: 'protect',
    skinTypes: ['Normal/Combination', 'Oily', 'Dry and/or Sensitive'],
    skinConcerns: ['Dark Spots & Uneven Tone', 'Fine Lines & Wrinkles'],
    shopifyProductId: 'gid://shopify/Product/123456791',
    shopifyVariantId: 'gid://shopify/ProductVariant/987654323',
    inStock: true,
    rating: 4.6,
    reviewCount: 203
  },
  {
    id: 'addon-001',
    name: 'Recovery Facial Oil',
    brand: 'Brand 1',
    image: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/454f8804-80eb-4014-9bca-e42ac54ce247-product09_FaceOil_green.png',
    price: 9,
    size: '20 ml',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis volutpat elit, in tincidunt enim volutpat a.',
    tags: ['Oily'],
    usage: 'evening',
    step: 'addon',
    skinTypes: ['Oily', 'Normal/Combination'],
    skinConcerns: ['Dehydration', 'Fine Lines & Wrinkles'],
    shopifyProductId: 'gid://shopify/Product/123456792',
    shopifyVariantId: 'gid://shopify/ProductVariant/987654324',
    inStock: true,
    rating: 4.3,
    reviewCount: 156
  }
];

// Mock routine data - replace with API calls later
const mockRoutine: SkinRoutine = {
  essential: [
    {
      step: 'cleanse',
      title: 'STEP 1: CLEANSE',
      products: [mockProducts[0]]
    },
    {
      step: 'moisturise',
      title: 'STEP 2: MOISTURISE',
      products: [mockProducts[1]]
    },
    {
      step: 'protect',
      title: 'STEP 3: PROTECT',
      products: [mockProducts[2]]
    }
  ],
  expert: [
    {
      step: 'cleanse',
      title: 'STEP 1: CLEANSE',
      products: [mockProducts[0]]
    },
    {
      step: 'moisturise',
      title: 'STEP 2: MOISTURISE',
      products: [mockProducts[1]]
    },
    {
      step: 'protect',
      title: 'STEP 3: PROTECT',
      products: [mockProducts[2]]
    }
  ],
  addons: [mockProducts[3]]
};

// API functions - replace these with actual API calls
const getProducts = async (): Promise<Product[]> => {
  // TODO: Replace with actual API call
  // return await fetch('/api/products').then(res => res.json());
  return mockProducts;
};

const getRoutine = async (skinType: string, concerns: string[], ageGroup: string): Promise<SkinRoutine> => {
  // TODO: Replace with actual API call
  // return await fetch('/api/routine', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ skinType, concerns, ageGroup })
  // }).then(res => res.json());
  return mockRoutine;
};

const getRecommendedProducts = async (concerns: string[], skinType: string): Promise<Product[]> => {
  // TODO: Replace with actual API call
  // return await fetch('/api/recommendations', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ concerns, skinType })
  // }).then(res => res.json());
  return mockProducts.filter(product => 
    product.skinTypes.includes(skinType) || 
    product.skinConcerns.some(concern => concerns.includes(concern))
  );
};

// Shopify cart integration functions
const shopifyCart = {
  // Add product to cart
  addToCart: async (product: Product, quantity: number = 1): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.parent !== window) {
        // If embedded in Shopify, communicate with parent
        window.parent.postMessage({
          type: 'SHOPIFY_ADD_TO_CART',
          payload: { 
            productId: product.shopifyProductId,
            variantId: product.shopifyVariantId,
            quantity 
          }
        }, '*');
        return true;
      } else {
        // Standalone mode - simulate cart addition
        console.log(`Added ${quantity}x ${product.name} to cart`);
        return true;
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    }
  },

  // Add multiple products to cart
  addRoutineToCart: async (products: Product[]): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.parent !== window) {
        // If embedded in Shopify, communicate with parent
        window.parent.postMessage({
          type: 'SHOPIFY_ADD_ROUTINE_TO_CART',
          payload: { 
            products: products.map(p => ({
              productId: p.shopifyProductId,
              variantId: p.shopifyVariantId,
              quantity: 1
            }))
          }
        }, '*');
        return true;
      } else {
        // Standalone mode - simulate cart addition
        console.log(`Added ${products.length} products to cart`);
        return true;
      }
    } catch (error) {
      console.error('Failed to add routine to cart:', error);
      return false;
    }
  },

  // Check if we're in Shopify environment
  isShopify: (): boolean => {
    if (typeof window !== 'undefined') {
      return window.parent !== window || 
             window.location.hostname.includes('myshopify.com') ||
             window.location.hostname.includes('shopify.com');
    }
    return false;
  }
};

const steps = [
  { id: 'quiz', title: 'QUIZ', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/9631a569-ec0d-426a-8f94-357f8ddb98ee-600921e5-1dd7-49e6-819a-d346132b8e24-quiz%20icon.svg' },
  { id: 'scan', title: 'SCAN', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/cdfa9dcf-2268-4930-8d8d-4209233ae45e-4739aef0-db97-4c29-88b0-dbe6e83b2d74-Group%2035.svg' },
  { id: 'results', title: 'RESULTS', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/ea856bc1-0ac0-4d32-9796-c588ac0d26bb-ecd99ac8-c52a-45fc-9a01-dc2f136d45b1-shade-finder-2.svg' }
];

export default function SkinAnalysisModal({ isOpen, onClose }: SkinAnalysisModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('onboarding');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  
  // Product and routine state
  const [routine, setRoutine] = useState<SkinRoutine | null>(null);
  const [routineType, setRoutineType] = useState<'essential' | 'expert'>('essential');
  const [recommendationSource, setRecommendationSource] = useState<'ai' | 'questionnaire'>('ai');
  const [loading, setLoading] = useState(false);
  
  // Cart state
  const [cartItems, setCartItems] = useState<{ [productId: string]: number }>({});
  const [cartLoading, setCartLoading] = useState<{ [productId: string]: boolean }>({});
  const [isShopify, setIsShopify] = useState(false);

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
      setRoutine(null);
      setRoutineType('essential');
      setRecommendationSource('ai');
    }
  }, [isOpen]);

  // Load routine when entering results step
  useEffect(() => {
    if (currentStep === 'results' && selectedSkinType && selectedConcerns.length > 0) {
      loadRoutine();
    }
  }, [currentStep, selectedSkinType, selectedConcerns]);

  const loadRoutine = async () => {
    setLoading(true);
    try {
      const routineData = await getRoutine(selectedSkinType, selectedConcerns, selectedAgeGroup);
      setRoutine(routineData);
    } catch (error) {
      console.error('Failed to load routine:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cart functions
  const handleAddToCart = async (product: Product) => {
    setCartLoading(prev => ({ ...prev, [product.id]: true }));
    try {
      const success = await shopifyCart.addToCart(product, 1);
      if (success) {
        setCartItems(prev => ({
          ...prev,
          [product.id]: (prev[product.id] || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setCartLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handleAddRoutineToCart = async () => {
    if (!routine) return;
    
    setCartLoading(prev => ({ ...prev, routine: true }));
    try {
      const allProducts = routine[routineType].flatMap(step => step.products);
      const success = await shopifyCart.addRoutineToCart(allProducts);
      if (success) {
        // Add all products to cart state
        const newCartItems = { ...cartItems };
        allProducts.forEach(product => {
          newCartItems[product.id] = (newCartItems[product.id] || 0) + 1;
        });
        setCartItems(newCartItems);
      }
    } catch (error) {
      console.error('Failed to add routine to cart:', error);
    } finally {
      setCartLoading(prev => ({ ...prev, routine: false }));
    }
  };

  // Detect Shopify environment
  useEffect(() => {
    setIsShopify(shopifyCart.isShopify());
  }, []);

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
      setSelectedConcerns(selectedConcerns.filter((c: string) => c !== concern));
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
          <div className="relative bg-primary-600">
            <div className="flex items-center justify-between px-6 py-2">
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
            {currentStep === 'onboarding' && (
              <div>
                <img
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                  alt="Skin Analysis"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
            {/* Progress Steps */}
            <div>
              {currentStep !== 'onboarding' && (
                 <div className="mt-6 flex items-center justify-around space-x-4 pb-4 px-6">
                  <div key={steps[0].id} className="flex flex-col items-center">
                    <div className="flex flex-col items-center">
                        <div
                          className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900 ${currentStep === steps[0].id ? 'bg-white' : 'bg-white/50'}`}
                        >
                          <img src={steps[0].icon} alt={steps[0].title} className="w-12 h-12" />
                        </div>
                      </div>
                  </div>
                  <div className="w-12 h-0.5 mx-2 transition-all duration-200 bg-gray-900" />
                  <div key={steps[1].id} className="flex flex-col items-center">
                    <div className="flex flex-col items-center">
                        <div
                          className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900 ${currentStep === steps[1].id ? 'bg-white' : 'bg-white/50'}`}
                        >
                          <img src={steps[1].icon} alt={steps[1].title} className="w-12 h-12" />
                        </div>
                      </div>
                  </div>
                  <div className="w-12 h-0.5 mx-2 transition-all duration-200 bg-gray-900" />
                  <div key={steps[2].id} className="flex flex-col items-center">
                    <div className="flex flex-col items-center">
                        <div
                          className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900 ${currentStep === steps[2].id ? 'bg-white' : 'bg-white/50'}`}
                        >
                          <img src={steps[2].icon} alt={steps[2].title} className="w-12 h-12" />
                        </div>
                      </div>
                  </div>
                </div>
              )}
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Get Your Virtual Skincare Consultation
                  </h3>
                  
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Complete a short assessment, take a photo, and receive personalized 
                    skincare recommendations powered by AI technology.
                  </p>

                  <div className="mt-6 flex items-center justify-around space-x-4">
                    <div key={steps[0].id} className="flex flex-col items-center">
                      <div className="flex flex-col items-center">
                          <div
                            className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900`}
                          >
                            <img src={steps[0].icon} alt={steps[0].title} className="w-12 h-12" />
                          </div>
                          <p className="text-xs text-gray-900 mt-1 font-medium">{steps[0].title}</p>
                        </div>
                    </div>
                    <div className="w-12 h-0.5 mx-2 transition-all duration-200 bg-gray-900" />
                    <div key={steps[1].id} className="flex flex-col items-center">
                      <div className="flex flex-col items-center">
                          <div
                            className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900`}
                          >
                            <img src={steps[1].icon} alt={steps[1].title} className="w-12 h-12" />
                          </div>
                          <p className="text-xs text-gray-900 mt-1 font-medium">{steps[1].title}</p>
                        </div>
                    </div>
                    <div className="w-12 h-0.5 mx-2 transition-all duration-200 bg-gray-900" />
                    <div key={steps[2].id} className="flex flex-col items-center">
                      <div className="flex flex-col items-center">
                          <div
                            className={`w-16 h-16 flex items-center justify-center text-sm font-semibold transition-all duration text-gray-900`}
                          >
                            <img src={steps[2].icon} alt={steps[2].title} className="w-12 h-12" />
                          </div>
                          <p className="text-xs text-gray-900 mt-1 font-medium">{steps[2].title}</p>
                        </div>
                    </div>
                  </div>

                  <motion.button
                    onClick={handleNext}
                    className="btn-primary mt-6 mx-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ACCEPT TO START
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
                      className="btn-secondary flex items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </motion.button>
                    
                    <motion.button
                      onClick={handleStartScan}
                      className="btn-primary flex items-center"
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
                  className="space-y-6"
                >
                  {/* AI Photo Analysis Section */}
                  <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg p-6 text-white">
                    <h2 className="text-xl font-bold mb-4 text-center">AI PHOTO ANALYSIS</h2>
                    
                    {/* Radar Chart Placeholder */}
                    <div className="relative w-64 h-64 mx-auto mb-4">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-white/30 rounded-full flex items-center justify-center">
                          <div className="w-32 h-32 border-2 border-white/50 rounded-full flex items-center justify-center">
                            <div className="w-16 h-16 border-2 border-white/70 rounded-full flex items-center justify-center">
                              <div className="w-8 h-8 bg-white/20 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Priority Indicator */}
                      <div className="absolute top-0 right-0 bg-yellow-400 text-primary-800 px-2 py-1 rounded-full text-xs font-bold">
                        {selectedConcerns[0] || 'Dehydration'} - Your Priority
                      </div>
                      
                      {/* Concern Labels */}
                      <div className="absolute top-1/4 right-0 text-xs font-semibold">Dehydration</div>
                      <div className="absolute bottom-1/4 right-0 text-xs font-semibold">Acne & Blemishes</div>
                      <div className="absolute bottom-1/4 left-0 text-xs font-semibold text-right">Dark Spots &<br/>Uneven Tone</div>
                      <div className="absolute top-1/4 left-0 text-xs font-semibold text-right">Dark Circles</div>
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-center">Fine Lines &<br/>Wrinkles</div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-center">Eye Bags</div>
                    </div>
                  </div>

                  {/* Your Skin Routine Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">YOUR SKIN ROUTINE</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Based on your selected skin concerns and the AI skin health photo analysis, we have personalized your skin routine.
                        </p>
                        {isShopify && (
                          <p className="text-xs text-blue-600 mt-2">
                            💡 Products will be added to your Shopify cart automatically
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Routine Type Buttons */}
                    <div className="routine-btns flex space-x-2 mb-6">
                      <button 
                        className={`flex-1 ${routineType === 'essential' ? 'active-btn' : 'inactive-btn'}`}
                        onClick={() => setRoutineType('essential')}
                      >
                        ESSENTIAL ROUTINE
                      </button>
                      <button 
                        className={`flex-1 ${routineType === 'expert' ? 'active-btn' : 'inactive-btn'}`}
                        onClick={() => setRoutineType('expert')}
                      >
                        EXPERT ROUTINE
                      </button>
                    </div>

                                         {/* Recommendation Source */}
                     <div className="mb-6">
                       <p className="text-sm text-gray-600 mb-2">Your Skin Recommendation By:</p>
                       <div className="flex space-x-4">
                         <label className="flex items-center">
                           <input 
                             type="radio" 
                             name="recommendation" 
                             value="ai" 
                             checked={recommendationSource === 'ai'}
                             onChange={() => setRecommendationSource('ai')}
                             className="mr-2" 
                           />
                           <span className="text-sm">AI Photo Analysis</span>
                         </label>
                         <label className="flex items-center">
                           <input 
                             type="radio" 
                             name="recommendation" 
                             value="questionnaire" 
                             checked={recommendationSource === 'questionnaire'}
                             onChange={() => setRecommendationSource('questionnaire')}
                             className="mr-2" 
                           />
                           <span className="text-sm">Selected Concerns</span>
                         </label>
                       </div>
                     </div>

                    {/* Detected Concerns */}
                    <div className="flex space-x-4 mb-6">
                      <div className="flex items-center space-x-2 bg-orange-100 px-3 py-2 rounded-lg">
                        <img 
                          src="https://production-cdn.holitionbeauty.com/cms/client/110/file/eff7f7f1-7c71-475f-926c-85cd3dff0c9b-hydration-3.svg" 
                          alt="Dehydration" 
                          className="w-6 h-6"
                        />
                        <span className="text-sm font-semibold text-orange-800">Dehydration</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-2 rounded-lg">
                        <img 
                          src="https://production-cdn.holitionbeauty.com/cms/client/110/file/1dc95b48-dbc7-4fdb-a4be-ef0dca1beec9-spot-3.svg" 
                          alt="Dark Circles" 
                          className="w-6 h-6"
                        />
                        <span className="text-sm font-semibold text-yellow-800">Dark Circles</span>
                      </div>
                    </div>

                    {/* Routine Steps */}
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <span className="ml-2 text-gray-600">Loading your routine...</span>
                      </div>
                    ) : routine ? (
                      <div className="space-y-4">
                        {routine[routineType].map((step, index) => (
                          <RoutineProductCard
                            key={step.step}
                            product={{
                              id: parseInt(step.products[0].id) || 1,
                              title: step.products[0].name,
                              vendor: step.products[0].brand,
                              product_type: 'skincare',
                              tags: step.products[0].tags.join(', '),
                              variants: [{
                                id: step.products[0].shopifyVariantId?.split('/').pop() || '1',
                                title: 'Default',
                                price: step.products[0].price.toString(),
                                inventory_quantity: step.products[0].inStock ? 10 : 0
                              }],
                              images: [{
                                id: 1,
                                src: step.products[0].image,
                                alt: step.products[0].name
                              }],
                              body_html: step.products[0].description,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            }}
                            stepNumber={index + 1}
                            stepTitle={step.title.split(': ')[1] || step.title}
                            isLastStep={index === routine[routineType].length - 1}
                            showAddAllButton={index === routine[routineType].length - 1}
                            onAddAllToCart={handleAddRoutineToCart}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No routine available. Please try again.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-6">
                    <motion.button
                      onClick={handleBack}
                      className="btn-secondary flex items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </motion.button>
                    
                    <motion.button
                      onClick={onClose}
                      className="btn-primary flex items-center"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete
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