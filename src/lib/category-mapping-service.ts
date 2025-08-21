/**
 * Category Mapping Service
 * 
 * This service provides unified category mapping functionality using iRacing's official
 * constants API. It replaces hardcoded category mappings with API-driven lookups
 * and implements proper caching for performance.
 */

import { getAllCategories, getAllCars } from './iracing-api-core';
import { type RaceCategory } from './iracing-types';

// Interface for iRacing category data
interface IracingCategoryData {
  label: string;
  value: number; // categoryId
}

// Interface for iRacing car data
interface IracingCarData {
  carId: number;
  carName: string;
  carNameAbbreviated: string;
  carDirpath: string;
  carTypes: any[];
  categories: any[];
  packageId: number;
  retired: boolean;
}

// Category mapping cache
class CategoryMappingCache {
  private categoryNameToId = new Map<string, number>();
  private categoryIdToName = new Map<number, string>();
  private carIdToCategory = new Map<number, RaceCategory>();
  private apiCategoryToOurCategory = new Map<string, RaceCategory>();
  private cacheExpiry = 0;
  private loadingPromise: Promise<void> | null = null;
  
  // Cache duration: 24 hours (categories don't change often)
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  /**
   * Check if cache is valid
   */
  private isValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * Load data from iRacing API and build mapping caches
   */
  private async loadData(): Promise<void> {
    try {
      console.log('🔄 Loading category mapping data from iRacing API...');
      
      // Fetch both categories and cars in parallel
      const [categories, cars] = await Promise.all([
        getAllCategories(),
        getAllCars()
      ]);

      console.log(`📊 Loaded ${categories.length} categories and ${cars.length} cars from API`);

      // Clear existing caches
      this.categoryNameToId.clear();
      this.categoryIdToName.clear();
      this.carIdToCategory.clear();
      this.apiCategoryToOurCategory.clear();

      // Build category mappings
      this.buildCategoryMappings(categories);
      
      // Build car-to-category mappings
      this.buildCarMappings(cars);

      // Set cache expiry
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log('✅ Category mapping cache built successfully');
      console.log(`📋 Available API categories: ${Array.from(this.categoryNameToId.keys())}`);
      console.log(`🚗 Mapped ${this.carIdToCategory.size} cars to categories`);
      
    } catch (error) {
      console.error('❌ Error loading category mapping data:', error);
      throw error;
    }
  }

  /**
   * Build category name <-> ID mappings and API category to our category mappings
   */
  private buildCategoryMappings(categories: IracingCategoryData[]): void {
    for (const category of categories) {
      if (category.label && typeof category.value === 'number') {
        // Store direct API mappings
        this.categoryNameToId.set(category.label, category.value);
        this.categoryIdToName.set(category.value, category.label);
        
        // Map API categories to our RaceCategory types
        const ourCategory = this.mapApiCategoryToOurCategory(category.label);
        if (ourCategory) {
          this.apiCategoryToOurCategory.set(category.label, ourCategory);
        }
      }
    }
  }

  /**
   * Build car ID to category mappings
   */
  private buildCarMappings(cars: IracingCarData[]): void {
    for (const car of cars) {
      if (car.carId && car.carName) {
        const category = this.determineCarCategory(car);
        if (category) {
          this.carIdToCategory.set(car.carId, category);
        }
      }
    }
  }

  /**
   * Map iRacing API category names to our RaceCategory types
   */
  private mapApiCategoryToOurCategory(apiCategoryName: string): RaceCategory | null {
    const normalized = apiCategoryName.toLowerCase();
    
    if (normalized.includes('formula')) return 'Formula Car';
    if (normalized.includes('oval') && normalized.includes('dirt')) return 'Dirt Oval';
    if (normalized.includes('oval')) return 'Oval';
    if (normalized.includes('prototype')) return 'Prototype';
    if (normalized.includes('sports') || normalized.includes('road')) return 'Sports Car';
    
    // Handle common iRacing category names
    if (normalized === 'road') return 'Sports Car';
    if (normalized === 'dirt') return 'Dirt Oval';
    
    return null;
  }

  /**
   * Determine car category using multiple data sources
   */
  private determineCarCategory(car: IracingCarData): RaceCategory | null {
    // Method 1: Use car's categories array if available
    if (car.categories && car.categories.length > 0) {
      for (const categoryInfo of car.categories) {
        if (categoryInfo.categoryName) {
          const mapped = this.mapApiCategoryToOurCategory(categoryInfo.categoryName);
          if (mapped) return mapped;
        }
      }
    }
    
    // Method 2: Use car types if categories not available
    if (car.carTypes && car.carTypes.length > 0) {
      for (const carType of car.carTypes) {
        if (carType.carType) {
          const mapped = this.mapApiCategoryToOurCategory(carType.carType);
          if (mapped) return mapped;
        }
      }
    }
    
    // Method 3: Analyze car name as fallback
    return this.categorizeByCarName(car.carName);
  }

  /**
   * Categorize car by analyzing its name (fallback method)
   */
  private categorizeByCarName(carName: string): RaceCategory {
    const name = carName.toLowerCase();
    
    // Handle edge cases first: cars with "formula" in name but are actually sports cars
    if (name.includes('formula drift') || name.includes('formula ford')) {
      return 'Sports Car';
    }
    
    // Formula cars - expanded patterns for better detection
    if (name.includes('formula') || name.includes('f1') || name.includes('f3') || 
        name.includes('fr2.0') || name.includes('skip barber') || name.includes('indy') ||
        name.includes('dallara dw12') || name.includes('williams fw') || name.includes('mclaren mp4') ||
        name.includes('lotus 79') || name.includes('dallara f3') || name.includes('formula vee') ||
        name.includes('formula renault') || name.includes('indycar') || name.includes('open wheel')) {
      return 'Formula Car';
    }
    
    // Dirt oval cars
    if (name.includes('dirt') && (name.includes('oval') || name.includes('modified') || 
        name.includes('sprint') || name.includes('late model'))) {
      return 'Dirt Oval';
    }
    
    // Oval cars
    if (name.includes('legends') || name.includes('modified') || name.includes('sprint') || 
        name.includes('late model') || name.includes('super speedway') || name.includes('stock car')) {
      return 'Oval';
    }
    
    // Prototype cars - expanded patterns
    if (name.includes('prototype') || name.includes('lmp') || name.includes('dpi') || 
        name.includes('radical') || name.includes('oreca') || name.includes('hpd arx') ||
        name.includes('riley mk') || name.includes('daytona prototype')) {
      return 'Prototype';
    }
    
    // Default to Sports Car for GT3, Challenge, and other road cars
    return 'Sports Car';
  }

  /**
   * Ensure cache is loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (this.isValid()) {
      return;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this.loadData();
    }

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Get category ID by category name
   */
  async getCategoryId(categoryName: string): Promise<number | null> {
    await this.ensureLoaded();
    
    // Direct lookup first
    if (this.categoryNameToId.has(categoryName)) {
      return this.categoryNameToId.get(categoryName)!;
    }
    
    // Fuzzy matching for our RaceCategory types to API categories
    const fuzzyMappings: Record<RaceCategory, string[]> = {
      'Sports Car': ['Road', 'Sports Car', 'GT'],
      'Formula Car': ['Formula', 'Open Wheel', 'Formula Car'],
      'Prototype': ['Prototype', 'Sports Prototype'],
      'Oval': ['Oval', 'Stock Car'],
      'Dirt Oval': ['Dirt', 'Dirt Oval']
    };
    
    const raceCategory = categoryName as RaceCategory;
    if (fuzzyMappings[raceCategory]) {
      for (const possibleName of fuzzyMappings[raceCategory]) {
        if (this.categoryNameToId.has(possibleName)) {
          return this.categoryNameToId.get(possibleName)!;
        }
      }
    }
    
    return null;
  }

  /**
   * Get category name by category ID
   */
  async getCategoryName(categoryId: number): Promise<string | null> {
    await this.ensureLoaded();
    return this.categoryIdToName.get(categoryId) || null;
  }

  /**
   * Get our RaceCategory type for a car ID
   */
  async getCarCategory(carId: number): Promise<RaceCategory | null> {
    await this.ensureLoaded();
    return this.carIdToCategory.get(carId) || null;
  }

  /**
   * Map API category name to our RaceCategory type
   */
  async mapApiCategoryToRaceCategory(apiCategoryName: string): Promise<RaceCategory | null> {
    await this.ensureLoaded();
    return this.apiCategoryToOurCategory.get(apiCategoryName) || 
           this.mapApiCategoryToOurCategory(apiCategoryName);
  }

  /**
   * Get all available API categories
   */
  async getAvailableCategories(): Promise<string[]> {
    await this.ensureLoaded();
    return Array.from(this.categoryNameToId.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      isValid: this.isValid(),
      expiresAt: new Date(this.cacheExpiry).toISOString(),
      categoriesCount: this.categoryNameToId.size,
      carsCount: this.carIdToCategory.size,
      apiCategoriesCount: this.apiCategoryToOurCategory.size,
      timeUntilExpiry: this.isValid() 
        ? Math.round((this.cacheExpiry - Date.now()) / (1000 * 60)) + ' minutes'
        : 'Expired'
    };
  }

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.categoryNameToId.clear();
    this.categoryIdToName.clear();
    this.carIdToCategory.clear();
    this.apiCategoryToOurCategory.clear();
    this.cacheExpiry = 0;
    this.loadingPromise = null;
    console.log('🗑️ Category mapping cache cleared');
  }

  /**
   * Pre-warm the cache
   */
  async preWarmCache(): Promise<void> {
    try {
      console.log('🔥 Pre-warming category mapping cache...');
      await this.ensureLoaded();
      console.log('✅ Category mapping cache pre-warmed successfully');
    } catch (error) {
      console.error('❌ Failed to pre-warm category mapping cache:', error);
      throw error;
    }
  }
}

// Singleton instance
const categoryMappingCache = new CategoryMappingCache();

/**
 * Category Mapping Service - Public API
 */
export class CategoryMappingService {
  /**
   * Get category ID for a category name (supports both API names and our RaceCategory types)
   */
  static async getCategoryId(categoryName: string): Promise<number | null> {
    try {
      return await categoryMappingCache.getCategoryId(categoryName);
    } catch (error) {
      console.error(`Error getting category ID for "${categoryName}":`, error);
      return null;
    }
  }

  /**
   * Get category name for a category ID
   */
  static async getCategoryName(categoryId: number): Promise<string | null> {
    try {
      return await categoryMappingCache.getCategoryName(categoryId);
    } catch (error) {
      console.error(`Error getting category name for ID ${categoryId}:`, error);
      return null;
    }
  }

  /**
   * Get RaceCategory type for a car ID
   */
  static async getCarCategory(carId: number): Promise<RaceCategory | null> {
    try {
      return await categoryMappingCache.getCarCategory(carId);
    } catch (error) {
      console.error(`Error getting car category for ID ${carId}:`, error);
      return null;
    }
  }

  /**
   * Map API category name to our RaceCategory type
   */
  static async mapApiCategoryToRaceCategory(apiCategoryName: string): Promise<RaceCategory | null> {
    try {
      return await categoryMappingCache.mapApiCategoryToRaceCategory(apiCategoryName);
    } catch (error) {
      console.error(`Error mapping API category "${apiCategoryName}":`, error);
      return null;
    }
  }

  /**
   * Get all available API categories
   */
  static async getAvailableCategories(): Promise<string[]> {
    try {
      return await categoryMappingCache.getAvailableCategories();
    } catch (error) {
      console.error('Error getting available categories:', error);
      return [];
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return categoryMappingCache.getCacheStats();
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    categoryMappingCache.clearCache();
  }

  /**
   * Pre-warm the cache
   */
  static async preWarmCache(): Promise<void> {
    return categoryMappingCache.preWarmCache();
  }

  /**
   * Graceful fallback for category lookup when API is unavailable
   */
  static getFallbackCategoryId(categoryName: string): number | null {
    const fallbackMapping: Record<RaceCategory, number> = {
      'Sports Car': 2,      // Road
      'Formula Car': 2,     // Road  
      'Prototype': 2,       // Road
      'Oval': 1,           // Oval
      'Dirt Oval': 3,      // Dirt Oval
    };
    
    const raceCategory = categoryName as RaceCategory;
    return fallbackMapping[raceCategory] || null;
  }

  /**
   * Enhanced category lookup with fallback
   */
  static async getCategoryIdWithFallback(categoryName: string): Promise<number | null> {
    try {
      const categoryId = await this.getCategoryId(categoryName);
      if (categoryId !== null) {
        return categoryId;
      }
      
      console.warn(`No API category found for "${categoryName}", using fallback`);
      return this.getFallbackCategoryId(categoryName);
    } catch (error) {
      console.warn(`API error getting category ID for "${categoryName}", using fallback:`, error);
      return this.getFallbackCategoryId(categoryName);
    }
  }
}

// Export the service as default and named export
export default CategoryMappingService;