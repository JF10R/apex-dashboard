/**
 * iRacing Car Lookup Module
 * 
 * Handles car data retrieval and caching from the iRacing API.
 * Provides efficient car name lookups with proper caching.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API types
export interface IracingCar {
  carId: number;
  carName: string;
  carNameAbbreviated: string;
  carDirpath: string;
  carTypes: { carType: string }[]; // Actual API structure
  packageId: number;
  retired: boolean;
  [key: string]: any;
}

// The getCars() response is just an array of Car objects
export type IracingCarsResponse = IracingCar[];

// Global car cache for fast lookups
let carIdToNameMap: Map<number, string> | null = null;
let carsLoadingPromise: Promise<void> | null = null;

/**
 * Get car name by car ID from iRacing API
 * Uses efficient caching to avoid repeated API calls
 */
export const getCarName = async (carId: number): Promise<string> => {
  try {
    // Check if we have the car in our quick lookup map
    if (carIdToNameMap && carIdToNameMap.has(carId)) {
      return carIdToNameMap.get(carId)!;
    }

    // Load cars data if not loaded
    if (!carsLoadingPromise) {
      carsLoadingPromise = loadCarsData();
    }
    await carsLoadingPromise;
    
    if (carIdToNameMap && carIdToNameMap.has(carId)) {
      return carIdToNameMap.get(carId)!;
    }

    // Fallback if car not found
    console.warn(`Car not found for ID ${carId}, using fallback name`);
    return `Car ${carId}`;
    
  } catch (error) {
    console.error(`Error getting car name for ID ${carId}:`, error);
    return `Car ${carId}`;
  }
};

/**
 * Get all cars data from cache or API
 */
export const getAllCars = async (): Promise<IracingCar[]> => {
  return getCached(
    caches.cars,
    'all-cars',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('🚗 Fetching all cars data from iRacing API...');
      
      const carsResponse = await iracingApi.car.getCars();
      
      if (!Array.isArray(carsResponse)) {
        console.warn('Unexpected cars response format:', typeof carsResponse);
        return [];
      }

      console.log(`✅ Fetched ${carsResponse.length} cars from iRacing API`);
      return carsResponse as IracingCar[];
    }
  );
};

/**
 * Load cars data and populate the quick lookup map
 */
const loadCarsData = async (): Promise<void> => {
  try {
    const carsData = await getAllCars();
    
    // Create quick lookup map
    carIdToNameMap = new Map();
    
    for (const car of carsData) {
      if (car.carId && car.carName) {
        carIdToNameMap.set(car.carId, car.carName);
      } else if (car.carId && car.carNameAbbreviated) {
        carIdToNameMap.set(car.carId, car.carNameAbbreviated);
      }
    }
    
    console.log(`🗄️ Created quick lookup map with ${carIdToNameMap.size} cars`);
    
  } catch (error) {
    console.error('Error loading cars data:', error);
  } finally {
    carsLoadingPromise = null;
  }
};

/**
 * Get cars by category or type
 */
export const getCarsByCategory = async (categoryFilter?: string): Promise<IracingCar[]> => {
  const allCars = await getAllCars();
  
  if (!categoryFilter) {
    return allCars;
  }
  
  return allCars.filter(car => 
    car.carTypes?.some(typeObj => 
      typeObj.carType?.toLowerCase().includes(categoryFilter.toLowerCase())
    )
  );
};

/**
 * Search cars by name
 */
export const searchCars = async (searchTerm: string): Promise<IracingCar[]> => {
  const allCars = await getAllCars();
  const term = searchTerm.toLowerCase();
  
  return allCars.filter(car => 
    car.carName?.toLowerCase().includes(term) ||
    car.carNameAbbreviated?.toLowerCase().includes(term)
  );
};

/**
 * Pre-warm the car cache
 */
export const preWarmCarCache = async (): Promise<void> => {
  try {
    console.log('🔥 Pre-warming car cache...');
    await getAllCars();
    if (!carsLoadingPromise) {
      carsLoadingPromise = loadCarsData();
      await carsLoadingPromise;
    }
    console.log('✅ Car cache pre-warmed successfully');
  } catch (error) {
    console.error('Failed to pre-warm car cache:', error);
  }
};

/**
 * Get car cache statistics
 */
export const getCarCacheStats = () => {
  const cacheStats = caches.cars.getStats();
  
  return {
    ...cacheStats,
    quickLookupSize: carIdToNameMap?.size || 0,
    isQuickLookupLoaded: carIdToNameMap !== null,
  };
};
