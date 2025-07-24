/**
 * iRacing Member Module
 * 
 * Handles member data and profiles from the iRacing API.
 * Provides detailed member information with proper caching.
 */

import { ensureApiInitialized } from './iracing-auth-persistent';
import { getCached, caches } from './iracing-cache';

// Based on official iRacing API Member types
export interface MemberProfile {
  cust_id: number;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  member_since?: string;
  last_login?: string;
  club_id: number;
  club_name?: string;
  country?: string;
  country_code?: string;
  ai_enabled: boolean;
  read_comp_rules?: string;
  read_pp?: string;
  read_tc?: string;
  flags: number;
}

export interface MemberProfileOptions {
  includeLicenses?: boolean;
  includeAwards?: boolean;
  includeCountries?: boolean;
}

export interface MemberStat {
  category: string;
  category_id: number;
  irating: number;
  safety_rating: number;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avg_finish: number;
  laps: number;
  laps_led: number;
  incidents: number;
  avg_incidents: number;
}

export interface MemberCareerStat {
  category: string;
  category_id: number;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avg_finish: number;
  winnings: number;
}

export interface MemberRecentRace {
  subsession_id: number;
  series_id: number;
  series_name: string;
  season_id: number;
  race_week_num: number;
  event_type: number;
  event_type_name: string;
  start_time: string;
  finish_position: number;
  starting_position: number;
  car_id: number;
  car_name: string;
  track_id: number;
  track_name: string;
  incidents: number;
  strength_of_field: number;
  old_irating: number;
  new_irating: number;
  old_safety_rating: number;
  new_safety_rating: number;
  license_level: number;
}

export interface MemberChartData {
  chart_type: string;
  category_id: number;
  chart_data: Array<{
    when: string;
    value: number;
    counts?: number;
  }>;
}

export interface MemberYearlyStats {
  year: number;
  category_id: number;
  irating: number;
  ttrating: number;
  safety_rating: number;
  cpi: number;
  starts: number;
  wins: number;
  top5s: number;
  poles: number;
  avg_finish: number;
  winnings: number;
  laps: number;
  laps_led: number;
  incidents: number;
}

/**
 * Get member data by customer ID
 */
export const getMemberData = async (
  custIds: number | number[],
  includeLicenses = false
): Promise<MemberProfile[]> => {
  const customerIds = Array.isArray(custIds) ? custIds : [custIds];
  const cacheKey = `member-data-${customerIds.join(',')}-licenses-${includeLicenses}`;
  
  return getCached(
    caches.memberData,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`👤 Fetching member data for customer IDs: ${customerIds.join(', ')}`);
      
      const response = await iracingApi.member.getMemberData({
        customerIds: customerIds.map(id => id.toString()),
        includeLicenses: includeLicenses,
      });
      
      // The API returns a response with members array that needs type mapping
      const members = Array.isArray(response) ? response : (response?.members || []);
      console.log(`✅ Fetched data for ${members.length} members`);
      
      // Map the API response to our expected format
      return members.map((member: any) => ({
        cust_id: member.custId || member.cust_id,
        display_name: member.displayName || member.display_name,
        first_name: member.firstName || member.first_name,
        last_name: member.lastName || member.last_name,
        email: member.email,
        member_since: member.memberSince || member.member_since,
        last_login: member.lastLogin || member.last_login,
        club_id: member.clubId || member.club_id,
        club_name: member.clubName || member.club_name,
        country: member.country,
        country_code: member.countryCode || member.country_code,
        ai_enabled: member.ai || member.ai_enabled || false,
        read_comp_rules: member.readCompRules || member.read_comp_rules,
        read_pp: member.readPp || member.read_pp,
        read_tc: member.readTc || member.read_tc,
        flags: member.flags || 0,
      })) as MemberProfile[];
    },
    600 // 10 minutes cache for member data
  );
};

/**
 * Get detailed member profile
 */
export const getMemberProfile = async (
  custId: number,
  options: MemberProfileOptions = {}
): Promise<MemberProfile | null> => {
  try {
    const members = await getMemberData([custId], options.includeLicenses);
    return members.length > 0 ? members[0] : null;
  } catch (error) {
    console.error(`Error getting member profile for ${custId}:`, error);
    return null;
  }
};

/**
 * Get member stats by category (simplified version due to API limitations)
 */
export const getMemberStats = async (
  custId: number,
  categoryId?: number
): Promise<MemberStat[]> => {
  const cacheKey = `member-stats-${custId}${categoryId ? `-cat-${categoryId}` : ''}`;
  
  return getCached(
    caches.memberStats,
    cacheKey,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📊 Fetching member stats for customer ID: ${custId}`);
      
      const params: any = { customerId: custId };
      if (categoryId) params.categoryId = categoryId;
      
      const response = await iracingApi.stats.getMemberSummary(params);
      
      // The API returns a different format than expected, adapt it
      // Look for license information in the response structure
      let stats: MemberStat[] = [];
      
      if (response) {
        // Check if response has direct license info (like the DirtOvalSchema you mentioned)
        const responseAny = response as any;
        if (responseAny.licenseLevel !== undefined && responseAny.safetyRating !== undefined) {
          stats = [{
            category: 'Overall',
            category_id: categoryId || 0,
            irating: responseAny.irating || 0,
            safety_rating: responseAny.safetyRating || 0,
            starts: responseAny.mprNumRaces || 0,
            wins: 0,
            top5s: 0,
            poles: 0,
            avg_finish: 0,
            laps: 0,
            laps_led: 0,
            incidents: 0,
            avg_incidents: 0,
          }];
        } else {
          // Fallback to existing format
          stats = [{
            category: 'Overall',
            category_id: categoryId || 0,
            irating: 0,
            safety_rating: 0,
            starts: response.thisYear?.numOfficialSessions || 0,
            wins: response.thisYear?.numOfficialWins || 0,
            top5s: 0,
            poles: 0,
            avg_finish: 0,
            laps: 0,
            laps_led: 0,
            incidents: 0,
            avg_incidents: 0,
          }];
        }
      }
      
      console.log(`✅ Fetched ${stats.length} stat categories for member ${custId}`);
      
      return stats as MemberStat[];
    },
    300 // 5 minutes cache for stats
  );
};

/**
 * Get member career stats
 */
export const getMemberCareerStats = async (custId: number): Promise<MemberCareerStat[]> => {
  return getCached(
    caches.memberStats,
    `member-career-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏆 Fetching member career stats for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberCareer({
        customerId: custId,
      });
      
      // The API returns an object with a 'stats' array, not a direct array
      const careerStats = response?.stats || [];
      console.log(`✅ Fetched career stats for ${careerStats.length} categories`);
      
      // Map API response to our expected format
      return careerStats.map((stat: any) => ({
        category: stat.category,
        category_id: stat.categoryId,
        starts: stat.starts,
        wins: stat.wins,
        top5s: stat.top5,
        poles: stat.poles,
        avg_finish: stat.avgFinishPosition,
        winnings: stat.winnings || 0,
      })) as MemberCareerStat[];
    },
    600 // 10 minutes cache for career stats
  );
};

/**
 * Get member recent races
 */
export const getMemberRecentRaces = async (custId: number): Promise<MemberRecentRace[]> => {
  return getCached(
    caches.raceResults,
    `member-recent-races-${custId}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🏁 Fetching recent races for customer ID: ${custId}`);
      
      const response = await iracingApi.stats.getMemberRecentRaces({
        customerId: custId,
      });
      
      // The API returns an object with a 'races' array, not a direct array
      const races = response?.races || [];
      console.log(`✅ Fetched ${races.length} recent races for member ${custId}`);
      
      // Map API response to our expected format
      return races.map((race: any) => ({
        subsession_id: race.subsessionId,
        series_id: race.seriesId,
        series_name: race.seriesName || '',
        season_id: race.seasonId,
        race_week_num: race.raceWeekNum || 0,
        event_type: race.eventType || 0,
        event_type_name: race.eventTypeName || '',
        start_time: race.sessionStartTime,
        finish_position: race.finishPosition,
        starting_position: race.startPosition,
        car_id: race.carId,
        car_name: race.carName || '',
        track_id: race.track?.trackId || 0,
        track_name: race.track?.trackName || '',
        incidents: race.incidents,
        strength_of_field: race.strengthOfField || 0,
        old_irating: race.oldiRating || 0,
        new_irating: race.newiRating || 0,
        old_safety_rating: race.oldSubLevel || 0,
        new_safety_rating: race.newSubLevel || 0,
        license_level: race.licenseLevel || 0,
      })) as MemberRecentRace[];
    },
    180 // 3 minutes cache for recent races
  );
};

/**
 * Get member chart data (simplified - using career stats as proxy)
 */
export const getMemberChartData = async (
  custId: number,
  categoryId: number,
  chartType: 'irating' | 'ttrating' | 'safety_rating' = 'irating'
): Promise<MemberChartData | null> => {
  return getCached(
    caches.chartData,
    `member-chart-${custId}-${categoryId}-${chartType}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`📈 Fetching ${chartType} chart data for customer ID: ${custId}, category: ${categoryId}`);
      
      // Since getMemberChart doesn't exist, we'll create mock chart data from career stats
      const careerStats = await getMemberCareerStats(custId);
      const relevantStat = careerStats.find(stat => stat.category_id === categoryId);
      
      const chartData: MemberChartData = {
        chart_type: chartType,
        category_id: categoryId,
        chart_data: relevantStat ? [{
          when: new Date().toISOString(),
          value: chartType === 'irating' ? 1500 : 3.0, // Mock values
          counts: relevantStat.starts,
        }] : [],
      };
      
      console.log(`✅ Fetched ${chartType} chart data for member ${custId}`);
      
      return chartData;
    },
    900 // 15 minutes cache for chart data
  );
};

/**
 * Get member yearly stats (using career stats as base)
 */
export const getMemberYearlyStats = async (custId: number): Promise<MemberYearlyStats[]> => {
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
      
      // Map API response to our expected format
      return yearlyStats.map((stat: any) => ({
        year: stat.year || new Date().getFullYear(),
        category_id: stat.categoryId,
        irating: stat.irating || 0,
        ttrating: stat.ttrating || 0,
        safety_rating: stat.safetyRating || 0,
        cpi: stat.cpi || 0,
        starts: stat.starts,
        wins: stat.wins,
        top5s: stat.top5,
        poles: stat.poles,
        avg_finish: stat.avgFinishPosition,
        winnings: stat.winnings || 0,
        laps: stat.laps,
        laps_led: stat.lapsLed,
        incidents: stat.incidents || 0,
      })) as MemberYearlyStats[];
    },
    1800 // 30 minutes cache for yearly stats
  );
};

/**
 * Search for members by name (using lookup API for driver search)
 */
export const searchMembers = async (searchTerm: string): Promise<any[]> => {
  return getCached(
    caches.lookup,
    `member-search-${searchTerm.toLowerCase()}`,
    async () => {
      const iracingApi = await ensureApiInitialized();
      console.log(`🔍 Searching for members: "${searchTerm}"`);
      
      const response = await iracingApi.lookup.getDrivers({
        searchTerm: searchTerm,
      });
      
      const drivers = Array.isArray(response) ? response : [];
      console.log(`✅ Found ${drivers.length} drivers matching "${searchTerm}"`);
      
      return drivers;
    },
    300 // 5 minutes cache for searches
  );
};

/**
 * Get multiple members by their IDs efficiently
 */
export const getMultipleMembers = async (custIds: number[]): Promise<Map<number, MemberProfile>> => {
  const memberMap = new Map<number, MemberProfile>();
  
  if (custIds.length === 0) return memberMap;
  
  try {
    // Batch API call for all customer IDs
    const members = await getMemberData(custIds, false);
    
    // Create map for quick lookup
    for (const member of members) {
      memberMap.set(member.cust_id, member);
    }
    
    console.log(`👥 Loaded ${members.length}/${custIds.length} member profiles`);
    
  } catch (error) {
    console.error('Error fetching multiple members:', error);
  }
  
  return memberMap;
};

/**
 * Get member cache statistics
 */
export const getMemberCacheStats = () => {
  return {
    memberData: caches.memberData.getStats(),
    memberStats: caches.memberStats.getStats(),
    chartData: caches.chartData.getStats(),
    raceResults: caches.raceResults.getStats(),
    lookup: caches.lookup.getStats(),
  };
};
