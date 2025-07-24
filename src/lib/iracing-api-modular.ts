/**
 * iRacing API - Modular Structure
 * 
 * Comprehensive iRacing API integration with proper TypeScript types,
 * caching, and error handling. Split into logical modules for maintainability.
 */

// Authentication and Core
export * from './iracing-auth-persistent';
export * from './iracing-cache';

// Data Modules
export * from './iracing-cars';
export * from './iracing-constants';
export * from './iracing-member';
export * from './iracing-lookup';
export * from './iracing-stats';
export * from './iracing-results';

// Convenience re-exports for backward compatibility
export {
  // Cars
  getCarName,
  getAllCars,
  searchCars,
  getCarsByCategory,
  preWarmCarCache,
  getCarCacheStats,
} from './iracing-cars';

export {
  // Constants
  getCategoryId,
  getCategoryName,
  getAllCategories,
  getAllDivisions,
  getAllEventTypes,
  preWarmConstantsCache,
  getConstantsCacheStats,
} from './iracing-constants';

export {
  // Members
  getMemberData,
  getMemberProfile,
  getMemberStats,
  getMemberCareerStats,
  getMemberRecentRaces,
  getMemberChartData,
  getMemberYearlyStats,
  searchMembers,
  getMultipleMembers,
  getMemberCacheStats,
} from './iracing-member';

export {
  // Lookup
  searchDrivers,
  getAllCountries,
  getAllClubs,
  getAllLicenses,
  getCountryByCode,
  getClubById,
  getLicenseById,
  searchClubs,
  searchCountries,
  getDriverById,
  getMultipleDrivers,
  preWarmLookupCache,
  getLookupCacheStats,
} from './iracing-lookup';

export {
  // Stats
  getMemberSummary,
  getMemberCareer,
  getMemberRecentRaces as getStatsRecentRaces,
  getMemberYearlyStats as getStatsYearlyStats,
  getSeasonStats,
  getWorldRecords,
  getComprehensiveMemberStats,
  getStatsCacheStats,
} from './iracing-stats';

export {
  // Results
  getSubsessionResults,
  getSubsessionLapData,
  searchResults,
  getMemberRecentResults,
  getSeasonResults,
  getFastestLaps,
  getEnrichedRaceResults,
  getResultsCacheStats,
} from './iracing-results';

// Cache management
export {
  clearAllCaches,
  cleanupAllCaches,
  getAllCacheStats,
} from './iracing-cache';

/**
 * Pre-warm all caches for optimal performance
 */
export const preWarmAllCaches = async (): Promise<void> => {
  const { preWarmCarCache } = await import('./iracing-cars');
  const { preWarmConstantsCache } = await import('./iracing-constants');
  const { preWarmLookupCache } = await import('./iracing-lookup');
  
  try {
    console.log('🔥 Pre-warming all iRacing API caches...');
    await Promise.all([
      preWarmCarCache(),
      preWarmConstantsCache(),
      preWarmLookupCache(),
    ]);
    console.log('✅ All iRacing API caches pre-warmed successfully');
  } catch (error) {
    console.error('❌ Failed to pre-warm some caches:', error);
  }
};

/**
 * Get comprehensive statistics for all caches
 */
export const getComprehensiveCacheStats = () => {
  const { getCarCacheStats } = require('./iracing-cars');
  const { getConstantsCacheStats } = require('./iracing-constants');
  const { getMemberCacheStats } = require('./iracing-member');
  const { getLookupCacheStats } = require('./iracing-lookup');
  const { getStatsCacheStats } = require('./iracing-stats');
  const { getResultsCacheStats } = require('./iracing-results');
  const { getAllCacheStats } = require('./iracing-cache');
  
  return {
    overall: getAllCacheStats(),
    modules: {
      cars: getCarCacheStats(),
      constants: getConstantsCacheStats(),
      member: getMemberCacheStats(),
      lookup: getLookupCacheStats(),
      stats: getStatsCacheStats(),
      results: getResultsCacheStats(),
    },
  };
};

// Type exports for convenience
export type {
  // Car types
  IracingCar,
  IracingCarsResponse,
} from './iracing-cars';

export type {
  // Constants types
  IracingCategory,
  IracingDivision,
  IracingEventType,
} from './iracing-constants';

export type {
  // Member types
  MemberProfile,
  MemberProfileOptions,
  MemberStat,
  MemberCareerStat,
  MemberRecentRace,
  MemberChartData,
  MemberYearlyStats,
} from './iracing-member';

export type {
  // Lookup types
  IracingDriver,
  IracingCountry,
  IracingClub,
  IracingLicense,
  DriverSearchOptions,
} from './iracing-lookup';

export type {
  // Stats types
  SeasonStats,
  CareerStats,
  MemberSummary,
  WorldRecords,
  StatsSearchOptions,
} from './iracing-stats';

export type {
  // Results types
  RaceResult,
  LapData,
  SubsessionResult,
  ResultsSearchOptions,
} from './iracing-results';

export type {
  // Cache types
  CacheStats,
  TtlCache,
} from './iracing-cache';

export type {
  // Auth types
  ApiError,
} from './iracing-auth-persistent';
