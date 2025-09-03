import { getSubsessionResults, getSubsessionLapData } from '@/lib/iracing-results';
import { ensureApiInitialized } from '@/lib/iracing-auth-persistent';

jest.mock('@/lib/iracing-auth-persistent', () => ({
  ensureApiInitialized: jest.fn(),
}));

const mockEnsure = ensureApiInitialized as jest.Mock;

describe('iRacing subsession utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves subsession results from API', async () => {
    const mockApi = {
      results: {
        getResult: jest.fn().mockResolvedValue({
          subsessionId: 123,
          seasonId: 2024,
          sessionId: 456,
          seriesId: 1,
          seriesName: 'Test Series',
          raceWeekNum: 2,
          startTime: '2024-01-01T00:00:00Z',
          sessionResults: [
            {
              simsessionName: 'Race',
              results: [
                {
                  custId: 1,
                  displayName: 'Driver One',
                  finishPosition: 1,
                  finishPositionInClass: 1,
                  lapsLead: 5,
                  lapsComplete: 10,
                  optLapsComplete: 0,
                  averageLap: 60,
                  bestLapNum: 3,
                  bestLapTime: 59,
                  champPoints: 100,
                  clubPoints: 0,
                  position: 1,
                  startingPosition: 2,
                  startingPositionInClass: 2,
                  carId: 101,
                  carName: 'Car',
                  aggregateChampPoints: 100,
                  oldLicenseLevel: 0,
                  oldSafetyRating: 0,
                  oldCpi: 0,
                  oldiRating: 0,
                  oldTtrating: 0,
                  newLicenseLevel: 0,
                  newSafetyRating: 0,
                  newCpi: 0,
                  newiRating: 0,
                  newTtrating: 0,
                  multiplier: 1,
                  licenseChangeOval: 0,
                  licenseChangeRoad: 0,
                  incidents: 0,
                  maxPctFuelFill: 100,
                  weightPenaltyKg: 0,
                  leaguePoints: 0,
                  leagueAggPoints: 0,
                  carClassId: 1,
                  carClassName: 'Class',
                  carClassColor: '#fff',
                  division: 1,
                  divisionName: 'Div',
                  watched: false,
                  friend: false,
                  ai: false,
                },
              ],
            },
          ],
        }),
        getResultsLapData: jest.fn(),
      },
    };
    mockEnsure.mockResolvedValue(mockApi);

    const result = await getSubsessionResults(123);

    expect(mockApi.results.getResult).toHaveBeenCalledWith({ subsessionId: 123 });
    expect(result).not.toBeNull();
    expect(result?.subsession_id).toBe(123);
    expect(result?.subsession_results).toHaveLength(1);
    expect(result?.subsession_results[0].display_name).toBe('Driver One');
  });

  it('paginates lap data responses', async () => {
    const mockApi = {
      results: {
        getResult: jest.fn(),
        getResultsLapData: jest.fn().mockImplementation(({ startLap }: any) => {
          if (startLap === 0) {
            return Promise.resolve({
              lapData: [
                { groupId: 1, name: 'Driver', custId: 1, displayName: 'Driver', lapNumber: 1, flags: 0, incident: false, sessionTime: 0, sessionStartTime: 0, lapTime: 60, teamFastestLap: false, personalBestLap: false, licenseLevel: 0, carNumber: '1', lapEvents: [] },
                { groupId: 1, name: 'Driver', custId: 1, displayName: 'Driver', lapNumber: 2, flags: 0, incident: false, sessionTime: 60, sessionStartTime: 0, lapTime: 61, teamFastestLap: false, personalBestLap: false, licenseLevel: 0, carNumber: '1', lapEvents: [] },
              ],
              chunkInfo: { chunkSize: 2, rows: 3 },
            });
          }
          return Promise.resolve({
            lapData: [
              { groupId: 1, name: 'Driver', custId: 1, displayName: 'Driver', lapNumber: 3, flags: 0, incident: false, sessionTime: 120, sessionStartTime: 0, lapTime: 62, teamFastestLap: false, personalBestLap: false, licenseLevel: 0, carNumber: '1', lapEvents: [] },
            ],
            chunkInfo: { chunkSize: 2, rows: 3 },
          });
        }),
      },
    };
    mockEnsure.mockResolvedValue(mockApi);

    const laps = await getSubsessionLapData(555, 1);

    expect(mockApi.results.getResultsLapData).toHaveBeenCalledTimes(2);
    expect(laps).toHaveLength(3);
    expect(laps[0].lap_number).toBe(1);
    expect(laps[2].lap_number).toBe(3);
  });
});
