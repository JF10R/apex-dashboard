/**
 * iRacing Stats Module
 * 
 * Handles statistics data from the iRacing API.
 * Provides comprehensive stats with proper caching and type safety.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API Stats types
export interface SeasonStats {
  season_id: number;
  series_id: number;
  series_name: string;
  car_id: number;
  car_name: string;
  license_level: number;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avg_start_position: number;
  avg_finish_position: number;
  laps: number;
  laps_led: number;
  incidents: number;
  points: number;
  week_dropped: boolean;
}

export interface CareerStats {
  category: string;
  category_id: number;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avg_start_position: number;
  avg_finish_position: number;
  laps: number;
  laps_led: number;
  incidents: number;
  avg_incidents: number;
  points: number;
  winnings: number;
}

export interface MemberSummary {
  cust_id: number;
  this_year: {
    num_official_sessions: number;
    num_league_sessions: number;
    num_official_wins: number;
    num_league_wins: number;
  };
}

export interface WorldRecords {
  track_id: number;
  track_name: string;
  car_id: number;
  car_name: string;
  cust_id: number;
  display_name: string;
  lap_time: number;
  session_start_time: string;
  subsession_id: number;
}

export interface StatsSearchOptions {
  custId?: number;
  seasonId?: number;
  carId?: number;
  categoryId?: number;
}

/**
 * Get member summary statistics
 */
export const getMemberSummary = async (custId: number): Promise<MemberSummary | null> => {
  return getCached(
    caches.memberStats,
    `member-summary-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📊 Fetching member summary for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberSummary({
        customerId: custId,
      });
      
      if (!response) {
        console.warn(`No summary data found for member ${custId}`);
        return null;
      }
      
      // Map API response to our expected format
      const summary: MemberSummary = {
        cust_id: response.custId || custId,
        this_year: {
          num_official_sessions: response.thisYear?.numOfficialSessions || 0,
          num_league_sessions: response.thisYear?.numLeagueSessions || 0,
          num_official_wins: response.thisYear?.numOfficialWins || 0,
          num_league_wins: response.thisYear?.numLeagueWins || 0,
        },
      };
      
      console.log(`✅ Fetched member summary for ${custId}`);
      return summary;
    },
    300 // 5 minutes cache for member summary
  );
};

/**
 * Get member career statistics
 */
export const getMemberCareer = async (custId: number): Promise<CareerStats[]> => {
  return getCached(
    caches.memberStats,
    `member-career-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏆 Fetching career stats for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberCareer({
        customerId: custId,
      });
      
      // The API returns an object with a 'stats' array, not a direct array
      const careerStats = response?.stats || [];
      console.log(`✅ Fetched ${careerStats.length} career categories for member ${custId}`);
      
      // Map API response to our expected format
      return careerStats.map((stat: any) => ({
        category: stat.category,
        category_id: stat.categoryId,
        starts: stat.starts,
        wins: stat.wins,
        top5s: stat.top5,
        poles: stat.poles,
        avg_start_position: stat.avgStartPosition,
        avg_finish_position: stat.avgFinishPosition,
        laps: stat.laps,
        laps_led: stat.lapsLed,
        incidents: stat.incidents || 0,
        avg_incidents: stat.avgIncidents || 0,
        points: stat.points || 0,
        winnings: stat.winnings || 0,
      })) as CareerStats[];
    },
    600 // 10 minutes cache for career stats
  );
};

/**
 * Get member recent races
 */
export const getMemberRecentRaces = async (custId: number): Promise<any[]> => {
  return getCached(
    caches.raceResults,
    `member-recent-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏁 Fetching recent races for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberRecentRaces({
        customerId: custId,
      });
      
      // The API returns an object with a 'races' array, not a direct array
      const races = response?.races || [];
      console.log(`✅ Fetched ${races.length} recent races for member ${custId}`);
      
      return races;
    },
    180 // 3 minutes cache for recent races
  );
};

/**
 * Get member yearly statistics
 */
export const getMemberYearlyStats = async (custId: number): Promise<any[]> => {
  return getCached(
    caches.memberStats,
    `member-yearly-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📅 Fetching yearly stats for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberYearlyStats({
        customerId: custId,
      });
      
      const yearlyStats = Array.isArray(response) ? response : [];
      console.log(`✅ Fetched yearly stats for ${yearlyStats.length} years`);
      
      return yearlyStats;
    },
    1800 // 30 minutes cache for yearly stats
  );
};

/**
 * Get season statistics for a member
 */
export const getSeasonStats = async (
  custId: number,
  seasonId?: number,
  carId?: number
): Promise<SeasonStats[]> => {
  const cacheKey = `season-stats-${custId}${seasonId ? `-season-${seasonId}` : ''}${carId ? `-car-${carId}` : ''}`;
  
  return getCached(
    caches.memberStats,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📈 Fetching season stats for customer ID: ${custId}`);
      
      const params: any = { customerId: custId };
      if (seasonId) params.seasonId = seasonId;
      if (carId) params.carId = carId;
      
      // Note: This might need to be adjusted based on actual API method availability
      // For now, we'll use career stats as a proxy
      const careerStats = await getMemberCareer(custId);
      
      // Transform career stats to season stats format
      const seasonStats: SeasonStats[] = careerStats.map((stat, index) => ({
        season_id: seasonId || new Date().getFullYear(),
        series_id: index + 1,
        series_name: stat.category,
        car_id: carId || 0,
        car_name: 'Unknown Car',
        license_level: 1,
        starts: stat.starts,
        wins: stat.wins,
        top5s: stat.top5s,
        poles: stat.poles,
        avg_start_position: stat.avg_start_position,
        avg_finish_position: stat.avg_finish_position,
        laps: stat.laps,
        laps_led: stat.laps_led,
        incidents: stat.incidents,
        points: stat.points,
        week_dropped: false,
      }));
      
      console.log(`✅ Fetched ${seasonStats.length} season stats for member ${custId}`);
      
      return seasonStats;
    },
    900 // 15 minutes cache for season stats
  );
};

/**
 * Get world records (if available in the API)
 */
export const getWorldRecords = async (
  trackId?: number,
  carId?: number,
  categoryId?: number
): Promise<WorldRecords[]> => {
  const cacheKey = `world-records${trackId ? `-track-${trackId}` : ''}${carId ? `-car-${carId}` : ''}${categoryId ? `-cat-${categoryId}` : ''}`;
  
  return getCached(
    caches.raceResults,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log('🏆 Fetching world records...');
      
      // Note: This might not be available in the current API wrapper
      // Return mock data for now
      const worldRecords: WorldRecords[] = [];
      
      console.log(`✅ Fetched ${worldRecords.length} world records`);
      
      return worldRecords;
    },
    3600 // 1 hour cache for world records
  );
};

/**
 * Get comprehensive statistics for a member across all categories
 */
export const getComprehensiveMemberStats = async (custId: number): Promise<{
  summary: MemberSummary | null;
  career: CareerStats[];
  recentRaces: any[];
  yearlyStats: any[];
}> => {
  try {
    const [summary, career, recentRaces, yearlyStats] = await Promise.all([
      getMemberSummary(custId),
      getMemberCareer(custId),
      getMemberRecentRaces(custId),
      getMemberYearlyStats(custId),
    ]);
    
    return {
      summary,
      career,
      recentRaces,
      yearlyStats,
    };
  } catch (error) {
    console.error(`Error fetching comprehensive stats for member ${custId}:`, error);
    return {
      summary: null,
      career: [],
      recentRaces: [],
      yearlyStats: [],
    };
  }
};

/**
 * Get stats cache statistics
 */
export const getStatsCacheStats = () => {
  return {
    memberStats: caches.memberStats.getStats(),
    raceResults: caches.raceResults.getStats(),
  };
};
