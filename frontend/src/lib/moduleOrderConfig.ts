/**
 * Module Order Configuration
 * 
 * This utility allows overriding the default order of skincare and makeup modules
 * that come from the API. If a configuration file exists, it will be used to 
 * reorder the modules within each category.
 */

export interface ModuleOrderConfig {
  skincare_morning: string[];
  skincare_evening: string[];
  skincare_weekly: string[];
  makeup: string[];
}

// Default fallback order (same as config file for consistency)
const DEFAULT_MODULE_ORDER: ModuleOrderConfig = {
  skincare_morning: [
    "Cleansing",
    "Tonic/Serum", 
    "Pimple Patches",
    "Eye Contour",
    "Hydration",
    "Lip Balm",
    "SPF"
  ],
  skincare_evening: [
    "Cleansing",
    "Tonic/Serum", 
    "Pimple Patches",
    "Eye Contour",
    "Night Cream",
    "Lip Balm"
  ],
  skincare_weekly: [
    "Face Mask/Scrub",
    "Eye Patches",
    "Lip Scrub"
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
    // Force fresh load on browser refresh to avoid 304 empty-body issues
    const response = await fetch('/config/module-order.json', { cache: 'no-store' });
    
    if (!response.ok) {
      console.warn('Module order config file not found, using default order');
      cachedConfig = DEFAULT_MODULE_ORDER;
      return cachedConfig;
    }

    const raw = await response.json();

    // Backward compatibility: if old shape with "skincare" exists, map it to morning by default
    const normalized: ModuleOrderConfig = {
      skincare_morning: Array.isArray(raw.skincare_morning)
        ? raw.skincare_morning
        : (Array.isArray(raw.skincare) ? raw.skincare : DEFAULT_MODULE_ORDER.skincare_morning),
      skincare_evening: Array.isArray(raw.skincare_evening)
        ? raw.skincare_evening
        : DEFAULT_MODULE_ORDER.skincare_evening,
      skincare_weekly: Array.isArray(raw.skincare_weekly)
        ? raw.skincare_weekly
        : DEFAULT_MODULE_ORDER.skincare_weekly,
      makeup: Array.isArray(raw.makeup) ? raw.makeup : DEFAULT_MODULE_ORDER.makeup,
    };

    // Cache the valid configuration
    cachedConfig = normalized;
    console.log('✅ Module order configuration loaded successfully');
    return normalized;

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

  // Group steps by category (now includes skincare_morning/evening/weekly and makeup)
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
    const categoryConfig = (config as any)[category] as string[] | undefined;
    
    if (!categoryConfig || categoryConfig.length === 0) {
      // If no config for this category, keep original order
      reorderedSteps.push(...steps);
      return;
    }

    // Create a map for quick lookup
    const stepMap = new Map<string, any>();
    const normalizedStepMap = new Map<string, any>();
    steps.forEach(step => {
      stepMap.set(step.stepTitle, step);
      normalizedStepMap.set(normalizeModuleName(step.stepTitle), step);
    });

    // Reorder according to configuration
    const orderedSteps: any[] = [];
    const remainingSteps: any[] = [];

    // First, add steps in the configured order
    categoryConfig.forEach(moduleName => {
      // Try exact match first
      let step = stepMap.get(moduleName);
      if (!step) {
        // Try normalized match
        const normalized = normalizeModuleName(moduleName);
        step = normalizedStepMap.get(normalized);
      }
      if (step) {
        orderedSteps.push(step);
        // Remove from both maps to avoid duplicates
        stepMap.delete(step.stepTitle);
        normalizedStepMap.delete(normalizeModuleName(step.stepTitle));
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
