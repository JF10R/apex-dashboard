'use server'

import {
  searchMembers,
  getMemberProfile,
  getMemberRecentRaces,
  getMemberStats,
  getAllCars,
  getAllCategories,
  getRaceResultData,
  getCarName,
  getDriverData
} from '@/lib/iracing-api-core';

import { CategoryMappingService } from '@/lib/category-mapping-service';
import { formatLapTime } from '@/lib/iracing-data-transform';

import { ApiError, ApiErrorType } from '@/lib/iracing-auth'
import { type RecentRace, type Driver, type SearchedDriver, type RaceCategory } from '@/lib/iracing-types'
import { cache, cacheKeys, cacheTTL } from '@/lib/cache'
import { transformRecentRacesToPersonalBests } from '@/lib/personal-bests'
import type { DriverPersonalBests } from '@/lib/personal-bests-types'

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

      // Use the proven getDriverData function to get accurate chart data
      // This fetches real historical data from iRacing's chart APIs instead of calculating from deltas
      console.log('🔄 Fetching accurate chart data from iRacing APIs...');
      const accurateDriverData = await getDriverData(custId);
      
      // Extract the accurate iRating histories and safety rating history
      let iratingHistories = {};
      let safetyRatingHistory: Array<{month: string, value: number}> = [];
      let racePaceHistory: Array<{month: string, value: number}> = [];
      
      if (accurateDriverData) {
        // Use the accurate chart data from the core API
        iratingHistories = accurateDriverData.iratingHistories || {};
        safetyRatingHistory = accurateDriverData.safetyRatingHistory || [];
        
        // Update current iRating with the accurate value if available
        if (accurateDriverData.currentIRating > 0) {
          actualCurrentIRating = accurateDriverData.currentIRating;
        }
        
        // Update current safety rating with the accurate value if available
        if (accurateDriverData.currentSafetyRating && accurateDriverData.currentSafetyRating !== 'N/A') {
          actualCurrentSafetyRating = accurateDriverData.currentSafetyRating;
        }
        
        // Get the accurate race pace history as well
        racePaceHistory = accurateDriverData.racePaceHistory || [];
        
        console.log('✅ Successfully fetched accurate chart data:', {
          categories: Object.keys(iratingHistories),
          safetyRatingPoints: safetyRatingHistory.length,
          racePacePoints: racePaceHistory.length,
          currentIRating: actualCurrentIRating
        });
      } else {
        console.warn('⚠️ Core API returned null, falling back to empty histories');
      }

      // Transform member profile to Driver format
      const data: Driver = {
        id: memberProfile.cust_id,
        name: memberProfile.display_name,
        currentIRating: actualCurrentIRating,
        currentSafetyRating: actualCurrentSafetyRating,
        avgRacePace: accurateDriverData?.avgRacePace || '1:30.000', // Use accurate data if available
        iratingHistories: iratingHistories,
        safetyRatingHistory: safetyRatingHistory,
        racePaceHistory: racePaceHistory || [],
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

// Enhanced car info helper function using unified API and CategoryMappingService
async function getCarInfo(carId: number): Promise<{ car_name: string; category: string }> {
  try {
    // Use the unified API's car lookup system with caching
    const carName = await getCarName(carId);
    
    // Use the CategoryMappingService for category lookup
    const category = await CategoryMappingService.getCarCategory(carId);
    if (category) {
      return { car_name: carName, category };
    }
    
    // Fallback: Get car data and use mapping function
    const cars = await getAllCars();
    const carData = cars.find((car: any) => car.carId === carId);
    
    if (carData) {
      const mappedCategory = await mapCarToCategory(carData);
      return { car_name: carName, category: mappedCategory };
    } else {
      return { car_name: carName, category: 'Sports Car' };
    }
  } catch (error) {
    console.error(`Error getting car info for ID ${carId}:`, error);
    return { car_name: `Car ${carId}`, category: 'Sports Car' };
  }
}

// Helper function to map car to category using the unified CategoryMappingService
async function mapCarToCategory(car: any): Promise<string> {
  try {
    // Use the unified category mapping service
    const category = await CategoryMappingService.getCarCategory(car.carId);
    if (category) {
      return category;
    }
    
    // If carId lookup fails, fall back to manual analysis using the service's logic
    // This maintains compatibility while using the service
    if (car.categories && car.categories.length > 0) {
      const categoryInfo = car.categories[0];
      if (categoryInfo.categoryName) {
        const mapped = await CategoryMappingService.mapApiCategoryToRaceCategory(categoryInfo.categoryName);
        if (mapped) return mapped;
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
  } catch (error) {
    console.error('Error mapping car to category:', error);
    return 'Sports Car'; // Safe fallback
  }
}

export async function getPersonalBestsData(
  custId: number,
  forceRefresh: boolean = false
): Promise<{ data: DriverPersonalBests | null; error: string | null; fromCache?: boolean; cacheAge?: number }> {
  try {
    const cacheKey = cacheKeys.personalBests(custId);
    if (!forceRefresh) {
      const cacheInfo = cache.getCacheInfo(cacheKey);
      const cached = cache.get<DriverPersonalBests>(cacheKey);
      if (cached) {
        return { data: cached, error: null, fromCache: true, cacheAge: cacheInfo.age };
      }
    }

    console.log(`🏁 Starting enhanced Personal Bests data fetch for custId: ${custId}`);

    // Step 1: Get basic driver info and recent races summary (fast)
    const { data: driver, error: driverError } = await getDriverPageData(custId, forceRefresh);
    if (driverError) {
      // Fallback to expired cache if available
      const expired = cache.getExpired<DriverPersonalBests>(cacheKey);
      if (expired) {
        const cacheInfo = cache.getCacheInfo(cacheKey);
        return { data: expired, error: driverError, fromCache: true, cacheAge: cacheInfo.age };
      }
      return { data: null, error: driverError };
    }

    if (!driver || !driver.recentRaces || driver.recentRaces.length === 0) {
      console.log(`📊 No recent races found for custId: ${custId}`);
      const emptyPersonalBests: DriverPersonalBests = {
        custId,
        driverName: driver?.name || `Driver ${custId}`,
        lastUpdated: new Date().toISOString(),
        dataSource: 'recentRaces',
        seriesBests: {},
        totalRaces: 0,
        totalSeries: 0,
        totalTrackLayouts: 0,
        totalCars: 0,
        fastestLapOverall: 'N/A',
        fastestLapOverallMs: Infinity,
        fastestLapTrack: '',
        fastestLapCar: ''
      };
      cache.set(cacheKey, emptyPersonalBests, cacheTTL.PERSONAL_BESTS);
      return { data: emptyPersonalBests, error: null };
    }

    console.log(`🏎️ Found ${driver.recentRaces.length} recent races, fetching detailed data...`);

    // Step 2: Fetch detailed race data in parallel (with caching)
    const detailedRacesPromises = driver.recentRaces.map(async (race) => {
      try {
        const subsessionId = parseInt(race.id);
        if (isNaN(subsessionId)) {
          console.warn(`Invalid subsessionId for race: ${race.id}`);
          return null;
        }

        // Get detailed race result data (this is cached internally)
        const detailedRace = await getRaceResultData(subsessionId);
        if (!detailedRace) {
          console.warn(`No detailed data available for race ${subsessionId}`);
          return null;
        }

        console.log(`✅ Fetched detailed data for race ${subsessionId} (${detailedRace.trackName})`);
        return detailedRace;
      } catch (error) {
        console.warn(`Failed to fetch detailed data for race ${race.id}:`, error);
        return null;
      }
    });

    // Wait for all detailed race data (parallel fetching)
    const detailedRacesResults = await Promise.allSettled(detailedRacesPromises);
    const detailedRaces = detailedRacesResults
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    const failedFetches = detailedRacesResults.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value === null)
    ).length;

    console.log(`📊 Personal Bests data summary: ${detailedRaces.length} detailed races fetched, ${failedFetches} failed/skipped`);

    // Step 3: Transform detailed race data to Personal Bests
    if (detailedRaces.length === 0) {
      console.log(`⚠️ No detailed race data available for custId: ${custId}`);
        const emptyPersonalBests: DriverPersonalBests = {
          custId,
          driverName: driver.name,
          lastUpdated: new Date().toISOString(),
          dataSource: 'recentRaces',
          seriesBests: {},
          totalRaces: 0,
          totalSeries: 0,
          totalTrackLayouts: 0,
          totalCars: 0,
          fastestLapOverall: 'N/A',
          fastestLapOverallMs: Infinity,
          fastestLapTrack: '',
          fastestLapCar: ''
        };
      cache.set(cacheKey, emptyPersonalBests, cacheTTL.PERSONAL_BESTS);
      return { data: emptyPersonalBests, error: null };
    }

    // Transform using the detailed race data
    const { personalBests } = transformRecentRacesToPersonalBests(
      custId,
      driver.name,
      detailedRaces,
      driver.currentIRating
    );

    console.log(`🏆 Personal Bests transformation complete: ${personalBests.totalSeries} series, ${personalBests.totalRaces} races processed`);

    cache.set(cacheKey, personalBests, cacheTTL.PERSONAL_BESTS);
    return { data: personalBests, error: null };
  } catch (e) {
    console.error('Error in enhanced getPersonalBestsData:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    
    // Try to return expired cache data if available
    try {
      const cacheKey = cacheKeys.personalBests(custId);
      const expired = cache.getExpired<DriverPersonalBests>(cacheKey);
      if (expired) {
        const cacheInfo = cache.getCacheInfo(cacheKey);
        console.log(`🔄 Returning expired cache data due to error`);
        return { data: expired, error: `Error occurred, using cached data: ${message}`, fromCache: true, cacheAge: cacheInfo.age };
      }
    } catch (cacheError) {
      console.error('Error accessing expired cache:', cacheError);
    }
    
    return { data: null, error: message };
  }
}


