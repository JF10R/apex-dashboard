
/**
 * iRacing Constants Module
 * 
 * Handles constants data (categories, divisions, event types) from the iRacing API.
 * Provides efficient lookups with proper caching.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API types
export interface IracingCategory {
  label: string;
  value: number; // This is the categoryId we need
}

export interface IracingDivision {
  label: string;
  value: number;
}

export interface IracingEventType {
  label: string;
  value: number;
}

// Quick lookup maps
let categoriesMap: Map<string, number> | null = null;
let categoryIdToLabelMap: Map<number, string> | null = null;
let constantsLoadingPromise: Promise<void> | null = null;

/**
 * Get category ID by category name from iRacing API
 */
export const getCategoryId = async (categoryName: string): Promise<number | null> => {
  try {
    // Check quick lookup map first
    if (categoriesMap && categoriesMap.has(categoryName)) {
      return categoriesMap.get(categoryName)!;
    }

    // Load constants if not loaded
    if (!constantsLoadingPromise) {
      constantsLoadingPromise = loadConstantsData();
    }
    await constantsLoadingPromise;
    
    if (categoriesMap && categoriesMap.has(categoryName)) {
      return categoriesMap.get(categoryName)!;
    }

    // Try fuzzy matching for common variations
    const fuzzyMatches = [
      ['Sports Car', 'Road'],
      ['Formula Car', 'Road'],
      ['Prototype', 'Road'],
      ['Oval', 'Oval'],
      ['Dirt Oval', 'Dirt']
    ];
    
    for (const [input, apiName] of fuzzyMatches) {
      if (categoryName === input && categoriesMap?.has(apiName)) {
        return categoriesMap.get(apiName)!;
      }
    }

    console.warn(`Category not found for name "${categoryName}"`);
    return null;
    
  } catch (error) {
    console.error(`Error getting category ID for "${categoryName}":`, error);
    return null;
  }
};

/**
 * Get category name by category ID
 */
export const getCategoryName = async (categoryId: number): Promise<string | null> => {
  try {
    if (categoryIdToLabelMap && categoryIdToLabelMap.has(categoryId)) {
      return categoryIdToLabelMap.get(categoryId)!;
    }

    if (!constantsLoadingPromise) {
      constantsLoadingPromise = loadConstantsData();
    }
    await constantsLoadingPromise;
    
    if (categoryIdToLabelMap && categoryIdToLabelMap.has(categoryId)) {
      return categoryIdToLabelMap.get(categoryId)!;
    }

    console.warn(`Category not found for ID ${categoryId}`);
    return null;
    
  } catch (error) {
    console.error(`Error getting category name for ID ${categoryId}:`, error);
    return null;
  }
};

/**
 * Get all categories from cache or API
 */
export const getAllCategories = async (): Promise<IracingCategory[]> => {
  return getCached(
    caches.constants,
    'categories',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('📊 Fetching categories from iRacing API...');
      
      const response = await iracingApi.constants.getCategories();
      
      if (!Array.isArray(response)) {
        console.warn('Unexpected categories response format:', typeof response);
        return [];
      }

      console.log(`✅ Fetched ${response.length} categories`);
      return response as IracingCategory[];
    }
  );
};

/**
 * Get all divisions from cache or API
 */
export const getAllDivisions = async (): Promise<IracingDivision[]> => {
  return getCached(
    caches.constants,
    'divisions',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('📊 Fetching divisions from iRacing API...');
      
      const response = await iracingApi.constants.getDivisions();
      
      if (!Array.isArray(response)) {
        console.warn('Unexpected divisions response format:', typeof response);
        return [];
      }

      console.log(`✅ Fetched ${response.length} divisions`);
      return response as IracingDivision[];
    }
  );
};

/**
 * Get all event types from cache or API
 */
export const getAllEventTypes = async (): Promise<IracingEventType[]> => {
  return getCached(
    caches.constants,
    'event-types',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('📊 Fetching event types from iRacing API...');
      
      const response = await iracingApi.constants.getEventTypes();
      
      if (!Array.isArray(response)) {
        console.warn('Unexpected event types response format:', typeof response);
        return [];
      }

      console.log(`✅ Fetched ${response.length} event types`);
      return response as IracingEventType[];
    }
  );
};

/**
 * Load constants data and populate quick lookup maps
 */
const loadConstantsData = async (): Promise<void> => {
  try {
    const [categories, divisions, eventTypes] = await Promise.all([
      getAllCategories(),
      getAllDivisions(),
      getAllEventTypes()
    ]);

    // Create quick lookup maps for categories
    categoriesMap = new Map();
    categoryIdToLabelMap = new Map();
    
    for (const category of categories) {
      if (category.label && typeof category.value === 'number') {
        categoriesMap.set(category.label, category.value);
        categoryIdToLabelMap.set(category.value, category.label);
      }
    }
    
    console.log(`🗄️ Created category lookup maps with ${categoriesMap.size} categories`);
    console.log('📋 Available categories:', Array.from(categoriesMap.keys()));
    
  } catch (error) {
    console.error('Error loading constants data:', error);
  } finally {
    constantsLoadingPromise = null;
  }
};

/**
 * Pre-warm the constants cache
 */
export const preWarmConstantsCache = async (): Promise<void> => {
  try {
    console.log('🔥 Pre-warming constants cache...');
    await Promise.all([
      getAllCategories(),
      getAllDivisions(),
      getAllEventTypes()
    ]);
    if (!constantsLoadingPromise) {
      constantsLoadingPromise = loadConstantsData();
      await constantsLoadingPromise;
    }
    console.log('✅ Constants cache pre-warmed successfully');
  } catch (error) {
    console.error('Failed to pre-warm constants cache:', error);
  }
};

/**
 * Get constants cache statistics
 */
export const getConstantsCacheStats = () => {
  const cacheStats = caches.constants.getStats();
  
  return {
    ...cacheStats,
    categoriesCount: categoriesMap?.size || 0,
    isLoaded: categoriesMap !== null,
    availableCategories: categoriesMap ? Array.from(categoriesMap.keys()) : [],
  };
};
