"use client";
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { ASSETS } from '../../lib/assets';
import { fetchProductsByVariantIds, TransformedProduct } from '../../lib/shopify-product-fetcher';
import { useCart } from '../CartContext';

// Lazy load heavy components
const RoutineProductCard = lazy(() => import('../RoutineProductCard'));
const SkinAnalysisImage = lazy(() => import('../SkinAnalysisImage'));

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
  shopifyProductId?: string;
  shopifyVariantId?: string;
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

interface ResultsStepProps {
  analysisData: any;
  routine: SkinRoutine | null; // Keep for backward compatibility, but will be null
  routineType: 'essential' | 'expert';
  onRoutineTypeChange: (type: 'essential' | 'expert') => void;
  onRestart: () => void;
  capturedImage: string | null;
  activeTab: 'results' | 'routine';
  onTabChange: (tab: 'results' | 'routine') => void;
}

export default function ResultsStep({
  analysisData,
  routine,
  routineType,
  onRoutineTypeChange,
  onRestart,
  capturedImage,
  activeTab,
  onTabChange
}: ResultsStepProps) {
  // State for fresh product data
  const [routineSteps, setRoutineSteps] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // Cart functionality
  const { addToCart } = useCart();

  // Fetch products from Shopify and build routine steps
  useEffect(() => {
    const fetchRoutineProducts = async () => {
      if (!analysisData?.recommendations?.skincare_routine) {
        setRoutineSteps([]);
        return;
      }

      setIsLoadingProducts(true);
      
      try {
        // Collect all variant IDs from main and alternative products
        const allVariantIds: string[] = [];
        const productMapping: { [variantId: string]: { type: 'main' | 'alternative', categoryIndex: number, moduleIndex: number, productIndex?: number } } = {};

        console.log('=== RESULTS STEP - EXTRACTING VARIANT IDS ===');
        console.log('Raw skincare_routine:', analysisData.recommendations.skincare_routine);

        analysisData.recommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          console.log(`Category ${categoryIndex}:`, category.category);
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`Module ${moduleIndex}:`, module.module);
            console.log('Main product:', module.main_product);
            
            // Main product
            if (module.main_product?.shopify_product_id) {
              const variantId = module.main_product.shopify_product_id;
              console.log('Found main product variant ID:', variantId);
              allVariantIds.push(variantId);
              productMapping[variantId] = { type: 'main', categoryIndex, moduleIndex };
            } else {
              console.log('No shopify_product_id found for main product');
            }

            // Alternative products
            if (module.alternative_products) {
              console.log('Alternative products:', module.alternative_products);
              module.alternative_products.forEach((altProduct: any, productIndex: number) => {
                console.log(`Alternative product ${productIndex}:`, altProduct);
                if (altProduct.shopify_product_id) {
                  const variantId = altProduct.shopify_product_id;
                  console.log('Found alternative product variant ID:', variantId);
                  allVariantIds.push(variantId);
                  productMapping[variantId] = { type: 'alternative', categoryIndex, moduleIndex, productIndex };
                } else {
                  console.log(`No shopify_product_id found for alternative product ${productIndex}`);
                }
              });
            }
          });
        });

        console.log('All variant IDs collected:', allVariantIds);
        console.log('Product mapping:', productMapping);

        // Fetch all products from Shopify
        const shopifyProducts = await fetchProductsByVariantIds(allVariantIds);
        
        console.log('=== SHOPIFY PRODUCTS FETCHED ===');
        console.log('Number of products fetched:', shopifyProducts.length);
        console.log('Fetched products:', shopifyProducts);
        
        // Build routine steps with fetched products
        let globalStepNumber = 1;
        const steps: any[] = [];

        analysisData.recommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`\n=== PROCESSING MODULE ${moduleIndex} ===`);
            console.log('Module:', module.module);
            console.log('Main product variant ID:', module.main_product?.shopify_product_id);
            
            // Find main product
            const mainProductVariantId = module.main_product?.shopify_product_id;
            const mainProduct = mainProductVariantId 
              ? shopifyProducts.find(p => p.variants.some(v => v.id === mainProductVariantId))
              : null;

            console.log('Found main product:', mainProduct);
            if (mainProduct) {
              console.log('Main product images:', mainProduct.images);
            }

            // Find alternative products
            const alternativeProducts: TransformedProduct[] = [];
            if (module.alternative_products) {
              module.alternative_products.forEach((altProduct: any) => {
                if (altProduct.shopify_product_id) {
                  const altShopifyProduct = shopifyProducts.find(p => 
                    p.variants.some(v => v.id === altProduct.shopify_product_id)
                  );
                  if (altShopifyProduct) {
                    alternativeProducts.push(altShopifyProduct);
                  }
                }
              });
            }

            console.log('Alternative products found:', alternativeProducts.length);

            if (mainProduct) {
              const step = {
                stepNumber: globalStepNumber,
                stepTitle: `STEP ${globalStepNumber}: ${module.module?.toUpperCase() || 'SKINCARE STEP'}`,
                category: category.category, // Use category from JSON for section title
                mainProduct,
                alternativeProducts,
                allProducts: [mainProduct, ...alternativeProducts].filter(Boolean)
              };
              
              steps.push(step);
              globalStepNumber++;
              console.log('Step created successfully');
            } else {
              console.log('No main product found, skipping step');
            }
          });
        });

        setRoutineSteps(steps);
      } catch (error) {
        console.error('Failed to fetch routine products:', error);
        setRoutineSteps([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRoutineProducts();
  }, [analysisData?.recommendations]);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Tab Content */}
      <div className="flex-1 py-4">
        {activeTab === 'results' && (
          <div>
            {/* AI Photo Analysis Section */}
            <div className="mb-6">
              <div className="relative">
                <div className="text-center">
                  {/* Analysis Image */}
                  <div className="relative mb-4">
                    <Suspense fallback={
                      <div className="w-32 h-32 bg-gray-200 rounded-full animate-pulse"></div>
                    }>
                      <SkinAnalysisImage 
                        imageUrl={capturedImage || analysisData?.image_url || ''} 
                        analysisData={analysisData}
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="px-4">
            {/* Loading State */}
            {isLoadingProducts ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded mb-3 w-1/3"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Routine Steps */
              <div className="space-y-4">
                {routineSteps && routineSteps.length > 0 ? (
                  routineSteps.map((step, index) => (
                    <div key={step.stepNumber} className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{step.stepTitle}</h4>
                      <div className="space-y-3">
                        <Suspense fallback={
                          <div className="animate-pulse bg-gray-200 h-20 rounded-lg"></div>
                        }>
                          <RoutineProductCard
                            product={step.mainProduct as any}
                            stepNumber={step.stepNumber}
                            stepTitle={step.stepTitle}
                            categoryTitle={step.category}
                            isLastStep={index === routineSteps.length - 1}
                            showAddAllButton={index === routineSteps.length - 1}
                            onAddAllToCart={async () => {
                              // Add all main products to cart
                              for (const routineStep of routineSteps) {
                                if (routineStep.mainProduct && routineStep.mainProduct.variants[0]) {
                                  try {
                                    const variantId = `gid://shopify/ProductVariant/${routineStep.mainProduct.variants[0].id}`;
                                    const productInfo = {
                                      name: routineStep.mainProduct.title,
                                      image: routineStep.mainProduct.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
                                      price: parseFloat(routineStep.mainProduct.variants[0].price) * 100
                                    };
                                    
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
                                        value: routineStep.category.toLowerCase().replace(/\s+/g, '_')
                                      },
                                      {
                                        key: 'added_at',
                                        value: new Date().toISOString()
                                      }
                                    ];
                                    
                                    await addToCart(variantId, 1, customAttributes, productInfo);
                                  } catch (error) {
                                    console.error('Failed to add product to cart:', error);
                                  }
                                }
                              }
                            }}
                          />
                        </Suspense>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <p className="text-gray-500">No routine data available</p>
                    <p className="text-sm text-gray-400 mt-2">Please try the analysis again</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restart Button */}
      <div className="px-4 py-4 border-t border-gray-200">
        <motion.button
          onClick={onRestart}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start Over
        </motion.button>
      </div>
    </motion.div>
  );
}
