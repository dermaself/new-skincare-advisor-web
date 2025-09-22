/**
 * Module Order Configuration
 * 
 * This utility allows overriding the default order of skincare and makeup modules
 * that come from the API. If a configuration file exists, it will be used to 
 * reorder the modules within each category.
 */

export interface ModuleOrderConfig {
  skincare: string[];
  makeup: string[];
}

// Default fallback order (same as config file for consistency)
const DEFAULT_MODULE_ORDER: ModuleOrderConfig = {
  skincare: [
    "Cleansing",
    "Tonic/Serum", 
    "Pimple Patches",
    "Eye Contour",
    "Hydration",
    "Lip Balm",
    "SPF",
    "Night Cream",
    "Face Mask/Scrub",
    "Eye Patches",
    "Lip Scrub",
    "Razor Disinfectant",
    "Body Cleanser",
    "Body Lotion",
    "Pure Oil",
    "Other"
  ],
  makeup: [
    "Eye Makeup Remover",
    "Makeup Remover",
    "BB Cream",
    "Concealer", 
    "Foundation",
    "Powder",
    "Bronzer",
    "Blush",
    "Fixing Spray",
    "Makeup Brush Disinfectant",
    "Beauty Blender Disinfectant"
  ]
};

let cachedConfig: ModuleOrderConfig | null = null;

/**
 * Loads the module order configuration from the JSON file
 * Falls back to default order if file doesn't exist or is invalid
 */
export async function loadModuleOrderConfig(): Promise<ModuleOrderConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Try to load the configuration file
    const response = await fetch('/config/module-order.json');
    
    if (!response.ok) {
      console.warn('Module order config file not found, using default order');
      cachedConfig = DEFAULT_MODULE_ORDER;
      return cachedConfig;
    }

    const config: ModuleOrderConfig = await response.json();
    
    // Validate the configuration structure
    if (!config.skincare || !config.makeup || 
        !Array.isArray(config.skincare) || !Array.isArray(config.makeup)) {
      console.warn('Invalid module order config structure, using default order');
      cachedConfig = DEFAULT_MODULE_ORDER;
      return cachedConfig;
    }

    // Cache the valid configuration
    cachedConfig = config;
    console.log('✅ Module order configuration loaded successfully');
    return config;

  } catch (error) {
    console.warn('Failed to load module order config, using default order:', error);
    cachedConfig = DEFAULT_MODULE_ORDER;
    return cachedConfig;
  }
}

/**
 * Reorders routine steps based on the configuration
 * @param routineSteps - Array of routine steps from API
 * @param config - Module order configuration
 * @returns Reordered routine steps
 */
export function reorderRoutineSteps(
  routineSteps: any[], 
  config: ModuleOrderConfig
): any[] {
  if (!routineSteps || routineSteps.length === 0) {
    return routineSteps;
  }

  // Group steps by category
  const stepsByCategory: { [category: string]: any[] } = {};
  
  routineSteps.forEach(step => {
    const category = (step.category || '').toLowerCase();
    if (!stepsByCategory[category]) {
      stepsByCategory[category] = [];
    }
    stepsByCategory[category].push(step);
  });

  const reorderedSteps: any[] = [];

  // Process each category
  Object.entries(stepsByCategory).forEach(([category, steps]) => {
    const categoryConfig = category === 'skincare' ? config.skincare : config.makeup;
    
    if (!categoryConfig || categoryConfig.length === 0) {
      // If no config for this category, keep original order
      reorderedSteps.push(...steps);
      return;
    }

    // Create a map for quick lookup
    const stepMap = new Map<string, any>();
    steps.forEach(step => {
      stepMap.set(step.stepTitle, step);
    });

    // Reorder according to configuration
    const orderedSteps: any[] = [];
    const remainingSteps: any[] = [];

    // First, add steps in the configured order
    categoryConfig.forEach(moduleName => {
      const step = stepMap.get(moduleName);
      if (step) {
        orderedSteps.push(step);
        stepMap.delete(moduleName);
      }
    });

    // Then, add any remaining steps that weren't in the config
    stepMap.forEach(step => {
      remainingSteps.push(step);
    });

    // Combine ordered and remaining steps
    reorderedSteps.push(...orderedSteps, ...remainingSteps);
  });

  // Reassign step numbers after reordering
  reorderedSteps.forEach((step, index) => {
    step.stepNumber = index + 1;
  });

  console.log('📋 Routine steps reordered according to configuration');
  return reorderedSteps;
}

/**
 * Utility function to check if a module name matches (case-insensitive, flexible matching)
 */
export function normalizeModuleName(moduleName: string): string {
  return moduleName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Utility function to find best match for module names (handles variations)
 */
export function findBestModuleMatch(
  stepTitle: string, 
  configModules: string[]
): string | null {
  const normalizedStep = normalizeModuleName(stepTitle);
  
  // Try exact match first
  for (const configModule of configModules) {
    if (normalizeModuleName(configModule) === normalizedStep) {
      return configModule;
    }
  }

  // Try partial match
  for (const configModule of configModules) {
    const normalizedConfig = normalizeModuleName(configModule);
    if (normalizedStep.includes(normalizedConfig) || normalizedConfig.includes(normalizedStep)) {
      return configModule;
    }
  }

  return null;
}
