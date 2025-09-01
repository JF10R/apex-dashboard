/**
 * Personal Bests Type Definitions
 * 
 * This module defines TypeScript interfaces and Zod schemas for personal best lap times
 * functionality. Follows atomic development principles with single-responsibility types.
 */

import { z } from 'zod'
import { type RaceCategory } from './iracing-types'

// Shared category schema to eliminate duplication across schemas
export const CategorySchema = z.union([
  z.literal('Formula Car'),
  z.literal('Sports Car'), 
  z.literal('Prototype'),
  z.literal('Oval'),
  z.literal('Dirt Oval')
])

// Core personal best record for a specific car on a specific track layout
export const PersonalBestRecordSchema = z.object({
  // Unique identifier for this personal best record
  id: z.string(),
  
  // Track information (follows trackId + configName pattern)
  trackId: z.number(),
  trackName: z.string(),
  configName: z.string().optional(), // Some tracks may not have config names
  
  // Car information
  carId: z.number().optional(), // May not always be available
  carName: z.string(),
  
  // Performance data
  fastestLap: z.string(), // Formatted lap time (MM:SS.mmm)
  fastestLapMs: z.number(), // Lap time in milliseconds for sorting/comparison
  
  // Context information
  seriesName: z.string(),
  category: CategorySchema,
  
  // Race metadata
  subsessionId: z.string(), // Original race where this time was achieved
  raceDate: z.string(), // ISO date string
  year: z.number(),
  season: z.string(), // e.g., "Season 1"
  
  // Performance context
  strengthOfField: z.number(),
  finishPosition: z.number(),
  totalRaceIncidents: z.number(),
  
  // Weather conditions (for future enhancement)
  weatherConditions: z.object({
    temperature: z.number().optional(),
    trackCondition: z.string().optional(), // Dry, Wet, etc.
    windSpeed: z.number().optional(),
  }).optional(),
})

// Track layout grouping - combines all cars for a specific track configuration
export const TrackLayoutPersonalBestsSchema = z.object({
  // Track layout identifier
  trackLayoutKey: z.string(), // Generated from trackId + configName
  trackName: z.string(),
  configName: z.string().optional(),
  trackId: z.number(),
  
  // Category context
  category: CategorySchema,
  
  // Personal bests by car (Map-like structure stored as Record)
  carBests: z.record(z.string(), PersonalBestRecordSchema), // carName -> PersonalBestRecord
  
  // Summary statistics
  totalRaces: z.number(), // Number of races at this track layout
  fastestOverall: z.string(), // Overall fastest lap across all cars
  fastestOverallMs: z.number(),
  mostRecentRace: z.string(), // ISO date of most recent race
})

// Series grouping - contains all track layouts for a specific series
export const SeriesPersonalBestsSchema = z.object({
  // Series identification
  seriesName: z.string(),
  category: CategorySchema,
  
  // Track layout bests (Map-like structure stored as Record)
  trackLayoutBests: z.record(z.string(), TrackLayoutPersonalBestsSchema), // trackLayoutKey -> TrackLayoutPersonalBests
  
  // Series statistics
  totalRaces: z.number(),
  uniqueTrackLayouts: z.number(),
  uniqueCars: z.number(),
  averageSoF: z.number(),
  bestOverallLap: z.string(),
  bestOverallLapMs: z.number(),
})

// Top-level personal bests collection for a driver
export const DriverPersonalBestsSchema = z.object({
  // Driver identification
  custId: z.number(),
  driverName: z.string(),
  
  // Generated timestamp
  lastUpdated: z.string(), // ISO timestamp
  dataSource: z.literal('recentRaces'), // Indicates transformation source
  
  // Series groupings (Map-like structure stored as Record)
  seriesBests: z.record(z.string(), SeriesPersonalBestsSchema), // seriesName -> SeriesPersonalBests
  
  // Global driver statistics
  totalRaces: z.number(),
  totalSeries: z.number(),
  totalTrackLayouts: z.number(),
  totalCars: z.number(),
  
  // Overall fastest lap across all categories
  fastestLapOverall: z.string(),
  fastestLapOverallMs: z.number(),
  fastestLapTrack: z.string(),
  fastestLapCar: z.string(),
})

// Transform operation context for tracking data lineage
export const PersonalBestTransformContextSchema = z.object({
  sourceRaceCount: z.number(),
  transformedAt: z.string(),
  processingTimeMs: z.number(),
  ignoredRaces: z.array(z.object({
    raceId: z.string(),
    reason: z.string(), // e.g., "Invalid lap time", "Missing track data"
  })),
})

// Export TypeScript types derived from schemas
export type PersonalBestRecord = z.infer<typeof PersonalBestRecordSchema>
export type TrackLayoutPersonalBests = z.infer<typeof TrackLayoutPersonalBestsSchema>
export type SeriesPersonalBests = z.infer<typeof SeriesPersonalBestsSchema>
export type DriverPersonalBests = z.infer<typeof DriverPersonalBestsSchema>
export type PersonalBestTransformContext = z.infer<typeof PersonalBestTransformContextSchema>

// Utility type for track layout key generation
export interface TrackLayoutIdentifier {
  trackId: number
  trackName: string
  configName?: string
}

// Transformation options for personal bests generation
export interface PersonalBestTransformOptions {
  // Filtering options
  categoryFilter?: RaceCategory[]
  seriesFilter?: string[]
  minRaces?: number // Minimum races required to include a track layout
  
  // Performance options
  onlyOfficialRaces?: boolean
  minStrengthOfField?: number
  
  // Time period options
  dateFrom?: Date
  dateTo?: Date
  
  // Processing options
  skipInvalidLaps?: boolean
  includeWeatherData?: boolean
}

// Result type for transformation operations
export interface PersonalBestTransformResult {
  personalBests: DriverPersonalBests
  context: PersonalBestTransformContext
  warnings: string[]
  errors: string[]
}