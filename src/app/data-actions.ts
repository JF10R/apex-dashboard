'use server'

import {
  searchMembers,
  getMemberProfile,
  getMemberRecentRaces,
  getMemberStats,
  getAllCars,
  getAllCategories,
  getRaceResultData,
  getCarName
} from '@/lib/iracing-api-core';

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
          // Defensive mapping for all possible field names and fallback values
          const carId = race.carId ?? race.car_id ?? 0;
          const carInfo = await getCarInfo(carId);

          return {
            id: race.subsession_id?.toString() ?? race.id?.toString() ?? '0',
            trackName: race.track?.trackName ?? race.track_name ?? 'Unknown Track',
            date: race.sessionStartTime ?? race.start_time ?? new Date().toISOString(),
            year: new Date(race.sessionStartTime ?? race.start_time ?? new Date()).getFullYear(),
            season: `${race.seasonYear ?? new Date().getFullYear()} Q${race.seasonQuarter ?? Math.ceil((new Date().getMonth() + 1) / 3)}`,
            category: carInfo.category as RaceCategory,
            seriesName: race.seriesName ?? race.series_name ?? 'Unknown Series',
            startPosition: race.startPosition ?? race.starting_position ?? 0,
            finishPosition: race.finishPosition ?? race.finish_position ?? 0,
            incidents: race.incidents ?? 0,
            strengthOfField: race.strengthOfField ?? race.strength_of_field ?? 0,
            lapsLed: race.lapsLed ?? race.laps_led ?? 0,
            fastestLap: race.fastestLap ?? race.fastest_lap ?? '0:00.000',
            car: carInfo.car_name,
            avgLapTime: race.avgLapTime ?? race.avg_lap_time ?? '0:00.000',
            iratingChange: (race.newiRating ?? race.new_irating ?? 0) - (race.oldiRating ?? race.old_irating ?? 0),
            safetyRatingChange: ((race.newSubLevel ?? race.new_safety_rating ?? 0) - (race.oldSubLevel ?? race.old_safety_rating ?? 0)) * 0.01,
            participants: race.participants ?? [],
            avgRaceIncidents: race.avgRaceIncidents ?? race.avg_race_incidents ?? 0,
            avgRaceLapTime: race.avgRaceLapTime ?? race.avg_race_lap_time ?? '0:00.000'
          }
        })
      );

      // Calculate current iRating and safety rating from most recent race
      const mostRecentRace = transformedRaces[0];
      const currentIRating = mostRecentRace ? 
        (mostRecentRace.iratingChange > 0 ? 
          parseInt(mostRecentRace.id) // This should be gotten from race data
          : 1500) // Fallback
        : 1500;

      // Get current iRating and safety rating from member stats (more accurate than race data)
      let actualCurrentIRating = 1500;
      let actualCurrentSafetyRating = 'B 3.00';
      
      try {
        // Get member stats which should include current license information
        const memberStats = await getMemberStats(custId);
        if (memberStats && memberStats.length > 0) {
          const roadStats = memberStats.find((stat: any) => stat.category === 'Road' || stat.category === 'Overall');
          if (roadStats) {
            actualCurrentIRating = roadStats.irating || 1500;
            
            // If member stats has proper license info, use that
            if (roadStats.safety_rating > 0) {
              const safetyScore = roadStats.safety_rating.toFixed(2);
              actualCurrentSafetyRating = `Road ${safetyScore}`;
            }
          }
        }
      } catch (error) {
        console.log('Failed to get member stats, falling back to race data:', error);
      }
      
      // Fallback to race data if member stats unavailable
      if (actualCurrentIRating === 1500 && recentRaces && recentRaces.length > 0) {
        const latestRace = recentRaces[0];
        actualCurrentIRating = latestRace.new_irating || 1500;
        
        // Convert safety rating from sub-level to proper format
        const currentSubLevel = latestRace.new_safety_rating || 245;
        const licenseLevel = latestRace.license_level || 14; // License level from race data
        
        // Map license level to letter based on iRacing's system
        // Adjusted thresholds based on user confirmation that level 14 should be B
        const licenseClass = licenseLevel >= 20 ? 'A' : 
                           licenseLevel >= 12 ? 'B' :  // Adjusted to 12 to capture level 14
                           licenseLevel >= 8 ? 'C' : 
                           licenseLevel >= 4 ? 'D' : 'R';
        
        // Safety rating score from sub-level (0-499 range to 0.00-4.99 range)
        const safetyScore = (currentSubLevel / 100).toFixed(2);
        actualCurrentSafetyRating = `${licenseClass} ${safetyScore}`;
      }

      // Build iRating history from recent races (daily tracking)
      const roadRatingHistory: Array<{month: string, value: number}> = [];
      const ovalRatingHistory: Array<{month: string, value: number}> = [];
      
      // Process races in reverse chronological order to build history
      const reversedRaces = [...transformedRaces].reverse();
      let runningRoadRating = actualCurrentIRating;
      let runningOvalRating = actualCurrentIRating;
      
      reversedRaces.forEach((race) => {
        const raceDate = new Date(race.date);
        const dayKey = `${raceDate.getFullYear()}-${String(raceDate.getMonth() + 1).padStart(2, '0')}-${String(raceDate.getDate()).padStart(2, '0')}`;
        
        if (race.category === 'Oval' || race.category === 'Dirt Oval') {
          runningOvalRating -= race.iratingChange; // Subtract to get previous rating
          ovalRatingHistory.push({ month: dayKey, value: runningOvalRating });
        } else {
          runningRoadRating -= race.iratingChange; // Subtract to get previous rating
          roadRatingHistory.push({ month: dayKey, value: runningRoadRating });
        }
      });

      // Transform member profile to Driver format
      const data: Driver = {
        id: memberProfile.cust_id,
        name: memberProfile.display_name,
        currentIRating: actualCurrentIRating,
        currentSafetyRating: actualCurrentSafetyRating,
        avgRacePace: '1:30.000', // Default value, would need to calculate
        iratingHistories: {
          'Road': roadRatingHistory,
          'Oval': ovalRatingHistory
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

    // Use the proven getRaceResultData function from the core API
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

// Enhanced car info helper function using unified API
async function getCarInfo(carId: number): Promise<{ car_name: string; category: string }> {
  try {
    // Use the unified API's car lookup system with caching
    const carName = await getCarName(carId);
    
    // Get all cars to find category information
    const cars = await getAllCars();
    const carData = cars.find((car: any) => car.carId === carId);
    
    if (carData) {
      // Map car to category using the same logic as the /api/cars route
      const category = mapCarToCategory(carData);
      return { car_name: carName, category };
    } else {
      return { car_name: carName, category: 'Sports Car' };
    }
  } catch (error) {
    console.error(`Error getting car info for ID ${carId}:`, error);
    return { car_name: `Car ${carId}`, category: 'Sports Car' };
  }
}

// Helper function to map car to category (moved from /api/cars route)
function mapCarToCategory(car: any): string {
  // First, try to use the categories array from iRacing
  if (car.categories && car.categories.length > 0) {
    const category = car.categories[0];
    if (category.categoryName) {
      const categoryName = category.categoryName.toLowerCase();
      if (categoryName.includes('formula')) return 'Formula Car';
      if (categoryName.includes('oval') && categoryName.includes('dirt')) return 'Dirt Oval';
      if (categoryName.includes('oval')) return 'Oval';
      if (categoryName.includes('prototype')) return 'Prototype';
      if (categoryName.includes('sports') || categoryName.includes('road')) return 'Sports Car';
    }
  }
  
  // Fallback to car types if categories don't work
  if (car.carTypes && car.carTypes.length > 0) {
    const carType = car.carTypes[0];
    if (carType.carType) {
      const typeName = carType.carType.toLowerCase();
      if (typeName.includes('formula')) return 'Formula Car';
      if (typeName.includes('oval') && typeName.includes('dirt')) return 'Dirt Oval';
      if (typeName.includes('oval')) return 'Oval';
      if (typeName.includes('prototype')) return 'Prototype';
    }
  }
  
  // Final fallback to car name analysis
  const carName = (car.carName || '').toLowerCase();
  if (carName.includes('formula') || carName.includes('skip barber') || carName.includes('f1') || carName.includes('f3') || carName.includes('fr2.0')) {
    return 'Formula Car';
  } else if (carName.includes('legends') || carName.includes('modified') || carName.includes('sprint') || carName.includes('late model') || carName.includes('super speedway')) {
    return 'Oval';
  } else if (carName.includes('dirt') && carName.includes('oval')) {
    return 'Dirt Oval';
  } else if (carName.includes('prototype') || carName.includes('lmp') || carName.includes('dpi') || carName.includes('radical')) {
    return 'Prototype';
  } else {
    // Default for GT3, Challenge, and most road cars
    return 'Sports Car';
  }
}


