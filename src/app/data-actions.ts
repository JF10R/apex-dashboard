'use server'

import {
  searchMembers,
  getMemberProfile,
  getMemberRecentRaces,
  getSubsessionResults,
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
        recentRaces: recentRaces.map((race: any) => ({
          id: race.subsession_id?.toString() || '0',
          trackName: race.track?.trackName || race.track_name || 'Unknown Track',
          date: race.sessionStartTime || race.start_time || new Date().toISOString(),
          year: new Date(race.sessionStartTime || race.start_time || new Date()).getFullYear(),
          season: `${race.seasonYear || new Date().getFullYear()} Q${race.seasonQuarter || Math.ceil((new Date().getMonth() + 1) / 3)}`,
          category: getCategoryFromSeriesName(race.seriesName || race.series_name || 'Unknown Series'),
          seriesName: race.seriesName || race.series_name || 'Unknown Series',
          startPosition: race.startPosition || race.starting_position || 0,
          finishPosition: race.finishPosition || race.finish_position || 0,
          incidents: race.incidents || 0,
          strengthOfField: race.strengthOfField || race.strength_of_field || 0,
          lapsLed: race.lapsLed || 0,
          fastestLap: '0:00.000', // Not available in this data
          car: getCarNameFromSeriesName(race.seriesName || race.series_name || 'Unknown Car'),
          avgLapTime: '0:00.000', // Not available in this data
          iratingChange: (race.newiRating || race.new_irating || 0) - (race.oldiRating || race.old_irating || 0),
          safetyRatingChange: (race.newSubLevel || race.new_safety_rating || 0) - (race.oldSubLevel || race.old_safety_rating || 0),
          participants: [], // Not available in this data
          avgRaceIncidents: 0, // Not available in this data
          avgRaceLapTime: '0:00.000' // Not available in this data
        })) || []
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

// Helper functions for data transformation
function getCategoryFromSeriesName(seriesName: string): RaceCategory {
  const name = seriesName.toLowerCase();
  
  // Sports Car categories
  if (name.includes('ferrari') || name.includes('gt3') || name.includes('imsa') || 
      name.includes('endurance') || name.includes('sports car') || 
      name.includes('multiclass')) {
    return 'Sports Car';
  }
  
  // Prototype categories
  if (name.includes('prototype')) {
    return 'Prototype';
  }
  
  // Oval categories
  if (name.includes('nascar') || name.includes('xfinity') || name.includes('truck') ||
      name.includes('legends') || name.includes('late model') || name.includes('modified')) {
    return 'Oval';
  }
  
  // Formula Car categories
  if (name.includes('formula') || name.includes('f1') || name.includes('f2') ||
      name.includes('f3') || name.includes('indycar') || name.includes('skip barber') ||
      name.includes('pro mazda') || name.includes('indy pro')) {
    return 'Formula Car';
  }
  
  // Dirt Oval categories
  if (name.includes('dirt')) {
    return 'Dirt Oval';
  }
  
  // Default fallback to Sports Car for mixed or unclear cases
  return 'Sports Car';
}

function getCarNameFromSeriesName(seriesName: string): string {
  const name = seriesName.toLowerCase();
  
  // Extract car name from series name patterns
  if (name.includes('ferrari 296 challenge')) return 'Ferrari 296 Challenge';
  if (name.includes('ferrari 296 gt3')) return 'Ferrari 296 GT3';
  if (name.includes('legends')) return 'Legends Ford \'34 Coupe';
  if (name.includes('nascar')) return 'NASCAR';
  if (name.includes('gt3')) return 'GT3';
  if (name.includes('formula')) return 'Formula Car';
  if (name.includes('indycar')) return 'IndyCar';
  if (name.includes('prototype')) return 'Prototype';
  
  // If we can't extract a specific car name, use the series name
  return seriesName;
}
