'use server'

import {
  searchDriversByName,
  getDriverData,
  getRaceResultData,
  ApiError,
  ApiErrorType,
} from '@/lib/iracing-api-core'
import { type RecentRace, type Driver, type SearchedDriver } from '@/lib/mock-data'
import { cache, cacheKeys, cacheTTL } from '@/lib/cache'

export async function searchDriversAction(query: string): Promise<{ data: SearchedDriver[]; error: string | null }> {
  try {
    // Check cache first
    const cacheKey = cacheKeys.driverSearch(query);
    const cachedResults = cache.get<SearchedDriver[]>(cacheKey);
    if (cachedResults) {
      return { data: cachedResults, error: null };
    }

    const results = await searchDriversByName(query);
    
    // Cache the results
    cache.set(cacheKey, results, cacheTTL.SEARCH_RESULTS);
    
    return { data: results, error: null };
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: [], error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: [], error: `Failed to search drivers: ${error}` }
  }
}

export async function getDriverPageData(custId: number, forceRefresh: boolean = false): Promise<{ data: Driver | null; error: string | null; fromCache?: boolean; cacheAge?: number }> {
  try {
    // Check cache first (unless force refresh is requested)
    const cacheKey = cacheKeys.driver(custId);
    let cachedData: Driver | null = null;
    let cacheInfo = cache.getCacheInfo(cacheKey);
    
    if (!forceRefresh) {
      cachedData = cache.get<Driver>(cacheKey);
      if (cachedData) {
        return { data: cachedData, error: null, fromCache: true, cacheAge: cacheInfo.age };
      }
    }

    // If we don't have fresh cached data, try to fetch new data
    try {
      const data = await getDriverData(custId);
      if (!data) {
        // If API returns null but we have expired cached data, use it
        if (cacheInfo.exists) {
          const expiredData = cache.getExpired<Driver>(cacheKey);
          if (expiredData) {
            return { 
              data: expiredData, 
              error: 'Using cached data (API returned no data)', 
              fromCache: true, 
              cacheAge: cacheInfo.age 
            };
          }
        }
        return { data: null, error: 'Driver data could not be found.' };
      }

      // Cache the fresh data
      cache.set(cacheKey, data, cacheTTL.DRIVER_PROFILE);
      
      return { data, error: null, fromCache: false };
    } catch (apiError) {
      // If API call fails, check if we have any cached data (even expired) to fall back to
      if (cacheInfo.exists) {
        const fallbackData = cache.getExpired<Driver>(cacheKey);
        if (fallbackData) {
          const errorMessage = apiError instanceof ApiError 
            ? `API Error (using cached data): ${apiError.message}`
            : `Network Error (using cached data): ${apiError instanceof Error ? apiError.message : 'Unknown error'}`;
          
          return { 
            data: fallbackData, 
            error: errorMessage, 
            fromCache: true, 
            cacheAge: cacheInfo.age 
          };
        }
      }
      
      // No cached data available, re-throw the error
      throw apiError;
    }
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: null, error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: null, error: `Failed to fetch driver data: ${error}` }
  }
}

export async function getRaceResultAction(subsessionId: number): Promise<{ data: RecentRace | null; error: string | null }> {
  try {
    // Check cache first
    const cacheKey = cacheKeys.raceResult(subsessionId);
    const cachedData = cache.get<RecentRace>(cacheKey);
    if (cachedData) {
      return { data: cachedData, error: null };
    }

    const data = await getRaceResultData(subsessionId);
    if (!data) {
      return { data: null, error: 'Race result could not be found.' };
    }

    // Cache the race result (longer TTL since race results don't change)
    cache.set(cacheKey, data, cacheTTL.RACE_RESULT);
    
    return { data, error: null };
  } catch (e) {
    if (e instanceof ApiError) {
      return { data: null, error: e.message }
    }
    const error = e instanceof Error ? e.message : 'An unknown error occurred.'
    return { data: null, error: `Failed to fetch race result: ${error}` }
  }
}
