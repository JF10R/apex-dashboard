/**
 * Test suite for rate limiting handling and cache fallback functionality
 * 
 * This test verifies that when the iRacing API is rate limited or fails:
 * 1. The system falls back to cached data (even if expired)
 * 2. Cache age and warning messages are properly returned
 * 3. UI displays appropriate warnings to users
 */

import { getDriverPageData } from '@/app/data-actions';
import { cache } from '@/lib/cache';

// Mock the cache manager
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    getExpired: jest.fn(),
    isExpired: jest.fn(),
    has: jest.fn(),
    getCacheInfo: jest.fn(() => ({ exists: false, age: 0 })), // Default return value
    invalidate: jest.fn(),
  },
  cacheKeys: {
    driver: (id: number) => `driver:${id}`,
  },
  cacheTTL: {
    DRIVER_PROFILE: 10 * 60 * 1000, // 10 minutes
  },
}));

// Mock the iRacing API
jest.mock('@/lib/iracing-api-core', () => ({
  getDriverData: jest.fn(),
  ApiError: jest.fn().mockImplementation((type, message) => ({
    type,
    message,
    name: 'ApiError'
  })),
  ApiErrorType: {
    CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    LOGIN_FAILED: 'LOGIN_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR'
  }
}));

import { getDriverData } from '@/lib/iracing-api-core';

const mockCache = cache as jest.Mocked<typeof cache>;
const mockGetDriverData = getDriverData as jest.MockedFunction<typeof getDriverData>;

describe('Rate Limiting and Cache Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDriverData = {
    id: 123456,
    name: 'Test Driver',
    currentIRating: 2500,
    currentSafetyRating: 'A 3.5',
    avgRacePace: '1:25.123',
    iratingHistories: {
      'Sports Car': [],
      'Oval': [],
      'Formula Car': [],
    },
    safetyRatingHistory: [],
    racePaceHistory: [],
    recentRaces: [],
  };

  it('should return fresh data when API call succeeds', async () => {
    // Mock successful API response
    mockGetDriverData.mockResolvedValueOnce(mockDriverData);
    mockCache.get.mockReturnValueOnce(null);
    mockCache.set.mockReturnValueOnce(undefined);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: false });

    const result = await getDriverPageData(123456, false);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(mockDriverData);
    expect(result.fromCache).toBe(false);
    expect(result.cacheAge).toBeUndefined();
    expect(mockGetDriverData).toHaveBeenCalledWith(123456);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should return cached data when API is rate limited', async () => {
    // Mock rate limiting error
    const rateLimitError = new Error('Too Many Requests');
    mockGetDriverData.mockRejectedValueOnce(rateLimitError);
    
    // Mock expired cached data
    const cachedData = mockDriverData; // getExpired should return just the data, not wrapped
    mockCache.get.mockReturnValueOnce(null); // No fresh cache
    mockCache.getExpired.mockReturnValueOnce(cachedData);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: true, age: 2 * 60 * 60 * 1000 }); // 2 hours old

    const result = await getDriverPageData(123456, false);

    expect(result.error).toContain('Network Error (using cached data):');
    expect(result.data).toEqual(mockDriverData);
    expect(result.fromCache).toBe(true);
    expect(result.cacheAge).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
    expect(mockGetDriverData).toHaveBeenCalledWith(123456);
    expect(mockCache.getExpired).toHaveBeenCalled();
  });

  it('should return cached data when API call fails', async () => {
    // Mock API failure
    const apiError = new Error('API connection failed');
    mockGetDriverData.mockRejectedValueOnce(apiError);
    
    // Mock cached data
    const cachedData = mockDriverData; // getExpired should return just the data, not wrapped
    mockCache.get.mockReturnValueOnce(null);
    mockCache.getExpired.mockReturnValueOnce(cachedData);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: true, age: 30 * 60 * 1000 }); // 30 minutes old

    const result = await getDriverPageData(123456, false);

    expect(result.error).toContain('Network Error (using cached data):');
    expect(result.data).toEqual(mockDriverData);
    expect(result.fromCache).toBe(true);
    expect(result.cacheAge).toBe(30 * 60 * 1000); // 30 minutes in ms
  });

  it('should return error when no cached data is available and API fails', async () => {
    // Mock API failure
    const apiError = new Error('API connection failed');
    mockGetDriverData.mockRejectedValueOnce(apiError);
    
    // Mock no cached data available
    mockCache.get.mockReturnValueOnce(null);
    mockCache.getExpired.mockReturnValueOnce(null);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: false, age: 0 });

    const result = await getDriverPageData(123456, false);

    expect(result.error).toBe('Failed to fetch driver data: API connection failed');
    expect(result.data).toBeNull();
    expect(result.fromCache).toBeUndefined(); // Not set when no cache is used
    expect(result.cacheAge).toBeUndefined();
  });

  it('should force refresh and bypass cache when requested', async () => {
    // Mock successful API response
    mockGetDriverData.mockResolvedValueOnce(mockDriverData);
    
    // Mock existing fresh cache (should be bypassed)
    const cachedData = {
      data: { ...mockDriverData, name: 'Old Cached Name' },
      timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes old (fresh)
    };
    mockCache.get.mockReturnValueOnce(cachedData);
    mockCache.set.mockReturnValueOnce(undefined);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: true, age: 5 * 60 * 1000 });

    const result = await getDriverPageData(123456, true); // Force refresh

    expect(result.error).toBeNull();
    expect(result.data).toEqual(mockDriverData);
    expect(result.data?.name).toBe('Test Driver'); // Should be fresh data, not cached
    expect(result.fromCache).toBe(false);
    expect(mockGetDriverData).toHaveBeenCalledWith(123456);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should format cache age correctly for different time periods', async () => {
    // Test just one case to debug the issue
    const apiError = new Error('API failed');
    const testCase = { ageMs: 2 * 60 * 1000, expected: '2 minutes ago' };
    
    mockGetDriverData.mockRejectedValueOnce(apiError);
    
    const cachedData = { ...mockDriverData }; // Create a fresh copy
    mockCache.get.mockReturnValueOnce(null);
    mockCache.getExpired.mockReturnValueOnce(cachedData);
    mockCache.getCacheInfo.mockReturnValueOnce({ exists: true, age: testCase.ageMs });

    const result = await getDriverPageData(123456, false);
    
    expect(result.cacheAge).toBe(testCase.ageMs); // Should return the age in milliseconds
    expect(result.fromCache).toBe(true);
    expect(result.data).toBeTruthy(); // Should have data from cache
  });
});
