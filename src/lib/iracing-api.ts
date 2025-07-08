'use server'

import {
  type Driver,
  type RecentRace,
  type HistoryPoint,
  type RaceParticipant,
  type RaceCategory,
  type Lap,
} from '@/lib/mock-data'
import { iRacingAPI } from 'iracing-api'


// ##################################################################
// #                   LIVE IMPLEMENTATION                          #
// ##################################################################

const email = process.env.IRACING_EMAIL ?? null;
const password = process.env.IRACING_PASSWORD ?? null;

let api: iRacingAPI | null = null;
let apiInitializationPromise: Promise<void> | null = null;
let apiInitializedSuccessfully = false;

async function initializeAndLogin() {
  if (!email || !password) {
    console.warn(
      'iRacing credentials are not set in .env.local. API calls will not work.'
    );
    apiInitializedSuccessfully = false;
    return;
  }

  try {
    // Use a temporary instance for login, then assign to the global `api`
    const tempApi = new iRacingAPI();
    console.log('Attempting to log in to iRacing API...');
    await tempApi.login(email, password);
    api = tempApi; // Assign to global 'api' only after successful login
    apiInitializedSuccessfully = true;
    console.log('iRacing API initialized and logged in successfully.');
  } catch (error) {
    console.error('Failed to initialize or login to iRacing API:', error);
    api = null; // Ensure api is null if login fails
    apiInitializedSuccessfully = false;
    // We don't re-throw here; calling functions will check apiInitializedSuccessfully or use ensureApiInitialized
  }
}

// Immediately attempt to initialize and log in when the module loads.
// This promise can be awaited by functions that need the API.
apiInitializationPromise = initializeAndLogin();

// Helper function for API functions to ensure initialization is complete and successful
async function ensureApiInitialized(): Promise<iRacingAPI> {
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
        console.error('API not initialized: Credentials missing.');
        throw new Error('iRacing API credentials are not configured.');
    }
    console.error('API not initialized: Login may have failed or API object is not available.');
    throw new Error('iRacing API not configured or login failed.');
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
    const results: IracingDriverSearchResult[] = await currentApi.searchDrivers({ searchTerm: query });
    return results
      .slice(0, 5) // Limit to 5 results
      .map((d: IracingDriverSearchResult) => ({ name: d.displayName, custId: d.custId }));
  } catch (error) {
    // Check if the error is one of the specific configuration/login errors thrown by ensureApiInitialized
    if (error instanceof Error && (
        error.message === 'iRacing API credentials are not configured.' || // Exact match
        error.message === 'iRacing API not configured or login failed.'  // Exact match
       )) {
      // Log the specific configuration/login error message
      console.error(`API configuration/login error in searchDriversByName: ${error.message}`);
      throw error; // Re-throw these critical errors; the UI or calling layer should handle them.
    }
    // Log other types of errors (e.g., network issue, API specific error for the search itself)
    console.error('Error during driver search operation (e.g., network, API search specific):', error);
    return []; // Return empty for these other errors, maintaining graceful degradation for this function.
  }
}

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
      const result: IracingApiRaceResult | null = await currentApi.getResult({ subsessionId });

      if (!result) {
        console.warn(`No result data returned from API for subsessionId ${subsessionId}`);
        return null;
      }

      let raceSession: RawSessionResult | undefined = result.sessionResults?.find(
        (s) => s.simsession_name && s.simsession_name.toUpperCase().includes('RACE')
      );

      if (!raceSession && result.sessionResults?.length) {
        if (result.sessionResults.length === 1) {
            raceSession = result.sessionResults[0];
        } else {
            console.warn(`No session explicitly named "RACE" found for subsessionId ${subsessionId}. Attempting to find best match.`);
            // Fallback: pick the session with the most participants, as it's likely the race.
            raceSession = result.sessionResults.reduce((prev, current) =>
                (prev.results.length > current.results.length) ? prev : current,
                result.sessionResults[0]
            );
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

      const participants: RaceParticipant[] = raceSession.results.map((p: RawParticipantData) => ({
        name: p.displayName,
        startPosition: p.startingPosition !== null ? p.startingPosition + 1 : 0,
        finishPosition: p.finishPosition !== null ? p.finishPosition + 1 : 0,
        incidents: p.incidents,
        fastestLap: formatLapTime(p.bestLapTime),
        irating: p.newiRating,
        laps: p.laps ? p.laps.map((l: RawLapData, index: number) => ({
          lapNumber: index + 1,
          time: formatLapTime(l.lapTime),
          invalid: l.lapEvents ? l.lapEvents.includes('invalid') : false,
        })) : [],
      }));

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

      if (error instanceof Error && (
          error.message === 'iRacing API credentials are not configured.' ||
          error.message === 'iRacing API not configured or login failed.'
         )) {
        console.error(`API configuration/login error in getRaceResultData for subsessionId ${subsessionId}: ${error.message}`);
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

    const [
      memberData,
      memberStatsResponse, // Renamed to avoid conflict with memberStats.stats
      iratingChart,
      srChart,
      recentRacesRaw,
    ]: [
      IracingApiMemberData | null, // API calls can return null or partial data
      IracingApiMemberStatsData | null,
      IracingApiChartData | null,
      IracingApiChartData | null,
      IracingApiRecentRaces | null,
    ] = await Promise.all([
      currentApi.getMemberData({ custIds: [custId] }),
      currentApi.getMemberStats(custId),
      currentApi.getMemberChartData({ custId, chartType: 1 }), // 1 for iRating
      currentApi.getMemberChartData({ custId, chartType: 3 }), // 3 for License/SR (Safety Rating)
      currentApi.getMemberRecentRaces(custId),
    ]);

    if (!memberData?.members?.[0]) {
      // If critical data like memberData is missing, it's better to throw.
      console.warn(`Initial member data not found for custId ${custId}.`);
      throw new Error('Driver not found');
    }
    const driverInfo = memberData.members[0];
    const driverName = driverInfo.displayName;

    const recentRaces: RecentRace[] = (
      await Promise.all(
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
          raceResult.safetyRatingChange = (raceSummary.newSubLevel - raceSummary.oldSubLevel) / 100;
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

    const safetyRatingHistory: HistoryPoint[] = (srChart?.data || []).map((p: IracingApiChartPoint) => ({
      month: new Date(p.when).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: p.value / 100,
    }));

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

    const currentStats = memberStatsResponse?.stats;
    const driver: Driver = {
      id: custId,
      name: driverName,
      currentIRating: currentStats?.iRating ?? 0,
      currentSafetyRating: currentStats
        ? `${currentStats.licenseClass} ${currentStats.srPrime}.${String(currentStats.srSub).padStart(2, '0')}`
        : 'N/A',
      avgRacePace: formatLapTime(avgRacePaceSeconds * 1000), // convert seconds to ms for formatting
      iratingHistory,
      safetyRatingHistory,
      racePaceHistory,
      recentRaces,
    };

    return driver;

  } catch (error) {
     if (error instanceof Error && (
        error.message === 'iRacing API credentials are not configured.' ||
        error.message === 'iRacing API not configured or login failed.' ||
        error.message === 'Driver not found' // Error explicitly thrown in this function
       )) {
      console.error(`Error in getDriverData for custId ${custId}: ${error.message}`);
      throw error; // Re-throw these specific errors
    }
    // Log other generic errors (e.g. network, unexpected API issues from Promise.all)
    console.error(`Generic error fetching or processing data for driver ${custId}:`, error);
    return null; // Graceful failure for other errors
  }
}
