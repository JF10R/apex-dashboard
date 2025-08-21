import { searchDriversAction, getDriverPageData } from '@/app/data-actions'
import { searchMembers, getMemberProfile, getMemberRecentRaces } from '@/lib/iracing-api-core'

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    getCacheInfo: jest.fn(() => ({ exists: false })),
    getExpired: jest.fn(),
  },
  cacheKeys: {
    driverSearch: jest.fn((query: string) => `search:${query}`),
    driver: jest.fn((custId: number) => `driver:${custId}`),
  },
  cacheTTL: {
    SEARCH_RESULTS: 300000,
    DRIVER_PROFILE: 600000,
  }
}))

// Mock the API functions
jest.mock('@/lib/iracing-api-core', () => ({
  searchMembers: jest.fn(),
  getMemberProfile: jest.fn(),
  getMemberRecentRaces: jest.fn(),
  getMemberStats: jest.fn(),
  getAllCars: jest.fn(),
  getCarName: jest.fn(),
  getRaceResultData: jest.fn(),
}))

// Mock the auth module separately
jest.mock('@/lib/iracing-auth', () => ({
  ApiError: class ApiError extends Error {
    constructor(public type: string, message: string) {
      super(message)
    }
  },
  ApiErrorType: {
    CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    LOGIN_FAILED: 'LOGIN_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR'
  }
}))

const mockSearchMembers = searchMembers as jest.MockedFunction<typeof searchMembers>
const mockGetMemberProfile = getMemberProfile as jest.MockedFunction<typeof getMemberProfile>
const mockGetMemberRecentRaces = getMemberRecentRaces as jest.MockedFunction<typeof getMemberRecentRaces>

// Import and mock the additional functions
import { getMemberStats, getAllCars, getCarName } from '@/lib/iracing-api-core'
const mockGetMemberStats = getMemberStats as jest.MockedFunction<typeof getMemberStats>
const mockGetAllCars = getAllCars as jest.MockedFunction<typeof getAllCars>
const mockGetCarName = getCarName as jest.MockedFunction<typeof getCarName>

describe('Data Actions with Jeff Noel', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  const jeffNoelMemberData = {
    cust_id: 539129,
    display_name: 'Jeff Noel',
    first_name: 'Jeff',
    last_name: 'Noel',
    club_id: 1234,
    club_name: 'Test Club',
    ai_enabled: false,
    flags: 0
  }

  const jeffNoelRecentRaces = [
    {
      subsession_id: 12345,
      series_id: 456,
      series_name: 'Test Series',
      season_id: 789,
      race_week_num: 1,
      event_type: 5,
      event_type_name: 'Race',
      start_time: '2024-01-01T12:00:00Z',
      finish_position: 5,
      starting_position: 8,
      car_id: 101,
      car_name: 'Test Car',
      track_id: 201,
      track_name: 'Test Track',
      incidents: 2,
      strength_of_field: 1800,
      old_irating: 2100,
      new_irating: 2150,
      old_safety_rating: 3.38,
      new_safety_rating: 3.42,
      license_level: 4
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock cache to return null (no cache hit) for all tests
    const { cache } = require('@/lib/cache')
    cache.get.mockReturnValue(null)
    
    // Setup default mock implementations for car-related functions
    mockGetCarName.mockResolvedValue('Test Car')
    mockGetAllCars.mockResolvedValue([
      {
        carId: 101,
        carName: 'Test Car',
        carTypes: [{ carType: 'GT3' }],
        categories: [{ categoryName: 'Sports Car' }],
        retired: false
      }
    ])
    mockGetMemberStats.mockResolvedValue([])
  })

  describe('searchDriversAction', () => {
    test('successfully searches for Jeff Noel', async () => {
      // Mock searchMembers to return member data format
      mockSearchMembers.mockResolvedValue([{
        display_name: jeffNoelDriver.name,
        cust_id: jeffNoelDriver.custId
      }])

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [jeffNoelDriver],
        error: null
      })
      expect(mockSearchMembers).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles empty search results', async () => {
      mockSearchMembers.mockResolvedValue([])

      const result = await searchDriversAction('NonExistentDriver')

      expect(result).toEqual({
        data: [],
        error: null
      })
      expect(mockSearchMembers).toHaveBeenCalledWith('NonExistentDriver')
    })

    test('handles API errors correctly', async () => {
      const { ApiError } = require('@/lib/iracing-auth')
      mockSearchMembers.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network connection failed'))

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Network connection failed'
      })
      expect(mockSearchMembers).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles generic errors correctly', async () => {
      mockSearchMembers.mockRejectedValue(new Error('Database error'))

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Failed to search drivers: Database error'
      })
      expect(mockSearchMembers).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles unknown errors correctly', async () => {
      mockSearchMembers.mockRejectedValue('Unknown error')

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Failed to search drivers: An unknown error occurred.'
      })
      expect(mockSearchMembers).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles multiple Jeff drivers correctly', async () => {
      const jeffDrivers = [
        { display_name: 'Jeff Noel', cust_id: 539129 },
        { display_name: 'Jeff Smith', cust_id: 123456 }
      ]
      
      mockSearchMembers.mockResolvedValue(jeffDrivers)

      const result = await searchDriversAction('Jeff')

      expect(result.data).toHaveLength(2)
      expect(result.data[0].name).toBe('Jeff Noel')
      expect(result.error).toBeNull()
      expect(mockSearchMembers).toHaveBeenCalledWith('Jeff')
    })
  })

  describe('getDriverPageData', () => {
    test('successfully fetches Jeff Noel data', async () => {
      mockGetMemberProfile.mockResolvedValue(jeffNoelMemberData)
      mockGetMemberRecentRaces.mockResolvedValue(jeffNoelRecentRaces)

      const result = await getDriverPageData(539129)

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data?.name).toBe('Jeff Noel')
      expect(result.data?.id).toBe(539129)
      expect(result.data?.recentRaces).toHaveLength(1)
      expect(mockGetMemberProfile).toHaveBeenCalledWith(539129)
      expect(mockGetMemberRecentRaces).toHaveBeenCalledWith(539129)
    })

    test('handles driver not found', async () => {
      mockGetMemberProfile.mockResolvedValue(null)
      mockGetMemberRecentRaces.mockResolvedValue([])

      const result = await getDriverPageData(999999)

      expect(result).toEqual({
        data: null,
        error: 'Driver data could not be found.'
      })
      expect(mockGetMemberProfile).toHaveBeenCalledWith(999999)
    })

    test('handles API errors correctly', async () => {
      const { ApiError } = require('@/lib/iracing-auth')
      mockGetMemberProfile.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network connection failed'))
      mockGetMemberRecentRaces.mockResolvedValue([])

      const result = await getDriverPageData(539129)

      expect(result.data).toBeNull()
      expect(result.error).toBe('Network connection failed')
      expect(mockGetMemberProfile).toHaveBeenCalledWith(539129)
    })

    test('handles generic errors correctly', async () => {
      mockGetMemberProfile.mockRejectedValue(new Error('Database error'))
      mockGetMemberRecentRaces.mockResolvedValue([])

      const result = await getDriverPageData(539129)

      expect(result.data).toBeNull()
      expect(result.error).toBe('Failed to fetch driver data: Database error')
      expect(mockGetMemberProfile).toHaveBeenCalledWith(539129)
    })
  })

  describe('Cache Integration', () => {
    test('uses cached search results when available', async () => {
      const { cache } = require('@/lib/cache')
      cache.get.mockReturnValue([jeffNoelDriver])

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [jeffNoelDriver],
        error: null
      })
      // Should not call API when cache hit
      expect(mockSearchMembers).not.toHaveBeenCalled()
    })

    test('uses cached driver data when available', async () => {
      const { cache } = require('@/lib/cache')
      const cachedDriverData = {
        id: 539129,
        name: 'Jeff Noel',
        currentIRating: 2150,
        currentSafetyRating: 'A 3.42',
        avgRacePace: '1:42.123',
        iratingHistories: { 'Road': [], 'Oval': [] },
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: []
      }
      
      cache.get.mockReturnValue(cachedDriverData)
      cache.getCacheInfo.mockReturnValue({ exists: true, age: 30000 })

      const result = await getDriverPageData(539129)

      expect(result).toEqual({
        data: cachedDriverData,
        error: null,
        fromCache: true,
        cacheAge: 30000
      })
      // Should not call API when cache hit
      expect(mockGetMemberProfile).not.toHaveBeenCalled()
      expect(mockGetMemberRecentRaces).not.toHaveBeenCalled()
    })
  })
})
