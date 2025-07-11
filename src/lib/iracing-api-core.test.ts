import { getDriverData } from './iracing-api-core';
import IracingAPI from 'iracing-api';
import { type MemberSummaryResponse, type HistoryPoint } from './iracing-types';

// Mock the IracingAPI module
jest.mock('iracing-api', () => {
  // Create mocks that can be referenced from outside
  const mockLogin = jest.fn();
  const mockMemberGetMemberData = jest.fn();
  const mockStatsGetMemberSummary = jest.fn();
  const mockMemberGetMemberChartData = jest.fn();
  const mockStatsGetMemberRecentRaces = jest.fn();

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

// Get references to the mocks after they're created
const mockIracingAPI = IracingAPI as jest.MockedClass<typeof IracingAPI>;
let mockLogin: jest.Mock;
let mockMemberGetMemberData: jest.Mock;
let mockStatsGetMemberSummary: jest.Mock;
let mockMemberGetMemberChartData: jest.Mock;
let mockStatsGetMemberRecentRaces: jest.Mock;


describe('getDriverData', () => {
  const originalEnv = process.env;
  
  // Get mock instances
  let mockLogin: jest.Mock;
  let mockMemberGetMemberData: jest.Mock;
  let mockStatsGetMemberSummary: jest.Mock;
  let mockMemberGetMemberChartData: jest.Mock;
  let mockStatsGetMemberRecentRaces: jest.Mock;

  beforeEach(() => {
    jest.resetModules(); // Important to reset module state for iracing-api-core
    jest.clearAllMocks();

    // Get fresh references to the mocks
    const mockInstance = (IracingAPI as jest.MockedClass<typeof IracingAPI>).mock.results[0]?.value || {};
    mockLogin = mockInstance.login || jest.fn();
    mockMemberGetMemberData = mockInstance.member?.getMemberData || jest.fn();
    mockStatsGetMemberSummary = mockInstance.stats?.getMemberSummary || jest.fn();
    mockMemberGetMemberChartData = mockInstance.member?.getMemberChartData || jest.fn();
    mockStatsGetMemberRecentRaces = mockInstance.stats?.getMemberRecentRaces || jest.fn();

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
    mockStatsGetMemberRecentRaces.mockResolvedValue({ 
      races: [
        { subsessionId: 1, seriesName: 'GT3 Challenge', carId: 1, sessionStartTime: '2023-03-15T10:00:00Z', track: {trackName: 'Spa'}, licenseCategory: 'Road' },
        { subsessionId: 2, seriesName: 'NASCAR Cup', carId: 20, sessionStartTime: '2023-07-20T10:00:00Z', track: {trackName: 'Daytona'}, licenseCategory: 'Oval' },
      ]
    });
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
    it('should fetch iRating history for racing categories based on driver activity', async () => {
      const sportsCarData = [{ month: 'Feb 2023', value: 3000 }, { month: 'Mar 2023', value: 3050 }];
      const ovalData = [{ month: 'Feb 2023', value: 2000 }, { month: 'Mar 2023', value: 2050 }];

      // Mock recent races to include Sports Car and Oval categories
      mockStatsGetMemberRecentRaces.mockResolvedValueOnce({
        races: [
          { subsessionId: 1, seriesName: 'GT3 Challenge', carId: 1, sessionStartTime: '2023-03-15T10:00:00Z', track: {trackName: 'Spa'}, licenseCategory: 'Road' },
          { subsessionId: 2, seriesName: 'NASCAR Cup', carId: 20, sessionStartTime: '2023-07-20T10:00:00Z', track: {trackName: 'Daytona'}, licenseCategory: 'Oval' },
        ]
      });

      mockMemberGetMemberChartData.mockImplementation(async ({ categoryId }) => {
        if (categoryId === 2) return { data: sportsCarData }; // Road category used for Sports Car
        if (categoryId === 1) return { data: ovalData }; // Oval category
        return { data: [] };
      });

      const driverData = await getDriverData(123);
      // Date formatting in getDriverData is "MON YEAR"
      const mapToExpectedMonthFormat = (p: {month: string, value: number}) => ({
        ...p,
         month: expect.stringMatching(/^\w{3} \d{4}$/)
      });

      expect(driverData?.iratingHistories?.['Sports Car']).toEqual(sportsCarData.map(mapToExpectedMonthFormat));
      expect(driverData?.iratingHistories?.['Oval']).toEqual(ovalData.map(mapToExpectedMonthFormat));
    });

    it('should handle empty chart data for some iRating categories', async () => {
      // Mock recent races with only Sports Car activity
      mockStatsGetMemberRecentRaces.mockResolvedValueOnce({
        races: [
          { subsessionId: 1, seriesName: 'GT3 Challenge', carId: 1, sessionStartTime: '2023-03-15T10:00:00Z', track: {trackName: 'Spa'}, licenseCategory: 'Road' },
        ]
      });

      mockMemberGetMemberChartData.mockImplementation(async ({ categoryId }) => {
        if (categoryId === 2) return { data: [{ month: 'Jan 2023', value: 3000 }] };
        return { data: [] };
      });
      const driverData = await getDriverData(123);
      expect(driverData?.iratingHistories?.['Sports Car']?.length).toBeGreaterThan(0);
      // Only Sports Car should be present since that's the only category with recent races
      expect(Object.keys(driverData?.iratingHistories || {})).toEqual(['Sports Car']);
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
