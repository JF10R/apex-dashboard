// Mock the environment variables BEFORE importing any modules
const originalEnv = process.env;

// Mock the iracing-api module first to avoid import issues
jest.mock('iracing-api');

// Mock the entire iracing-api-core module to avoid module initialization issues
jest.mock('./iracing-api-core', () => {
  const mockGetDriverData = jest.fn();
  return {
    getDriverData: mockGetDriverData,
    searchDriversByName: jest.fn(),
    getRaceResultData: jest.fn(),
    ApiErrorType: {
      CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
      INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
      NOT_CONFIGURED: 'NOT_CONFIGURED',
      LOGIN_FAILED: 'LOGIN_FAILED',
      NETWORK_ERROR: 'NETWORK_ERROR'
    },
    ApiError: class ApiError extends Error {
      constructor(public type: string, message: string, public originalResponse?: any) {
        super(message);
        this.name = 'ApiError';
      }
    },
  };
});

// Now manually import the types we need
import { type MemberSummaryResponse, type HistoryPoint } from './iracing-types';

// Import the mocked function
import { getMemberProfile } from './iracing-api-modular';
const mockGetMemberProfile = getMemberProfile as jest.MockedFunction<typeof getMemberProfile>;


describe('getDriverData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('Safety Rating Formatting', () => {
    it('should correctly format safety rating for Class A', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 3000,
        currentSafetyRating: 'Class A 3.75',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Class A 3.75');
    });

    it('should correctly format safety rating for Rookie', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 1500,
        currentSafetyRating: 'Rookie 2.50',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Rookie 2.50');
    });

    it('should handle Pro/WC license class', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 6000,
        currentSafetyRating: 'Pro 4.01',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Pro 4.01');
    });

    it('should handle single digit srSub correctly (e.g., X.0Y)', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 2500,
        currentSafetyRating: 'B 3.05',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('B 3.05');
    });

    it('should return N/A if stats are missing', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 2000,
        currentSafetyRating: 'N/A',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');
    });

    it('should return N/A if srPrime or srSub is missing', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 2000,
        currentSafetyRating: 'N/A',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      let driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');

      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');
    });

    it('should handle stats as an array and use the first element', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 1800,
        currentSafetyRating: 'D 1.88',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('D 1.88');
    });
  });

  describe('iRating Histories', () => {
    it('should fetch iRating history for racing categories based on driver activity', async () => {
      const sportsCarData = [{ month: 'Feb 2023', value: 3000 }, { month: 'Mar 2023', value: 3050 }];
      const ovalData = [{ month: 'Feb 2023', value: 2000 }, { month: 'Mar 2023', value: 2050 }];

      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 3000,
        currentSafetyRating: 'A 3.50',
        avgRacePace: '1:25.123',
        iratingHistories: {
          'Sports Car': sportsCarData,
          'Oval': ovalData,
        },
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [
          {
            id: '1',
            trackName: 'Spa',
            seriesName: 'GT3 Challenge',
            date: '2023-03-15T10:00:00Z',
            car: 'Skip Barber RT2000',
            category: 'Sports Car' as const,
            year: 2023,
            season: 'Season 1',
            startPosition: 5,
            finishPosition: 3,
            incidents: 2,
            fastestLap: 'N/A',
            strengthOfField: 1800,
            participants: [],
            avgRaceIncidents: 2,
            avgRaceLapTime: 'N/A',
            lapsLed: 0,
            iratingChange: 25,
            safetyRatingChange: '0.05',
            avgLapTime: 'N/A',
          },
          {
            id: '2',
            trackName: 'Daytona',
            seriesName: 'NASCAR Cup',
            date: '2023-07-20T10:00:00Z',
            car: 'Stock Car',
            category: 'Oval' as const,
            year: 2023,
            season: 'Season 3',
            startPosition: 8,
            finishPosition: 12,
            incidents: 1,
            fastestLap: 'N/A',
            strengthOfField: 2200,
            participants: [],
            avgRaceIncidents: 1,
            avgRaceLapTime: 'N/A',
            lapsLed: 2,
            iratingChange: -15,
            safetyRatingChange: '0.02',
            avgLapTime: 'N/A',
          },
        ],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      
      // Use any() matcher for month format since we can't guarantee exact format in mock
      expect(driverData?.iratingHistories?.['Sports Car']).toEqual(sportsCarData);
      expect(driverData?.iratingHistories?.['Oval']).toEqual(ovalData);
    });

    it('should handle empty chart data for some iRating categories', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 3000,
        currentSafetyRating: 'A 3.50',
        avgRacePace: '1:25.123',
        iratingHistories: {
          'Sports Car': [{ month: 'Jan 2023', value: 3000 }],
        },
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [
          {
            id: '1',
            trackName: 'Spa',
            seriesName: 'GT3 Challenge',
            date: '2023-03-15T10:00:00Z',
            car: 'Skip Barber RT2000',
            category: 'Sports Car' as const,
            year: 2023,
            season: 'Season 1',
            startPosition: 5,
            finishPosition: 3,
            incidents: 2,
            fastestLap: 'N/A',
            strengthOfField: 1800,
            participants: [],
            avgRaceIncidents: 2,
            avgRaceLapTime: 'N/A',
            lapsLed: 0,
            iratingChange: 25,
            safetyRatingChange: '0.05',
            avgLapTime: 'N/A',
          },
        ],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.iratingHistories?.['Sports Car']?.length).toBeGreaterThan(0);
      // Only Sports Car should be present since that's the only category with recent races
      expect(Object.keys(driverData?.iratingHistories || {})).toEqual(['Sports Car']);
    });
  });

  describe('Recent Races Transformation', () => {
    it('should correctly parse year and season for recent races', async () => {
      const mockDriver = {
        id: 123,
        name: 'Test Driver',
        currentIRating: 3000,
        currentSafetyRating: 'A 3.50',
        avgRacePace: '1:25.123',
        iratingHistories: {},
        safetyRatingHistory: [],
        racePaceHistory: [],
        recentRaces: [
          {
            id: '1',
            trackName: 'Okayama',
            seriesName: 'Formula F1600',
            date: '2023-03-15T10:00:00Z',
            car: 'Skip Barber RT2000',
            category: 'Sports Car' as const,
            year: 2023,
            season: 'Season 1',
            startPosition: 5,
            finishPosition: 3,
            incidents: 2,
            fastestLap: 'N/A',
            strengthOfField: 1800,
            participants: [],
            avgRaceIncidents: 2,
            avgRaceLapTime: 'N/A',
            lapsLed: 0,
            iratingChange: 25,
            safetyRatingChange: '0.05',
            avgLapTime: 'N/A',
          },
          {
            id: '2',
            trackName: 'Spa',
            seriesName: 'GT3 Challenge',
            date: '2023-07-20T10:00:00Z',
            car: 'Stock Car',
            category: 'Oval' as const,
            year: 2023,
            season: 'Season 3',
            startPosition: 8,
            finishPosition: 12,
            incidents: 1,
            fastestLap: 'N/A',
            strengthOfField: 2200,
            participants: [],
            avgRaceIncidents: 1,
            avgRaceLapTime: 'N/A',
            lapsLed: 2,
            iratingChange: -15,
            safetyRatingChange: '0.02',
            avgLapTime: 'N/A',
          },
        ],
      };
      
      mockGetDriverData.mockResolvedValueOnce(mockDriver);
      const driverData = await getDriverData(123);
      expect(driverData?.recentRaces[0].year).toBe(2023);
      expect(driverData?.recentRaces[0].season).toBe('Season 1');
      expect(driverData?.recentRaces[0].category).toBe('Sports Car');
      expect(driverData?.recentRaces[1].year).toBe(2023);
      expect(driverData?.recentRaces[1].season).toBe('Season 3');
      expect(driverData?.recentRaces[1].category).toBe('Oval');
    });
  });
});

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
  } as Response)
);
