export interface Lap {
  lapNumber: number;
  time: string;
  invalid: boolean;
}

export interface RaceParticipant {
  name: string;
  startPosition: number;
  finishPosition: number;
  incidents: number;
  fastestLap: string;
  irating: number;
  laps: Lap[];
}

export interface HistoryPoint {
  month: string;
  value: number;
}

export interface RecentRace {
  id: string;
  trackName: string;
  date: string;
  year: number;
  season: string;
  category: 'Formula Car' | 'Sports Car' | 'Prototype';
  startPosition: number;
  finishPosition: number;
  incidents: number;
  strengthOfField: number;
  lapsLed: number;
  fastestLap: string;
  car: string;
  avgLapTime: string;
  iratingChange: number;
  safetyRatingChange: string;
  participants: RaceParticipant[];
  avgRaceIncidents: number;
  avgRaceLapTime: string;
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

const silverstoneParticipants: RaceParticipant[] = [
  { name: 'Max Verstappen', startPosition: 1, finishPosition: 1, incidents: 0, fastestLap: '1:29.550', irating: 6200, 
    laps: [
      { lapNumber: 1, time: '1:31.000', invalid: false },
      { lapNumber: 2, time: '1:30.200', invalid: false },
      { lapNumber: 3, time: '1:29.900', invalid: false },
      { lapNumber: 4, time: '1:29.550', invalid: false },
      { lapNumber: 5, time: '1:29.600', invalid: false },
    ] 
  },
  { name: 'Charles Leclerc', startPosition: 2, finishPosition: 2, incidents: 1, fastestLap: '1:29.750', irating: 5800, 
    laps: [
      { lapNumber: 1, time: '1:31.200', invalid: false },
      { lapNumber: 2, time: '1:30.500', invalid: false },
      { lapNumber: 3, time: '1:29.750', invalid: false },
      { lapNumber: 4, time: '1:29.800', invalid: false },
    ]
  },
  { name: 'Daniel Ricciardo', startPosition: 5, finishPosition: 3, incidents: 2, fastestLap: '1:29.876', irating: 4850, 
    laps: [
      { lapNumber: 1, time: '1:31.500', invalid: false },
      { lapNumber: 2, time: '1:30.800', invalid: false },
      { lapNumber: 3, time: '1:30.500', invalid: false },
      { lapNumber: 4, time: '1:30.100', invalid: true },
      { lapNumber: 5, time: '1:29.876', invalid: false },
      { lapNumber: 6, time: '1:30.200', invalid: false },
    ]
  },
  { name: 'Sergio Perez', startPosition: 4, finishPosition: 4, incidents: 3, fastestLap: '1:30.100', irating: 4600, 
    laps: [
      { lapNumber: 1, time: '1:31.800', invalid: false },
      { lapNumber: 2, time: '1:30.100', invalid: false },
      { lapNumber: 3, time: '1:30.300', invalid: false },
    ]
  },
  { name: 'Carlos Sainz', startPosition: 3, finishPosition: 5, incidents: 4, fastestLap: '1:30.200', irating: 5100, 
    laps: [
      { lapNumber: 1, time: '1:31.400', invalid: false },
      { lapNumber: 2, time: '1:30.200', invalid: false },
      { lapNumber: 3, time: '1:30.400', invalid: true },
    ]
  },
  { name: 'George Russell', startPosition: 7, finishPosition: 6, incidents: 1, fastestLap: '1:30.300', irating: 5300, laps: [] },
  { name: 'Lando Norris', startPosition: 6, finishPosition: 7, incidents: 0, fastestLap: '1:30.150', irating: 5200, 
    laps: [
        { lapNumber: 1, time: '1:31.600', invalid: false },
        { lapNumber: 2, time: '1:30.900', invalid: false },
        { lapNumber: 3, time: '1:30.150', invalid: false },
        { lapNumber: 4, time: '1:30.250', invalid: false },
    ] 
  },
];

const virParticipants: RaceParticipant[] = [
    { name: 'Lando Norris', startPosition: 4, finishPosition: 2, incidents: 1, fastestLap: '1:55.555', irating: 5250, laps: [] },
    { name: 'Lewis Hamilton', startPosition: 1, finishPosition: 1, incidents: 0, fastestLap: '1:55.450', irating: 5900, laps: [] },
    { name: 'Daniel Ricciardo', startPosition: 6, finishPosition: 3, incidents: 2, fastestLap: '1:55.800', irating: 4800, laps: [] },
    { name: 'Valtteri Bottas', startPosition: 3, finishPosition: 4, incidents: 3, fastestLap: '1:55.900', irating: 4900, laps: [] },
];

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
      { id: 'race-1', trackName: 'Silverstone', date: '2024-07-21', year: 2024, season: '2024 S3', category: 'Formula Car', startPosition: 5, finishPosition: 3, incidents: 2, strengthOfField: 4500, lapsLed: 5, fastestLap: '1:29.876', car: 'Dallara F3', avgLapTime: '1:30.543', iratingChange: 75, safetyRatingChange: '+0.10',
        avgRaceIncidents: 3.5,
        avgRaceLapTime: '1:30.800',
        participants: silverstoneParticipants,
      },
      { id: 'race-2', trackName: 'Spa-Francorchamps', date: '2024-07-14', year: 2024, season: '2024 S3', category: 'Sports Car', startPosition: 8, finishPosition: 6, incidents: 0, strengthOfField: 4800, lapsLed: 0, fastestLap: '2:01.112', car: 'Porsche 911 GT3 R', avgLapTime: '2:01.950', iratingChange: 42, safetyRatingChange: '+0.15', avgRaceIncidents: 2.1, avgRaceLapTime: '2:02.100', participants: [] },
      { id: 'race-3', trackName: 'Monza', date: '2024-07-07', year: 2024, season: '2024 S3', category: 'Sports Car', startPosition: 3, finishPosition: 5, incidents: 4, strengthOfField: 4200, lapsLed: 2, fastestLap: '1:22.345', car: 'Ferrari 488 GT3 Evo', avgLapTime: '1:23.010', iratingChange: -25, safetyRatingChange: '-0.08', avgRaceIncidents: 5.5, avgRaceLapTime: '1:23.300', participants: [] },
      { id: 'race-7', trackName: 'VIR', date: '2024-07-06', year: 2024, season: '2024 S3', category: 'Sports Car', startPosition: 6, finishPosition: 3, incidents: 2, strengthOfField: 5250, lapsLed: 0, fastestLap: '1:55.800', car: 'Mercedes-AMG GT3', avgLapTime: '1:56.200', iratingChange: 50, safetyRatingChange: '+0.01', avgRaceIncidents: 3.1, avgRaceLapTime: '1:56.500', participants: virParticipants },
      { id: 'race-4', trackName: 'Red Bull Ring', date: '2024-06-30', year: 2024, season: '2024 S2', category: 'Formula Car', startPosition: 12, finishPosition: 10, incidents: 1, strengthOfField: 3900, lapsLed: 0, fastestLap: '1:05.999', car: 'Formula Vee', avgLapTime: '1:06.500', iratingChange: 15, safetyRatingChange: '+0.05', avgRaceIncidents: 4.2, avgRaceLapTime: '1:06.800', participants: [] },
      { id: 'race-9', trackName: 'Okayama', date: '2024-06-23', year: 2024, season: '2024 S2', category: 'Formula Car', startPosition: 4, finishPosition: 2, incidents: 0, strengthOfField: 4300, lapsLed: 8, fastestLap: '1:28.123', car: 'Dallara F3', avgLapTime: '1:28.500', iratingChange: 80, safetyRatingChange: '+0.20', avgRaceIncidents: 2.5, avgRaceLapTime: '1:28.800', participants: [] },
      { id: 'race-10', trackName: 'Zandvoort', date: '2024-06-16', year: 2024, season: '2024 S2', category: 'Sports Car', startPosition: 10, finishPosition: 12, incidents: 5, strengthOfField: 4600, lapsLed: 0, fastestLap: '1:34.555', car: 'Porsche 911 GT3 R', avgLapTime: '1:35.000', iratingChange: -40, safetyRatingChange: '-0.12', avgRaceIncidents: 4.8, avgRaceLapTime: '1:35.200', participants: [] },
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
      { id: 'race-1', trackName: 'Silverstone', date: '2024-07-21', year: 2024, season: '2024 S3', category: 'Formula Car', startPosition: 6, finishPosition: 7, incidents: 0, strengthOfField: 4500, lapsLed: 0, fastestLap: '1:30.150', car: 'Dallara F3', avgLapTime: '1:30.700', iratingChange: -15, safetyRatingChange: '+0.18',
        avgRaceIncidents: 3.5,
        avgRaceLapTime: '1:30.800',
        participants: silverstoneParticipants,
      },
      { id: 'race-5', trackName: 'Watkins Glen', date: '2024-07-20', year: 2024, season: '2024 S3', category: 'Prototype', startPosition: 2, finishPosition: 1, incidents: 0, strengthOfField: 5100, lapsLed: 25, fastestLap: '1:42.101', car: 'Dallara P217', avgLapTime: '1:42.800', iratingChange: 110, safetyRatingChange: '+0.12', avgRaceIncidents: 1.8, avgRaceLapTime: '1:43.100', participants: [] },
      { id: 'race-6', trackName: 'Road America', date: '2024-07-13', year: 2024, season: '2024 S3', category: 'Prototype', startPosition: 1, finishPosition: 1, incidents: 0, strengthOfField: 5000, lapsLed: 30, fastestLap: '2:00.050', car: 'Dallara P217', avgLapTime: '2:00.700', iratingChange: 95, safetyRatingChange: '+0.18', avgRaceIncidents: 2.0, avgRaceLapTime: '2:01.000', participants: [] },
      { id: 'race-7', trackName: 'VIR', date: '2024-07-06', year: 2024, season: '2024 S3', category: 'Sports Car', startPosition: 4, finishPosition: 2, incidents: 1, strengthOfField: 5250, lapsLed: 0, fastestLap: '1:55.555', car: 'Mercedes-AMG GT3', avgLapTime: '1:56.200', iratingChange: 65, safetyRatingChange: '+0.03', avgRaceIncidents: 3.1, avgRaceLapTime: '1:56.500', participants: virParticipants },
      { id: 'race-8', trackName: 'Daytona (Road)', date: '2024-06-29', year: 2024, season: '2024 S2', category: 'Sports Car', startPosition: 10, finishPosition: 15, incidents: 8, strengthOfField: 4900, lapsLed: 0, fastestLap: '1:35.123', car: 'Mercedes-AMG GT3', avgLapTime: '1:36.000', iratingChange: -88, safetyRatingChange: '-0.35', avgRaceIncidents: 6.8, avgRaceLapTime: '1:36.400', participants: [] },
      { id: 'race-11', trackName: 'Le Mans', date: '2024-06-22', year: 2024, season: '2024 S2', category: 'Prototype', startPosition: 3, finishPosition: 1, incidents: 2, strengthOfField: 5500, lapsLed: 10, fastestLap: '3:25.111', car: 'Dallara P217', avgLapTime: '3:26.000', iratingChange: 150, safetyRatingChange: '+0.05', avgRaceIncidents: 4.1, avgRaceLapTime: '3:26.500', participants: [] },
      { id: 'race-12', trackName: 'Nurburgring', date: '2024-06-15', year: 2024, season: '2024 S2', category: 'Sports Car', startPosition: 5, finishPosition: 8, incidents: 3, strengthOfField: 5300, lapsLed: 0, fastestLap: '1:54.987', car: 'Mercedes-AMG GT3', avgLapTime: '1:55.500', iratingChange: -20, safetyRatingChange: '-0.02', avgRaceIncidents: 3.9, avgRaceLapTime: '1:55.800', participants: [] },
    ]
  },
};
