'use server'

import {
  searchMembers,
  getMemberProfile,
  getMemberRecentRaces,
  getSubsessionResults,
  getAllCars,
  getAllCategories,
} from '@/lib/iracing-api-modular'
import { ApiError, ApiErrorType } from '@/lib/iracing-auth'
import { type RecentRace, type Driver, type SearchedDriver, type RaceCategory } from '@/lib/iracing-types'
import { cache, cacheKeys, cacheTTL } from '@/lib/cache'

export async function searchDriversAction(query: string): Promise<{ data: SearchedDriver[]; error: string | null }> {
  try {
    // Check cache first
    const cacheKey = cacheKeys.driverSearch(query);
    const cachedResults = cache.get<SearchedDriver[]>(cacheKey);
    if (cachedResults) {
      return { data: cachedResults, error: null };
    }

    // Use the new searchMembers function
    const results = await searchMembers(query);
    
    // Map the member results to SearchedDriver format
    const searchedDrivers: SearchedDriver[] = results.map((member: any) => ({
      name: member.display_name || member.displayName,
      custId: member.cust_id || member.custId,
    }));
    
    // Cache the results
    cache.set(cacheKey, searchedDrivers, cacheTTL.SEARCH_RESULTS);
    
    return { data: searchedDrivers, error: null };
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
      const memberProfile = await getMemberProfile(custId);
      if (!memberProfile) {
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

      // Get recent races to include in driver data
      const recentRaces = await getMemberRecentRaces(custId);

      // Transform race data with dynamic car/category lookups
      const transformedRaces = await Promise.all(
        recentRaces.map(async (race: any) => {
          const carId = race.carId || race.car_id || 0
          const carInfo = await getCarInfo(carId)
          
          return {
            id: race.subsession_id?.toString() || '0',
            trackName: race.track?.trackName || race.track_name || 'Unknown Track',
            date: race.sessionStartTime || race.start_time || new Date().toISOString(),
            year: new Date(race.sessionStartTime || race.start_time || new Date()).getFullYear(),
            season: `${race.seasonYear || new Date().getFullYear()} Q${race.seasonQuarter || Math.ceil((new Date().getMonth() + 1) / 3)}`,
            category: carInfo.category as RaceCategory,
            seriesName: race.seriesName || race.series_name || 'Unknown Series',
            startPosition: race.startPosition || race.starting_position || 0,
            finishPosition: race.finishPosition || race.finish_position || 0,
            incidents: race.incidents || 0,
            strengthOfField: race.strengthOfField || race.strength_of_field || 0,
            lapsLed: race.lapsLed || 0,
            fastestLap: '0:00.000', // Not available in this data
            car: carInfo.car_name,
            avgLapTime: '0:00.000', // Not available in this data
            iratingChange: (race.newiRating || race.new_irating || 0) - (race.oldiRating || race.old_irating || 0),
            safetyRatingChange: ((race.newSubLevel || race.new_safety_rating || 0) - (race.oldSubLevel || race.old_safety_rating || 0)) * 0.01, // Convert sub-level to decimal
            participants: [], // Not available in this data
            avgRaceIncidents: 0, // Not available in this data
            avgRaceLapTime: '0:00.000' // Not available in this data
          }
        })
      );

      // Transform member profile to Driver format
      const data: Driver = {
        id: memberProfile.cust_id,
        name: memberProfile.display_name,
        currentIRating: 1500, // Default value, would need to get from stats
        currentSafetyRating: 'B 3.00', // Default value, would need to get from stats
        avgRacePace: '1:30.000', // Default value, would need to calculate
        iratingHistories: {
          'Road': [],
          'Oval': []
        },
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: transformedRaces
      };

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

    const subsessionData = await getSubsessionResults(subsessionId);
    if (!subsessionData) {
      return { data: null, error: 'Race result could not be found.' };
    }

    // Transform subsession data to RecentRace format
    // Note: This is a simplified mapping - you might need to adjust based on your RecentRace interface
    const data: RecentRace = {
      id: subsessionData.subsession_id.toString(),
      trackName: 'Unknown Track', // Would need track lookup
      date: new Date().toISOString(),
      year: new Date().getFullYear(),
      season: '2024 Season 1', // Would need season lookup
      category: 'Sports Car' as RaceCategory,
      seriesName: 'Unknown Series', // Would need series lookup
      startPosition: 1, // Would need to find user's result
      finishPosition: 1, // Would need to find user's result
      incidents: 0, // Would need to find user's result
      strengthOfField: 0,
      lapsLed: 0,
      fastestLap: '0:00.000',
      car: 'Unknown Car', // Would need car lookup
      avgLapTime: '0:00.000',
      iratingChange: 0,
      safetyRatingChange: 0,
      participants: [], // Would need to transform subsession_results
      avgRaceIncidents: 0,
      avgRaceLapTime: '0:00.000'
    };

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

// Dynamic car info lookup using cars API
async function getCarInfo(carId: number): Promise<{ car_name: string; category: string }> {
  try {
    // Use cache to avoid repeated API calls
    const cacheKey = `car-info-${carId}`;
    const cached = cache.get<{ car_name: string; category: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get cars data from the cars API endpoint
    const response = await fetch('http://localhost:9002/api/cars');
    const cars = await response.json();
    
    // Find the car in the results
    const carData = cars.find((car: any) => car.car_id === carId);
    
    let carInfo: { car_name: string; category: string };
    
    if (carData) {
      carInfo = { car_name: carData.car_name, category: carData.category };
    } else {
      carInfo = { car_name: `Car ${carId}`, category: 'Sports Car' };
    }
    
    // Cache the result
    cache.set(cacheKey, carInfo, cacheTTL.SEARCH_RESULTS);
    
    return carInfo;
  } catch (error) {
    console.error(`Error getting car info for ID ${carId}:`, error);
    return { car_name: `Car ${carId}`, category: 'Sports Car' };
  }
}

// Helper function to map car types to our category system (kept for potential future use)
function mapCarTypeToCategory(carTypes: any[]): RaceCategory {
  // Check car types for category indicators
  for (const type of carTypes) {
    const typeName = (type.car_type || '').toLowerCase();
    
    if (typeName.includes('oval')) return 'Oval';
    if (typeName.includes('dirt') && typeName.includes('oval')) return 'Dirt Oval';
    if (typeName.includes('formula')) return 'Formula Car';
    if (typeName.includes('prototype')) return 'Prototype';
    if (typeName.includes('sports') || typeName.includes('gt')) return 'Sports Car';
  }
  
  // Default fallback
  return 'Sports Car';
}

// ...existing code...
