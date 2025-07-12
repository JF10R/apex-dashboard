import { searchDriversAction, getDriverPageData } from '@/app/data-actions'
import { searchDriversByName, getDriverData } from '@/lib/iracing-api-core'

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
  searchDriversByName: jest.fn(),
  getDriverData: jest.fn(),
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

const mockSearchDriversByName = searchDriversByName as jest.MockedFunction<typeof searchDriversByName>
const mockGetDriverData = getDriverData as jest.MockedFunction<typeof getDriverData>

describe('Data Actions with Jeff Noel', () => {
  const jeffNoelDriver = {
    name: 'Jeff Noel',
    custId: 539129
  }

  const jeffNoelData = {
    id: 539129,
    name: 'Jeff Noel',
    currentIRating: 2150,
    currentSafetyRating: 'A 3.42',
    avgRacePace: '1:42.123',
    iratingHistories: {
      'Road': [
        { month: 'Jan', value: 2000 },
        { month: 'Feb', value: 2150 }
      ],
      'Oval': [
        { month: 'Jan', value: 1900 },
        { month: 'Feb', value: 2050 }
      ]
    },
    safetyRatingHistory: [
      { month: 'Jan', value: 3.2 },
      { month: 'Feb', value: 3.42 }
    ],
    racePaceHistory: [
      { month: 'Jan', value: 102.5 },
      { month: 'Feb', value: 102.123 }
    ],
    recentRaces: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock cache to return null (no cache hit) for all tests
    const { cache } = require('@/lib/cache')
    cache.get.mockReturnValue(null)
  })

  describe('searchDriversAction', () => {
    test('successfully searches for Jeff Noel', async () => {
      mockSearchDriversByName.mockResolvedValue([jeffNoelDriver])

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [jeffNoelDriver],
        error: null
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles empty search results', async () => {
      mockSearchDriversByName.mockResolvedValue([])

      const result = await searchDriversAction('NonExistentDriver')

      expect(result).toEqual({
        data: [],
        error: null
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('NonExistentDriver')
    })

    test('handles API error', async () => {
      const { ApiError } = require('@/lib/iracing-api-core')
      mockSearchDriversByName.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network connection failed'))

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Network connection failed'
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles generic error', async () => {
      mockSearchDriversByName.mockRejectedValue(new Error('Database error'))

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Failed to search drivers: Database error'
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles unknown error type', async () => {
      mockSearchDriversByName.mockRejectedValue('Unknown error')

      const result = await searchDriversAction('Jeff Noel')

      expect(result).toEqual({
        data: [],
        error: 'Failed to search drivers: An unknown error occurred.'
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('Jeff Noel')
    })

    test('handles partial match for Jeff', async () => {
      const jeffDrivers = [
        jeffNoelDriver,
        { name: 'Jeff Johnson', custId: 123456 },
        { name: 'Jeff Smith', custId: 789012 }
      ]

      mockSearchDriversByName.mockResolvedValue(jeffDrivers)

      const result = await searchDriversAction('Jeff')

      expect(result).toEqual({
        data: jeffDrivers,
        error: null
      })
      expect(mockSearchDriversByName).toHaveBeenCalledWith('Jeff')
    })
  })

  describe('getDriverPageData', () => {
    test('successfully retrieves Jeff Noel driver data', async () => {
      mockGetDriverData.mockResolvedValue(jeffNoelData)

      const result = await getDriverPageData(539129)

      expect(result).toEqual({
        data: jeffNoelData,
        error: null,
        fromCache: false
      })
      expect(mockGetDriverData).toHaveBeenCalledWith(539129)
    })

    test('handles driver not found', async () => {
      mockGetDriverData.mockResolvedValue(null)

      const result = await getDriverPageData(999999)

      expect(result).toEqual({
        data: null,
        error: 'Driver data could not be found.'
      })
      expect(mockGetDriverData).toHaveBeenCalledWith(999999)
    })

    test('handles API error', async () => {
      const { ApiError } = require('@/lib/iracing-api-core')
      mockGetDriverData.mockRejectedValue(new ApiError('NETWORK_ERROR', 'Network connection failed'))

      const result = await getDriverPageData(539129)

      expect(result).toEqual({
        data: null,
        error: 'Network connection failed'
      })
      expect(mockGetDriverData).toHaveBeenCalledWith(539129)
    })

    test('handles generic error', async () => {
      mockGetDriverData.mockRejectedValue(new Error('Database error'))

      const result = await getDriverPageData(539129)

      expect(result).toEqual({
        data: null,
        error: 'Failed to fetch driver data: Database error'
      })
      expect(mockGetDriverData).toHaveBeenCalledWith(539129)
    })

    test('handles unknown error type', async () => {
      mockGetDriverData.mockRejectedValue('Unknown error')

      const result = await getDriverPageData(539129)

      expect(result).toEqual({
        data: null,
        error: 'Failed to fetch driver data: An unknown error occurred.'
      })
      expect(mockGetDriverData).toHaveBeenCalledWith(539129)
    })

    test('handles zero customer ID', async () => {
      mockGetDriverData.mockResolvedValue({ ...jeffNoelData, id: 0 })

      const result = await getDriverPageData(0)

      expect(result.data?.id).toBe(0)
      expect(result.error).toBeNull()
      expect(mockGetDriverData).toHaveBeenCalledWith(0)
    })
  })
})
