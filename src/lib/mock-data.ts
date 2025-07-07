export interface HistoryPoint {
  month: string;
  value: number;
}

export interface RecentRace {
  trackName: string;
  date: string;
  startPosition: number;
  finishPosition: number;
  incidents: number;
  strengthOfField: number;
}

export interface Driver {
  id: number;
  name: string;
  currentIRating: number;
  currentSafetyRating: string;
  avgRacePace: string;
  iratingHistory: HistoryPoint[];
  safetyRatingHistory: HistoryPoint[];
  racePaceHistory: HistoryPoint[]; // As seconds for charting
  recentRaces: RecentRace[];
}

export const DRIVER_DATA: Record<string, Driver> = {
  'Daniel Ricciardo': {
    id: 32,
    name: 'Daniel Ricciardo',
    currentIRating: 4850,
    currentSafetyRating: 'A 4.99',
    avgRacePace: '1:32.112',
    iratingHistory: [
      { month: 'Jan', value: 3200 },
      { month: 'Feb', value: 3500 },
      { month: 'Mar', value: 3750 },
      { month: 'Apr', value: 4100 },
      { month: 'May', value: 4300 },
      { month: 'Jun', value: 4550 },
      { month: 'Jul', value: 4850 },
    ],
    safetyRatingHistory: [
      { month: 'Jan', value: 3.1 },
      { month: 'Feb', value: 3.5 },
      { month: 'Mar', value: 3.8 },
      { month: 'Apr', value: 4.2 },
      { month: 'May', value: 4.5 },
      { month: 'Jun', value: 4.8 },
      { month: 'Jul', value: 4.99 },
    ],
    // in seconds
    racePaceHistory: [
      { month: 'Jan', value: 94.5 },
      { month: 'Feb', value: 94.1 },
      { month: 'Mar', value: 93.8 },
      { month: 'Apr', value: 93.2 },
      { month: 'May', value: 92.9 },
      { month: 'Jun', value: 92.5 },
      { month: 'Jul', value: 92.1 },
    ],
    recentRaces: [
      { trackName: 'Silverstone', date: '2024-07-21', startPosition: 5, finishPosition: 3, incidents: 2, strengthOfField: 4500 },
      { trackName: 'Spa-Francorchamps', date: '2024-07-14', startPosition: 8, finishPosition: 6, incidents: 0, strengthOfField: 4800 },
      { trackName: 'Monza', date: '2024-07-07', startPosition: 3, finishPosition: 5, incidents: 4, strengthOfField: 4200 },
      { trackName: 'Red Bull Ring', date: '2024-06-30', startPosition: 12, finishPosition: 10, incidents: 1, strengthOfField: 3900 },
    ]
  },
  'Lando Norris': {
    id: 4,
    name: 'Lando Norris',
    currentIRating: 5200,
    currentSafetyRating: 'A 4.50',
    avgRacePace: '1:31.890',
    iratingHistory: [
      { month: 'Jan', value: 4100 },
      { month: 'Feb', value: 4250 },
      { month: 'Mar', value: 4400 },
      { month: 'Apr', value: 4600 },
      { month: 'May', value: 4850 },
      { month: 'Jun', value: 5050 },
      { month: 'Jul', value: 5200 },
    ],
    safetyRatingHistory: [
      { month: 'Jan', value: 4.8 },
      { month: 'Feb', value: 4.7 },
      { month: 'Mar', value: 4.6 },
      { month: 'Apr', value: 4.5 },
      { month: 'May', value: 4.4 },
      { month: 'Jun', value: 4.5 },
      { month: 'Jul', value: 4.5 },
    ],
     // in seconds
    racePaceHistory: [
      { month: 'Jan', value: 93.9 },
      { month: 'Feb', value: 93.5 },
      { month: 'Mar', value: 93.1 },
      { month: 'Apr', value: 92.7 },
      { month: 'May', value: 92.3 },
      { month: 'Jun', value: 92.0 },
      { month: 'Jul', value: 91.89 },
    ],
    recentRaces: [
      { trackName: 'Watkins Glen', date: '2024-07-20', startPosition: 2, finishPosition: 1, incidents: 0, strengthOfField: 5100 },
      { trackName: 'Road America', date: '2024-07-13', startPosition: 1, finishPosition: 1, incidents: 0, strengthOfField: 5000 },
      { trackName: 'VIR', date: '2024-07-06', startPosition: 4, finishPosition: 2, incidents: 1, strengthOfField: 5250 },
      { trackName: 'Daytona (Road)', date: '2024-06-29', startPosition: 10, finishPosition: 15, incidents: 8, strengthOfField: 4900 },
    ]
  },
};
