/**
 * iRacing Results Module
 * 
 * Handles race results and lap data from the iRacing API.
 * Provides comprehensive race results with proper caching.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API Results types
export interface RaceResult {
  subsession_id: number;
  series_id: number;
  series_name: string;
  season_id: number;
  race_week_num: number;
  session_id: number;
  start_time: string;
  finish_position: number;
  finish_position_in_class: number;
  laps_lead: number;
  laps_complete: number;
  opt_laps_complete: number;
  average_lap: number;
  best_lap_num: number;
  best_lap_time: number;
  best_qual_lap_at: string;
  best_qual_lap_num: number;
  best_qual_lap_time: number;
  reason_out_id: number;
  reason_out: string;
  champ_points: number;
  drop_race: boolean;
  club_points: number;
  position: number;
  qual_lap_time: number;
  starting_position: number;
  starting_position_in_class: number;
  car_id: number;
  car_name: string;
  aggregate_champ_points: number;
  cust_id: number;
  display_name: string;
  helmet: any;
  livery: any;
  suit: any;
  old_license_level: number;
  old_safety_rating: number;
  old_cpi: number;
  oldi_rating: number;
  old_ttrating: number;
  new_license_level: number;
  new_safety_rating: number;
  new_cpi: number;
  newi_rating: number;
  new_ttrating: number;
  multiplier: number;
  license_change_oval: number;
  license_change_road: number;
  incidents: number;
  max_pct_fuel_fill: number;
  weight_penalty_kg: number;
  league_points: number;
  league_agg_points: number;
  car_class_id: number;
  car_class_name: string;
  car_class_color: string;
  division: number;
  division_name: string;
  watched: boolean;
  friend: boolean;
  ai: boolean;
}

export interface LapData {
  group_id: number;
  name: string;
  cust_id: number;
  display_name: string;
  lap_number: number;
  flags: number;
  incident: boolean;
  session_time: number;
  session_start_time: number;
  lap_time: number;
  team_fastest_lap: boolean;
  personal_best_lap: boolean;
  license_level: number;
  car_number: string;
  lap_events: any[];
}

export interface SubsessionResult {
  subsession_id: number;
  season_id: number;
  session_id: number;
  subsession_results: RaceResult[];
  lap_data?: LapData[];
}

export interface ResultsSearchOptions {
  custId?: number;
  seasonId?: number;
  seriesId?: number;
  raceWeekNum?: number;
  carId?: number;
  trackId?: number;
  startTime?: string;
  endTime?: string;
}

/**
 * Get race results for a specific subsession
 */
export const getSubsessionResults = async (subsessionId: number): Promise<SubsessionResult | null> => {
  return getCached(
    caches.raceResults,
    `subsession-${subsessionId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏁 Fetching results for subsession: ${subsessionId}`);

      // Fetch subsession results from the official endpoint
      const response = await iracingApi.results.getResult({ subsessionId });

      if (!response || !response.sessionResults) {
        console.warn(`No results found for subsession ${subsessionId}`);
        return null;
      }

      // Determine the race session (usually named "Race")
      const raceSession =
        response.sessionResults.find(
          (s: any) =>
            s.simsessionName && s.simsessionName.toUpperCase().includes('RACE')
        ) || response.sessionResults[0];

      const raceInfo = {
        subsessionId: response.subsessionId,
        seriesId: response.seriesId,
        seriesName: response.seriesName,
        seasonId: response.seasonId,
        raceWeekNum: response.raceWeekNum,
        sessionId: response.sessionId,
        startTime: response.startTime,
      };

      const results = Array.isArray(raceSession?.results)
        ? raceSession.results.map((r: any) => mapResultToRaceResult({ ...raceInfo, ...r }))
        : [];

      console.log(`✅ Fetched ${results.length} results for subsession ${subsessionId}`);

      return {
        subsession_id: response.subsessionId,
        season_id: response.seasonId,
        session_id: response.sessionId,
        subsession_results: results,
        lap_data: undefined,
      } as SubsessionResult;
    },
    1800 // 30 minutes cache for subsession results
  );
};

/**
 * Get lap data for a specific subsession
 */
export const getSubsessionLapData = async (
  subsessionId: number,
  custId?: number
): Promise<LapData[]> => {
  const cacheKey = `lap-data-${subsessionId}${custId ? `-cust-${custId}` : ''}`;
  
  return getCached(
    caches.raceResults,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏁 Fetching lap data for subsession: ${subsessionId}${custId ? ` and customer: ${custId}` : ''}`);

      const allLaps: LapData[] = [];
      let startLap = 0;

      while (true) {
        const response = await iracingApi.results.getResultsLapData({
          subsessionId,
          custId,
          simsessionNumber: 0,
          startLap,
        });

        const laps = Array.isArray(response?.lapData)
          ? response.lapData.map(mapApiLapToLapData)
          : [];

        allLaps.push(...laps);

        const chunk = (response && (response.chunkInfo || (response as any).chunk_info)) || {};
        const chunkSize = chunk.chunkSize || chunk.chunk_size || laps.length;
        const totalRows = chunk.rows || chunk.total || allLaps.length;

        if (allLaps.length >= totalRows || laps.length === 0) {
          break;
        }

        startLap += chunkSize;
      }

      console.log(
        `✅ Fetched ${allLaps.length} lap entries for subsession ${subsessionId}${custId ? ` cust ${custId}` : ''}`
      );

      return allLaps;
    },
    1800 // 30 minutes cache for lap data
  );
};

/**
 * Search for race results based on criteria
 */
export const searchResults = async (options: ResultsSearchOptions): Promise<RaceResult[]> => {
  const cacheKey = `search-results-${JSON.stringify(options)}`;
  
  return getCached(
    caches.raceResults,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('🔍 Searching for race results with options:', options);
      
      // Note: The actual search API might have different parameter names
      // This is a placeholder implementation
      const searchParams = {
        customerId: options.custId,
        seasonId: options.seasonId,
        seriesId: options.seriesId,
        raceWeekNum: options.raceWeekNum,
        carId: options.carId,
        trackId: options.trackId,
        startTime: options.startTime,
        endTime: options.endTime,
      };
      
      // Remove undefined values
      Object.keys(searchParams).forEach(key => 
        searchParams[key as keyof typeof searchParams] === undefined && delete searchParams[key as keyof typeof searchParams]
      );
      
      // For now, return empty results as the actual search API method needs to be confirmed
      const results: RaceResult[] = [];
      
      console.log(`✅ Found ${results.length} race results`);
      
      return results;
    },
    600 // 10 minutes cache for search results
  );
};

/**
 * Get recent race results for a member
 */
export const getMemberRecentResults = async (custId: number, limit = 10): Promise<RaceResult[]> => {
  return getCached(
    caches.raceResults,
    `member-recent-results-${custId}-${limit}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📊 Fetching recent results for customer ID: ${custId}`);
      
      // Use the stats API for recent races
      const response = await iracingApi.stats.getMemberRecentRaces({
        customerId: custId,
      });
      
      const races = Array.isArray(response) ? response.slice(0, limit) : [];
      console.log(`✅ Fetched ${races.length} recent results for member ${custId}`);
      
      // Map to RaceResult format
      return races.map(mapApiRaceToRaceResult) as RaceResult[];
    },
    300 // 5 minutes cache for recent results
  );
};

/**
 * Get season results for a specific series and season
 */
export const getSeasonResults = async (
  seriesId: number,
  seasonId: number,
  raceWeek?: number
): Promise<RaceResult[]> => {
  const cacheKey = `season-results-${seriesId}-${seasonId}${raceWeek ? `-week-${raceWeek}` : ''}`;
  
  return getCached(
    caches.raceResults,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏆 Fetching season results for series ${seriesId}, season ${seasonId}${raceWeek ? `, week ${raceWeek}` : ''}`);
      
      // Note: This might need to be implemented using a different API endpoint
      // For now, return empty results
      const results: RaceResult[] = [];
      
      console.log(`✅ Fetched ${results.length} season results`);
      
      return results;
    },
    3600 // 1 hour cache for season results
  );
};

/**
 * Get the fastest laps from a subsession
 */
export const getFastestLaps = async (
  subsessionId: number,
  limit = 10
): Promise<LapData[]> => {
  try {
    const lapData = await getSubsessionLapData(subsessionId);
    
    // Filter out invalid laps and sort by lap time
    const validLaps = lapData
      .filter(lap => lap.lap_time > 0 && !lap.incident)
      .sort((a, b) => a.lap_time - b.lap_time)
      .slice(0, limit);
    
    console.log(`🚀 Found ${validLaps.length} fastest laps for subsession ${subsessionId}`);
    
    return validLaps;
  } catch (error) {
    console.error(`Error getting fastest laps for subsession ${subsessionId}:`, error);
    return [];
  }
};

/**
 * Get race results with additional enriched data
 */
export const getEnrichedRaceResults = async (subsessionId: number): Promise<{
  results: SubsessionResult | null;
  fastestLaps: LapData[];
  incidents: LapData[];
}> => {
  try {
    const [results, allLaps] = await Promise.all([
      getSubsessionResults(subsessionId),
      getSubsessionLapData(subsessionId),
    ]);
    
    const fastestLaps = allLaps
      .filter(lap => lap.lap_time > 0 && !lap.incident)
      .sort((a, b) => a.lap_time - b.lap_time)
      .slice(0, 10);
    
    const incidents = allLaps.filter(lap => lap.incident);
    
    return {
      results,
      fastestLaps,
      incidents,
    };
  } catch (error) {
    console.error(`Error getting enriched results for subsession ${subsessionId}:`, error);
    return {
      results: null,
      fastestLaps: [],
      incidents: [],
    };
  }
};

/**
 * Map API lap data to internal LapData format
 */
function mapApiLapToLapData(lap: any): LapData {
  return {
    group_id: lap.groupId || 0,
    name: lap.name || '',
    cust_id: lap.custId || 0,
    display_name: lap.displayName || '',
    lap_number: lap.lapNumber || 0,
    flags: lap.flags || 0,
    incident: lap.incident || false,
    session_time: lap.sessionTime || 0,
    session_start_time: lap.sessionStartTime || 0,
    lap_time: lap.lapTime || 0,
    team_fastest_lap: lap.teamFastestLap || false,
    personal_best_lap: lap.personalBestLap || false,
    license_level: lap.licenseLevel || 0,
    car_number: lap.carNumber || '',
    lap_events: lap.lapEvents || [],
  };
}

/**
 * Helper function to map API race data to RaceResult format
 */
function mapApiRaceToRaceResult(race: any): RaceResult {
  return {
    subsession_id: race.subsessionId || 0,
    series_id: race.seriesId || 0,
    series_name: race.seriesName || '',
    season_id: race.seasonId || 0,
    race_week_num: race.raceWeekNum || 0,
    session_id: race.sessionId || 0,
    start_time: race.startTime || '',
    finish_position: race.finishPosition || 0,
    finish_position_in_class: race.finishPositionInClass || 0,
    laps_lead: race.lapsLead || 0,
    laps_complete: race.lapsComplete || 0,
    opt_laps_complete: race.optLapsComplete || 0,
    average_lap: race.averageLap || 0,
    best_lap_num: race.bestLapNum || 0,
    best_lap_time: race.bestLapTime || 0,
    best_qual_lap_at: race.bestQualLapAt || '',
    best_qual_lap_num: race.bestQualLapNum || 0,
    best_qual_lap_time: race.bestQualLapTime || 0,
    reason_out_id: race.reasonOutId || 0,
    reason_out: race.reasonOut || '',
    champ_points: race.champPoints || 0,
    drop_race: race.dropRace || false,
    club_points: race.clubPoints || 0,
    position: race.position || 0,
    qual_lap_time: race.qualLapTime || 0,
    starting_position: race.startingPosition || 0,
    starting_position_in_class: race.startingPositionInClass || 0,
    car_id: race.carId || 0,
    car_name: race.carName || '',
    aggregate_champ_points: race.aggregateChampPoints || 0,
    cust_id: race.custId || 0,
    display_name: race.displayName || '',
    helmet: race.helmet || {},
    livery: race.livery || {},
    suit: race.suit || {},
    old_license_level: race.oldLicenseLevel || 0,
    old_safety_rating: race.oldSafetyRating || 0,
    old_cpi: race.oldCpi || 0,
    oldi_rating: race.oldIrating || 0,
    old_ttrating: race.oldTtrating || 0,
    new_license_level: race.newLicenseLevel || 0,
    new_safety_rating: race.newSafetyRating || 0,
    new_cpi: race.newCpi || 0,
    newi_rating: race.newIrating || 0,
    new_ttrating: race.newTtrating || 0,
    multiplier: race.multiplier || 0,
    license_change_oval: race.licenseChangeOval || 0,
    license_change_road: race.licenseChangeRoad || 0,
    incidents: race.incidents || 0,
    max_pct_fuel_fill: race.maxPctFuelFill || 0,
    weight_penalty_kg: race.weightPenaltyKg || 0,
    league_points: race.leaguePoints || 0,
    league_agg_points: race.leagueAggPoints || 0,
    car_class_id: race.carClassId || 0,
    car_class_name: race.carClassName || '',
    car_class_color: race.carClassColor || '',
    division: race.division || 0,
    division_name: race.divisionName || '',
    watched: race.watched || false,
    friend: race.friend || false,
    ai: race.ai || false,
  };
}

/**
 * Helper function to map subsession result data
 */
function mapResultToRaceResult(result: any): RaceResult {
  return mapApiRaceToRaceResult(result);
}

/**
 * Get results cache statistics
 */
export const getResultsCacheStats = () => {
  return caches.raceResults.getStats();
};
