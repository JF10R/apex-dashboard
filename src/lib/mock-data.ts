export interface HistoryPoint {
  month: string;
  value: number;
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
  },
};
