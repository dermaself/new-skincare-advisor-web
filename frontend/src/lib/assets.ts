// Centralized asset paths
export const ASSETS = {
  images: {
    skinTypes: {
      normal: '/assets/images/skin-types/skin-type-normal.jpg',
      dry: '/assets/images/skin-types/skin-type-dry.jpg',
      oily: '/assets/images/skin-types/skin-type-oily.jpg',
      combination: '/assets/images/skin-types/skin-type-combination.jpg',
      dontKnow: '/assets/images/skin-types/skin-type-dont-know.jpg'
    },
    icons: {
      results: '/assets/images/icons/results-icon.svg',
      routine: '/assets/images/icons/routine-icon.svg'
    },
    backgrounds: {
      poweredByRevieve: '/assets/images/backgrounds/powered-by-revieve.svg'
    }
  }
} as const;

// Helper function to get skin type image
export const getSkinTypeImage = (skinType: string): string => {
  const skinTypeMap: { [key: string]: string } = {
    'Normale': ASSETS.images.skinTypes.normal,
    'Secca': ASSETS.images.skinTypes.dry,
    'Grassa': ASSETS.images.skinTypes.oily,
    'Mista': ASSETS.images.skinTypes.combination,
    'Non lo so': ASSETS.images.skinTypes.dontKnow
  };
  
  return skinTypeMap[skinType] || ASSETS.images.skinTypes.normal;
};
