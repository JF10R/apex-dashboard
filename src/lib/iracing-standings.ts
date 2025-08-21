/**
 * iRacing Season Standings Module
 * 
 * Handles championship standings and season data from the iRacing API.
 * Provides comprehensive standings with proper caching and type safety.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API Series/Standings types
export interface SeasonStandingEntry {
  cust_id: number;
  display_name: string;
  division: number;
  division_name: string;
  club_id: number;
  club_name: string;
  country_code: string;
  region_name: string;
  position: number;
  rank: number;
  points: number;
  starts: number;
  wins: number;
  top5: number;
  poles: number;
  avg_start_position: number;
  avg_finish_position: number;
  laps: number;
  laps_led: number;
  incidents: number;
  license_level: number;
  safety_rating: number;
  irating: number;
  ttrating: number;
  multiplier: number;
  license_change_oval: number;
  license_change_road: number;
  max_license_level: number;
  week_dropped: boolean;
}

export interface SeasonStandings {
  season_id: number;
  season_name: string;
  season_short_name: string;
  series_id: number;
  series_name: string;
  car_class_ids: number[];
  standings: SeasonStandingEntry[];
  success: boolean;
}

export interface SeriesInfo {
  series_id: number;
  series_name: string;
  series_short_name: string;
  publisher: string;
  publisher_id: number;
  category: string;
  category_id: number;
  allowed_licenses: any[];
  car_types: any[];
  cars: any[];
  tracks: any[];
  min_team_drivers: number;
  max_team_drivers: number;
  qualify_scoring: string;
  race_scoring: string;
  enable_pitlane_collisions: boolean;
  short_parade_lap: boolean;
  race_week: number;
  fixed_setup: boolean;
  driver_changes: boolean;
  start_date: string;
  end_date: string;
  seasons: SeasonInfo[];
}

export interface SeasonInfo {
  season_id: number;
  season_name: string;
  season_short_name: string;
  season_year: number;
  season_quarter: number;
  active: boolean;
  car_classes: any[];
  schedules: any[];
}

export interface StandingsSearchOptions {
  custId?: number;
  seasonId?: number;
  carClassId?: number;
  division?: number;
  club?: string;
  raceWeek?: number;
}

/**
 * Get season standings for a specific season
 */
export const getSeasonStandings = async (
  seasonId: number,
  carClassId?: number,
  division?: number
): Promise<SeasonStandings | null> => {
  const cacheKey = `season-standings-${seasonId}-${carClassId || 'all'}-${division || 'all'}`;
  
  return getCached(
    caches.seasonData,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏆 Fetching season standings for season ID: ${seasonId}`);
      
      try {
        const response = await iracingApi.stats.getSeasonStandings({
          seasonId,
          carClassId,
          division
        });
        
        if (!response) {
          console.warn(`No standings found for season ${seasonId}`);
          return null;
        }
        
        // Transform API response to our expected format
        const standings: SeasonStandings = {
          season_id: response.season_id || seasonId,
          season_name: response.season_name || `Season ${seasonId}`,
          season_short_name: response.season_short_name || `S${seasonId}`,
          series_id: response.series_id || 0,
          series_name: response.series_name || 'Unknown Series',
          car_class_ids: response.car_class_ids || [],
          standings: (response.standings || []).map((entry: any) => ({
            cust_id: entry.cust_id,
            display_name: entry.display_name || entry.displayName,
            division: entry.division || 0,
            division_name: entry.division_name || 'Unknown Division',
            club_id: entry.club_id || entry.clubId || 0,
            club_name: entry.club_name || entry.clubName || 'Unknown Club',
            country_code: entry.country_code || entry.countryCode || '',
            region_name: entry.region_name || entry.regionName || '',
            position: entry.position || entry.rank || 0,
            rank: entry.rank || entry.position || 0,
            points: entry.points || 0,
            starts: entry.starts || 0,
            wins: entry.wins || 0,
            top5: entry.top5 || entry.top5s || 0,
            poles: entry.poles || 0,
            avg_start_position: entry.avg_start_position || entry.avgStartPosition || 0,
            avg_finish_position: entry.avg_finish_position || entry.avgFinishPosition || 0,
            laps: entry.laps || 0,
            laps_led: entry.laps_led || entry.lapsLed || 0,
            incidents: entry.incidents || 0,
            license_level: entry.license_level || entry.licenseLevel || 0,
            safety_rating: entry.safety_rating || entry.safetyRating || 0,
            irating: entry.irating || entry.iRating || 0,
            ttrating: entry.ttrating || entry.ttRating || 0,
            multiplier: entry.multiplier || 1.0,
            license_change_oval: entry.license_change_oval || entry.licenseChangeOval || 0,
            license_change_road: entry.license_change_road || entry.licenseChangeRoad || 0,
            max_license_level: entry.max_license_level || entry.maxLicenseLevel || 0,
            week_dropped: entry.week_dropped || entry.weekDropped || false,
          })),
          success: response.success !== false,
        };
        
        console.log(`✅ Retrieved ${standings.standings.length} standings entries for season ${seasonId}`);
        return standings;
        
      } catch (error) {
        console.error(`Error fetching season standings for ${seasonId}:`, error);
        return null;
      }
    },
    30 * 60 * 1000 // 30 minute cache for standings (they update relatively frequently)
  );
};

/**
 * Get a driver's position in season standings
 */
export const getDriverSeasonPosition = async (
  custId: number,
  seasonId: number,
  carClassId?: number
): Promise<SeasonStandingEntry | null> => {
  const standings = await getSeasonStandings(seasonId, carClassId);
  
  if (!standings) {
    return null;
  }
  
  const driverEntry = standings.standings.find(entry => entry.cust_id === custId);
  return driverEntry || null;
};

/**
 * Get series information including available seasons
 */
export const getSeriesInfo = async (seriesId: number): Promise<SeriesInfo | null> => {
  return getCached(
    caches.seriesData,
    `series-info-${seriesId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📊 Fetching series info for series ID: ${seriesId}`);
      
      try {
        // Note: This might need adjustment based on actual iracing-api implementation
        const response = await iracingApi.series.getSeries({ seriesIds: [seriesId] });
        
        if (!response || !Array.isArray(response) || response.length === 0) {
          console.warn(`No series info found for series ${seriesId}`);
          return null;
        }
        
        const series = response[0];
        
        const seriesInfo: SeriesInfo = {
          series_id: series.series_id || seriesId,
          series_name: series.series_name || `Series ${seriesId}`,
          series_short_name: series.series_short_name || series.series_name || `S${seriesId}`,
          publisher: series.publisher || '',
          publisher_id: series.publisher_id || 0,
          category: series.category || '',
          category_id: series.category_id || 0,
          allowed_licenses: series.allowed_licenses || [],
          car_types: series.car_types || [],
          cars: series.cars || [],
          tracks: series.tracks || [],
          min_team_drivers: series.min_team_drivers || 1,
          max_team_drivers: series.max_team_drivers || 1,
          qualify_scoring: series.qualify_scoring || '',
          race_scoring: series.race_scoring || '',
          enable_pitlane_collisions: series.enable_pitlane_collisions || false,
          short_parade_lap: series.short_parade_lap || false,
          race_week: series.race_week || 0,
          fixed_setup: series.fixed_setup || false,
          driver_changes: series.driver_changes || false,
          start_date: series.start_date || '',
          end_date: series.end_date || '',
          seasons: (series.seasons || []).map((season: any) => ({
            season_id: season.season_id,
            season_name: season.season_name,
            season_short_name: season.season_short_name,
            season_year: season.season_year,
            season_quarter: season.season_quarter,
            active: season.active,
            car_classes: season.car_classes || [],
            schedules: season.schedules || [],
          })),
        };
        
        console.log(`✅ Retrieved series info for ${seriesInfo.series_name}`);
        return seriesInfo;
        
      } catch (error) {
        console.error(`Error fetching series info for ${seriesId}:`, error);
        return null;
      }
    },
    60 * 60 * 1000 // 1 hour cache for series info (changes rarely)
  );
};

/**
 * Get current active seasons for all series
 */
export const getActiveSeasons = async (): Promise<SeasonInfo[]> => {
  return getCached(
    caches.seasonData,
    'active-seasons',
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📅 Fetching active seasons...`);
      
      try {
        const response = await iracingApi.constants.getSeasons();
        
        if (!response || !Array.isArray(response)) {
          console.warn('No seasons data received from API');
          return [];
        }
        
        const activeSeasons = response
          .filter((season: any) => season.active === true)
          .map((season: any) => ({
            season_id: season.season_id,
            season_name: season.season_name,
            season_short_name: season.season_short_name,
            season_year: season.season_year,
            season_quarter: season.season_quarter,
            active: season.active,
            car_classes: season.car_classes || [],
            schedules: season.schedules || [],
          }));
        
        console.log(`✅ Retrieved ${activeSeasons.length} active seasons`);
        return activeSeasons;
        
      } catch (error) {
        console.error('Error fetching active seasons:', error);
        return [];
      }
    },
    30 * 60 * 1000 // 30 minute cache for active seasons
  );
};

/**
 * Search standings with various filters
 */
export const searchStandings = async (options: StandingsSearchOptions): Promise<SeasonStandingEntry[]> => {
  const { custId, seasonId, carClassId, division, club, raceWeek } = options;
  
  if (!seasonId) {
    console.warn('Season ID is required for standings search');
    return [];
  }
  
  const standings = await getSeasonStandings(seasonId, carClassId, division);
  
  if (!standings) {
    return [];
  }
  
  let results = standings.standings;
  
  // Filter by customer ID if specified
  if (custId) {
    results = results.filter(entry => entry.cust_id === custId);
  }
  
  // Filter by club if specified
  if (club) {
    const clubLower = club.toLowerCase();
    results = results.filter(entry => 
      entry.club_name.toLowerCase().includes(clubLower)
    );
  }
  
  console.log(`🔍 Standings search returned ${results.length} results`);
  return results;
};

/**
 * Get top drivers in season standings
 */
export const getTopDrivers = async (
  seasonId: number,
  limit: number = 50,
  carClassId?: number,
  division?: number
): Promise<SeasonStandingEntry[]> => {
  const standings = await getSeasonStandings(seasonId, carClassId, division);
  
  if (!standings) {
    return [];
  }
  
  // Return top drivers sorted by position
  const topDrivers = standings.standings
    .sort((a, b) => a.position - b.position)
    .slice(0, limit);
    
  console.log(`🏅 Retrieved top ${topDrivers.length} drivers for season ${seasonId}`);
  return topDrivers;
};

/**
 * Get season summary for a driver across all their active seasons
 */
export const getDriverSeasonSummary = async (custId: number): Promise<{
  seasons: Array<{
    season_id: number;
    season_name: string;
    series_name: string;
    position: number;
    points: number;
    wins: number;
    top5: number;
    starts: number;
  }>;
  totalSeasons: number;
  totalWins: number;
  totalTop5s: number;
  bestPosition: number;
  averagePosition: number;
}> => {
  const cacheKey = `driver-season-summary-${custId}`;
  
  return getCached(
    caches.driverData,
    cacheKey,
    async () => {
      console.log(`📈 Building season summary for driver ${custId}...`);
      
      // Get active seasons first
      const activeSeasons = await getActiveSeasons();
      
      const driverSeasons = [];
      let totalWins = 0;
      let totalTop5s = 0;
      let positionSum = 0;
      let positionCount = 0;
      let bestPosition = Number.MAX_SAFE_INTEGER;
      
      // Check each active season for this driver's participation
      for (const season of activeSeasons) {
        try {
          const standings = await getSeasonStandings(season.season_id);
          
          if (standings) {
            const driverEntry = standings.standings.find(entry => entry.cust_id === custId);
            
            if (driverEntry && driverEntry.starts > 0) {
              driverSeasons.push({
                season_id: season.season_id,
                season_name: season.season_name,
                series_name: standings.series_name,
                position: driverEntry.position,
                points: driverEntry.points,
                wins: driverEntry.wins,
                top5: driverEntry.top5,
                starts: driverEntry.starts,
              });
              
              totalWins += driverEntry.wins;
              totalTop5s += driverEntry.top5;
              
              if (driverEntry.position > 0) {
                positionSum += driverEntry.position;
                positionCount += 1;
                bestPosition = Math.min(bestPosition, driverEntry.position);
              }
            }
          }
        } catch (error) {
          console.warn(`Error checking season ${season.season_id} for driver ${custId}:`, error);
        }
      }
      
      const summary = {
        seasons: driverSeasons,
        totalSeasons: driverSeasons.length,
        totalWins,
        totalTop5s,
        bestPosition: bestPosition === Number.MAX_SAFE_INTEGER ? 0 : bestPosition,
        averagePosition: positionCount > 0 ? Math.round(positionSum / positionCount) : 0,
      };
      
      console.log(`✅ Built season summary: ${summary.totalSeasons} active seasons, ${summary.totalWins} wins`);
      return summary;
      
    },
    15 * 60 * 1000 // 15 minute cache for driver summaries
  );
};

/**
 * Clear all standings-related cache
 */
export const clearStandingsCache = (): void => {
  // Clear specific cache categories
  caches.seasonData.clear();
  caches.seriesData.clear();
  
  console.log('🗑️ Cleared all standings cache data');
};

/**
 * Get cache statistics for standings data
 */
export const getStandingsCacheStats = () => {
  return {
    seasonData: {
      size: caches.seasonData.size,
      maxSize: caches.seasonData.maxSize,
    },
    seriesData: {
      size: caches.seriesData.size,
      maxSize: caches.seriesData.maxSize,
    },
  };
};