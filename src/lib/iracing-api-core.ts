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

// Basic car ID to name mapping - this should be expanded or fetched from API
const CAR_NAMES: Record<number, string> = {
  203: 'Ferrari 296 Challenge',
  5: 'Legends Ford 34 Coupe',
  1: 'Skip Barber RT2000',
  2: 'Mazda MX-5 Cup',
  4: 'Dallara DW12',
  6: 'Stock Car',
  15: 'Formula Vee',
  18: 'Lotus 79',
  19: 'Radical SR8',
  20: 'Corvette C6.R GT1',
  21: 'BMW Z4 GT3',
  30: 'Dallara IndyCar',
  41: 'Porsche 911 GT3 Cup',
  42: 'McLaren MP4-12C GT3',
  45: 'Ferrari 458 Italia GT3',
  58: 'Audi R8 LMS GT3',
  71: 'Formula Renault 2.0',
  72: 'Pro Mazda',
  73: 'Indy Lights',
  79: 'McLaren F1',
  82: 'Toyota Camry',
  91: 'Global Mazda MX-5 Cup',
  93: 'Cadillac CTS-V Racecar',
  96: 'Mercedes AMG GT3',
  98: 'BMW M8 GTE',
  101: 'Ferrari 488 GT3',
  107: 'Audi R18',
  122: 'McLaren 720S GT3',
  140: 'Formula 3.5',
  154: 'Porsche 911 RSR',
  165: 'Super Formula Lights',
  184: 'Lamborghini Huracán GT3 EVO',
  191: 'W12',
  // Add more as needed
};

// Function to get car name from ID
function getCarName(carId: number): string {
  return CAR_NAMES[carId] || `Car ${carId}`;
}
export enum ApiErrorType {
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  LOGIN_FAILED = 'LOGIN_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalResponse?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to create user-friendly error messages
const createUserFriendlyErrorMessage = (type: ApiErrorType): string => {
  switch (type) {
    case ApiErrorType.CAPTCHA_REQUIRED:
      return `
🔒 CAPTCHA Verification Required

iRacing is requesting CAPTCHA verification, which typically happens when:
- Logging in from a new location/device
- After multiple failed login attempts
- As a security measure

To resolve this:
1. Open a web browser and go to https://members.iracing.com/
2. Log in manually with your iRacing credentials
3. Complete the CAPTCHA challenge
4. After successful login, wait a few minutes and try again

This is a security feature from iRacing that cannot be bypassed programmatically.
      `.trim();
    
    case ApiErrorType.INVALID_CREDENTIALS:
      return `
❌ Invalid Credentials

Your iRacing email or password is incorrect. Please:
1. Check your .env.local file for typos
2. Verify your credentials work at https://members.iracing.com/
3. Update your environment variables if needed
      `.trim();
    
    case ApiErrorType.NOT_CONFIGURED:
      return `
⚙️ API Not Configured

iRacing API credentials are missing. Please:
1. Create a .env.local file in your project root
2. Add your iRacing credentials:
   IRACING_EMAIL=your-email@example.com
   IRACING_PASSWORD=your-password
3. Restart your development server
      `.trim();
    
    case ApiErrorType.LOGIN_FAILED:
      return `
🚫 Login Failed

Unable to authenticate with iRacing API. This could be due to:
- Server issues on iRacing's end
- Network connectivity problems
- Account restrictions

Please try again in a few minutes.
      `.trim();
    
    default:
      return 'An unexpected error occurred with the iRacing API.';
  }
};

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
  getCategoryFromSeriesName,
  getSeasonFromDate, 
} from '@/lib/iracing-data-transform'
import IracingAPI from 'iracing-api'

const email = process.env.IRACING_EMAIL ?? null;
const password = process.env.IRACING_PASSWORD ?? null;

let api: IracingAPI | null = null;
let apiInitializationPromise: Promise<void> | null = null;
let apiInitializedSuccessfully = false;

async function initializeAndLogin() {
  if (!email || !password) {
    const error = new ApiError(
      ApiErrorType.NOT_CONFIGURED,
      'iRacing API credentials are not configured.'
    );
    console.warn(createUserFriendlyErrorMessage(ApiErrorType.NOT_CONFIGURED));
    apiInitializedSuccessfully = false;
    return;
  }

  try {
    // Use a temporary instance for login, then assign to the global `api`
    const tempApi = new IracingAPI({ logger: true });
    console.log('Attempting to log in to iRacing API...');
    const loginResponse = await tempApi.login(email, password);
    console.log('Raw login API response:', JSON.stringify(loginResponse, null, 2));

    // Check the actual login response content for success indication
    // Based on the iracing-api library, successful login should have no error property
    if (loginResponse && loginResponse.error) {
      // Case 1: Explicit error in response
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.LOGIN_FAILED,
        'Failed to authenticate with iRacing API: Error in login response.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
      console.error('Full login response:', JSON.stringify(loginResponse, null, 2));
    } else if (loginResponse && loginResponse.verificationRequired === true) {
      // Case 2: Recaptcha is explicitly required
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.CAPTCHA_REQUIRED,
        'iRacing API requires CAPTCHA verification.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.CAPTCHA_REQUIRED));
      console.error('Login response indicating CAPTCHA required:', JSON.stringify(loginResponse, null, 2));
    } else if (loginResponse && loginResponse.message && loginResponse.message.toLowerCase().includes('invalid email address or password')) {
      // Case 3: Invalid credentials
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.INVALID_CREDENTIALS,
        'Invalid iRacing email address or password.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.INVALID_CREDENTIALS));
      console.error('Login response:', JSON.stringify(loginResponse, null, 2));
    } else if (!loginResponse || (loginResponse.authcode !== undefined && loginResponse.authcode === 0 && loginResponse.verificationRequired !== false)) {
      // Case 4: No response or unsuccessful login (authcode 0 usually means failure)
      api = null;
      apiInitializedSuccessfully = false;
      const error = new ApiError(
        ApiErrorType.LOGIN_FAILED,
        'Login unsuccessful - received invalid response from iRacing API.',
        loginResponse
      );
      console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
      console.error('Unexpected login response:', JSON.stringify(loginResponse, null, 2));
    } else {
      // Case 5: Successful login - no error, no verification required, or success indicators present
      api = tempApi;
      apiInitializedSuccessfully = true;
      console.log('✅ iRacing API initialized and login appears successful.');
      console.log('Login response:', JSON.stringify(loginResponse, null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize or login to iRacing API (exception during login call):', error);
    console.error(createUserFriendlyErrorMessage(ApiErrorType.NETWORK_ERROR));
    api = null; // Ensure api is null if login fails
    apiInitializedSuccessfully = false;
    // We don't re-throw here; calling functions will check apiInitializedSuccessfully or use ensureApiInitialized
  }
}

// Immediately attempt to initialize and log in when the module loads.
// This promise can be awaited by functions that need the API.
apiInitializationPromise = initializeAndLogin();

// Helper function for API functions to ensure initialization is complete and successful
async function ensureApiInitialized(): Promise<IracingAPI> {
  if (!apiInitializationPromise) {
    // This case should ideally not happen if apiInitializationPromise is set at module load.
    // However, as a fallback, attempt initialization again.
    console.warn('API initialization promise was not set, attempting to initialize now.');
    apiInitializationPromise = initializeAndLogin();
  }
  await apiInitializationPromise;

  if (!apiInitializedSuccessfully || !api) {
    // Log the specific reason if known
    if (!email || !password) {
      console.error(createUserFriendlyErrorMessage(ApiErrorType.NOT_CONFIGURED));
      throw new ApiError(
        ApiErrorType.NOT_CONFIGURED,
        'iRacing API credentials are not configured.'
      );
    }
    console.error(createUserFriendlyErrorMessage(ApiErrorType.LOGIN_FAILED));
    throw new ApiError(
      ApiErrorType.LOGIN_FAILED,
      'iRacing API not configured or login failed.'
    );
  }
  return api;
}

// Re-export transformation utilities for convenience
export {
  formatLapTimeFrom10000ths,
  formatLapTime,
  lapTimeToSeconds,
  getCategoryFromSeriesName,
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
  carClassId: number;
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
      
      try {
        // Get the session number for the race session
        const raceSessionNumber = result.sessionResults?.findIndex(s => s === raceSession) ?? 0;
        console.log(`[LAP DATA DEBUG] Attempting to fetch lap data for subsessionId ${subsessionId}`);
        console.log(`[LAP DATA DEBUG] Race session found: ${raceSession.simsessionName}`);
        console.log(`[LAP DATA DEBUG] Race session number (index): ${raceSessionNumber}`);
        console.log(`[LAP DATA DEBUG] Number of participants: ${raceSession.results.length}`);
        
        // Fetch lap data for all participants in the race session
        // Using simsessionNumber: 0 which represents the main race session
        const MAIN_RACE_SESSION = 0;
        
        for (const participant of raceSession.results) {
          try {
            const lapDataResponse = await currentApi.results.getResultsLapData({ 
              customerId: participant.custId,
              subsessionId, 
              simsessionNumber: MAIN_RACE_SESSION
            }, { 
              getAllChunks: true 
            });
            
            // Extract and validate lap data using our utility functions
            const lapDataItems = extractLapDataFromResponse(lapDataResponse);
            console.log(`[LAP DATA DEBUG] Raw response for ${participant.custId}:`, JSON.stringify(lapDataResponse, null, 2).substring(0, 500));
            console.log(`[LAP DATA DEBUG] Extracted ${lapDataItems.length} lap items for ${participant.custId}`);
            if (validateLapDataResponse(lapDataItems) && lapDataItems.length > 0) {
              lapDataMap.set(participant.custId, lapDataItems);
              console.log(`[LAP DATA DEBUG] Successfully stored lap data for ${participant.custId}`);
            } else {
              console.log(`[LAP DATA DEBUG] Failed validation or empty data for ${participant.custId}`);
            }
          } catch (lapError) {
            // Continue silently if lap data fetch fails for individual participants
            console.warn(`Failed to fetch lap data for participant ${participant.custId}:`, lapError);
          }
        }
        
      } catch (lapFetchError) {
        console.warn(`[LAP DATA DEBUG] Failed to fetch lap data for subsessionId ${subsessionId}:`, lapFetchError);
        // Continue without lap data
      }

      // Use the transformation utility to convert to our application format
      const transformedResult = transformIracingRaceResult(result, subsessionId, lapDataMap);
      
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


export const getDriverData = async (custId: number): Promise<Driver | null> => {
  try {
    const currentApi = await ensureApiInitialized();

    // First, get recent races to determine what categories the driver actually races in
    const [
      memberDataResponse,
      memberStatsResponseFromPromise,
      recentRacesRawResponse,
    ]: any[] = await Promise.all([
      currentApi.member.getMemberData({ customerIds: [custId.toString()] }),
      currentApi.stats.getMemberSummary({ customerId: custId }),
      currentApi.stats.getMemberRecentRaces({ customerId: custId }),
    ]);

    // Log the raw responses to inspect their structure
    console.log('Raw memberDataResponse:', JSON.stringify(memberDataResponse, null, 2));
    console.log('Raw memberStatsResponseFromPromise:', JSON.stringify(memberStatsResponseFromPromise, null, 2));
    console.log('Raw recentRacesRawResponse:', JSON.stringify(recentRacesRawResponse, null, 2));

    const memberData: IracingApiMemberData | null = memberDataResponse as any;
    const memberStatsResponse: MemberSummaryResponse | null = memberStatsResponseFromPromise as MemberSummaryResponse | null;
    const recentRacesRaw: IracingApiRecentRaces | null = recentRacesRawResponse as any;

    if (!memberData?.members?.[0]) {
      console.warn(`Initial member data not found for custId ${custId}. Check raw logs.`);
      throw new Error('Driver not found or data structure unexpected');
    }
    const driverInfo = memberData.members[0];
    const driverName = driverInfo.displayName;

    // Fetch more races for comprehensive season analysis - increase from 20 to 100
    // This ensures that when users filter by specific seasons, they have access to complete season data
    const racesToFetch = Math.min((recentRacesRaw?.races || []).length, 100);
    const recentRaces: RecentRace[] = (recentRacesRaw?.races || []).slice(0, racesToFetch).map((raceSummary: RawRecentRaceSummary) => {
      const { year, season } = getSeasonFromDate(new Date(raceSummary.sessionStartTime || new Date()));
      // Determine category based on seriesName or fallback
      let category: RaceCategory = getCategoryFromSeriesName(raceSummary.seriesName || '');

      return {
        id: raceSummary.subsessionId.toString(),
        trackName: raceSummary.track?.trackName || 'Unknown Track',
        seriesName: raceSummary.seriesName || 'Unknown Series',
        date: raceSummary.sessionStartTime || new Date().toISOString(),
        car: getCarName(raceSummary.carId),
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
    });
    
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

    // Map racing categories to iRacing API category IDs for chart data
    const categoryIdMapping: Record<RaceCategory, number> = {
      'Sports Car': 2,      // Road
      'Formula Car': 2,     // Road  
      'Prototype': 2,       // Road
      'Oval': 1,           // Oval
      'Dirt Oval': 3,      // Dirt Oval
    };

    // Fetch iRating chart data for each active category
    const chartDataPromises = activeCategories.map(async (category) => {
      const categoryId = categoryIdMapping[category];
      if (!categoryId) {
        console.warn(`No category ID mapping found for category: ${category}`);
        return { category, data: [] };
      }
      
      try {
        const response = await currentApi.member.getMemberChartData({ 
          customerId: custId, 
          chartType: 1, 
          categoryId 
        });
        return { category, data: response?.data || [] };
      } catch (error) {
        console.warn(`Failed to fetch chart data for category ${category}:`, error);
        return { category, data: [] };
      }
    });

    // Also fetch safety rating data (using road/sports car as primary)
    const srChartPromise = currentApi.member.getMemberChartData({ 
      customerId: custId, 
      chartType: 3, 
      categoryId: 2 // Road category for SR
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
    const memberStatsData = memberStatsResponseFromPromise;
    console.log('memberStatsData structure for debugging:', JSON.stringify(memberStatsData, null, 2));
    
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
    
    // If not found, check memberStatsData
    if (currentIRating === 0 && memberStatsData) {
      const currentStats = memberStatsData.stats;
      
      if (currentStats && Array.isArray(currentStats)) {
        // If stats is an array of categories, find Sports Car category (category 2)
        const sportsCarStats = currentStats.find(stat => stat.categoryId === 2);
        currentIRating = sportsCarStats?.iRating ?? currentStats[0]?.iRating ?? 0;
        console.log('Found current iRating from stats array:', currentIRating);
      } else if (currentStats?.iRating) {
        // If stats is a single object
        currentIRating = currentStats.iRating;
        console.log('Found current iRating from single stats object:', currentIRating);
      }
    }

    let currentSafetyRating = 'N/A';
    if (memberStatsData?.stats) {
      const statsSource = Array.isArray(memberStatsData.stats) ? memberStatsData.stats[0] : memberStatsData.stats;
      if (statsSource) {
        let licenseClass = statsSource.licenseClass as string | undefined;
        const srPrime = statsSource.srPrime as number | undefined;
        const srSub = statsSource.srSub as number | undefined;

        if (licenseClass && typeof srPrime === 'number' && typeof srSub === 'number') {
          if (licenseClass.toLowerCase() === 'pro/wc') {
            licenseClass = 'Pro';
          }
          // Ensure srSub is treated as the fractional part, correctly formatted
          const srSubFormatted = String(srSub).padStart(2, '0');
          currentSafetyRating = `${licenseClass} ${srPrime}.${srSubFormatted}`;
        } else {
          console.warn(`Incomplete safety rating data for custId ${custId}: licenseClass=${licenseClass}, srPrime=${srPrime}, srSub=${srSub}`);
        }
      } else {
        console.warn(`No valid statsSource found in memberStatsData for custId ${custId}`);
      }
    } else {
      console.warn(`memberStatsData or memberStatsData.stats is missing for custId ${custId}`);
    }

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
