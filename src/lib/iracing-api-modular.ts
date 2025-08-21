/**
 * @deprecated iRacing API - Modular Structure
 * 
 * DEPRECATION NOTICE: This module has been deprecated in favor of the unified
 * iracing-api-core.ts. Please migrate to using '@/lib/iracing-api-core' instead.
 * 
 * This file now serves as a thin wrapper that redirects calls to the unified API
 * to maintain backward compatibility during the transition period.
 * 
 * Migration guide:
 * - Replace imports from '@/lib/iracing-api-modular' with '@/lib/iracing-api-core'
 * - The unified API provides enhanced features including:
 *   - Sophisticated authentication and session management
 *   - Progressive loading capabilities  
 *   - Comprehensive caching (race results, lap data, car lookup)
 *   - Rate limiting and retry logic
 *   - Better error handling and fallback mechanisms
 */

// Re-export commonly used functions from the unified API for backward compatibility
export {
  // Core authentication and session management
  ApiError,
  ApiErrorType,
  forceRefreshSession,
  getSessionStatus,
  clearSession,
  getAuthConfig,
  
  // Search and member functions
  searchDriversByName as searchDrivers,
  searchMembers,
  getMemberProfile,
  getMemberRecentRaces,
  getMemberStats,
  
  // Car and category functions
  getAllCars,
  getAllCategories,
  getCarName,
  getCategoryId,
  getCategoryName,
  
  // Race result functions
  getRaceResultData,
  getRaceResultDataProgressive,
  
  // Driver data functions
  getDriverData,
  
  // Cache management
  preWarmCarCache,
  preWarmConstantsCache,
  getCarCacheStats,
  getConstantsCacheStats,
  getLapDataCacheStats,
  getResultsCacheStats,
  clearLapDataCache,
  clearResultsCache,
  cleanupExpiredLapDataCache,
  
  // Enhanced API functions
  getResultsEventLog,
  getResultsLapChartData,
  getSeasonResults,
  searchSeriesResults,
} from './iracing-api-core';

// Legacy function aliases for backward compatibility
export { searchDriversByName as searchDriversByName } from './iracing-api-core';

/**
 * @deprecated Use preWarmCarCache and preWarmConstantsCache from iracing-api-core instead
 */
export const preWarmAllCaches = async (): Promise<void> => {
  console.warn('⚠️  preWarmAllCaches from iracing-api-modular is deprecated. Use individual cache warming functions from iracing-api-core.');
  const { preWarmCarCache, preWarmConstantsCache } = await import('./iracing-api-core');
  
  try {
    console.log('🔥 Pre-warming iRacing API caches (deprecated function)...');
    await Promise.all([
      preWarmCarCache(),
      preWarmConstantsCache(),
    ]);
    console.log('✅ iRacing API caches pre-warmed successfully');
  } catch (error) {
    console.error('❌ Failed to pre-warm some caches:', error);
  }
};

/**
 * @deprecated Use individual cache stats functions from iracing-api-core instead
 */
export const getComprehensiveCacheStats = () => {
  console.warn('⚠️  getComprehensiveCacheStats from iracing-api-modular is deprecated. Use individual cache stats functions from iracing-api-core.');
  const { getCarCacheStats, getConstantsCacheStats, getLapDataCacheStats, getResultsCacheStats } = require('./iracing-api-core');
  
  return {
    overall: 'Use individual cache stats functions from iracing-api-core',
    modules: {
      cars: getCarCacheStats(),
      constants: getConstantsCacheStats(),
      lapData: getLapDataCacheStats(),
      results: getResultsCacheStats(),
    },
  };
};

// Type re-exports are handled by the regular export above
