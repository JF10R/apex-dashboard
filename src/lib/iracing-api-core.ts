/**
 * iRacing API Integration - Core Module
 * 
 * This module handles authentication and data retrieval from the iRacing API.
 * This is NOT a server component file so it can export classes and constants.
 * 
 * IMPORTANT: CAPTCHA Requirements
 * ================================
 * iRacing may require CAPTCHA verification when:
 * - Logging in from a new location/device
 * - After multiple failed login attempts  
 * - As a random security measure
 * 
 * If you see "recaptcha verification required" errors:
 * 1. Open https://members.iracing.com/ in your browser
 * 2. Log in manually with your credentials
 * 3. Complete any CAPTCHA challenges
 * 4. Wait a few minutes, then restart your dev server
 * 
 * This is a security feature that cannot be bypassed programmatically.
 */

// START FETCH PATCH
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache) {
    console.log('[FETCH PATCH] Removing cache option from fetch call to:', url.toString());
    const { cache, ...restOfOptions } = options;
    return originalFetch(url, restOfOptions);
  }
  return originalFetch(url, options);
};
// END FETCH PATCH

import {
  type Driver,
  type RecentRace,
  type HistoryPoint,
  type RaceParticipant,
  type RaceCategory,
  type Lap,
  type GetResultResponse,
  type LapDataItem,
  GetResultResponseSchema,
  type MemberSummaryResponse,
  type MemberStats,
} from '@/lib/iracing-types'
import { 
  transformIracingRaceResult,
  validateIracingRaceResult,
  extractLapDataFromResponse,
  validateLapDataResponse,
  formatLapTimeFrom10000ths,
  formatLapTime,
  lapTimeToSeconds,
  getSeasonFromDate,
  transformLapData, 
} from '@/lib/iracing-data-transform'
import IracingAPI from 'iracing-api'

// Import persistent authentication
import { 
  ensureApiInitialized, 
  ApiError, 
  ApiErrorType,
  forceRefreshSession,
  getSessionStatus,
  clearSession,
  getAuthConfig
} from './iracing-auth-persistent'

// Import category mapping service
import { CategoryMappingService } from './category-mapping-service'

// Re-export CategoryMappingService for convenience
export { CategoryMappingService }

// Re-export for convenience
export { 
  ApiError, 
  ApiErrorType,
  forceRefreshSession,
  getSessionStatus,
  clearSession,
  getAuthConfig
}

// Progressive loading types
export interface ProgressiveLoadingCallbacks {
  onInitialData: (race: RecentRace) => void;
  onProgress: (processed: number, total: number, currentParticipant?: string) => void;
  onParticipantUpdate: (custId: number, laps: Lap[]) => void;
  onComplete: (race: RecentRace) => void;
  onError: (error: Error) => void;
}

// Re-export transformation utilities for convenience
export {
  formatLapTimeFrom10000ths,
  formatLapTime,
  lapTimeToSeconds,
  getSeasonFromDate,
} from '@/lib/iracing-data-transform'

// Define a more specific type for driver search results
interface IracingDriverSearchResult {
  displayName: string;
  custId: number;
  [key: string]: any; // Allow other properties that might come from the API
}

// #region Interfaces for getRaceResultData API response
interface RawLapData {
  lapTime: number; // Assuming time in 1/10000s or ms, needs formatLapTime
  lapEvents: string[]; // e.g., ["invalid", "lostcontrol"]
  // ... other potential lap properties like pit, offTrack etc.
  [key: string]: any;
}

interface RawParticipantData {
  displayName: string;
  startingPosition: number; // 0-indexed
  finishPosition: number;   // 0-indexed
  incidents: number;
  bestLapTime: number;      // Assuming time in 1/10000s or ms
  newiRating: number;       // Post-race iRating
  laps: RawLapData[];
  // ... other potential participant properties like oldiRating, licenselevel, etc.
  [key: string]: any;
}

interface RawSessionResult {
  simsession_name: string; // e.g. "RACE", "QUALIFY", "PRACTICE" - useful for finding the right session
  results: RawParticipantData[];
  [key: string]: any;
}

interface IracingApiRaceResult {
  startTime: string; // ISO Date string
  seriesName: string;
  track: {
    trackName: string;
    [key: string]: any;
  };
  eventStrengthOfField: number;
  carClassName: string; // Or car_class_name
  sessionResults: RawSessionResult[]; // Array of sessions (practice, qualy, race)
  // ... other potential top-level properties
  [key: string]: any;
}
// #endregion

// #region Interfaces for getDriverData API responses
interface RawRecentRaceSummary {
  subsessionId: number;
  seriesId: number;
  seriesName: string;
  carId: number;
  car: string; // iRacing API provides car name directly in 'car' field!
  carName?: string; // Alternative field name (fallback)
  carClassId: number;
  carClassName: string; // iRacing API also provides car class name!
  sessionStartTime: string;
  startPosition: number;
  finishPosition: number;
  qualifyingTime: number;
  laps: number;
  lapsLed: number;
  incidents: number;
  points: number;
  strengthOfField: number;
  oldiRating: number;
  newiRating: number;
  oldSubLevel: number;
  newSubLevel: number;
  track: {
    trackId: number;
    trackName: string;
  };
  seasonYear: number;
  seasonQuarter: number;
  raceWeekNum: number;
  dropRace: boolean;
  licenseLevel: number;
  category: string; // iRacing API provides this directly - trust it!
  // Potentially other summary fields
  [key: string]: any;
}

interface IracingApiRecentRaces {
  races: RawRecentRaceSummary[];
  [key: string]: any;
}

interface IracingApiChartPoint {
  when: string; // Typically an ISO date string or timestamp
  value: number;
  displayValue?: string; // Optional, sometimes present
  [key: string]: any;
}

interface IracingApiChartData {
  data: IracingApiChartPoint[];
  [key: string]: any;
}

interface IracingApiMemberInfo {
  displayName: string;
  custId: number;
  [key: string]: any;
}

interface IracingApiMemberData {
  members: IracingApiMemberInfo[];
  [key: string]: any;
}

// #endregion

export const searchDriversByName = async (
  query: string
): Promise<{ name: string; custId: number }[]> => {
  if (!query) return []; // Handle empty query separately
  try {
    const currentApi = await ensureApiInitialized();
    // Explicitly type the results from the API call
    const apiResponse = await currentApi.lookup.getDrivers({ searchTerm: query });
    console.log('Direct apiResponse from currentApi.lookup.getDrivers:', apiResponse);

    // Check for any object that has an 'error' property, treating it as an API error response
    if (apiResponse && typeof apiResponse === 'object' && 'error' in apiResponse) {
      console.error(
        'API error object received from lookup.getDrivers. Full error object:',
        JSON.stringify(apiResponse, null, 2) // Log the full error object
      );
      console.error(
        `The error message was: "${(apiResponse as any).message}". ` +
        `This could mean an issue with API session validity or cookie handling by the iracing-api library for this request.`
      );
      return []; // Return empty to gracefully degrade
    }

    const results: IracingDriverSearchResult[] = Array.isArray(apiResponse) ? apiResponse as IracingDriverSearchResult[] : [];

    // Ensure results is an array before slicing and mapping
    return (Array.isArray(results) ? results : [])
      .slice(0, 5) // Limit to 5 results
      .map((d: IracingDriverSearchResult) => ({ name: d.displayName, custId: d.custId }));
  } catch (error) {
    // Check if the error is one of the specific configuration/login errors thrown by ensureApiInitialized
    if (error instanceof ApiError && (
        error.type === ApiErrorType.NOT_CONFIGURED || 
        error.type === ApiErrorType.LOGIN_FAILED ||
        error.type === ApiErrorType.CAPTCHA_REQUIRED ||
        error.type === ApiErrorType.INVALID_CREDENTIALS
       )) {
      // Log the specific configuration/login error message
      console.error(`API error in searchDriversByName: ${error.message}`);
      throw error; // Re-throw these critical errors; the UI or calling layer should handle them.
    }
    // Log other types of errors more comprehensively
    console.error('Error during driver search operation. Full error object:', error);
    if (error && typeof error === 'object') {
      // Standard error properties
      if ('message' in error) console.error('Error message:', (error as Error).message);
      if ('stack' in error) console.error('Error stack:', (error as Error).stack);

      // Axios-like error structure or common API client error structures
      if ('response' in error && (error as any).response) {
        console.error('Error response:', (error as any).response);
        if ((error as any).response.data) {
          console.error('Error response data:', (error as any).response.data);
        }
      }
      // Other potential nested data properties
      if ('data' in error) {
        console.error('Error data:', (error as any).data);
      }
    }
    return []; // Return empty for these other errors, maintaining graceful degradation for this function.
  }
};

// Cache for getRaceResultData promises to prevent thundering herd and cache results.
// Using a simple Map; for a production app with many users/subs, a more robust cache (e.g., LRU, TTL, or Next.js specific caching) would be better.
const raceResultPromiseCache = new Map<number, Promise<RecentRace | null>>();

// Cache for individual participant lap data to avoid redundant API calls
// Key format: `${subsessionId}-${custId}-${simsessionNumber}`
const lapDataCache = new Map<string, LapDataItem[]>();
const LAP_DATA_CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache for lap data
const lapDataCacheExpiry = new Map<string, number>();

// Rate limiting configuration for lap data fetching
const RATE_LIMIT_CONFIG = {
  ENABLED: process.env.IRACING_ENABLE_LAP_DATA_FETCHING !== 'false', // Allow disabling completely
  DELAY_MS: parseInt(process.env.IRACING_RATE_LIMIT_DELAY_MS || '600'), // Default 600ms between calls
  MAX_PARTICIPANTS: parseInt(process.env.IRACING_MAX_LAP_DATA_PARTICIPANTS || '50'), // Safety limit
  BATCH_SIZE: parseInt(process.env.IRACING_LAP_DATA_BATCH_SIZE || '5'), // Process in small batches
  RETRY_DELAY_MULTIPLIER: parseInt(process.env.IRACING_RETRY_DELAY_MULTIPLIER || '2'), // Multiply delay on rate limit errors
};

/**
 * Generate cache key for lap data
 */
const getLapDataCacheKey = (subsessionId: number, custId: number, simsessionNumber: number): string => {
  return `${subsessionId}-${custId}-${simsessionNumber}`;
};

/**
 * Check if cached lap data is still valid
 */
const isLapDataCacheValid = (cacheKey: string): boolean => {
  const expiry = lapDataCacheExpiry.get(cacheKey);
  return expiry !== undefined && Date.now() < expiry;
};

/**
 * Get cached lap data if valid
 */
const getCachedLapData = (subsessionId: number, custId: number, simsessionNumber: number): LapDataItem[] | null => {
  const cacheKey = getLapDataCacheKey(subsessionId, custId, simsessionNumber);
  if (isLapDataCacheValid(cacheKey) && lapDataCache.has(cacheKey)) {
    console.log(`[LAP CACHE] Using cached lap data for ${custId} in subsession ${subsessionId}`);
    return lapDataCache.get(cacheKey)!;
  }
  return null;
};

/**
 * Cache lap data with expiry
 */
const cacheLapData = (subsessionId: number, custId: number, simsessionNumber: number, lapData: LapDataItem[]): void => {
  const cacheKey = getLapDataCacheKey(subsessionId, custId, simsessionNumber);
  lapDataCache.set(cacheKey, lapData);
  lapDataCacheExpiry.set(cacheKey, Date.now() + LAP_DATA_CACHE_DURATION);
  console.log(`[LAP CACHE] Cached ${lapData.length} lap items for ${custId} in subsession ${subsessionId}`);
};

export const getRaceResultData = async (
  subsessionId: number
): Promise<RecentRace | null> => {
  if (raceResultPromiseCache.has(subsessionId)) {
    // console.log(`Returning cached promise for race result subsessionId ${subsessionId}`);
    return raceResultPromiseCache.get(subsessionId)!;
  }

  const promise = (async (): Promise<RecentRace | null> => {
    try {
      const currentApi = await ensureApiInitialized();
      const resultResponse: unknown = await currentApi.results.getResult({ subsessionId });
      console.log('Raw getResult response for subsessionId ' + subsessionId + ':', JSON.stringify(resultResponse, null, 2));
      
      // Validate the response structure using our schema
      if (!validateIracingRaceResult(resultResponse)) {
        console.warn(`Invalid result data structure from API for subsessionId ${subsessionId}`);
        console.warn('Validation error details:', resultResponse);
        
        // Try to work with the raw response if it has the essential fields
        if (resultResponse && typeof resultResponse === 'object' && 
            'subsessionId' in resultResponse && 'sessionResults' in resultResponse) {
          console.log(`Attempting to use raw response for subsessionId ${subsessionId} despite validation failure`);
          // Continue with the raw response
        } else {
          return null;
        }
      }

      const result = resultResponse as GetResultResponse;

      // Find the race session using the transformation utility's logic
      let raceSession = result.sessionResults?.find(
        (s) => s.simsessionName && s.simsessionName.toUpperCase().includes('RACE')
      );

      if (!raceSession && result.sessionResults?.length) {
        // Try other common session names for race sessions
        raceSession = result.sessionResults?.find(
          (s) => s.simsessionName && (
            s.simsessionName.toUpperCase().includes('FEATURE') ||
            s.simsessionName.toUpperCase().includes('MAIN') ||
            s.simsessionName.toUpperCase() === 'R' ||
            s.simsessionName.toUpperCase() === 'RACE SESSION'
          )
        );
        
        if (!raceSession) {
          if (result.sessionResults.length === 1) {
              raceSession = result.sessionResults[0];
          } else {
              console.warn(`No session explicitly named "RACE" found for subsessionId ${subsessionId}. Available sessions:`, 
                result.sessionResults.map(s => s.simsessionName));
              console.warn(`Attempting to find best match by participant count.`);
              // Fallback: pick the session with the most participants, as it's likely the race.
              raceSession = result.sessionResults.reduce((prev, current) =>
                  (prev.results.length > current.results.length) ? prev : current,
                  result.sessionResults[0]
              );
          }
        }
      }

      if (!raceSession || !raceSession.results) {
        console.warn(`Could not determine a valid race session with results for subsessionId ${subsessionId}`);
        return null;
      }

      // Fetch lap data for each participant to get accurate fastest laps
      const lapDataMap = new Map<number, LapDataItem[]>();
      
      // Check if lap data fetching is enabled
      if (!RATE_LIMIT_CONFIG.ENABLED) {
        console.log(`[LAP DATA] Lap data fetching disabled via IRACING_ENABLE_LAP_DATA_FETCHING=false`);
      } else {
        try {
        // Get the session number for the race session
        const raceSessionNumber = result.sessionResults?.findIndex(s => s === raceSession) ?? 0;
        console.log(`[LAP DATA] Fetching lap data for subsessionId ${subsessionId} (${raceSession.results.length} participants)`);
        
        // Rate limiting configuration
        const MAIN_RACE_SESSION = 0;
        const { DELAY_MS, MAX_PARTICIPANTS, BATCH_SIZE, RETRY_DELAY_MULTIPLIER } = RATE_LIMIT_CONFIG;
        
        // Limit participants to prevent runaway API usage
        const participantsToProcess = raceSession.results.slice(0, MAX_PARTICIPANTS);
        console.log(`[RATE LIMIT] Processing ${participantsToProcess.length} participants with ${DELAY_MS}ms delays (batch size: ${BATCH_SIZE})`);
        
        // Process participants in batches with rate limiting
        for (let i = 0; i < participantsToProcess.length; i += BATCH_SIZE) {
          const batch = participantsToProcess.slice(i, i + BATCH_SIZE);
          console.log(`[RATE LIMIT] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(participantsToProcess.length / BATCH_SIZE)} (${batch.length} participants)`);
          
          // Process batch with individual rate limiting
          for (let j = 0; j < batch.length; j++) {
            const participant = batch[j];
            try {
              // Check cache first
              const cachedLapData = getCachedLapData(subsessionId, participant.custId, MAIN_RACE_SESSION);
              if (cachedLapData) {
                lapDataMap.set(participant.custId, cachedLapData);
                console.log(`[LAP CACHE] Using cached lap data for ${participant.custId} (no delay needed)`);
                continue; // Skip rate limiting delay for cached data
              }

              const lapDataResponse = await currentApi.results.getResultsLapData({ 
                customerId: participant.custId,
                subsessionId, 
                simsessionNumber: MAIN_RACE_SESSION
              }, { 
                getAllChunks: true 
              });
              
              // Extract and validate lap data using our utility functions
              const lapDataItems = extractLapDataFromResponse(lapDataResponse);
              console.log(`[LAP DATA DEBUG] Extracted ${lapDataItems.length} lap items for ${participant.custId}`);
              if (validateLapDataResponse(lapDataItems) && lapDataItems.length > 0) {
                lapDataMap.set(participant.custId, lapDataItems);
                // Cache the lap data for future use
                cacheLapData(subsessionId, participant.custId, MAIN_RACE_SESSION, lapDataItems);
                console.log(`[LAP DATA DEBUG] Successfully stored lap data for ${participant.custId}`);
              } else {
                console.log(`[LAP DATA DEBUG] Failed validation or empty data for ${participant.custId}`);
              }
              
              // Rate limiting delay between API calls (not needed for cached data)
              const isNotLastInBatch = j < batch.length - 1;
              const isNotLastOverall = i + j < participantsToProcess.length - 1;
              if (isNotLastInBatch || isNotLastOverall) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
              }
              
            } catch (lapError) {
              // Continue silently if lap data fetch fails for individual participants
              console.warn(`Failed to fetch lap data for participant ${participant.custId}:`, lapError);
              
              // If we get a rate limit error, increase delay for next calls
              if (lapError && typeof lapError === 'object' && 'message' in lapError) {
                const errorMessage = (lapError as Error).message.toLowerCase();
                if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('429')) {
                  console.warn(`[RATE LIMIT] Detected rate limiting, increasing delay to ${DELAY_MS * RETRY_DELAY_MULTIPLIER}ms`);
                  await new Promise(resolve => setTimeout(resolve, DELAY_MS * RETRY_DELAY_MULTIPLIER));
                }
              }
            }
          }
          
          // Longer delay between batches to be extra safe
          if (i + BATCH_SIZE < participantsToProcess.length) {
            console.log(`[RATE LIMIT] Batch complete, waiting ${DELAY_MS}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        }
        
        console.log(`[LAP DATA DEBUG] Completed lap data fetching for ${lapDataMap.size}/${participantsToProcess.length} participants`);
        
        } catch (lapFetchError) {
          console.warn(`[LAP DATA DEBUG] Failed to fetch lap data for subsessionId ${subsessionId}:`, lapFetchError);
          // Continue without lap data
        }
      } // End of RATE_LIMIT_CONFIG.ENABLED check

      // Use the transformation utility to convert to our application format
      const transformedResult = await transformIracingRaceResult(result, subsessionId, lapDataMap);
      
      return transformedResult;

    } catch (error) {
      // If an error occurs, remove the promise from the cache to allow retries.
      // Otherwise, a permanent error for a subsessionId might get stuck in the cache.
      raceResultPromiseCache.delete(subsessionId);

      if (error instanceof ApiError && (
          error.type === ApiErrorType.NOT_CONFIGURED ||
          error.type === ApiErrorType.LOGIN_FAILED ||
          error.type === ApiErrorType.CAPTCHA_REQUIRED ||
          error.type === ApiErrorType.INVALID_CREDENTIALS
         )) {
        console.error(`API error in getRaceResultData for subsessionId ${subsessionId}: ${error.message}`);
        throw error;
      }
      console.error(`Error processing race result for subsessionId ${subsessionId}:`, error);
      return null;
    }
  })();

  raceResultPromiseCache.set(subsessionId, promise);
  return promise;
}

/**
 * Progressive loading version of getRaceResultData that provides real-time updates
 * as lap data is fetched for each participant. Uses cached data when available.
 */
export const getRaceResultDataProgressive = async (
  subsessionId: number,
  callbacks: ProgressiveLoadingCallbacks
): Promise<void> => {
  try {
    // Check if we already have cached data for this subsession
    let cachedRace: RecentRace | null = null;
    if (raceResultPromiseCache.has(subsessionId)) {
      console.log(`[PROGRESSIVE CACHE] Found cached data for subsessionId ${subsessionId}`);
      try {
        cachedRace = await raceResultPromiseCache.get(subsessionId)!;
        if (cachedRace) {
          console.log(`[PROGRESSIVE CACHE] Using cached race data, skipping API call`);
          // Send cached data immediately
          callbacks.onInitialData(cachedRace);
          callbacks.onComplete(cachedRace);
          return;
        }
      } catch (cacheError) {
        console.warn(`[PROGRESSIVE CACHE] Error retrieving cached data, falling back to API:`, cacheError);
        // Remove invalid cache entry
        raceResultPromiseCache.delete(subsessionId);
      }
    }

    const currentApi = await ensureApiInitialized();
    const resultResponse: unknown = await currentApi.results.getResult({ subsessionId });
    
    // Validate the response structure
    if (!validateIracingRaceResult(resultResponse)) {
      if (resultResponse && typeof resultResponse === 'object' && 
          'subsessionId' in resultResponse && 'sessionResults' in resultResponse) {
        console.log(`Using raw response for subsessionId ${subsessionId} despite validation failure`);
      } else {
        throw new Error('Invalid result data structure from API');
      }
    }

    const result = resultResponse as GetResultResponse;

    // Find the race session
    let raceSession = result.sessionResults?.find(
      (s) => s.simsessionName && s.simsessionName.toUpperCase().includes('RACE')
    );

    if (!raceSession && result.sessionResults?.length) {
      raceSession = result.sessionResults?.find(
        (s) => s.simsessionName && (
          s.simsessionName.toUpperCase().includes('FEATURE') ||
          s.simsessionName.toUpperCase().includes('MAIN') ||
          s.simsessionName.toUpperCase() === 'R' ||
          s.simsessionName.toUpperCase() === 'RACE SESSION'
        )
      );
      
      if (!raceSession) {
        if (result.sessionResults.length === 1) {
          raceSession = result.sessionResults[0];
        } else {
          raceSession = result.sessionResults.reduce((prev, current) =>
            (prev.results.length > current.results.length) ? prev : current,
            result.sessionResults[0]
          );
        }
      }
    }

    if (!raceSession || !raceSession.results) {
      throw new Error('Could not determine a valid race session with results');
    }

    // Create initial race data without detailed lap data
    const initialLapDataMap = new Map<number, LapDataItem[]>();
    const initialRace = await transformIracingRaceResult(result, subsessionId, initialLapDataMap);
    
    if (!initialRace) {
      throw new Error('Failed to transform initial race result');
    }

    // Send initial data immediately
    callbacks.onInitialData(initialRace);

    // Cache the initial race data (will be updated with enhanced data later)
    console.log(`[PROGRESSIVE CACHE] Caching initial race data for subsessionId ${subsessionId}`);
    const initialRacePromise = Promise.resolve(initialRace);
    raceResultPromiseCache.set(subsessionId, initialRacePromise);

    // Check if lap data fetching is enabled
    if (!RATE_LIMIT_CONFIG.ENABLED) {
      console.log(`[PROGRESSIVE] Lap data fetching disabled, completing with basic data`);
      callbacks.onComplete(initialRace);
      return;
    }

    // Start progressive lap data loading
    const { DELAY_MS, MAX_PARTICIPANTS, BATCH_SIZE, RETRY_DELAY_MULTIPLIER } = RATE_LIMIT_CONFIG;
    const MAIN_RACE_SESSION = 0;
    const lapDataMap = new Map<number, LapDataItem[]>();
    
    const participantsToProcess = raceSession.results.slice(0, MAX_PARTICIPANTS);
    console.log(`[PROGRESSIVE] Processing ${participantsToProcess.length} participants progressively`);
    
    let processedCount = 0;
    
    // Process participants in batches
    for (let i = 0; i < participantsToProcess.length; i += BATCH_SIZE) {
      const batch = participantsToProcess.slice(i, i + BATCH_SIZE);
      
      // Process batch with individual rate limiting
      for (const participant of batch) {
        try {
          callbacks.onProgress(processedCount, participantsToProcess.length, participant.displayName);
          
          // Check cache first
          const cachedLapData = getCachedLapData(subsessionId, participant.custId, MAIN_RACE_SESSION);
          if (cachedLapData) {
            lapDataMap.set(participant.custId, cachedLapData);
            console.log(`[PROGRESSIVE CACHE] Using cached lap data for ${participant.custId}`);
            
            // Transform lap data and send participant update
            const transformedLaps = transformLapData(cachedLapData);
            callbacks.onParticipantUpdate(participant.custId, transformedLaps);
            
            processedCount++;
            continue;
          }
          
          const lapDataResponse = await currentApi.results.getResultsLapData({ 
            customerId: participant.custId,
            subsessionId, 
            simsessionNumber: MAIN_RACE_SESSION
          }, { 
            getAllChunks: true 
          });
          
          const lapDataItems = extractLapDataFromResponse(lapDataResponse);
          if (validateLapDataResponse(lapDataItems) && lapDataItems.length > 0) {
            lapDataMap.set(participant.custId, lapDataItems);
            
            // Cache the lap data for future use
            cacheLapData(subsessionId, participant.custId, MAIN_RACE_SESSION, lapDataItems);
            
            // Transform lap data and send participant update
            const transformedLaps = transformLapData(lapDataItems);
            callbacks.onParticipantUpdate(participant.custId, transformedLaps);
          }
          
          processedCount++;
          
          // Rate limiting delay
          if (processedCount < participantsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
          
        } catch (lapError) {
          console.warn(`Failed to fetch lap data for participant ${participant.custId}:`, lapError);
          
          // Handle rate limiting
          if (lapError && typeof lapError === 'object' && 'message' in lapError) {
            const errorMessage = (lapError as Error).message.toLowerCase();
            if (errorMessage.includes('rate') || errorMessage.includes('limit') || errorMessage.includes('429')) {
              console.warn(`[PROGRESSIVE] Rate limiting detected, increasing delay`);
              await new Promise(resolve => setTimeout(resolve, DELAY_MS * RETRY_DELAY_MULTIPLIER));
            }
          }
          
          processedCount++;
        }
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < participantsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
    
    // Create final enhanced race data
    const finalRace = await transformIracingRaceResult(result, subsessionId, lapDataMap);
    if (!finalRace) {
      throw new Error('Failed to transform final race result');
    }
    
    // Cache the final enhanced race data for future use
    console.log(`[PROGRESSIVE CACHE] Caching enhanced race data for subsessionId ${subsessionId}`);
    const finalRacePromise = Promise.resolve(finalRace);
    raceResultPromiseCache.set(subsessionId, finalRacePromise);
    
    callbacks.onComplete(finalRace);
    console.log(`[PROGRESSIVE] Completed lap data loading for ${lapDataMap.size}/${participantsToProcess.length} participants`);
    
  } catch (error) {
    console.error(`[PROGRESSIVE] Error in progressive race loading for subsessionId ${subsessionId}:`, error);
    // Remove failed entry from cache to allow retries
    raceResultPromiseCache.delete(subsessionId);
    callbacks.onError(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
};

/**
 * Search for members/drivers by name
 * Enhanced version that unifies the search functionality from the modular API
 */
export const searchMembers = async (searchTerm: string): Promise<Array<{ display_name: string; cust_id: number }>> => {
  try {
    const currentApi = await ensureApiInitialized();
    const results = await currentApi.lookup.getDrivers({ searchTerm });
    
    // Check for API error responses
    if (results && typeof results === 'object' && 'error' in results) {
      console.error('API error in searchMembers:', (results as any).message);
      return [];
    }
    
    // Transform results to expected format
    const drivers = Array.isArray(results) ? results : [];
    return drivers.map((driver: any) => ({
      display_name: driver.displayName || driver.display_name,
      cust_id: driver.custId || driver.cust_id
    }));
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in searchMembers: ${error.message}`);
      throw error;
    }
    console.error('Error in searchMembers:', error);
    return [];
  }
};

/**
 * Get member profile data
 * Enhanced version that unifies the member data fetching from the modular API
 */
export const getMemberProfile = async (custId: number): Promise<any | null> => {
  try {
    const currentApi = await ensureApiInitialized();
    const response = await currentApi.member.getMemberData({ customerIds: [custId.toString()] });
    
    // Extract the member data from the response
    if (response && Array.isArray(response.members) && response.members.length > 0) {
      const member = response.members[0];
      return {
        cust_id: member.custId || member.cust_id,
        display_name: member.displayName || member.display_name,
        first_name: member.firstName || member.first_name,
        last_name: member.lastName || member.last_name,
        club_id: member.clubId || member.club_id,
        club_name: member.clubName || member.club_name,
        ai_enabled: member.aiEnabled || member.ai_enabled || false,
        flags: member.flags || 0,
        // Include other member fields that might be present
        ...member
      };
    }
    
    return null;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in getMemberProfile: ${error.message}`);
      throw error;
    }
    console.error('Error in getMemberProfile:', error);
    return null;
  }
};

/**
 * Get member recent races  
 * Enhanced version that unifies the recent races fetching from the modular API
 */
export const getMemberRecentRaces = async (custId: number): Promise<any[]> => {
  try {
    const currentApi = await ensureApiInitialized();
    const response = await currentApi.stats.getMemberRecentRaces({ customerId: custId });
    
    // Transform the response to expected format
    if (response && Array.isArray(response.races)) {
      return response.races.map((race: any) => ({
        subsession_id: race.subsessionId || race.subsession_id,
        series_id: race.seriesId || race.series_id,
        series_name: race.seriesName || race.series_name,
        season_id: race.seasonId || race.season_id,
        race_week_num: race.raceWeekNum || race.race_week_num,
        event_type: race.eventType || race.event_type,
        event_type_name: race.eventTypeName || race.event_type_name,
        start_time: race.sessionStartTime || race.start_time,
        finish_position: race.finishPosition || race.finish_position,
        starting_position: race.startPosition || race.starting_position,
        car_id: race.carId || race.car_id,
        car_name: race.carName || race.car_name,
        track_id: race.track?.trackId || race.track_id,
        track_name: race.track?.trackName || race.track_name,
        incidents: race.incidents,
        strength_of_field: race.strengthOfField || race.strength_of_field,
        old_irating: race.oldiRating || race.old_irating,
        new_irating: race.newiRating || race.new_irating,
        old_safety_rating: race.oldSubLevel || race.old_safety_rating,
        new_safety_rating: race.newSubLevel || race.new_safety_rating,
        license_level: race.licenseLevel || race.license_level,
        seasonYear: race.seasonYear,
        seasonQuarter: race.seasonQuarter,
        // Include other race fields
        ...race
      }));
    }
    
    return [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in getMemberRecentRaces: ${error.message}`);
      throw error;
    }
    console.error('Error in getMemberRecentRaces:', error);
    return [];
  }
};

/**
 * Get member stats data
 * Enhanced version that provides member statistics
 */
export const getMemberStats = async (custId: number): Promise<any[]> => {
  try {
    const currentApi = await ensureApiInitialized();
    const response = await currentApi.stats.getMemberSummary({ customerId: custId });
    
    // Transform response to expected format
    if (response && typeof response === 'object') {
      // The member summary might contain stats for different categories
      // Return as array for consistency with existing code
      return [response];
    }
    
    return [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in getMemberStats: ${error.message}`);
      throw error;
    }
    console.error('Error in getMemberStats:', error);
    return [];
  }
};

/**
 * Get all cars data
 * Enhanced version that uses the existing car caching system
 */
export const getAllCars = async (): Promise<any[]> => {
  try {
    const currentApi = await ensureApiInitialized();
    const response = await currentApi.car.getCars();
    
    if (Array.isArray(response)) {
      return response.map((car: any) => ({
        carId: car.carId || car.car_id,
        carName: car.carName || car.car_name,
        carNameAbbreviated: car.carNameAbbreviated || car.car_name_abbreviated,
        carDirpath: car.carDirpath || car.car_dirpath,
        carTypes: car.carTypes || car.car_types || [],
        packageId: car.packageId || car.package_id,
        retired: car.retired || false,
        // Include categories if present
        categories: car.categories || [],
        // Include all original fields for compatibility
        ...car
      }));
    }
    
    return [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in getAllCars: ${error.message}`);
      throw error;
    }
    console.error('Error in getAllCars:', error);
    return [];
  }
};

/**
 * Get all categories data
 * Enhanced version that uses the existing constants caching system
 */
export const getAllCategories = async (): Promise<any[]> => {
  try {
    const currentApi = await ensureApiInitialized();
    const response = await currentApi.constants.getCategories();
    
    if (Array.isArray(response)) {
      return response;
    }
    
    return [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error in getAllCategories: ${error.message}`);
      throw error;
    }
    console.error('Error in getAllCategories:', error);
    return [];
  }
};


export const getDriverData = async (custId: number): Promise<Driver | null> => {
  try {
    const currentApi = await ensureApiInitialized();

    // Use standard APIs for now with enhanced logging  
    const [
      memberDataResponse,
      memberStatsResponseRaw,
      recentRacesRawResponse,
    ] = await Promise.all([
      currentApi.member.getMemberData({ customerIds: [custId.toString()] }),
      currentApi.stats.getMemberSummary({ customerId: custId }),
      currentApi.stats.getMemberRecentRaces({ customerId: custId }),
    ]);

    // Log the responses
    console.log('Raw memberDataResponse:', JSON.stringify(memberDataResponse, null, 2));
    console.log('Raw memberStatsResponse:', JSON.stringify(memberStatsResponseRaw, null, 2));
    console.log('Raw recentRacesResponse:', JSON.stringify(recentRacesRawResponse, null, 2));

    const memberData: IracingApiMemberData | null = memberDataResponse as any;
    const memberStatsResponse: any = memberStatsResponseRaw;
    const recentRacesRaw: IracingApiRecentRaces | null = recentRacesRawResponse as any;

    if (!memberData?.members?.[0]) {
      console.warn(`Initial member data not found for custId ${custId}. Check raw logs.`);
      throw new Error('Driver not found or data structure unexpected');
    }
    const driverInfo = memberData.members[0];
    const driverName = driverInfo.displayName;

    // Log first race summary to verify API provides car name directly  
    if ((recentRacesRaw?.races || []).length > 0) {
      const firstRace = (recentRacesRaw?.races || [])[0];
      console.log('✅ Full first race object from API:', JSON.stringify(firstRace, null, 2));
      console.log('✅ API car name fields available:', JSON.stringify({
        carId: firstRace.carId,
        car: firstRace.car, // Primary field used for car names
        carName: firstRace.carName, // Alternative field name
        carClassId: firstRace.carClassId,
        carClassName: firstRace.carClassName,
        // Show all car-related fields
        carFields: Object.keys(firstRace).filter(key => key.toLowerCase().includes('car'))
      }, null, 2));
      
      // Additional debugging: log what the final car assignment will be  
      let debugCarName: string;
      if (firstRace.carId) {
        debugCarName = await getCarName(firstRace.carId);
        console.log('🚗 Final car assignment for first race:', debugCarName);
        console.log('🔍 Used car lookup for carId:', firstRace.carId, '-> Car name:', debugCarName);
      } else {
        debugCarName = firstRace.car || firstRace.carName || firstRace.carClassName || 'Unknown Car';
        console.log('🚗 Final car assignment for first race (fallback):', debugCarName);
      }
      console.log('🔍 Individual field values:', {
        'firstRace.car': firstRace.car,
        'firstRace.carName': firstRace.carName,
        'firstRace.carClassName': firstRace.carClassName,
        'firstRace.carId': firstRace.carId
      });
    }

    // Fetch more races for comprehensive season analysis - increase from 20 to 100
    // This ensures that when users filter by specific seasons, they have access to complete season data
    const racesToFetch = Math.min((recentRacesRaw?.races || []).length, 100);
    
    // Process recent races with car name lookup
    const recentRacesPromises = (recentRacesRaw?.races || []).slice(0, racesToFetch).map(async (raceSummary: RawRecentRaceSummary) => {
      const { year, season } = getSeasonFromDate(new Date(raceSummary.sessionStartTime || new Date()));
      
      // ✅ iRacing API ALWAYS provides accurate category - trust it completely!
      const category = raceSummary.category as RaceCategory;

      // 🚗 Use car lookup if we have carId, otherwise fallback to existing fields
      let carName: string;
      if (raceSummary.carId) {
        carName = await getCarName(raceSummary.carId);
      } else {
        carName = raceSummary.car || raceSummary.carName || raceSummary.carClassName || 'Unknown Car';
      }

      const recentRace: RecentRace = {
        id: raceSummary.subsessionId.toString(),
        trackName: raceSummary.track?.trackName || 'Unknown Track',
        seriesName: raceSummary.seriesName || 'Unknown Series',
        date: raceSummary.sessionStartTime || new Date().toISOString(),
        car: carName,
        category,
        year, // from getSeasonFromDate
        season, // from getSeasonFromDate
        startPosition: raceSummary.startPosition !== undefined ? raceSummary.startPosition + 1 : 0, // Adjust 0-index
        finishPosition: raceSummary.finishPosition !== undefined ? raceSummary.finishPosition + 1 : 0, // Adjust 0-index
        incidents: raceSummary.incidents || 0,
        fastestLap: 'N/A',
        strengthOfField: raceSummary.strengthOfField || 0,
        participants: [],
        avgRaceIncidents: raceSummary.incidents || 0, // Placeholder
        avgRaceLapTime: 'N/A', // Placeholder
        lapsLed: raceSummary.lapsLed || 0,
        iratingChange: (raceSummary.oldiRating !== -1 && raceSummary.newiRating !== -1)
                      ? raceSummary.newiRating - raceSummary.oldiRating
                      : 0,
        safetyRatingChange: raceSummary.oldSubLevel !== undefined && raceSummary.newSubLevel !== undefined
                            ? ((raceSummary.newSubLevel - raceSummary.oldSubLevel) / 100).toFixed(2)
                            : "0.00",
        avgLapTime: 'N/A',
      };
      
      return recentRace;
    });
    
    // Await all car name lookups
    const recentRaces: RecentRace[] = await Promise.all(recentRacesPromises);
    
    console.log(`Fetched ${recentRaces.length} races (increased from 20 limit for better season filtering)`);
    
    // Log season distribution for debugging
    const seasonStats = recentRaces.reduce((acc, race) => {
      const key = `${race.year} ${race.season}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Season distribution in fetched races:', seasonStats);

    // Check for incomplete season data and warn users
    const season2025S2Races = recentRaces.filter(race => race.year === 2025 && race.season === 'Season 2');
    if (season2025S2Races.length > 0) {
      console.warn(`⚠️  API LIMITATION: Only ${season2025S2Races.length} Season 2 races available from iRacing API.`);
      console.warn(`   This may represent a small subset of actual Season 2 participation.`);
      console.warn(`   iRacing's getMemberRecentRaces API only returns the most recent races,`);
      console.warn(`   not comprehensive seasonal data. Series performance calculations for`);
      console.warn(`   Season 2 are based on available data only.`);
    }
    
    // Determine which racing categories this driver actually participates in
    const activeCategories = [...new Set(recentRaces.map(race => race.category))];
    console.log('Active racing categories for driver:', activeCategories);

    // Fetch iRating chart data for each active category using API-based category lookup
    const chartDataPromises = activeCategories.map(async (category) => {
      // Use the new unified category mapping service with fallback
      const categoryId = await CategoryMappingService.getCategoryIdWithFallback(category);
      if (!categoryId) {
        console.warn(`No category ID found for category: ${category} (including fallback)`);
        return { category, data: [] };
      }
      
      return await fetchChartDataForCategory(currentApi, custId, category, categoryId);
    });

    // Helper function to fetch chart data for a category
    async function fetchChartDataForCategory(api: any, custId: number, category: string, categoryId: number) {
      try {
        const response = await api.member.getMemberChartData({ 
          customerId: custId, 
          chartType: 1, 
          categoryId 
        });
        return { category, data: response?.data || [] };
      } catch (error) {
        console.warn(`Failed to fetch chart data for category ${category} (ID: ${categoryId}):`, error);
        return { category, data: [] };
      }
    }

    // Also fetch safety rating data (try to use Road category, fallback to ID 2)
    let srCategoryId = await CategoryMappingService.getCategoryIdWithFallback('Road') || 2; // Default to Road category
    const srChartPromise = currentApi.member.getMemberChartData({ 
      customerId: custId, 
      chartType: 3, 
      categoryId: srCategoryId
    });

    const [chartDataResults, srChartResponse] = await Promise.all([
      Promise.all(chartDataPromises),
      srChartPromise
    ]);

    // Build iRating histories organized by racing category
    const iratingHistories: Record<string, HistoryPoint[]> = {};
    
    // Calculate the cutoff date for the most recent 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    for (const { category, data } of chartDataResults) {
      const chartData = data as IracingApiChartPoint[];
      iratingHistories[category] = (chartData || [])
        .map((p: IracingApiChartPoint) => ({
          // Store the original date for proper sorting
          originalDate: new Date(p.when),
          month: new Date(p.when).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
          value: p.value,
        }))
        // Filter to show only the most recent 12 months
        .filter(p => p.originalDate >= twelveMonthsAgo)
        // Sort by actual date, not the formatted string
        .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime())
        // Remove the originalDate property from the final result
        .map(({ originalDate, ...point }) => point);
    }

    const srChart: IracingApiChartData | null = srChartResponse as any;

    const safetyRatingHistory: HistoryPoint[] = (srChart?.data || [])
      .map((p: IracingApiChartPoint) => ({
        // Store the original date for proper sorting
        originalDate: new Date(p.when),
        month: new Date(p.when).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        value: p.value / 100, // SR values are often *100 in API
      }))
      // Filter to show only the most recent 12 months
      .filter(p => p.originalDate >= twelveMonthsAgo)
      // Sort by actual date, not the formatted string
      .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime())
      // Remove the originalDate property from the final result
      .map(({ originalDate, ...point }) => point);

    const racePaceHistory: HistoryPoint[] = recentRaces
      .map(r => {
        const paceInSeconds = lapTimeToSeconds(r.avgLapTime); // r.avgLapTime is string "M:SS.mmm"
        return {
          month: new Date(r.date).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: paceInSeconds,
        };
      })
      .filter(p => p.value !== null && !isNaN(p.value) && p.value > 0); // Ensure value is valid
    
    const avgRacePaceSeconds = racePaceHistory.length > 0
        ? racePaceHistory.reduce((acc, p) => acc + p.value, 0) / racePaceHistory.length
        : NaN; // Use NaN if no valid history points, formatLapTime will handle it

    // Get current stats from member data and recent race iRating changes
    console.log('memberStatsData structure for debugging:', JSON.stringify(memberStatsResponse, null, 2));
    
    // Try to get current iRating from member data first
    let currentIRating = 0;
    
    // Check member data for current iRating
    if (memberData?.members?.[0]?.irating) {
      currentIRating = memberData.members[0].irating;
      console.log('Found current iRating from member data:', currentIRating);
    }
    
    // If not found, try recent race summary data (use the most recent newIRating)
    if (currentIRating === 0 && recentRaces.length > 0) {
      const latestRace = recentRaces[0]; // Most recent race
      if (typeof latestRace.iratingChange === 'number') {
        // Calculate current iRating from the race summary if available
        const raceData = (recentRacesRaw?.races || []).find(r => r.subsessionId.toString() === latestRace.id);
        if (raceData?.newiRating && raceData.newiRating > 0) {
          currentIRating = raceData.newiRating;
          console.log('Using most recent race newiRating:', currentIRating);
        }
      }
    }
    
    // Add current iRating as the final point to each category's iRating history
    // This ensures the graph shows the most up-to-date value and matches the displayed current iRating
    if (currentIRating > 0) {
      const currentMonth = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      
      // Add current iRating to each active category's history
      for (const category of Object.keys(iratingHistories)) {
        // Only add if this category has history data and we have a current iRating
        if (iratingHistories[category].length > 0) {
          // Check if the last point is already current month with current value
          const lastPoint = iratingHistories[category][iratingHistories[category].length - 1];
          const isDifferentValue = lastPoint.value !== currentIRating;
          const isDifferentMonth = lastPoint.month !== currentMonth;
          
          // Add current point if it's different from the last point or if it's a new month
          if (isDifferentValue || isDifferentMonth) {
            iratingHistories[category].push({
              month: currentMonth,
              value: currentIRating,
            });
            console.log(`Added current iRating (${currentIRating}) to ${category} history as final point`);
          }
        }
      }
    }

    // For safety rating, we'll use a simpler fallback approach for now
    let currentSafetyRating = 'N/A';
    console.log('Safety rating will be determined from chart data or fallback methods');

    const driver: Driver = {
      id: custId,
      name: driverName,
      currentIRating,
      currentSafetyRating,
      avgRacePace: formatLapTime(avgRacePaceSeconds * 1000), // convert seconds to ms for formatting
      iratingHistories,
      safetyRatingHistory,
      racePaceHistory,
      recentRaces,
    };

    return driver;

  } catch (error) {
     if (error instanceof ApiError && (
        error.type === ApiErrorType.NOT_CONFIGURED ||
        error.type === ApiErrorType.LOGIN_FAILED ||
        error.type === ApiErrorType.CAPTCHA_REQUIRED ||
        error.type === ApiErrorType.INVALID_CREDENTIALS
       )) {
      console.error(`API error in getDriverData for custId ${custId}: ${error.message}`);
      throw error; // Re-throw these specific errors
    }
    if (error instanceof Error && error.message === 'Driver not found or data structure unexpected') {
      console.error(`Driver not found for custId ${custId}: ${error.message}`);
      throw error; // Re-throw driver not found errors
    }
    // Log other generic errors (e.g. network, unexpected API issues from Promise.all)
    console.error(`Generic error fetching or processing data for driver ${custId}:`, error);
    return null; // Graceful failure for other errors
  }
}

// Car lookup interfaces and functions based on official iRacing API types
interface IracingCar {
  carId: number;
  carName: string;
  carNameAbbreviated: string;
  carDirpath: string;
  carTypes: number[];
  packageId: number;
  retired: boolean;
  [key: string]: any;
}

// The getCars() response is just an array of Car objects
type IracingCarsResponse = IracingCar[];

// Cache for car data to avoid repeated API calls
let carsCache: Map<number, string> | null = null;
let carsCacheExpiry: number = 0;
let carsLoadingPromise: Promise<void> | null = null; // Prevent multiple simultaneous loads
const CARS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get car name by car ID from iRacing API
 * Uses efficient caching to avoid repeated API calls for the same car across multiple drivers
 */
export const getCarName = async (carId: number): Promise<string> => {
  try {
    // Check if cache is valid and has the car
    if (carsCache && Date.now() < carsCacheExpiry && carsCache.has(carId)) {
      return carsCache.get(carId)!;
    }

    // Fetch fresh car data if cache is expired or doesn't have the car
    // Use promise to prevent multiple simultaneous loads when processing multiple drivers
    if (!carsLoadingPromise) {
      carsLoadingPromise = loadCarsData();
    }
    await carsLoadingPromise;
    
    if (carsCache && carsCache.has(carId)) {
      return carsCache.get(carId)!;
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
 * Load all cars data from iRacing API and cache it
 * This function is cached and prevents multiple simultaneous API calls
 */
const loadCarsData = async (): Promise<void> => {
  try {
    const iracingApi = await ensureApiInitialized();
    console.log('🚗 Fetching cars data from iRacing API...');
    
    const carsResponse: any = await iracingApi.car.getCars();
    console.log('🔍 Raw cars response structure:', {
      type: typeof carsResponse,
      isArray: Array.isArray(carsResponse),
      length: Array.isArray(carsResponse) ? carsResponse.length : 'N/A',
      firstItem: Array.isArray(carsResponse) && carsResponse.length > 0 ? 
        Object.keys(carsResponse[0]).slice(0, 10) : null
    });
    
    // Create new cache
    carsCache = new Map();
    
    if (Array.isArray(carsResponse) && carsResponse.length > 0) {
      console.log(`✅ Found ${carsResponse.length} cars in response`);
      console.log('🔍 First car object keys:', Object.keys(carsResponse[0]));
      console.log('🔍 First car sample:', JSON.stringify(carsResponse[0], null, 2));
      
      for (const car of carsResponse) {
        // Use the correct field names from the official iRacing API types
        const carId = car.carId;
        const carName = car.carName || car.carNameAbbreviated;
        
        if (carId && carName) {
          carsCache.set(carId, carName);
        }
      }
      console.log(`🗄️ Cached ${carsCache.size} car names`);
    } else {
      console.warn('No cars found in API response or response is not an array');
    }
    
    // Set cache expiry
    carsCacheExpiry = Date.now() + CARS_CACHE_DURATION;
    
  } catch (error) {
    console.error('Error loading cars data from iRacing API:', error);
    // Don't throw - we'll use fallback car names
  } finally {
    // Reset the loading promise so future calls can retry
    carsLoadingPromise = null;
  }
};

/**
 * Pre-warm the car cache by loading all car data
 * Useful for better performance when processing multiple drivers
 */
export const preWarmCarCache = async (): Promise<void> => {
  try {
    if (!carsLoadingPromise && (!carsCache || Date.now() >= carsCacheExpiry)) {
      console.log('🔥 Pre-warming car cache...');
      carsLoadingPromise = loadCarsData();
      await carsLoadingPromise;
      console.log('✅ Car cache pre-warmed successfully');
    } else {
      console.log('💾 Car cache already warm');
    }
  } catch (error) {
    console.error('Failed to pre-warm car cache:', error);
  }
};

/**
 * Get cache statistics for monitoring
 */
export const getCarCacheStats = (): {
  isLoaded: boolean;
  carCount: number;
  isExpired: boolean;
  expiresAt: string | null;
  timeUntilExpiry: string | null;
} => {
  const now = Date.now();
  const isExpired = carsCacheExpiry <= now;
  const timeUntilExpiry = carsCacheExpiry > now 
    ? `${Math.round((carsCacheExpiry - now) / (1000 * 60))} minutes`
    : null;
  
  return {
    isLoaded: carsCache !== null,
    carCount: carsCache?.size || 0,
    isExpired,
    expiresAt: carsCacheExpiry > 0 ? new Date(carsCacheExpiry).toISOString() : null,
    timeUntilExpiry,
  };
};

// Constants lookup interfaces and functions based on official iRacing API types
interface IracingCategory {
  label: string;
  value: number; // This is the categoryId we need
}

interface IracingDivision {
  label: string;
  value: number;
}

interface IracingEventType {
  label: string;
  value: number;
}

// Cache for constants data
let categoriesCache: Map<string, number> | null = null; // label -> categoryId mapping
let categoryIdToLabelCache: Map<number, string> | null = null; // categoryId -> label mapping
let divisionsCache: IracingDivision[] | null = null;
let eventTypesCache: IracingEventType[] | null = null;
let constantsCacheExpiry: number = 0;
let constantsLoadingPromise: Promise<void> | null = null;
const CONSTANTS_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days (constants rarely change)

/**
 * Get category ID by category name from iRacing API
 * Uses efficient caching to avoid repeated API calls
 */
export const getCategoryId = async (categoryName: string): Promise<number | null> => {
  try {
    // Check if cache is valid and has the category
    if (categoriesCache && Date.now() < constantsCacheExpiry && categoriesCache.has(categoryName)) {
      return categoriesCache.get(categoryName)!;
    }

    // Fetch fresh constants data if cache is expired or doesn't have the category
    if (!constantsLoadingPromise) {
      constantsLoadingPromise = loadConstantsData();
    }
    await constantsLoadingPromise;
    
    if (categoriesCache && categoriesCache.has(categoryName)) {
      return categoriesCache.get(categoryName)!;
    }

    // Use the category mapping service for fuzzy matching
    const mappedCategory = await CategoryMappingService.mapApiCategoryToRaceCategory(categoryName);
    if (mappedCategory && categoriesCache) {
      // Try to find the mapped category in our cache
      for (const [apiName, id] of categoriesCache.entries()) {
        const apiMapped = await CategoryMappingService.mapApiCategoryToRaceCategory(apiName);
        if (apiMapped === mappedCategory) {
          return id;
        }
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
 * Get category name by category ID from iRacing API
 */
export const getCategoryName = async (categoryId: number): Promise<string | null> => {
  try {
    // Ensure constants are loaded
    if (!constantsLoadingPromise) {
      constantsLoadingPromise = loadConstantsData();
    }
    await constantsLoadingPromise;
    
    if (categoryIdToLabelCache && categoryIdToLabelCache.has(categoryId)) {
      return categoryIdToLabelCache.get(categoryId)!;
    }

    console.warn(`Category not found for ID ${categoryId}`);
    return null;
    
  } catch (error) {
    console.error(`Error getting category name for ID ${categoryId}:`, error);
    return null;
  }
};

/**
 * Load all constants data from iRacing API and cache it
 */
const loadConstantsData = async (): Promise<void> => {
  try {
    const iracingApi = await ensureApiInitialized();
    console.log('📊 Fetching constants data from iRacing API...');
    
    // Fetch all constants in parallel
    const [categoriesResponse, divisionsResponse, eventTypesResponse] = await Promise.all([
      iracingApi.constants.getCategories(),
      iracingApi.constants.getDivisions(),
      iracingApi.constants.getEventTypes(),
    ]);

    console.log('🔍 Raw constants responses:', {
      categories: categoriesResponse,
      divisions: divisionsResponse,
      eventTypes: eventTypesResponse,
    });
    
    // Process categories
    categoriesCache = new Map();
    categoryIdToLabelCache = new Map();
    
    if (Array.isArray(categoriesResponse)) {
      for (const category of categoriesResponse) {
        if (category.label && typeof category.value === 'number') {
          categoriesCache.set(category.label, category.value);
          categoryIdToLabelCache.set(category.value, category.label);
        }
      }
      console.log(`✅ Cached ${categoriesCache.size} categories`);
      console.log('📋 Available categories:', Array.from(categoriesCache.keys()));
    }
    
    // Process divisions
    if (Array.isArray(divisionsResponse)) {
      divisionsCache = divisionsResponse;
      console.log(`✅ Cached ${divisionsCache.length} divisions`);
    }
    
    // Process event types
    if (Array.isArray(eventTypesResponse)) {
      eventTypesCache = eventTypesResponse;
      console.log(`✅ Cached ${eventTypesCache.length} event types`);
    }
    
    // Set cache expiry
    constantsCacheExpiry = Date.now() + CONSTANTS_CACHE_DURATION;
    
  } catch (error) {
    console.error('Error loading constants data from iRacing API:', error);
    // Don't throw - we'll use fallback mappings
  } finally {
    constantsLoadingPromise = null;
  }
};

/**
 * Get constants cache statistics for monitoring
 */
export const getConstantsCacheStats = (): {
  isLoaded: boolean;
  categoriesCount: number;
  divisionsCount: number;
  eventTypesCount: number;
  isExpired: boolean;
  expiresAt: string | null;
  availableCategories: string[];
} => {
  const now = Date.now();
  const isExpired = constantsCacheExpiry <= now;
  
  return {
    isLoaded: categoriesCache !== null,
    categoriesCount: categoriesCache?.size || 0,
    divisionsCount: divisionsCache?.length || 0,
    eventTypesCount: eventTypesCache?.length || 0,
    isExpired,
    expiresAt: constantsCacheExpiry > 0 ? new Date(constantsCacheExpiry).toISOString() : null,
    availableCategories: categoriesCache ? Array.from(categoriesCache.keys()) : [],
  };
};

/**
 * Pre-warm the constants cache
 */
export const preWarmConstantsCache = async (): Promise<void> => {
  try {
    if (!constantsLoadingPromise && (!categoriesCache || Date.now() >= constantsCacheExpiry)) {
      console.log('🔥 Pre-warming constants cache...');
      constantsLoadingPromise = loadConstantsData();
      await constantsLoadingPromise;
      console.log('✅ Constants cache pre-warmed successfully');
    } else {
      console.log('💾 Constants cache already warm');
    }
  } catch (error) {
    console.error('Failed to pre-warm constants cache:', error);
  }
};

// Enhanced Stats API types based on official iRacing API
interface IracingMemberSummary {
  thisYear: {
    numOfficialSessions: number;
    numLeagueSessions: number;
    numOfficialWins: number;
    numLeagueWins: number;
  };
  custId: number;
}

interface IracingRecentRace {
  seasonId: number;
  seriesId: number;
  seriesName: string;
  carId: number;
  carClassId: number;
  licenseLevel: number;
  sessionStartTime: string;
  winnerGroupId: number;
  winnerName: string;
  winnerLicenseLevel: number;
  startPosition: number;
  finishPosition: number;
  qualifyingTime: number;
  laps: number;
  lapsLed: number;
  incidents: number;
  clubPoints: number;
  points: number;
  strengthOfField: number;
  subsessionId: number;
  oldSubLevel: number;
  newSubLevel: number;
  oldiRating: number;
  newiRating: number;
  track: {
    trackId: number;
    trackName: string;
  };
  dropRace: boolean;
  seasonYear: number;
  seasonQuarter: number;
  raceWeekNum: number;
  [key: string]: any;
}

interface IracingMemberRecentRaces {
  races: IracingRecentRace[];
  custId: number;
}

interface IracingMemberCareer {
  stats: Array<{
    categoryId: number;
    category: string;
    starts: number;
    wins: number;
    top5: number;
    poles: number;
    avgStartPosition: number;
    avgFinishPosition: number;
    laps: number;
    lapsLed: number;
    avgIncidents: number;
    avgPoints: number;
    winPercentage: number;
    top5Percentage: number;
    lapsLedPercentage: number;
    totalClubPoints: number;
  }>;
  custId: number;
}

interface IracingMemberRecap {
  year: number;
  stats: {
    starts: number;
    wins: number;
    top5: number;
    avgStartPosition: number;
    avgFinishPosition: number;
    laps: number;
    lapsLed: number;
    favoriteCar: {
      carId: number;
      carName: string;
      carImage: string;
    };
    favoriteTrack: {
      trackId: number;
      trackName: string;
      configName: string;
      trackLogo: string;
    };
  };
  success: boolean;
  season: null;
  custId: number;
}

// Enhanced Results API implementation
interface IracingEventLogItem {
  subsessionId: number;
  simsessionNumber: number;
  sessionTime: number;
  eventSeq: number;
  eventCode: number;
  groupId: number;
  custId: number;
  lapNumber: number;
  description: string;
  message: string;
  displayName: string;
}

interface IracingEventLogResponse {
  success: boolean;
  chunkInfo?: {
    chunkSize: number;
    numChunks: number;
    rows: number;
    baseDownloadUrl: string;
    chunkFileNames: string[];
  };
  eventLog?: IracingEventLogItem[];
}

interface IracingLapChartDataItem {
  groupId: number;
  name: string;
  custId: number;
  displayName: string;
  lapNumber: number;
  flags: number;
  incident: boolean;
  sessionTime: number;
  sessionStartTime: string | null;
  lapTime: number;
  teamFastestLap: boolean;
  personalBestLap: boolean;
  licenseLevel: number;
  carNumber: string;
  lapEvents: string[];
  lapPosition: number;
  interval: number | null;
  intervalUnits: string | null;
  fastestLap: boolean;
  ai: boolean;
}

interface IracingLapChartDataResponse {
  success: boolean;
  sessionInfo: {
    subsessionId: number;
    sessionId: number;
    simsessionNumber: number;
    simsessionType: number;
    simsessionName: string;
    eventType: number;
    eventTypeName: string;
    startTime: string;
  };
  chunkInfo: {
    chunkSize: number;
    numChunks: number;
    rows: number;
    baseDownloadUrl: string;
    chunkFileNames: string[];
  };
  bestLapNum: number;
  bestLapTime: number;
  bestNlapsNum: number;
  bestNlapsTime: number;
  bestQualLapNum: number;
  bestQualLapTime: number;
  bestQualLapAt: string | null;
  lapChartData?: IracingLapChartDataItem[];
}

// Results cache for better performance
let resultsCache = new Map<string, { data: any; expiry: number }>();
const RESULTS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for results data

/**
 * Get cached results data or fetch from API
 */
const getCachedResults = async <T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  const cached = resultsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data as T;
  }

  const data = await fetcher();
  resultsCache.set(cacheKey, {
    data,
    expiry: Date.now() + RESULTS_CACHE_DURATION
  });

  return data;
};

/**
 * Enhanced event log fetching with caching
 */
export const getResultsEventLog = async (
  subsessionId: number,
  simsessionNumber: number = 0
): Promise<IracingEventLogResponse | null> => {
  try {
    const cacheKey = `event-log-${subsessionId}-${simsessionNumber}`;
    return await getCachedResults(cacheKey, async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🎯 Fetching event log for subsession ${subsessionId}, session ${simsessionNumber}...`);
      
      const response = await iracingApi.results.getResultsEventLog({ 
        subsessionId, 
        simsessionNumber 
      });
      console.log(`✅ Event log fetched for ${subsessionId}`);
      
      return response as IracingEventLogResponse;
    });
  } catch (error) {
    console.error(`Error fetching event log for ${subsessionId}:`, error);
    return null;
  }
};

/**
 * Enhanced lap chart data fetching with caching
 */
export const getResultsLapChartData = async (
  subsessionId: number,
  simsessionNumber: number = 0
): Promise<IracingLapChartDataResponse | null> => {
  try {
    const cacheKey = `lap-chart-${subsessionId}-${simsessionNumber}`;
    return await getCachedResults(cacheKey, async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📊 Fetching lap chart data for subsession ${subsessionId}, session ${simsessionNumber}...`);
      
      const response = await iracingApi.results.getResultsLapChartData({ 
        subsessionId, 
        simsessionNumber 
      });
      console.log(`✅ Lap chart data fetched for ${subsessionId}`);
      
      return response as IracingLapChartDataResponse;
    });
  } catch (error) {
    console.error(`Error fetching lap chart data for ${subsessionId}:`, error);
    return null;
  }
};

/**
 * Enhanced season results fetching with caching
 */
export const getSeasonResults = async (
  seasonId: number,
  eventType: number,
  raceWeekNumber: number
): Promise<any | null> => {
  try {
    const cacheKey = `season-results-${seasonId}-${eventType}-${raceWeekNumber}`;
    return await getCachedResults(cacheKey, async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏆 Fetching season results for season ${seasonId}, week ${raceWeekNumber}...`);
      
      const response = await iracingApi.results.getSeasonResults({ 
        seasonId, 
        eventType, 
        raceWeekNumber 
      });
      console.log(`✅ Season results fetched for ${seasonId}`);
      
      return response;
    });
  } catch (error) {
    console.error(`Error fetching season results for ${seasonId}:`, error);
    return null;
  }
};

/**
 * Enhanced results search functionality
 */
export const searchSeriesResults = async (params: {
  seasonYear?: number;
  seasonQuarter?: number;
  startRangeBegin?: string;
  startRangeEnd?: string;
  finishRangeBegin?: string;
  finishRangeEnd?: string;
  customerId?: number;
  teamId?: number;
  seriesId?: number;
  raceWeekNum?: number;
  officialOnly?: boolean;
  eventTypes?: number[];
  categoryIds?: number[];
}): Promise<any | null> => {
  try {
    const cacheKey = `series-search-${JSON.stringify(params)}`;
    return await getCachedResults(cacheKey, async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🔍 Searching series results with params:`, params);
      
      // Note: This API may not be available in all versions of iracing-api
      // We'll provide a placeholder implementation for now
      console.warn('searchSeriesResults API not available in current iracing-api version');
      return null;
    });
  } catch (error) {
    console.error(`Error searching series results:`, error);
    return null;
  }
};

/**
 * Clear results cache for specific subsession or all
 */
export const clearResultsCache = (subsessionId?: number): void => {
  if (subsessionId) {
    // Clear specific subsession cache
    const keysToDelete = Array.from(resultsCache.keys()).filter(key => 
      key.includes(`-${subsessionId}-`) || key.includes(`-${subsessionId}`)
    );
    keysToDelete.forEach(key => resultsCache.delete(key));
    console.log(`🗑️ Cleared results cache for subsession ${subsessionId}`);
  } else {
    // Clear all cache
    resultsCache.clear();
    console.log(`🗑️ Cleared all results cache`);
  }
};

/**
 * Get results cache statistics
 */
export const getResultsCacheStats = () => {
  const entries = Array.from(resultsCache.entries());
  const activeEntries = entries.filter(([_, { expiry }]) => Date.now() < expiry);
  
  return {
    totalEntries: entries.length,
    activeEntries: activeEntries.length,
    expiredEntries: entries.length - activeEntries.length,
    cacheKeys: entries.map(([key]) => key),
  };
};

/**
 * Clear lap data cache for a specific participant or all lap data
 */
export const clearLapDataCache = (subsessionId?: number, custId?: number, simsessionNumber?: number): void => {
  if (subsessionId !== undefined && custId !== undefined && simsessionNumber !== undefined) {
    // Clear specific participant lap data
    const cacheKey = getLapDataCacheKey(subsessionId, custId, simsessionNumber);
    lapDataCache.delete(cacheKey);
    lapDataCacheExpiry.delete(cacheKey);
    console.log(`[LAP CACHE] Cleared lap data for participant ${custId} in subsession ${subsessionId}`);
  } else if (subsessionId !== undefined) {
    // Clear all lap data for a subsession
    const keysToDelete: string[] = [];
    for (const key of lapDataCache.keys()) {
      if (key.startsWith(`${subsessionId}-`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      lapDataCache.delete(key);
      lapDataCacheExpiry.delete(key);
    });
    console.log(`[LAP CACHE] Cleared ${keysToDelete.length} lap data entries for subsession ${subsessionId}`);
  } else {
    // Clear all lap data
    lapDataCache.clear();
    lapDataCacheExpiry.clear();
    console.log(`[LAP CACHE] Cleared all lap data cache`);
  }
};

/**
 * Get lap data cache statistics
 */
export const getLapDataCacheStats = () => {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  
  for (const [key, expiry] of lapDataCacheExpiry.entries()) {
    if (expiry > now) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }
  
  return {
    totalEntries: lapDataCache.size,
    validEntries,
    expiredEntries,
    cacheDurationMs: LAP_DATA_CACHE_DURATION,
    cacheDurationMinutes: LAP_DATA_CACHE_DURATION / (1000 * 60),
  };
};

/**
 * Clean up expired lap data cache entries
 */
export const cleanupExpiredLapDataCache = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, expiry] of lapDataCacheExpiry.entries()) {
    if (expiry <= now) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    lapDataCache.delete(key);
    lapDataCacheExpiry.delete(key);
  });
  
  if (keysToDelete.length > 0) {
    console.log(`[LAP CACHE] Cleaned up ${keysToDelete.length} expired lap data entries`);
  }
};
