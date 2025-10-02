"use client";
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sun, Moon, CalendarDays, Palette } from 'lucide-react';
import { ASSETS } from '../../lib/assets';
import { fetchProductsByVariantIds, TransformedProduct } from '../../lib/shopify-product-fetcher';
import { useCart } from '../CartContext';
import { loadModuleOrderConfig, reorderRoutineSteps, findBestModuleMatch } from '../../lib/moduleOrderConfig';
import { translateModuleName } from '../../lib/moduleTranslations';

// Import components
import RoutineProductCard from '../RoutineProductCard';
import SkinAnalysisImage from '../SkinAnalysisImage';
const SpideringChart = lazy(() => import('../SpideringChart'));

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
  const [moduleOrderConfig, setModuleOrderConfig] = useState<any>(null);
  // UI state: expanded alternatives per step
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  // UI state: category selector (skincare subcategories + makeup)
  const [selectedCategory, setSelectedCategory] = useState<'skincare_morning' | 'skincare_evening' | 'skincare_weekly' | 'makeup'>('skincare_morning');
  const toggleAlternatives = (key: string) => {
    setExpandedAlternatives(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  // Cart functionality
  const { addToCart } = useCart();

  // Load module order configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await loadModuleOrderConfig();
        setModuleOrderConfig(config);
        console.log('📋 Module order configuration loaded:', config);
      } catch (error) {
        console.error('Failed to load module order config:', error);
        setModuleOrderConfig(null);
      }
    };
    
    loadConfig();
  }, []);

  // Fetch products from Shopify and build routine steps
  useEffect(() => {
    const fetchRoutineProducts = async () => {
      // Wait until config is loaded to avoid fallback build
      if (!moduleOrderConfig) {
        return;
      }
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
        // Build fast lookup map by variant id (string form)
        const variantIdToProduct = new Map<string, TransformedProduct>();
        for (const p of shopifyProducts) {
          for (const v of p.variants) {
            variantIdToProduct.set(v.id.toString(), p);
          }
        }
        
        console.log('=== SHOPIFY PRODUCTS FETCHED ===');
        console.log('Number of products fetched:', shopifyProducts.length);
        console.log('Fetched products:', shopifyProducts);
        
        // Debug: Show all variant IDs from fetched products
        const allFetchedVariantIds = shopifyProducts.flatMap(p => p.variants.map(v => v.id));
        console.log('All fetched variant IDs:', allFetchedVariantIds);
        console.log('Requested variant IDs:', allVariantIds);
        console.log('Variant ID types - requested:', allVariantIds.map(id => typeof id));
        console.log('Variant ID types - fetched:', allFetchedVariantIds.map(id => typeof id));
        
        // Test matching
        const matchingIds = allVariantIds.filter(requestedId => 
          allFetchedVariantIds.some(fetchedId => 
            requestedId.toString() === fetchedId.toString()
          )
        );
        console.log('Matching variant IDs found:', matchingIds);
        console.log('Number of matches:', matchingIds.length, 'out of', allVariantIds.length);
        
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
            console.log('Looking for variant ID:', mainProductVariantId, 'type:', typeof mainProductVariantId);
            
            const mainProduct = mainProductVariantId
              ? variantIdToProduct.get(mainProductVariantId.toString()) || null
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
                  console.log('Looking for alternative variant ID:', altProduct.shopify_product_id);
                  const altShopifyProduct = variantIdToProduct.get(altProduct.shopify_product_id.toString()) || null;
                  if (altShopifyProduct) {
                    console.log('✅ Found alternative product:', altShopifyProduct.title);
                    alternativeProducts.push(altShopifyProduct);
                  } else {
                    console.log('❌ Alternative product not found for variant:', altProduct.shopify_product_id);
                  }
                }
              });
            }

            console.log('Alternative products found:', alternativeProducts.length);

            if (mainProduct) {
              const whyPicked = module.why_picked || module.reason || module.description || (mainProduct?.body_html ? mainProduct.body_html.replace(/<[^>]*>/g, '').substring(0, 400) : '');
              const moduleName: string = module.module || 'Skincare Step';

              // Determine categories: for makeup keep 'makeup'; for skincare split into subcategories based on config lists
              const apiCategory = (category.category || '').toLowerCase();
              const targetCategories: string[] = [];

              if (apiCategory === 'makeup') {
                targetCategories.push('makeup');
              } else {
                // skincare: check in morning/evening/weekly lists, allow duplicates across multiple lists
                if (moduleOrderConfig) {
                  const m = moduleOrderConfig;
                  const inMorning = findBestModuleMatch(moduleName, m.skincare_morning || []) !== null;
                  const inEvening = findBestModuleMatch(moduleName, m.skincare_evening || []) !== null;
                  const inWeekly = findBestModuleMatch(moduleName, m.skincare_weekly || []) !== null;

                  if (inMorning) targetCategories.push('skincare_morning');
                  if (inEvening) targetCategories.push('skincare_evening');
                  if (inWeekly) targetCategories.push('skincare_weekly');

                  // Heuristic fallback if no config match
                  if (targetCategories.length === 0) {
                    const nameLc = (moduleName || '').toLowerCase();
                    
                    if (/(night|notte|evening|sera)/.test(nameLc)) {
                      targetCategories.push('skincare_evening');
                    }
                    if (/(mask|scrub|patch|weekly|settimanale)/.test(nameLc)) {
                      targetCategories.push('skincare_weekly');
                    }
                    // If still none, default to morning
                    if (targetCategories.length === 0) {
                      targetCategories.push('skincare_morning');
                    }
                  }
                } else {
                  // If no config, use API category or default to skincare_morning
                  if (apiCategory === 'skincare_evening' || apiCategory === 'evening') {
                    targetCategories.push('skincare_evening');
                  } else if (apiCategory === 'skincare_weekly' || apiCategory === 'weekly') {
                    targetCategories.push('skincare_weekly');
                  } else {
                    targetCategories.push('skincare_morning');
                  }
                }
              }

              // Create one step per target category (duplication allowed)
              for (const catKey of targetCategories) {
                const step = {
                  stepNumber: globalStepNumber,
                  stepTitle: moduleName,
                  category: catKey, // 'skincare_morning' | 'skincare_evening' | 'skincare_weekly' | 'makeup'
                  mainProduct,
                  alternativeProducts,
                  whyPicked,
                  allProducts: [mainProduct, ...alternativeProducts].filter(Boolean)
                };
                steps.push(step);
                globalStepNumber++;
              }
            } else {
              console.log('No main product found, skipping step');
            }
          });
        });

        // Apply module order configuration if available
        let finalSteps = steps;
        if (moduleOrderConfig) {
          finalSteps = reorderRoutineSteps(steps, moduleOrderConfig);
          console.log('📋 Applied module order configuration to', finalSteps.length, 'steps');
        } else {
          console.log('📋 No module order configuration, using API order');
        }

        setRoutineSteps(finalSteps);
      } catch (error) {
        console.error('Failed to fetch routine products:', error);
        setRoutineSteps([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRoutineProducts();
  }, [analysisData?.recommendations, moduleOrderConfig]);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'results' && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 min-h-full">
            {/* AI Photo Analysis Section */}
            <div className="p-6">
              <div className="relative">
                <div className="text-center">
                  {/* Analysis Image */}
                  <div className="relative mb-6">
                    <SkinAnalysisImage 
                      imageUrl={capturedImage || analysisData?.image_url || ''} 
                      analysisData={analysisData}
                    />
                  </div>

                  {/* Spidering Chart */}
                  {analysisData && (
                    <div className="mb-6">
                      <Suspense fallback={
                        <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                          <div className="h-8 bg-purple-200 rounded mb-4"></div>
                          <div className="h-48 bg-purple-100 rounded"></div>
                        </div>
                      }>
                        <SpideringChart 
                          analysisData={analysisData} 
                          userAge={30} 
                          userGender="female" 
                        />
                      </Suspense>
                    </div>
                  )}

                  {/* Analysis Results */}
                  {analysisData && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">La Tua Analisi della Pelle</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">Tipo di Pelle</span>
                          <span className="text-sm font-semibold text-purple-600">{analysisData.skin_type || 'Normale'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">Analisi Acne</span>
                          <span className="text-sm font-semibold text-purple-600">{analysisData.acne?.severity || 'Nessuna rilevata'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">Rossore</span>
                          <span className="text-sm font-semibold text-purple-600">{analysisData.redness ? `${analysisData.redness.redness_perc}%` : 'Nessuno rilevato'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">Rughe</span>
                          <span className="text-sm font-semibold text-purple-600">{analysisData.wrinkles?.severity || 'Nessuna rilevata'}</span>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-xl">
                          <span className="text-sm font-medium text-gray-700 block mb-1">Raccomandazioni</span>
                          <span className="text-sm text-gray-600">
                            {typeof analysisData.recommendations === 'string' 
                              ? analysisData.recommendations 
                              : analysisData.recommendations?.skincare_routine 
                                ? 'Routine personalizzata generata' 
                                : 'Routine personalizzata suggerita'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 min-h-full p-6">
            {/* Category Selector */}
            <div className="mb-4 sticky top-0 z-30 bg-transparent py-2 flex justify-center">
                      <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-purple-100">
                {/* Skincare Morning */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_morning' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'}`}
                  onClick={() => setSelectedCategory('skincare_morning')}
                  title="Skincare Mattina"
                >
                  <Sun className="w-4 h-4" />
                  {selectedCategory === 'skincare_morning' && <span>Skincare</span>}
                </button>
                {/* Skincare Evening */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_evening' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'}`}
                  onClick={() => setSelectedCategory('skincare_evening')}
                  title="Skincare Sera"
                >
                  <Moon className="w-4 h-4" />
                  {selectedCategory === 'skincare_evening' && <span>Skincare</span>}
                </button>
                {/* Skincare Weekly */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_weekly' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'}`}
                  onClick={() => setSelectedCategory('skincare_weekly')}
                  title="Skincare Settimanale"
                >
                  <CalendarDays className="w-4 h-4" />
                  {selectedCategory === 'skincare_weekly' && <span>Settimanale</span>}
                </button>
                {/* Makeup */}
                <button
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'makeup' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'}`}
                  onClick={() => setSelectedCategory('makeup')}
                >
                  <Palette className="w-4 h-4" />
                  {selectedCategory === 'makeup' && <span>Makeup</span>}
                </button>
              </div>
            </div>
            {/* Loading State */}
            {isLoadingProducts ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6">
                    <div className="animate-pulse">
                      <div className="h-8 bg-purple-200 rounded mb-4"></div>
                      <div className="h-32 bg-purple-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Routine Steps */
              <div className="space-y-6">
                {routineSteps && routineSteps.length > 0 ? (
                  routineSteps
                    .filter(step => (step.category || '').toLowerCase() === selectedCategory)
                    .map((step, index, arr) => (
                      <div key={`${step.category}-${index + 1}`} className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6">
                      <div className="space-y-3">
                        <RoutineProductCard
                          product={step.mainProduct as any}
                          stepNumber={index + 1}
                          stepTitle={step.stepTitle}
                          categoryTitle={
                            selectedCategory === 'makeup' ? 'Makeup' : (selectedCategory === 'skincare_weekly' ? 'Skincare Weekly' : 'Skincare')
                          }
                          isLastStep={index === arr.length - 1}
                          showAddAllButton={index === arr.length - 1}
                        // new UI props
                          whyPicked={step.whyPicked}
                          alternatives={step.alternativeProducts as any}
                          alternativesExpanded={expandedAlternatives.has(`${step.category}-${index + 1}`)}
                          onToggleAlternatives={() => toggleAlternatives(`${step.category}-${index + 1}`)}
                          onAddAllToCart={async () => {
                            // Add all main products (filtered list) to cart
                            for (const routineStep of arr) {
                              if (routineStep.mainProduct && routineStep.mainProduct.variants[0]) {
                                try {
                                  const variantId = `gid://shopify/ProductVariant/${routineStep.mainProduct.variants[0].id}`;
                                  const productInfo = {
                                    name: routineStep.mainProduct.title,
                                    image: routineStep.mainProduct.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
                                    price: parseFloat(routineStep.mainProduct.variants[0].price) * 100
                                  };

                                  const customAttributes = [
                                    { key: 'source', value: 'dermaself_recommendation' },
                                    { key: 'recommendation_type', value: 'skin_analysis' },
                                    { key: 'product_step', value: routineStep.category.toLowerCase().replace(/\s+/g, '_') },
                                    { key: 'added_at', value: new Date().toISOString() }
                                  ];

                                  await addToCart(variantId, 1, customAttributes, productInfo);
                                } catch (error) {
                                  console.error('Failed to add product to cart:', error);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💄</span>
                    </div>
                    <p className="text-gray-600 font-medium">Nessun dato di routine disponibile</p>
                    <p className="text-sm text-gray-400 mt-2">Per favore riprova l'analisi</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restart Button */}
      <div className="p-6 bg-white border-t border-purple-100">
        <motion.button
          onClick={onRestart}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-purple-600 transition-all duration-300 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Inizia Nuova Analisi
        </motion.button>
      </div>
    </motion.div>
  );
}
