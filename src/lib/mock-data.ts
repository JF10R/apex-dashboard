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

export type RaceCategory = 'Formula Car' | 'Sports Car' | 'Prototype' | 'Oval' | 'Dirt Oval';

export interface RecentRace {
  id: string;
  trackName: string;
  date: string;
  year: number;
  season: string;
  category: RaceCategory;
  startPosition: number;
  finishPosition: number;
  incidents: number;
  strengthOfField: number;
  lapsLed: number;
  fastestLap: string;
  car: string;
  avgLapTime: string;
  iratingChange: number;
  safetyRatingChange: string | number;
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

export interface SearchedDriver {
    name: string;
    custId: number;
}
