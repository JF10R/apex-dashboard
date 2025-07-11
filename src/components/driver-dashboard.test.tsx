import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DriverDashboard from './driver-dashboard';
import * as dataActions from '../app/data-actions'; // To mock getDriverPageData
import { type Driver, type HistoryPoint, type RecentRace, RaceCategory } from '@/lib/iracing-types'; // Ensure RaceCategory is imported
import { useToast } from '@/hooks/use-toast';

// Mock child components to simplify testing
jest.mock('./stat-card', () => ({ StatCard: (props: any) => <div data-testid="stat-card" title={props.title}>{props.title}: {props.value}</div> }));
jest.mock('./history-chart', () => ({ HistoryChart: (props: any) => <div data-testid="history-chart" title={props.title}>{props.title} using {props.dataKey}</div> }));
jest.mock('./recent-races', () => ({ RecentRaces: (props: any) => <div data-testid="recent-races">Races: {props.races.length}</div> }));
jest.mock('./series-performance-summary', () => (props: any) => <div data-testid="series-summary">Series Stats: {props.seriesStats.length}</div>);
jest.mock('@/app/actions', () => ({
  getAnalysis: jest.fn().mockResolvedValue({ summary: 'AI Analysis', error: null }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));


// Mock getDriverPageData from data-actions
jest.mock('../app/data-actions', () => ({
  getDriverPageData: jest.fn(),
}));

const mockGetDriverPageData = dataActions.getDriverPageData as jest.Mock;

const createMockDriverData = (overrides: Partial<Driver> = {}): Driver => {
  const sportsCarHistory: HistoryPoint[] = [{ month: 'Jan 2023', value: 3000 }, { month: 'Feb 2023', value: 3100 }];
  const ovalHistory: HistoryPoint[] = [{ month: 'Jan 2023', value: 2000 }, { month: 'Feb 2023', value: 2100 }];
  const formulaCarHistory: HistoryPoint[] = [{ month: 'Jan 2023', value: 2800 }, { month: 'Feb 2023', value: 2900 }];

  const mockRaces: RecentRace[] = [
    { id: '1', trackName: 'Okayama', date: '2023-03-15T10:00:00Z', year: 2023, season: 'Season 1', category: 'Formula Car' as RaceCategory, seriesName: 'F1600', car: 'F1600', startPosition: 1, finishPosition: 1, incidents: 0, strengthOfField: 1500, lapsLed: 10, fastestLap: '1:30.000', avgLapTime: '1:31.000', iratingChange: 50, safetyRatingChange: '0.10', participants: [], avgRaceIncidents: 2, avgRaceLapTime: '1:32.000' },
    { id: '2', trackName: 'Spa', date: '2023-07-20T10:00:00Z', year: 2023, season: 'Season 3', category: 'Sports Car' as RaceCategory, seriesName: 'GT3', car: 'Ferrari GT3', startPosition: 5, finishPosition: 3, incidents: 2, strengthOfField: 2500, lapsLed: 0, fastestLap: '2:18.000', avgLapTime: '2:19.000', iratingChange: 30, safetyRatingChange: '0.05', participants: [], avgRaceIncidents: 3, avgRaceLapTime: '2:20.000' },
    { id: '3', trackName: 'Silverstone', date: '2023-06-10T10:00:00Z', year: 2023, season: 'Season 2', category: 'Sports Car' as RaceCategory, seriesName: 'GT3', car: 'McLaren GT3', startPosition: 3, finishPosition: 2, incidents: 1, strengthOfField: 2300, lapsLed: 5, fastestLap: '2:17.000', avgLapTime: '2:18.000', iratingChange: 40, safetyRatingChange: '0.08', participants: [], avgRaceIncidents: 3, avgRaceLapTime: '2:19.000' },
    { id: '4', trackName: 'Daytona', date: '2022-10-05T10:00:00Z', year: 2022, season: 'Season 4', category: 'Oval' as RaceCategory, seriesName: 'NASCAR', car: 'Stock Car', startPosition: 10, finishPosition: 8, incidents: 1, strengthOfField: 2000, lapsLed: 0, fastestLap: '0:45.000', avgLapTime: '0:46.000', iratingChange: 20, safetyRatingChange: '-0.02', participants: [], avgRaceIncidents: 4, avgRaceLapTime: '0:47.000' },
  ];

  return {
    id: 123,
    name: 'Test Driver',
    currentIRating: 3100,
    currentSafetyRating: 'A 3.50',
    avgRacePace: '1:45.000',
    iratingHistories: {
      'Sports Car': sportsCarHistory,
      'Oval': ovalHistory,
      'Formula Car': formulaCarHistory,
    },
    safetyRatingHistory: [{ month: 'Jan 2023', value: 3.4 }, { month: 'Feb 2023', value: 3.5 }],
    racePaceHistory: [{ month: 'Jan 2023', value: 105 }, { month: 'Feb 2023', value: 104 }], // 1:45.000, 1:44.000
    recentRaces: mockRaces,
    ...overrides,
  };
};

describe('DriverDashboard', () => {
  beforeEach(() => {
    mockGetDriverPageData.mockResolvedValue({ data: createMockDriverData(), error: null });
    (useToast as jest.Mock).mockReturnValue({ toast: jest.fn() }); // Ensure toast is mocked for each test
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    mockGetDriverPageData.mockImplementationOnce(() => new Promise(() => {})); // Never resolves
    render(<DriverDashboard custId={123} driverName="Test Driver" />);
    // Check for presence of skeleton elements (example)
    expect(screen.getAllByText((content, element) => 
      Boolean(element?.classList.contains('h-8') && element?.classList.contains('w-48'))
    ).length).toBeGreaterThan(0);
  });

  it('renders driver data after loading', async () => {
    render(<DriverDashboard custId={123} driverName="Test Driver" />);
    await waitFor(() => expect(screen.getByText('Stats for Test Driver')).toBeInTheDocument());
    expect(screen.getByText('iRating: 3,100')).toBeInTheDocument(); // StatCard format
    expect(screen.getByText('Safety Rating: A 3.50')).toBeInTheDocument(); // StatCard format
  });

  describe('iRating Category Selector', () => {
    it('defaults to Sports Car iRating and displays its chart', async () => {
      render(<DriverDashboard custId={123} driverName="Test Driver" />);
      await waitFor(() => {
        const iRatingChart = screen.getByTitle('iRating History (Sports Car)');
        expect(iRatingChart).toBeInTheDocument();
      });
    });

    it('allows changing iRating category and updates chart', async () => {
      render(<DriverDashboard custId={123} driverName="Test Driver" />);
      await waitFor(() => expect(screen.getByText('iRating History (Sports Car)')).toBeInTheDocument());

      const selector = await screen.findByRole('combobox', { name: /select irating category/i });
      fireEvent.mouseDown(selector); // Open the select dropdown

      // Wait for the options to be available
      const ovalOption = await screen.findByText('Oval');
      fireEvent.click(ovalOption);

      await waitFor(() => expect(screen.getByText('iRating History (Oval)')).toBeInTheDocument());
    });

    it('only shows categories with data in the selector', async () => {
       mockGetDriverPageData.mockResolvedValue({ data: createMockDriverData({
         iratingHistories: { 'Sports Car': [{ month: 'Jan 2023', value: 1000}], 'Oval': [], 'Formula Car': [] }
       }), error: null });
      render(<DriverDashboard custId={123} driverName="Test Driver" />);

      await waitFor(() => screen.getByText('iRating History (Sports Car)')); // Ensure dashboard loaded

      const selector = screen.getByRole('combobox', { name: /select irating category/i });
      fireEvent.mouseDown(selector);

      await screen.findByText('Sports Car'); // Sports Car option should be there
      expect(screen.queryByText('Oval')).not.toBeInTheDocument(); // Oval option should NOT be there
    });
  });

  describe('Data Filters', () => {
    it('filters recent races when a year is selected', async () => {
      render(<DriverDashboard custId={123} driverName="Test Driver" />);
      await waitFor(() => expect(screen.getByTestId('recent-races')).toHaveTextContent('Races: 4')); // Initial: 4 races

      // Open Year select
      const yearSelect = screen.getByRole('combobox', { name: /year/i });
      fireEvent.mouseDown(yearSelect);
      // Select 2022
      const year2022 = await screen.findByText('2022');
      fireEvent.click(year2022);

      await waitFor(() => expect(screen.getByTestId('recent-races')).toHaveTextContent('Races: 1')); // Only 1 race in 2022
    });

    it('resets season when year is changed', async () => {
      render(<DriverDashboard custId={123} driverName="Test Driver" />);
      await waitFor(() => expect(screen.getByText('Stats for Test Driver')).toBeInTheDocument());

      // Initial season is Season 3 (from mock data's latest 2023 race)
      const seasonSelect = screen.getByRole('combobox', { name: /season/i });
      expect(seasonSelect).toHaveTextContent('Season 3');

      // Change Year
      const yearSelect = screen.getByRole('combobox', { name: /year/i });
      fireEvent.mouseDown(yearSelect);
      fireEvent.click(await screen.findByText('2022'));

      // Season should reset to 'All Seasons' (value 'all')
      await waitFor(() => expect(seasonSelect).toHaveTextContent('All Seasons'));
    });

    it('filters by category', async () => {
      render(<DriverDashboard custId={123} driverName="Test Driver" />);
      await waitFor(() => expect(screen.getByTestId('recent-races')).toHaveTextContent('Races: 4'));

      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      fireEvent.mouseDown(categorySelect);
      fireEvent.click(await screen.findByText('Formula Car')); // Mock data has one "Formula Car"

      await waitFor(() => expect(screen.getByTestId('recent-races')).toHaveTextContent('Races: 1'));
    });
  });
});
