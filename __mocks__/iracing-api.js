// Mock for iracing-api package to handle ES module imports in Jest

const mockMethods = {
  login: jest.fn(),
  cars: jest.fn(),
  tracks: jest.fn(),
  series: jest.fn(),
  seasons: jest.fn(),
  memberChartData: jest.fn(),
  memberRecentRaces: jest.fn(),
  memberProfile: jest.fn(),
  memberCareer: jest.fn(),
  results: jest.fn(),
  resultsLaps: jest.fn(),
  logout: jest.fn()
};

// Default implementation to return empty/success responses
mockMethods.login.mockResolvedValue({ success: true });
mockMethods.cars.mockResolvedValue([]);
mockMethods.tracks.mockResolvedValue([]);
mockMethods.series.mockResolvedValue([]);
mockMethods.seasons.mockResolvedValue([]);
mockMethods.memberChartData.mockResolvedValue([]);
mockMethods.memberRecentRaces.mockResolvedValue([]);
mockMethods.memberProfile.mockResolvedValue({});
mockMethods.memberCareer.mockResolvedValue({});
mockMethods.results.mockResolvedValue([]);
mockMethods.resultsLaps.mockResolvedValue([]);
mockMethods.logout.mockResolvedValue({ success: true });

// Export both named and default exports to handle different import styles
module.exports = mockMethods;
module.exports.default = mockMethods;

// Handle named exports
Object.keys(mockMethods).forEach(key => {
  module.exports[key] = mockMethods[key];
});
