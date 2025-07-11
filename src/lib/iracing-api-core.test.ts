import { getDriverData } from './iracing-api-core';
import IracingAPI from 'iracing-api';
import { type MemberSummaryResponse, type HistoryPoint } from './iracing-types';

// Mock the IracingAPI module
// Store module-level mocks from jest.mock
let mockLogin: jest.Mock;
let mockMemberGetMemberData: jest.Mock;
let mockStatsGetMemberSummary: jest.Mock;
let mockMemberGetMemberChartData: jest.Mock;
let mockStatsGetMemberRecentRaces: jest.Mock;

jest.mock('iracing-api', () => {
  // Create mocks that can be referenced from outside
  mockLogin = jest.fn();
  mockMemberGetMemberData = jest.fn();
  mockStatsGetMemberSummary = jest.fn();
  mockMemberGetMemberChartData = jest.fn();
  mockStatsGetMemberRecentRaces = jest.fn();

  return jest.fn().mockImplementation(() => ({
    login: mockLogin,
    member: {
      getMemberData: mockMemberGetMemberData,
      getMemberChartData: mockMemberGetMemberChartData,
    },
    stats: {
      getMemberSummary: mockStatsGetMemberSummary,
      getMemberRecentRaces: mockStatsGetMemberRecentRaces,
    },
  }));
});


describe('getDriverData', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules(); // Important to reset module state for iracing-api-core
    jest.clearAllMocks();

    // Set up environment variables for successful initialization
    process.env = {
      ...originalEnv,
      IRACING_EMAIL: 'test@example.com',
      IRACING_PASSWORD: 'password',
    };

    // Default successful login mock (actual call is in initializeAndLogin)
    // This mock will be used by the IracingAPI instance created in iracing-api-core
    mockLogin.mockResolvedValue({ success: true, authcode: 'someauthcode' }); // Adjust to actual success response

    // Default mock implementations for successful data calls
    mockMemberGetMemberData.mockResolvedValue({ members: [{ custId: 123, displayName: 'Test Driver', irating: 3000 }] });
    mockStatsGetMemberSummary.mockResolvedValue({
      stats: { licenseClass: 'A', srPrime: 3, srSub: 50, iRating: 3000 }
    } as MemberSummaryResponse);
    mockMemberGetMemberChartData.mockImplementation(async ({ chartType, categoryId }) => {
      let data: HistoryPoint[] = [{ month: 'Jan 2023', value: chartType === 1 ? 2800 : 3.50 }];
      if (chartType === 1 && categoryId === 1) {
        data = [{ month: 'Jan 2023', value: 2500 }];
      }
      return Promise.resolve({ data });
    });
    mockStatsGetMemberRecentRaces.mockResolvedValue({ races: [] });
  });

  afterEach(() => {
    process.env = originalEnv; // Restore original environment variables
  });

  describe('Safety Rating Formatting', () => {
    it('should correctly format safety rating for Class A', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'Class A', srPrime: 3, srSub: 75, iRating: 3000 },
      } as MemberSummaryResponse);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Class A 3.75');
    });

    it('should correctly format safety rating for Rookie', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'Rookie', srPrime: 2, srSub: 50, iRating: 1500 },
      } as MemberSummaryResponse);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Rookie 2.50');
    });

    it('should handle Pro/WC license class', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'Pro/WC', srPrime: 4, srSub: 1, iRating: 6000 },
      } as MemberSummaryResponse);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('Pro 4.01');
    });

    it('should handle single digit srSub correctly (e.g., X.0Y)', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'B', srPrime: 3, srSub: 5, iRating: 2500 },
      } as MemberSummaryResponse);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('B 3.05');
    });

    it('should return N/A if stats are missing', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({ stats: undefined } as any); // Simulate API returning no stats block
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');
    });

    it('should return N/A if srPrime or srSub is missing', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'C', srPrime: undefined, srSub: 50, iRating: 2000 }, // srPrime is undefined
      } as any); // Cast to any to allow partial mock
      let driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');

      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: { licenseClass: 'C', srPrime: 2, srSub: undefined, iRating: 2000 }, // srSub is undefined
      } as any); // Cast to any to allow partial mock
      driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('N/A');
    });

    it('should handle stats as an array and use the first element', async () => {
      mockStatsGetMemberSummary.mockResolvedValueOnce({
        stats: [{ licenseClass: 'D', srPrime: 1, srSub: 88, iRating: 1800, categoryId: 2 }],
      } as MemberSummaryResponse);
      const driverData = await getDriverData(123);
      expect(driverData?.currentSafetyRating).toBe('D 1.88');
    });
  });

  describe('iRating Histories', () => {
    it('should fetch iRating history for multiple categories', async () => {
      const roadData = [{ month: 'Feb 2023', value: 3000 }, { month: 'Mar 2023', value: 3050 }];
      const ovalData = [{ month: 'Feb 2023', value: 2000 }, { month: 'Mar 2023', value: 2050 }];
      const dirtRoadData = [{ month: 'Feb 2023', value: 1500 }];
      const dirtOvalData: HistoryPoint[] = [];

      mockMemberGetMemberChartData.mockImplementation(async ({ categoryId }) => {
        if (categoryId === 2) return { data: roadData };
        if (categoryId === 1) return { data: ovalData };
        if (categoryId === 4) return { data: dirtRoadData };
        if (categoryId === 3) return { data: dirtOvalData };
        return { data: [] };
      });

      const driverData = await getDriverData(123);
      // Date formatting in getDriverData is "MON YEAR"
      const mapToExpectedMonthFormat = (p: {month: string, value: number}) => ({
        ...p,
         month: expect.stringMatching(/^\w{3} \d{4}$/)
      });

      expect(driverData?.iratingHistories?.road).toEqual(roadData.map(mapToExpectedMonthFormat));
      expect(driverData?.iratingHistories?.oval).toEqual(ovalData.map(mapToExpectedMonthFormat));
      expect(driverData?.iratingHistories?.dirtRoad).toEqual(dirtRoadData.map(mapToExpectedMonthFormat));
      expect(driverData?.iratingHistories?.dirtOval).toEqual(dirtOvalData); // Empty array should be as is
    });

    it('should handle empty chart data for some iRating categories', async () => {
      mockMemberGetMemberChartData.mockImplementation(async ({ categoryId }) => {
        if (categoryId === 2) return { data: [{ month: 'Jan 2023', value: 3000 }] };
        return { data: [] };
      });
      const driverData = await getDriverData(123);
      expect(driverData?.iratingHistories?.road?.length).toBeGreaterThan(0);
      expect(driverData?.iratingHistories?.oval).toEqual([]);
      expect(driverData?.iratingHistories?.dirtRoad).toEqual([]);
      expect(driverData?.iratingHistories?.dirtOval).toEqual([]);
    });
  });

  describe('Recent Races Transformation', () => {
    it('should correctly parse year and season for recent races', async () => {
      mockStatsGetMemberRecentRaces.mockResolvedValueOnce({
        races: [
          { subsessionId: 1, seriesName: 'Formula F1600', carId: 1, sessionStartTime: '2023-03-15T10:00:00Z', track: {trackName: 'Okayama'}, licenseCategory: 'Road' },
          { subsessionId: 2, seriesName: 'GT3 Challenge', carId: 20, sessionStartTime: '2023-07-20T10:00:00Z', track: {trackName: 'Spa'}, licenseCategory: 'Road' },
        ]
      });
      const driverData = await getDriverData(123);
      expect(driverData?.recentRaces[0].year).toBe(2023);
      expect(driverData?.recentRaces[0].season).toBe('Spring');
      expect(driverData?.recentRaces[0].category).toBe('Formula Car');
      expect(driverData?.recentRaces[1].year).toBe(2023);
      expect(driverData?.recentRaces[1].season).toBe('Summer');
      expect(driverData?.recentRaces[1].category).toBe('Sports Car');
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
