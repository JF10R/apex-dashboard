import { z } from 'zod'

// Official iRacing API schemas for better type safety
// Based on https://github.com/themich4/iracing-api
// This provides complete interface definitions matching the official API

// Core common schemas
export const HelmetSchema = z.object({
  pattern: z.number(),
  color1: z.string(),
  color2: z.string(),
  color3: z.string(),
  faceType: z.number(),
  helmetType: z.number(),
})

export const SuitSchema = z.object({
  pattern: z.number(),
  color1: z.string(),
  color2: z.string(),
  color3: z.string(),
  bodyType: z.number(),
})

export const BasicLiverySchema = z.object({
  carId: z.number(),
  pattern: z.number(),
  color1: z.string(),
  color2: z.string(),
  color3: z.string(),
})

export const LiverySchema = BasicLiverySchema.extend({
  numberFont: z.number(),
  numberColor1: z.string(),
  numberColor2: z.string(),
  numberColor3: z.string(),
  numberSlant: z.number(),
  sponsor1: z.number(),
  sponsor2: z.number(),
  carNumber: z.string(),
  wheelColor: z.string().nullable(),
  rimType: z.number(),
})

// Lap Data Schema (from official API) - uses camelCase field names
export const LapDataItemSchema = z.object({
  groupId: z.number(),
  name: z.string(),
  custId: z.number(),
  displayName: z.string(),
  lapNumber: z.number(),
  flags: z.number(),
  incident: z.boolean(),
  sessionTime: z.number(),
  sessionStartTime: z.string().nullable(),
  lapTime: z.number(),
  teamFastestLap: z.boolean(),
  personalBestLap: z.boolean(),
  helmet: z.object({
    pattern: z.number(),
    color1: z.string(),
    color2: z.string(),
    color3: z.string(),
    faceType: z.number(),
    helmetType: z.number(),
  }),
  licenseLevel: z.number(),
  carNumber: z.string(),
  lapEvents: z.array(z.string()),
  ai: z.boolean(),
})

// Race Result Participant Schema (based on official API)
export const ResultSchema = z.object({
  custId: z.number(),
  displayName: z.string(),
  aggregateChampPoints: z.number(),
  ai: z.boolean(),
  averageLap: z.number(),
  bestLapNum: z.number(),
  bestLapTime: z.number(),
  bestNlapsNum: z.number(),
  bestNlapsTime: z.number(),
  bestQualLapAt: z.string(),
  bestQualLapNum: z.number(),
  bestQualLapTime: z.number(),
  carClassId: z.number(),
  carClassName: z.string(),
  carClassShortName: z.string(),
  carId: z.number(),
  carName: z.string(),
  champPoints: z.number(),
  classInterval: z.number(),
  clubId: z.number(),
  clubName: z.string(),
  clubPoints: z.number(),
  clubShortname: z.string(),
  countryCode: z.string(),
  division: z.number(),
  divisionName: z.string(),
  dropRace: z.boolean(),
  finishPosition: z.number(),
  finishPositionInClass: z.number(),
  friend: z.boolean(),
  helmet: HelmetSchema,
  incidents: z.number(),
  interval: z.number(),
  lapsComplete: z.number(),
  lapsLead: z.number(),
  leagueAggPoints: z.number(),
  leaguePoints: z.number(),
  licenseChangeOval: z.number(),
  licenseChangeRoad: z.number(),
  livery: LiverySchema,
  maxPctFuelFill: z.number(),
  multiplier: z.number(),
  newCpi: z.number(),
  newLicenseLevel: z.number(),
  newSubLevel: z.number(),
  newTtrating: z.number(),
  newiRating: z.number(),
  oldCpi: z.number(),
  oldLicenseLevel: z.number(),
  oldSubLevel: z.number(),
  oldTtrating: z.number(),
  oldiRating: z.number(),
  optLapsComplete: z.number(),
  position: z.number(),
  qualLapTime: z.number(),
  reasonOut: z.string(),
  reasonOutId: z.number(),
  startingPosition: z.number(),
  startingPositionInClass: z.number(),
  suit: SuitSchema,
  watched: z.boolean(),
  weightPenaltyKg: z.number(),
})

export const TrackSchema = z.object({
  category: z.string(),
  categoryId: z.number(),
  configName: z.string(),
  trackId: z.number(),
  trackName: z.string(),
})

// Additional official schemas from iRacing API
export const ChunkInfoSchema = z.object({
  chunkSize: z.number(),
  numChunks: z.number(),
  rows: z.number(),
  baseDownloadUrl: z.string(),
  chunkFileNames: z.array(z.string()),
})

export const SessionInfoSchema = z.object({
  subsessionId: z.number(),
  sessionId: z.number(),
  simsessionNumber: z.number(),
  simsessionType: z.number(),
  simsessionName: z.string(),
  numLapsForQualAverage: z.number(),
  numLapsForSoloAverage: z.number(),
  eventType: z.number(),
  eventTypeName: z.string(),
  privateSessionId: z.number(),
  seasonName: z.string(),
  seasonShortName: z.string(),
  seriesName: z.string(),
  seriesShortName: z.string(),
  startTime: z.string(),
  track: z.object({
    configName: z.string(),
    trackId: z.number(),
    trackName: z.string(),
  }),
})

export const WeatherResultSchema = z.object({
  avgSkies: z.number(),
  avgCloudCoverPct: z.number(),
  minCloudCoverPct: z.number(),
  maxCloudCoverPct: z.number(),
  tempUnits: z.number(),
  avgTemp: z.number(),
  minTemp: z.number(),
  maxTemp: z.number(),
  avgRelHumidity: z.number(),
  windUnits: z.number(),
  avgWindSpeed: z.number(),
  minWindSpeed: z.number(),
  maxWindSpeed: z.number(),
  avgWindDir: z.number(),
  maxFog: z.number(),
  fogTimePct: z.number(),
  precipTimePct: z.number(),
  precipMm: z.number(),
  precipMm2hrBeforeSession: z.number(),
  simulatedStartTime: z.string(),
})

export const SessionResultSchema = z.object({
  simsessionNumber: z.number(),
  simsessionName: z.string(),
  simsessionType: z.number(),
  simsessionTypeName: z.string(),
  simsessionSubtype: z.number(),
  weatherResult: WeatherResultSchema,
  results: z.array(ResultSchema),
})

// Main race result schema
export const GetResultResponseSchema = z.object({
  subsessionId: z.number(),
  allowedLicenses: z.array(z.object({
    groupName: z.string(),
    licenseGroup: z.number(),
    maxLicenseLevel: z.number(),
    minLicenseLevel: z.number(),
    parentId: z.number(),
  })),
  associatedSubsessionIds: z.array(z.number()),
  canProtest: z.boolean(),
  carClasses: z.array(z.object({
    carClassId: z.number(),
    shortName: z.string(),
    name: z.string(),
    strengthOfField: z.number(),
    numEntries: z.number(),
    carsInClass: z.array(z.object({
      carId: z.number(),
    })),
  })),
  cautionType: z.number(),
  cooldownMinutes: z.number(),
  cornersPerLap: z.number(),
  damageModel: z.number(),
  driverChangeParam1: z.number(),
  driverChangeParam2: z.number(),
  driverChangeRule: z.number(),
  driverChanges: z.boolean(),
  endTime: z.string(),
  eventAverageLap: z.number(),
  eventBestLapTime: z.number(),
  eventLapsComplete: z.number(),
  eventStrengthOfField: z.number(),
  eventType: z.number(),
  eventTypeName: z.string(),
  heatInfoId: z.number(),
  licenseCategory: z.string(),
  licenseCategoryId: z.number(),
  limitMinutes: z.number(),
  maxTeamDrivers: z.number(),
  maxWeeks: z.number(),
  minTeamDrivers: z.number(),
  numCautionLaps: z.number(),
  numCautions: z.number(),
  numDrivers: z.number(),
  numLapsForQualAverage: z.number(),
  numLapsForSoloAverage: z.number(),
  numLeadChanges: z.number(),
  officialSession: z.boolean(),
  pointsType: z.string(),
  privateSessionId: z.number(),
  raceSummary: z.object({
    subsessionId: z.number(),
    averageLap: z.number(),
    lapsComplete: z.number(),
    numCautions: z.number(),
    numCautionLaps: z.number(),
    numLeadChanges: z.number(),
    fieldStrength: z.number(),
    numOptLaps: z.number(),
    hasOptPath: z.boolean(),
    specialEventType: z.number(),
    specialEventTypeText: z.string(),
  }),
  raceWeekNum: z.number(),
  resultsRestricted: z.boolean(),
  seasonId: z.number(),
  seasonName: z.string(),
  seasonQuarter: z.number(),
  seasonShortName: z.string(),
  seasonYear: z.number(),
  seriesId: z.number(),
  seriesLogo: z.string(),
  seriesName: z.string(),
  seriesShortName: z.string(),
  sessionId: z.number(),
  sessionResults: z.array(SessionResultSchema),
  sessionSplits: z.array(z.object({
    subsessionId: z.number(),
    eventStrengthOfField: z.number(),
  })),
  specialEventType: z.number(),
  startTime: z.string(),
  track: TrackSchema,
  trackState: z.object({
    leaveMarbles: z.boolean(),
    practiceGripCompound: z.number(),
    practiceRubber: z.number(),
    qualifyGripCompound: z.number(),
    qualifyRubber: z.number(),
    raceGripCompound: z.number(),
    raceRubber: z.number(),
    warmupGripCompound: z.number(),
    warmupRubber: z.number(),
  }),
  weather: z.object({
    allowFog: z.boolean(),
    fog: z.number(),
    humidity: z.number(),
    precipMm: z.number(),
    precipOption: z.number(),
    skies: z.number(),
    simulatedStartTime: z.string(),
    simulatedStartUtcTime: z.string(),
    simulatedTimeMultiplier: z.number(),
    simulatedTimeOffsets: z.array(z.number()),
    tempUnits: z.number(),
    tempValue: z.number(),
    timeOfDay: z.number(),
    trackWater: z.number().nullable().optional(),
    type: z.number(),
    version: z.number(),
    weatherSummary: z.object({
      maxPrecipRate: z.number().nullable().optional(),
      maxPrecipRateDesc: z.enum(['Heavy', 'Light', 'Moderate', 'None']).optional(),
    }).nullable().optional(),
    weatherUrl: z.string().nullable().optional(),
    weatherVarInitial: z.number(),
    weatherVarOngoing: z.number(),
    windDir: z.number(),
    windUnits: z.number(),
    windValue: z.number(),
  }),
})

// Official API Response Schemas
export const GetResultsLapDataResponseSchema = z.object({
  success: z.boolean(),
  sessionInfo: SessionInfoSchema,
  chunkInfo: ChunkInfoSchema.optional(),
  bestLapNum: z.number(),
  bestLapTime: z.number(),
  bestNlapsNum: z.number(),
  bestNlapsTime: z.number(),
  bestQualLapNum: z.number(),
  bestQualLapTime: z.number(),
  bestQualLapAt: z.string().nullable(),
  lastUpdated: z.string(),
  groupId: z.number(),
  custId: z.number(),
  name: z.string(),
  carId: z.number(),
  licenseLevel: z.number(),
  livery: LiverySchema,
  lapData: z.array(LapDataItemSchema).optional(),
})

export const GetResultsLapDataWithChunksResponseSchema = z.object({
  ...GetResultsLapDataResponseSchema.shape,
  lapData: z.array(LapDataItemSchema),
})

// API Parameter Schemas
export const GetResultParamsSchema = z.object({
  subsessionId: z.number(),
  includeLicenses: z.boolean().optional(),
})

export const GetResultsLapDataParamsSchema = z
  .object({
    subsessionId: z.number(),
    simsessionNumber: z.number(),
    customerId: z.number().optional(),
    teamId: z.number().optional(),
  })
  .refine((data) => Boolean(data.customerId) || Boolean(data.teamId))

// Driver Search Schema
export const DriverSearchResultSchema = z.object({
  custId: z.number(),
  displayName: z.string(),
  // Additional properties that may be returned by the API
  licenseLevel: z.number().optional(),
  irating: z.number().optional(),
  clubName: z.string().optional(),
})

// Export parameter and response types
export type GetResultParams = z.infer<typeof GetResultParamsSchema>
export type GetResultsLapDataParams = z.infer<typeof GetResultsLapDataParamsSchema>
export type GetResultsLapDataResponse = z.infer<typeof GetResultsLapDataResponseSchema>
export type GetResultsLapDataWithChunksResponse = z.infer<typeof GetResultsLapDataWithChunksResponseSchema>
export type DriverSearchResult = z.infer<typeof DriverSearchResultSchema>

// TypeScript types derived from schemas
export type Helmet = z.infer<typeof HelmetSchema>
export type Suit = z.infer<typeof SuitSchema>
export type BasicLivery = z.infer<typeof BasicLiverySchema>
export type Livery = z.infer<typeof LiverySchema>
export type LapDataItem = z.infer<typeof LapDataItemSchema>
export type RaceResult = z.infer<typeof ResultSchema>
export type Track = z.infer<typeof TrackSchema>
export type WeatherResult = z.infer<typeof WeatherResultSchema>
export type SessionResult = z.infer<typeof SessionResultSchema>
export type SessionInfo = z.infer<typeof SessionInfoSchema>
export type ChunkInfo = z.infer<typeof ChunkInfoSchema>
export type GetResultResponse = z.infer<typeof GetResultResponseSchema>

// Specific type for member summary stats from stats.getMemberSummary
export const MemberStatsSchema = z.object({
  iRating: z.number(),
  licenseClass: z.string(), // e.g., "Rookie", "Class A", "Pro/WC License" - will be text from API
  srPrime: z.number(),     // Integer part of SR, e.g., 3 for C3.50
  srSub: z.number(),       // Decimal part of SR * 100, e.g., 50 for C3.50
  categoryId: z.number().optional(), // Optional: road, oval etc.
  category: z.string().optional(),   // Optional: "Road", "Oval"
});
export type MemberStats = z.infer<typeof MemberStatsSchema>;

export const MemberSummaryResponseSchema = z.object({
  stats: z.union([MemberStatsSchema, z.array(MemberStatsSchema)]), // Can be single object or array by category
  // custId: z.number().optional(), // Might also include custId
  // Other fields might be present
});
export type MemberSummaryResponse = z.infer<typeof MemberSummaryResponseSchema>;


// Legacy interfaces for backward compatibility
export interface Lap {
  lapNumber: number;
  time: string;
  invalid: boolean;
}

export interface RaceParticipant {
  name: string;
  custId: number;
  startPosition: number;
  finishPosition: number;
  incidents: number;
  fastestLap: string;
  irating: number;
  laps: Lap[];
  totalTime?: string;
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
  seriesName: string;
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
  currentIRating: number; // This might become category-specific or an overall if available
  currentSafetyRating: string; // This is typically category-specific too
  avgRacePace: string;
  // Store iRating history per category (e.g., "Road", "Oval")
  iratingHistories: Record<string, HistoryPoint[]>;
  safetyRatingHistory: HistoryPoint[]; // Assuming one primary SR history for now, or this might also need categorizing
  racePaceHistory: HistoryPoint[];
  recentRaces: RecentRace[];
}

export interface SearchedDriver {
  name: string;
  custId: number;
}

// New interfaces based on official iRacing API
export interface IracingRaceParticipant {
  custId: number;
  displayName: string;
  finishPosition: number;
  startingPosition: number;
  incidents: number;
  bestLapTime: number;
  newiRating: number;
  lapsComplete: number;
  lapsLead: number;
  helmet: Helmet;
  livery: Livery;
  suit: Suit;
  carName: string;
  carClassName: string;
  clubName: string;
  countryCode: string;
  division: number;
  friend: boolean;
  watched: boolean;
  ai: boolean;
}

export interface IracingRaceData {
  subsessionId: number;
  seriesName: string;
  seriesShortName: string;
  seasonName: string;
  seasonYear: number;
  seasonQuarter: number;
  raceWeekNum: number;
  track: Track;
  startTime: string;
  endTime: string;
  eventStrengthOfField: number;
  eventBestLapTime: number;
  eventAverageLap: number;
  eventLapsComplete: number;
  numDrivers: number;
  numCautions: number;
  numCautionLaps: number;
  numLeadChanges: number;
  participants: IracingRaceParticipant[];
  officialSession: boolean;
  weather: WeatherResult;
}

// Schemas are already exported above with their declarations
