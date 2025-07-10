'use server'

/**
 * iRacing API Integration
 * 
 * This module handles authentication and data retrieval from the iRacing API.
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

// Error types for better error handling
enum ApiErrorType {
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  LOGIN_FAILED = 'LOGIN_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}

class ApiError extends Error {
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
} from '@/lib/mock-data'
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

const seriesCategoryMap: Record<string, RaceCategory> = {
  F3: 'Formula Car',
  'Formula Vee': 'Formula Car',
  'Formula 1600': 'Formula Car',
  'GT3': 'Sports Car',
  'GT4': 'Sports Car',
  'Touring Car': 'Sports Car',
  'LMP2': 'Prototype',
  'Dallara P217': 'Prototype',
  'NASCAR': 'Oval',
  'Late Model': 'Dirt Oval',
}

const getCategoryFromSeriesName = (seriesName: string): RaceCategory => {
  for (const key in seriesCategoryMap) {
    if (seriesName.includes(key)) {
      return seriesCategoryMap[key]
    }
  }
  if (seriesName.toLowerCase().includes('oval')) return 'Oval'
  if (seriesName.toLowerCase().includes('dirt')) return 'Dirt Oval'
  if (seriesName.toLowerCase().includes('formula')) return 'Formula Car'
  return 'Sports Car' // Default
}

const formatLapTime = (timeInMs: number): string => {
  if (timeInMs < 0 || isNaN(timeInMs)) return 'N/A'
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

const getSeasonFromDate = (date: Date): { year: number, season: string } => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1;
    return { year, season: `${year} S${quarter}` };
}

const lapTimeToSeconds = (time: string): number => {
  if (!time || !time.includes(':') || !time.includes('.')) return NaN;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) return NaN;
  return minutes * 60 + seconds + ms / 1000;
};

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
  newiRating: number;
  oldiRating: number;
  newSubLevel: number;
  oldSubLevel: number;
  lapsLed: number;
  averageLap: number; // Assuming this is in milliseconds from the API
  // Potentially other summary fields like series_name, track_name, car_name, etc.
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

interface IracingApiMemberStatsData { // Renamed to avoid conflict if 'stats' is too generic
  stats: {
    iRating: number;
    licenseClass: string; // e.g., "Rookie", "A", "Pro/WC"
    srPrime: number;      // Integer part of SR, e.g., 3
    srSub: number;        // Decimal part of SR * 100, e.g., 50 for x.50
    [key: string]: any;
  };
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
      const resultResponse: any = await currentApi.results.getResult({ subsessionId });
      console.log('Raw getResult response for subsessionId ' + subsessionId + ':', JSON.stringify(resultResponse, null, 2));
      const result: IracingApiRaceResult | null = resultResponse as any; // Temporary cast

      if (!result) {
        console.warn(`No result data returned from API for subsessionId ${subsessionId} (after potential transformation or if initially null/undefined)`);
        return null;
      }

      let raceSession: RawSessionResult | undefined = result.sessionResults?.find(
        (s) => s.simsession_name && s.simsession_name.toUpperCase().includes('RACE')
      );

      if (!raceSession && result.sessionResults?.length) {
        // Try other common session names for race sessions
        raceSession = result.sessionResults?.find(
          (s) => s.simsession_name && (
            s.simsession_name.toUpperCase().includes('FEATURE') ||
            s.simsession_name.toUpperCase().includes('MAIN') ||
            s.simsession_name.toUpperCase() === 'R' ||
            s.simsession_name.toUpperCase() === 'RACE SESSION'
          )
        );
        
        if (!raceSession) {
          if (result.sessionResults.length === 1) {
              raceSession = result.sessionResults[0];
          } else {
              console.warn(`No session explicitly named "RACE" found for subsessionId ${subsessionId}. Available sessions:`, 
                result.sessionResults.map(s => s.simsession_name));
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
        // Important: If we decide this is an error state where we shouldn't cache 'null' indefinitely,
        // we might remove from cache here or in the catch block for this specific case.
        // For now, returning null means this subsessionId will effectively be cached as "no valid data".
        return null;
      }

      const { year, season } = getSeasonFromDate(new Date(result.startTime));
      const category = getCategoryFromSeriesName(result.seriesName);

      // Fetch lap data for each participant to get accurate fastest laps
      const lapDataMap = new Map<number, any[]>();
      
      try {
        // Get the session number for the race session
        const raceSessionNumber = result.sessionResults?.findIndex(s => s === raceSession) ?? 0;
        
        // Fetch lap data for all participants
        for (const participant of raceSession.results) {
          try {
            const lapData = await currentApi.results.getResultsLapData({ 
              subsessionId, 
              simsessionNumber: raceSessionNumber,
              customerId: participant.custId 
            });
            if (lapData && Array.isArray(lapData)) {
              lapDataMap.set(participant.custId, lapData);
            }
          } catch (lapError) {
            console.warn(`Failed to fetch lap data for participant ${participant.custId}:`, lapError);
            // Continue without lap data for this participant
          }
        }
      } catch (lapFetchError) {
        console.warn(`Failed to fetch lap data for subsessionId ${subsessionId}:`, lapFetchError);
        // Continue without lap data
      }

      const participants: RaceParticipant[] = raceSession.results.map((p: RawParticipantData) => {
        // Get lap data for this participant
        const participantLapData = lapDataMap.get(p.custId) || [];
        
        let calculatedFastestLap = 'N/A';
        let fastestMs = Infinity;
        
        // Process individual lap data if available
        const processedLaps = participantLapData.map((lapInfo: any, index: number) => {
          const lapTime = formatLapTime(lapInfo.lap_time);
          const isInvalid = lapInfo.lap_events && lapInfo.lap_events.includes('invalid');
          
          // Calculate fastest lap from valid laps
          if (!isInvalid && lapTime !== 'N/A' && lapInfo.lap_time > 0) {
            const lapMs = lapInfo.lap_time; // lap_time should already be in milliseconds
            if (lapMs < fastestMs) {
              fastestMs = lapMs;
              calculatedFastestLap = lapTime;
            }
          }
          
          return {
            lapNumber: index + 1,
            time: lapTime,
            invalid: isInvalid || false,
          };
        });
        
        // Fallback to API bestLapTime if no lap data available
        if (calculatedFastestLap === 'N/A' && p.bestLapTime && p.bestLapTime > 0 && p.bestLapTime < 999999) {
          // Convert from 10,000ths of a second to seconds, then format
          const lapTimeInSeconds = p.bestLapTime / 10000;
          calculatedFastestLap = formatLapTime(lapTimeInSeconds * 1000); // formatLapTime expects milliseconds
        }

        return {
          name: p.displayName,
          custId: p.custId,
          startPosition: p.startingPosition !== null ? p.startingPosition + 1 : 0,
          finishPosition: p.finishPosition !== null ? p.finishPosition + 1 : 0,
          incidents: p.incidents,
          fastestLap: calculatedFastestLap,
          irating: p.newiRating,
          laps: processedLaps,
          totalTime: p.interval >= 0 ? formatLapTime(p.interval) : 'N/A',
        };
      });

      const avgIncidents = participants.length > 0
          ? participants.reduce((acc, p) => acc + p.incidents, 0) / participants.length
          : 0;

      const validLaps = participants.flatMap(p => p.laps?.filter(l => !l.invalid && l.time !== 'N/A') || []);

      const avgLapTimeMs = validLaps.length > 0
          ? validLaps.reduce((acc, l) => acc + (l.time !== 'N/A' ? lapTimeToSeconds(l.time) * 1000 : 0), 0) / validLaps.length
          : NaN;

      const raceData: RecentRace = {
        id: subsessionId.toString(),
        trackName: result.track.trackName,
        date: result.startTime,
        year,
        season,
        category,
        seriesName: result.seriesName,
        startPosition: 0,
        finishPosition: 0,
        incidents: 0,
        strengthOfField: result.eventStrengthOfField,
        lapsLed: 0,
        fastestLap: '',
        car: result.carClassName,
        avgLapTime: '',
        iratingChange: 0,
        safetyRatingChange: '',
        participants,
        avgRaceIncidents: parseFloat(avgIncidents.toFixed(2)),
        avgRaceLapTime: formatLapTime(avgLapTimeMs),
      };
      return raceData;

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

    // Temporarily using 'any' to inspect actual response structures due to TS2322
    const [
      memberDataResponse,
      memberStatsResponseFromPromise, 
      iratingChartResponse,
      srChartResponse,
      recentRacesRawResponse,
    ]: any[] = await Promise.all([
      currentApi.member.getMemberData({ customerIds: [custId.toString()] }), 
      currentApi.stats.getMemberSummary({ customerId: custId }), // Fixed: this expects number ID
      currentApi.member.getMemberChartData({ customerId: custId, chartType: 1, categoryId: 2 }), // Chart data for iRating
      currentApi.member.getMemberChartData({ customerId: custId, chartType: 3, categoryId: 2 }), // Chart data for SR
      currentApi.stats.getMemberRecentRaces({ customerId: custId }), // Assuming number ID is fine unless error specifies this one
    ]);

    // Log the raw responses to inspect their structure
    console.log('Raw memberDataResponse:', JSON.stringify(memberDataResponse, null, 2));
    console.log('Raw memberStatsResponseFromPromise:', JSON.stringify(memberStatsResponseFromPromise, null, 2));
    console.log('Raw iratingChartResponse:', JSON.stringify(iratingChartResponse, null, 2));
    console.log('Raw srChartResponse:', JSON.stringify(srChartResponse, null, 2));
    console.log('Raw recentRacesRawResponse:', JSON.stringify(recentRacesRawResponse, null, 2));

    // Temporarily assign to old variable names for minimal further code changes,
    // but these will likely need adjustment based on logged structures.
    const memberData: IracingApiMemberData | null = memberDataResponse as any;
    const memberStatsResponse: IracingApiMemberStatsData | null = memberStatsResponseFromPromise as any;
    const iratingChart: IracingApiChartData | null = iratingChartResponse as any;
    const srChart: IracingApiChartData | null = srChartResponse as any;
    const recentRacesRaw: IracingApiRecentRaces | null = recentRacesRawResponse as any;


    if (!memberData?.members?.[0]) {
      // If critical data like memberData is missing, it's better to throw.
      // This access (memberData.members) might need to change based on actual structure.
      console.warn(`Initial member data (or its expected structure) not found for custId ${custId}. Check raw logs.`);
      throw new Error('Driver not found or data structure unexpected');
    }
    const driverInfo = memberData.members[0]; // This access might need to change
    const driverName = driverInfo.displayName; // This access might need to change

    const recentRaces: RecentRace[] = (
      await Promise.all(
        // This access (recentRacesRaw.races) might need to change based on actual structure.
        (recentRacesRaw?.races || []).slice(0, 20).map(async (raceSummary: RawRecentRaceSummary) => {
          const raceResult = await getRaceResultData(raceSummary.subsessionId);
          if (!raceResult) return null;

          const driverInRace = raceResult.participants.find(p => p.name === driverName);

          if (driverInRace) {
            raceResult.startPosition = driverInRace.startPosition;
            raceResult.finishPosition = driverInRace.finishPosition;
            raceResult.incidents = driverInRace.incidents;
            raceResult.fastestLap = driverInRace.fastestLap;
          } else {
            console.warn(
              `Driver ${driverName} (ID: ${custId}) not found in detailed participants for subsession ${raceSummary.subsessionId}. ` +
              `Driver-specific details from full results (start/finish pos, incidents, fastest lap) might be default values.`
            );
          }

          raceResult.iratingChange = raceSummary.oldiRating !== -1 && raceSummary.newiRating !== -1
                                      ? raceSummary.newiRating - raceSummary.oldiRating
                                      : 0; // -1 often means N/A for iRating in summaries
          const srChange = (raceSummary.newSubLevel - raceSummary.oldSubLevel) / 100;
          raceResult.safetyRatingChange = srChange.toFixed(2);
          raceResult.lapsLed = raceSummary.lapsLed;
          raceResult.avgLapTime = formatLapTime(raceSummary.averageLap); // averageLap from summary is in ms

          return raceResult;
        })
      )
    ).filter((r): r is RecentRace => r !== null);

    const iratingHistory: HistoryPoint[] = (iratingChart?.data || []).map((p: IracingApiChartPoint) => ({
      month: new Date(p.when).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: p.value,
    }));

    // Process Safety Rating data - adaptive format handling
    const safetyRatingHistory: HistoryPoint[] = (srChart?.data || [])
      .map((p: IracingApiChartPoint) => {
        // Try different processing based on the raw data format
        let processedValue = p.value;
        
        // If the raw value is > 100, it's likely in format like 240 (representing 2.40)
        if (p.value > 100) {
          processedValue = p.value / 100;
        }
        // If the raw value is already in decimal format (like 2.40), use as-is
        else if (p.value >= 0 && p.value <= 4.99) {
          processedValue = p.value;
        }
        
        return {
          month: new Date(p.when).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
          value: processedValue,
        };
      })
      .filter(point => point.value >= 0 && point.value <= 4.99); // Filter out clearly invalid values

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

    // Get the most recent iRating from history, fallback to current stats if no history
    const mostRecentIRating = iratingHistory.length > 0 
        ? iratingHistory[iratingHistory.length - 1].value
        : (memberStatsResponse?.stats?.iRating ?? 0);

    // Get the most recent Safety Rating from history, fallback to current stats if no history
    const mostRecentSafetyRating = safetyRatingHistory.length > 0
        ? safetyRatingHistory[safetyRatingHistory.length - 1].value
        : (memberStatsResponse?.stats?.srPrime ? memberStatsResponse.stats.srPrime + (memberStatsResponse.stats.srSub / 100) : 0);

    // Format the most recent Safety Rating with actual license class from member stats
    const actualLicenseClass = memberStatsResponse?.stats?.licenseClass || 'Unknown';
    const formattedSafetyRating = `${actualLicenseClass} ${mostRecentSafetyRating.toFixed(2)}`;

    const currentStats = memberStatsResponse?.stats;
    const driver: Driver = {
      id: custId,
      name: driverName,
      currentIRating: mostRecentIRating,
      currentSafetyRating: formattedSafetyRating,
      avgRacePace: formatLapTime(avgRacePaceSeconds * 1000), // convert seconds to ms for formatting
      iratingHistory,
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
