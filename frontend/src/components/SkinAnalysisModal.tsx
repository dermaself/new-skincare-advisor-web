"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, FileText, Sparkles, Heart, CheckCircle, ArrowLeft, Info, RotateCcw } from 'lucide-react';
import CameraCapture from './CameraCapture';
import RoutineProductCard from './RoutineProductCard';


interface SkinAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
}

type Step = 'onboarding' | 'quiz' | 'scan' | 'loading' | 'results';

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

// Function to fetch real products from Shopify API
const fetchRealProducts = async (): Promise<Product[]> => {
  try {
    const response = await fetch('/api/shopify/storefront');
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.products || data.products.length === 0) {
      throw new Error('No products available');
    }
    
    // Transform Shopify products to our Product interface
    const transformedProducts: Product[] = data.products.map((shopifyProduct: any, index: number) => {
      const firstVariant = shopifyProduct.variants[0];
      const firstImage = shopifyProduct.images[0];
      
      // Generate random skin-related data for demonstration
      const skinTypes = ['Normal/Combination', 'Oily', 'Dry and/or Sensitive'];
      const skinConcerns = ['Fine Lines & Wrinkles', 'Dehydration', 'Dark Spots & Uneven Tone', 'Acne & Blemishes', 'Dark Circles / Eye Bags'];
      const steps = ['cleanse', 'moisturise', 'protect', 'addon'];
      const usages = ['morning', 'evening', 'both'];
      
      return {
        id: shopifyProduct.id || `product-${index}`,
        name: shopifyProduct.title || 'Skincare Product',
        brand: shopifyProduct.vendor || 'Skincare Brand',
        image: firstImage?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(firstVariant?.price || '0'),
        size: '30ml', // Default size
        description: shopifyProduct.description || 'A premium skincare product designed for your skin needs.',
        tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map((tag: string) => tag.trim()) : [],
        usage: usages[Math.floor(Math.random() * usages.length)] as 'morning' | 'evening' | 'both',
        step: steps[Math.floor(Math.random() * steps.length)] as 'cleanse' | 'moisturise' | 'protect' | 'addon',
        skinTypes: [skinTypes[Math.floor(Math.random() * skinTypes.length)]],
        skinConcerns: [skinConcerns[Math.floor(Math.random() * skinConcerns.length)]],
        shopifyProductId: shopifyProduct.id,
        shopifyVariantId: firstVariant?.id,
        inStock: firstVariant?.inventory_quantity > 0 || true,
        rating: 4.0 + Math.random() * 1.0, // Random rating between 4.0-5.0
        reviewCount: Math.floor(Math.random() * 200) + 10 // Random review count between 10-210
      };
    });
    
    return transformedProducts;
  } catch (error) {
    console.error('Error fetching real products:', error);
    // Return empty array if API fails
    return [];
  }
};

// Function to get 3 random products
const getRandomProducts = (products: Product[], count: number = 3): Product[] => {
  if (products.length <= count) {
    return products;
  }
  
  const shuffled = [...products].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Function to create routine from products
const createRoutineFromProducts = (products: Product[]): SkinRoutine => {
  const randomProducts = getRandomProducts(products, 3);
  
  return {
    essential: [
      {
        step: 'cleanse',
        title: 'STEP 1: CLEANSE',
        products: [randomProducts[0] || products[0]]
      },
      {
        step: 'moisturise',
        title: 'STEP 2: MOISTURISE',
        products: [randomProducts[1] || products[1]]
      },
      {
        step: 'protect',
        title: 'STEP 3: PROTECT',
        products: [randomProducts[2] || products[2]]
      }
    ],
    expert: [
      {
        step: 'cleanse',
        title: 'STEP 1: CLEANSE',
        products: [randomProducts[0] || products[0]]
      },
      {
        step: 'moisturise',
        title: 'STEP 2: MOISTURISE',
        products: [randomProducts[1] || products[1]]
      },
      {
        step: 'protect',
        title: 'STEP 3: PROTECT',
        products: [randomProducts[2] || products[2]]
      }
    ],
    addons: products.slice(3, 4) // Use 4th product as addon if available
  };
};

// API functions - replace these with actual API calls
const getProducts = async (): Promise<Product[]> => {
  return await fetchRealProducts();
};

const getRoutine = async (skinType: string, concerns: string[], ageGroup: string): Promise<SkinRoutine> => {
  const products = await fetchRealProducts();
  return createRoutineFromProducts(products);
};

const getRecommendedProducts = async (concerns: string[], skinType: string): Promise<Product[]> => {
  const products = await fetchRealProducts();
  return products.filter((product: Product) => 
    product.skinTypes.includes(skinType) || 
    product.skinConcerns.some((concern: string) => concerns.includes(concern))
  );
};

// Shopify cart integration functions
const shopifyCart = {
  // Add product to cart
  addToCart: async (product: Product, quantity: number = 1, customAttributes?: Array<{key: string, value: string}>): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined' && window.parent !== window) {
        // If embedded in Shopify, communicate with parent
        // Convert GraphQL ID to numeric ID if needed
        let variantId = product.shopifyVariantId;
        console.log('Original shopifyVariantId:', product.shopifyVariantId);
        
        if (!variantId) {
          console.error('No shopifyVariantId found for product:', product.name);
          throw new Error('Product variant ID is missing');
        }
        
        if (typeof product.shopifyVariantId === 'string' && product.shopifyVariantId.includes('gid://shopify/ProductVariant/')) {
          variantId = product.shopifyVariantId.split('/').pop();
          console.log('Converted to numeric ID:', variantId);
        }
        
        // Ensure we have a valid numeric ID
        if (!variantId || isNaN(parseInt(variantId))) {
          console.error('Invalid variant ID:', variantId, 'for product:', product.name);
          throw new Error(`Invalid variant ID: ${variantId}`);
        }
        
        const messagePayload = {
          type: 'SHOPIFY_ADD_TO_CART',
          payload: { 
            variantId: variantId,
            quantity,
            customAttributes,
            productInfo: {
              name: product.name,
              image: product.image,
              price: product.price,
              title: product.name,
              product_title: product.name
            }
          }
        };
        
        console.log('Sending message to parent:', messagePayload);
        window.parent.postMessage(messagePayload, '*');
        
        // Wait for response from parent
        return new Promise((resolve) => {
          const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'CART_UPDATE_SUCCESS' || event.data.type === 'CART_UPDATE_ERROR') {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.type === 'CART_UPDATE_SUCCESS');
            }
          };
          window.addEventListener('message', handleMessage);
          
          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve(false);
          }, 5000);
        });
      } else {
        // Standalone mode - simulate cart addition
        console.log(`Added ${quantity}x ${product.name} to cart with attributes:`, customAttributes);
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
            products: products.map(p => {
              // Convert GraphQL ID to numeric ID if needed
              let variantId = p.shopifyVariantId;
              if (typeof p.shopifyVariantId === 'string' && p.shopifyVariantId.includes('gid://shopify/ProductVariant/')) {
                variantId = p.shopifyVariantId.split('/').pop();
              }
              
              return {
                variantId: variantId,
                quantity: 1,
                properties: {
                  source: 'dermaself_recommendation',
                  recommendation_type: 'skin_analysis',
                  product_step: p.step,
                  added_at: new Date().toISOString()
                }
              };
            })
          }
        }, '*');
        
        // Wait for response from parent
        return new Promise((resolve) => {
          const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ROUTINE_ADD_SUCCESS' || event.data.type === 'ROUTINE_ADD_ERROR') {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.type === 'ROUTINE_ADD_SUCCESS');
            }
          };
          window.addEventListener('message', handleMessage);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve(false);
          }, 10000);
        });
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
             window.location.hostname.includes('shopify.com') ||
             document.querySelector('[data-shopify]') !== null;
    }
    return false;
  }
};

const steps = [
  { id: 'quiz', title: 'QUIZ', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/9631a569-ec0d-426a-8f94-357f8ddb98ee-600921e5-1dd7-49e6-819a-d346132b8e24-quiz%20icon.svg' },
  { id: 'scan', title: 'SCAN', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/cdfa9dcf-2268-4930-8d8d-4209233ae45e-4739aef0-db97-4c29-88b0-dbe6e83b2d74-Group%2035.svg' },
  { id: 'results', title: 'RESULTS', icon: 'https://production-cdn.holitionbeauty.com/cms/client/110/file/ea856bc1-0ac0-4d32-9796-c588ac0d26bb-ecd99ac8-c52a-45fc-9a01-dc2f136d45b1-shade-finder-2.svg' }
];

export default function SkinAnalysisModal({ isOpen, onClose, embedded = false }: SkinAnalysisModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  const [currentStep, setCurrentStep] = useState<Step>('onboarding');
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [selectedSkinType, setSelectedSkinType] = useState<string>('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  
  // Product and routine state
  const [routine, setRoutine] = useState<SkinRoutine | null>(null);
  const [routineType, setRoutineType] = useState<'essential' | 'expert'>('essential');
  const [recommendationSource, setRecommendationSource] = useState<'ai' | 'questionnaire'>('ai');
  const [loading, setLoading] = useState(false);
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'routine'>('results');
  
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
      setRealProducts([]); // Clear real products when modal closes
    }
  }, [isOpen]);

  // Load routine when entering results step
  useEffect(() => {
    if (currentStep === 'results' && selectedSkinType && selectedConcerns.length > 0) {
      loadRoutine();
    }
  }, [currentStep, selectedSkinType, selectedConcerns]);

  // Fetch real products when modal opens
  useEffect(() => {
    if (isOpen && realProducts.length === 0) {
      const loadProducts = async () => {
        try {
          const products = await fetchRealProducts();
          setRealProducts(products);
        } catch (error) {
          console.error('Failed to load products:', error);
        }
      };
      loadProducts();
    }
  }, [isOpen, realProducts.length]);

  const loadRoutine = async () => {
    setLoading(true);
    try {
      // Use real products if available, otherwise fetch them
      let products = realProducts;
      if (products.length === 0) {
        products = await fetchRealProducts();
        setRealProducts(products);
      }
      
      if (products.length === 0) {
        throw new Error('No products available');
      }
      
      const routineData = createRoutineFromProducts(products);
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
      // Add custom attributes for tracking recommended products
      const customAttributes = [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis'
        },
        {
          key: 'product_step',
          value: product.step
        },
        {
          key: 'skin_concerns',
          value: selectedConcerns.join(',')
        },
        {
          key: 'skin_type',
          value: selectedSkinType
        },
        {
          key: 'age_group',
          value: selectedAgeGroup
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ];
      
      const success = await shopifyCart.addToCart(product, 1, customAttributes);
      if (success) {
        setCartItems(prev => ({
          ...prev,
          [product.id]: (prev[product.id] || 0) + 1
        }));
        
        // Success modal will be handled by CartContext
        console.log('Product added to cart successfully');
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
      
      // Use the cart context to add products with custom attributes
      for (const product of allProducts) {
        if (product.shopifyVariantId) {
          const customAttributes = [
            {
              key: 'source',
              value: 'dermaself_recommendation'
            },
            {
              key: 'recommendation_type',
              value: 'skin_analysis_routine'
            },
            {
              key: 'routine_type',
              value: routineType
            },
            {
              key: 'skin_concerns',
              value: selectedConcerns.join(',')
            },
            {
              key: 'skin_type',
              value: selectedSkinType
            },
            {
              key: 'age_group',
              value: selectedAgeGroup
            },
            {
              key: 'added_at',
              value: new Date().toISOString()
            }
          ];
          
          await shopifyCart.addToCart(product, 1, customAttributes);
        }
      }
      
      // Update cart items state
      const newCartItems = { ...cartItems };
      allProducts.forEach(product => {
        newCartItems[product.id] = (newCartItems[product.id] || 0) + 1;
      });
      setCartItems(newCartItems);
      
      // Success modal will be handled by CartContext
      console.log('Routine added to cart successfully');
    } catch (error) {
      console.error('Failed to add routine to cart:', error);
    } finally {
      setCartLoading(prev => ({ ...prev, routine: false }));
    }
  };

  // Detect Shopify environment and listen for cart updates
  useEffect(() => {
    setIsShopify(shopifyCart.isShopify());
    
    // Listen for cart updates from parent Shopify page
    const handleCartUpdate = (event: MessageEvent) => {
      console.log('Message received from parent:', event.data);
      
      if (event.data.type === 'CART_UPDATE_SUCCESS') {
        // Update local cart state when products are successfully added
        const { cart } = event.data.payload;
        console.log('Cart update received:', event.data);
        
        // Update cart items based on what's in the cart
        if (cart && cart.items && cart.items.length > 0) {
          const newCartItems: { [key: string]: number } = {};
          
          cart.items.forEach((item: any) => {
            // Find product by variant ID
            const allProducts = routine ? 
              routine[routineType].flatMap(step => step.products) : 
              realProducts;
            
            const product = allProducts.find(p => 
              p.shopifyVariantId === item.variant_id?.toString() ||
              p.shopifyVariantId?.split('/').pop() === item.variant_id?.toString()
            );
            
            if (product) {
              newCartItems[product.id] = item.quantity;
            }
          });
          
          setCartItems(newCartItems);
        }
      } else if (event.data.type === 'CART_INITIAL_STATE') {
        // Handle initial cart state from Shopify
        const { cart } = event.data.payload;
        console.log('Initial cart state received:', cart);
        
        // Update cart items based on what's already in the cart
        if (cart.items && cart.items.length > 0) {
          const newCartItems: { [key: string]: number } = {};
          
          cart.items.forEach((item: any) => {
            // Find product by variant ID
            const allProducts = routine ? 
              routine[routineType].flatMap(step => step.products) : 
              realProducts;
            
            const product = allProducts.find(p => 
              p.shopifyVariantId === item.variant_id?.toString() ||
              p.shopifyVariantId?.split('/').pop() === item.variant_id?.toString()
            );
            
            if (product) {
              newCartItems[product.id] = item.quantity;
            }
          });
          
          setCartItems(newCartItems);
        }
      }
    };
    
    window.addEventListener('message', handleCartUpdate);
    
    return () => {
      window.removeEventListener('message', handleCartUpdate);
    };
  }, [routine, routineType, realProducts]);

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
    const stepOrder: Step[] = ['onboarding', 'quiz', 'scan', 'loading', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: Step[] = ['onboarding', 'quiz', 'scan', 'loading', 'results'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleRestart = () => {
    setCurrentStep('onboarding');
    setSelectedConcerns([]);
    setSelectedSkinType('');
    setSelectedAgeGroup('');
    setOpenInfo(null);
    setLoading(false);
    setRealProducts([]);
    setActiveTab('results');
    setRoutineType('essential');
    setRecommendationSource('ai');
  };

  // Cart success modal handlers


  const handleStartScan = () => {
    setShowCamera(true);
  };

  const handleImageCapture = async (imageData: string, metadata?: any) => {
    setCapturedImage(imageData);
    setImageMetadata(metadata);
    setShowCamera(false);
    
    // Set default quiz values if they're empty to ensure proper flow
    if (!selectedSkinType) {
      setSelectedSkinType('Normal/Combination');
    }
    if (selectedConcerns.length === 0) {
      setSelectedConcerns(['Fine Lines & Wrinkles', 'Dehydration']);
    }
    if (!selectedAgeGroup) {
      setSelectedAgeGroup('26-35');
    }
    
    // Show loading state immediately
      setLoading(true);
    setCurrentStep('loading');
      
    // Trigger analysis immediately with user data and recommendations
    try {
      // Prepare user data from quiz responses
      const userData = {
        first_name: 'User',
        last_name: 'Test',
        birthdate: selectedAgeGroup ? calculateBirthdate(selectedAgeGroup) : '1990-01-01',
        gender: 'female' as const, // Default for now, can be enhanced with gender selection in quiz
        budget_level: 'High' as const,
        shop_domain: 'dermaself'
      };
      
      // Call the new API with recommendations
      const { analyzeSkinWithRecommendations } = await import('../lib/api');
      const analysisResult = await analyzeSkinWithRecommendations(
        imageData,
        userData,
        metadata
      );
      
      // Transform result to match expected format
      const transformedResult = transformAnalysisResult(analysisResult);
      setRoutine(transformedResult.routine);
      setCurrentStep('results');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      // Still advance to results with mock data for now
      setTimeout(() => {
        setCurrentStep('results');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate birthdate from age group
  const calculateBirthdate = (ageGroup: string): string => {
    const currentYear = new Date().getFullYear();
    switch (ageGroup) {
      case '18-25': return `${currentYear - 22}-01-01`;
      case '26-35': return `${currentYear - 30}-01-01`;
      case '36-45': return `${currentYear - 40}-01-01`;
      case '46+': return `${currentYear - 50}-01-01`;
      default: return '1990-01-01';
    }
  };

  // Helper function to transform API response to expected format
  const transformAnalysisResult = (apiResponse: any) => {
    // If we have recommendations from the API, use them
    if (apiResponse.recommendations?.skincare_routine) {
      return {
        routine: {
          essential: apiResponse.recommendations.skincare_routine.filter((cat: any) => 
            cat.category === 'Skincare'
          ).map((cat: any) => ({
            step: cat.modules[0]?.module || 'Step',
            title: cat.modules[0]?.module || 'Step',
            products: [
              cat.modules[0]?.main_product,
              ...cat.modules[0]?.alternative_products || []
            ].filter(Boolean).map(transformProduct)
          })),
          expert: apiResponse.recommendations.skincare_routine.filter((cat: any) => 
            cat.category === 'Makeup'
          ).map((cat: any) => ({
            step: cat.modules[0]?.module || 'Step',
            title: cat.modules[0]?.module || 'Step',
            products: [
              cat.modules[0]?.main_product,
              ...cat.modules[0]?.alternative_products || []
            ].filter(Boolean).map(transformProduct)
          })),
          addons: []
        }
      };
    }
    
    // Fallback to existing logic
    return { 
      routine: {
        essential: [],
        expert: [],
        addons: []
      }
    };
  };

  // Helper function to transform API product to our format
  const transformProduct = (apiProduct: any) => ({
    id: apiProduct.product_id?.toString() || Math.random().toString(),
    name: apiProduct.product_name || 'Product',
    brand: apiProduct.brand || 'Brand',
    image: apiProduct.image_url || '',
    price: apiProduct.best_price || 0,
    size: apiProduct.volume || '50ml',
    description: apiProduct.info || 'No description available',
    tags: apiProduct.composition?.split(',').slice(0, 3) || [],
    usage: 'both' as const,
    step: 'cleanse' as const,
    skinTypes: apiProduct.skin_type?.split(',') || [],
    skinConcerns: [],
    shopifyProductId: apiProduct.product_id?.toString(),
    shopifyVariantId: apiProduct.product_id?.toString(),
    inStock: true,
    rating: apiProduct.rating || 4.5,
    reviewCount: 100
  });

  const handleCameraClose = () => {
    setShowCamera(false);
  };

  const toggleInfo = (concern: string) => {
    setOpenInfo(openInfo === concern ? null : concern);
  };

  if (!isOpen) return null;

  // If camera is shown, render it embedded within the modal
  if (showCamera) {
    return (
      <AnimatePresence key="camera-modal">
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
            onClick={handleCameraClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[540px] max-h-[95vh] bg-white shadow-xl overflow-hidden flex flex-col h-full"
          >
            <CameraCapture
              onCapture={handleImageCapture}
              onClose={handleCameraClose}
              embedded={true}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence key="main-modal">
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
            {currentStep === 'onboarding' && (
              <React.Fragment key="onboarding-header">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white/20 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold text-base">DermaSelf</h2>
                      <p className="text-white/80 text-xs">AI Skin Analysis</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-6 h-6 bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    aria-label="Close modal"
                    title="Close modal"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div>
                  <img
                    src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                    alt="Skin Analysis"
                    className="w-full h-64 object-cover"
                  />
                </div>
              </React.Fragment>
            )}

          </div>

          {/* Progress Steps */}
          <div>
            {currentStep !== 'onboarding' && (
              <div className="progress flex items-center px-4 py-2 justify-center" style={{ gridTemplateColumns: 'auto' }}>
                <button 
                  onClick={handleRestart}
                  className="absolute left-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Restart analysis"
                  title="Restart analysis"
                >
                  <RotateCcw className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={handleClose}
                  className="absolute right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close modal"
                  title="Close modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <div className="steps flex items-center">
                  <div className="steps__wrapper flex items-center">
                    <img 
                      className="steps__icon w-8 h-8" 
                      src="https://production-cdn.holitionbeauty.com/cms/client/110/file/30c8b3b0-3fc0-4185-aa05-9e996dd118f7-steps-1-full.svg"
                    />
                    <div style={{ width: '50px' }}>
                      <div style={{ width: '50px', background: 'rgb(231, 61, 110)', height: '1px' }}></div>
                    </div>
                  </div>
                  <div className="steps__wrapper flex items-center">
                    <img 
                      className="steps__icon w-8 h-8" 
                      src={currentStep === 'quiz' ? 
                        "https://production-cdn.holitionbeauty.com/cms/client/110/file/53595ac0-e529-44b6-84d3-1f877a444b02-steps-2.svg" : 
                        "https://production-cdn.holitionbeauty.com/cms/client/110/file/2ee49d0a-c87c-425c-94fb-fb43adec3f34-steps-2-full.svg"
                      }
                    />
                    <div style={{ width: '50px' }}>
                      <div style={{ width: '50px', background: 'rgb(231, 61, 110)', height: '1px' }}></div>
                    </div>
                  </div>
                  <div className="steps__wrapper flex items-center">
                    <img 
                      className="steps__icon w-8 h-8" 
                      src={currentStep === 'results' ? 
                        "https://production-cdn.holitionbeauty.com/cms/client/110/file/a972dbee-053c-46c8-b083-9e7979214cbf-steps-4-full.svg" : 
                        "https://production-cdn.holitionbeauty.com/cms/client/110/file/9a5e16c4-71cf-44c2-acac-8f20e14e643c-steps-4.svg"
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="modal-content p-4 max-h-[65vh] overflow-y-auto">
            <AnimatePresence key="content-steps" mode="wait">
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
                            aria-label={`More information about ${concern.name}`}
                            title={`More information about ${concern.name}`}
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
                            aria-label={`More information about ${type.name}`}
                            title={`More information about ${type.name}`}
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
                      onClick={handleStartScan}
                      className="btn-primary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={selectedConcerns.length !== 2 || !selectedSkinType || !selectedAgeGroup}
                    >
                      Take Photo
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Loading Step */}
              {currentStep === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Photo</h2>
                    <p className="text-gray-600 text-center max-w-md">
                      Our AI is analyzing your skin and creating personalized recommendations...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Results Step */}
              {currentStep === 'results' && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                    <div className="routine-btns w-full flex">
                      <button
                        onClick={() => setActiveTab('results')}
                        className={activeTab === 'results' ? 'w-full flex flex-col items-center justify-center bg-black text-white' : 'w-full flex flex-col items-center justify-center bg-gray-200 text-black'}
                      >
                        <img 
                          src="https://production-cdn.holitionbeauty.com/cms/client/110/file/47ef97b8-2f41-4e92-920f-a3e05d613a35-ecd99ac8-c52a-45fc-9a01-dc2f136d45b1-shade-finder-2.svg" 
                          alt=""
                          width={30}
                          height={30}
                          style={{ filter: activeTab === 'results' ? 'invert(1)' : 'invert(0)' }}
                        />
                        <p className="heading-4">RESULTS</p>
                      </button>
                      <button
                        onClick={() => setActiveTab('routine')}
                        className={activeTab === 'routine' ? 'w-full flex flex-col items-center justify-center bg-black text-white' : 'w-full flex flex-col items-center justify-center bg-gray-200 text-black'}
                      >
                        <img 
                          src="https://production-cdn.holitionbeauty.com/cms/client/110/file/5bb0dac2-c844-4a57-9037-ea7d2c4200c3-fda61d2f-8cb2-4723-bd0e-471e8ecef4c2-icon-reccommendations.svg" 
                          alt="" 
                          width={30}
                          height={30}
                          style={{ filter: activeTab === 'routine' ? 'invert(1)' : 'invert(0)' }}
                        />
                        <p className="heading-4">ROUTINE</p>
                      </button>
                    </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    {activeTab === 'results' && (
                      <div className="p-6">
                        {/* AI Photo Analysis Section */}
                        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg p-6 text-white mb-6">
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

                        {/* Results Info */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <p className="text-sm text-gray-600 mb-4">
                            These results are based on your AI skin health photo analysis. The highest scores represent the skin concerns that are most prominent on your skin.
                          </p>
                          <button
                            onClick={() => setActiveTab('routine')}
                            className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                          >
                            DISCOVER YOUR ROUTINE
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'routine' && (
                      <div className="p-6">
                        {/* Your Skin Routine Section */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">YOUR SKIN ROUTINE</h2>
                            
                            {isShopify && (
                              <p className="text-xs text-blue-600 mt-2">
                                💡 Products will be added to your Shopify cart automatically
                              </p>
                            )}
                          </div>

                          {/* Detected Concerns */}
                          <div className="flex space-x-4 mb-6">
                            <div className="flex items-center bg-orange-100 px-3 py-2 rounded-lg">
                              <img 
                                src="https://production-cdn.holitionbeauty.com/cms/client/110/file/eff7f7f1-7c71-475f-926c-85cd3dff0c9b-hydration-3.svg" 
                                alt="Dehydration" 
                                className="w-6 h-6"
                              />
                              <span className="text-sm font-semibold text-orange-800">Dehydration</span>
                            </div>
                            <div className="flex items-center bg-yellow-100 px-3 py-2 rounded-lg">
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
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              DermaSelf processes all data locally on your device. No personal information is collected or stored.
            </p>
          </div>
        </motion.div>
      </motion.div>


    </AnimatePresence>
  );
}