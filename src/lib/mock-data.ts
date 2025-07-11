// Re-export the types from iracing-types.ts for backward compatibility
export type {
  Lap,
  RaceParticipant,
  HistoryPoint,
  RaceCategory,
  RecentRace,
  Driver,
  SearchedDriver,
  // Also export the new official iRacing API types
  IracingRaceParticipant,
  IracingRaceData,
  Helmet,
  Suit,
  Livery,
  RaceResult,
  Track,
  WeatherResult,
  SessionResult,
  GetResultResponse,
} from './iracing-types'

// Import all the interfaces for use
import type {
  Lap,
  RaceParticipant,
  HistoryPoint,
  RaceCategory,
  RecentRace,
  Driver,
  SearchedDriver,
} from './iracing-types'
