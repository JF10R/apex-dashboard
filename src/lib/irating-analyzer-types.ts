/**
 * iRating Analysis Type Definitions
 * 
 * This module defines TypeScript interfaces and Zod schemas for iRating equivalency 
 * calculations and pace analysis functionality. Follows atomic development principles 
 * with single-responsibility types for Personal Bests integration.
 */

import { z } from 'zod'

/**
 * Pace percentile represents where a driver's lap time falls within a field
 */
export const PacePercentileSchema = z.object({
  // Raw percentile calculation (0-100)
  percentile: z.number().min(0).max(100),
  
  // Position within the field based on pace
  fieldPosition: z.number().int().positive(),
  
  // Total number of drivers in the comparison field
  totalDrivers: z.number().int().positive(),
  
  // Descriptive performance level
  performanceLevel: z.enum([
    'Elite',        // Top 5%
    'Excellent',    // Top 10%
    'Strong',       // Top 25%
    'Average',      // 25-75%
    'Below Average', // Bottom 25%
    'Struggling'    // Bottom 10%
  ]),
})

/**
 * iRating equivalency estimate based on pace performance
 */
export const IRatingEquivalencySchema = z.object({
  // Estimated iRating based on pace analysis
  estimatedIRating: z.number().int().positive(),
  
  // Confidence level in the estimate (0-100)
  confidence: z.number().min(0).max(100),
  
  // Factors affecting confidence
  confidenceFactors: z.object({
    fieldSize: z.number().min(0).max(100), // Larger fields = higher confidence
    strengthOfField: z.number().min(0).max(100), // Higher SoF = higher confidence
    dataQuality: z.number().min(0).max(100), // Complete lap data = higher confidence
  }),
  
  // Method used for calculation
  analysisMethod: z.enum([
    'fieldPercentile',     // Based on position in field
    'strengthOfFieldRatio', // Based on SoF and pace ratio
    'hybrid'              // Combination approach
  ]),
})

/**
 * Comparison with driver's current iRating
 */
export const IRatingDeltaSchema = z.object({
  // Difference from current iRating (positive = faster than current skill)
  delta: z.number().int(),
  
  // Current iRating for comparison
  currentIRating: z.number().int().min(0), // Allow zero iRating
  
  // Estimated iRating
  estimatedIRating: z.number().int().positive(),
  
  // Percentage change
  percentageChange: z.number(),
  
  // Descriptive assessment
  assessment: z.enum([
    'significantly_above',  // +15% or more
    'moderately_above',     // +5% to +15%
    'slightly_above',       // +1% to +5%
    'consistent',           // -1% to +1%
    'slightly_below',       // -5% to -1%
    'moderately_below',     // -15% to -5%
    'significantly_below'   // -15% or less
  ]),
})

/**
 * Comprehensive iRating analysis for a personal best lap
 */
export const IRatingAnalysisSchema = z.object({
  // Pace analysis within the race field
  pacePercentile: PacePercentileSchema,
  
  // iRating equivalency calculation
  iratingEquivalency: IRatingEquivalencySchema,
  
  // Comparison with current driver iRating
  iratingDelta: IRatingDeltaSchema,
  
  // Metadata about the analysis
  analysisMetadata: z.object({
    calculatedAt: z.string(), // ISO timestamp
    raceConditions: z.object({
      strengthOfField: z.number(),
      fieldSize: z.number().int().positive(),
      officialSession: z.boolean(),
      weatherConditions: z.string().optional(),
    }),
    
    // Quality indicators
    dataQuality: z.object({
      hasCompleteFieldData: z.boolean(),
      hasLapTimesForAllDrivers: z.boolean(),
      minimumLapsSample: z.boolean(), // At least 75% of drivers completed minimum laps
    }),
  }),
  
  // Human-readable summary
  summary: z.string(),
})

/**
 * Configuration for iRating analysis calculations
 */
export const IRatingAnalysisConfigSchema = z.object({
  // Minimum field size for reliable analysis
  minFieldSize: z.number().int().positive().default(8),
  
  // Minimum SoF for high-confidence analysis
  minStrengthOfField: z.number().default(1200),
  
  // Performance level thresholds (percentiles)
  performanceLevels: z.object({
    elite: z.number().default(95),       // Top 5%
    excellent: z.number().default(90),   // Top 10%
    strong: z.number().default(75),      // Top 25%
    average: z.number().default(25),     // Bottom 25%
    belowAverage: z.number().default(10), // Bottom 10%
  }).default({
    elite: 95,
    excellent: 90,
    strong: 75,
    average: 25,
    belowAverage: 10,
  }),
  
  // Confidence scoring weights
  confidenceWeights: z.object({
    fieldSize: z.number().default(0.4),      // 40% weight
    strengthOfField: z.number().default(0.4), // 40% weight
    dataQuality: z.number().default(0.2),     // 20% weight
  }).default({
    fieldSize: 0.4,
    strengthOfField: 0.4,
    dataQuality: 0.2,
  }),
  
  // iRating calculation parameters
  iratingCalculation: z.object({
    // Base iRating adjustments for percentile position
    percentileMultipliers: z.object({
      elite: z.number().default(1.25),         // 25% above SoF average
      excellent: z.number().default(1.15),     // 15% above SoF average
      strong: z.number().default(1.05),        // 5% above SoF average
      average: z.number().default(0.95),       // 5% below SoF average
      belowAverage: z.number().default(0.85),  // 15% below SoF average
      struggling: z.number().default(0.75),    // 25% below SoF average
    }).default({
      elite: 1.25,
      excellent: 1.15,
      strong: 1.05,
      average: 0.95,
      belowAverage: 0.85,
      struggling: 0.75,
    }),
    
    // Minimum and maximum iRating bounds
    minIRating: z.number().default(350),
    maxIRating: z.number().default(12000),
  }).default({
    percentileMultipliers: {
      elite: 1.25,
      excellent: 1.15,
      strong: 1.05,
      average: 0.95,
      belowAverage: 0.85,
      struggling: 0.75,
    },
    minIRating: 350,
    maxIRating: 12000,
  }),
})

// Export TypeScript types derived from schemas
export type PacePercentile = z.infer<typeof PacePercentileSchema>
export type IRatingEquivalency = z.infer<typeof IRatingEquivalencySchema>
export type IRatingDelta = z.infer<typeof IRatingDeltaSchema>
export type IRatingAnalysis = z.infer<typeof IRatingAnalysisSchema>
export type IRatingAnalysisConfig = z.infer<typeof IRatingAnalysisConfigSchema>

// Utility types for field analysis
export interface FieldParticipant {
  custId: number
  displayName: string
  lapTime: string      // Fastest lap time in MM:SS.mmm format
  lapTimeMs: number   // Lap time in milliseconds
  irating: number     // Driver's iRating at time of race
  finishPosition: number
}

export interface RaceFieldAnalysis {
  totalParticipants: number
  validLapTimes: number
  strengthOfField: number
  officialSession: boolean
  participants: FieldParticipant[]
  
  // Statistical data
  fastestLapMs: number
  slowestLapMs: number
  averageLapMs: number
  medianLapMs: number
}

// Analysis context for tracking data sources
export interface IRatingAnalysisContext {
  personalBestId: string
  subsessionId: string
  raceDate: string
  trackName: string
  carName: string
  driverCurrentIRating: number
  
  // Source data validation
  fieldDataComplete: boolean
  analysisReliable: boolean
  warnings: string[]
}

// Result wrapper for analysis operations
export interface IRatingAnalysisResult {
  analysis: IRatingAnalysis | null
  context: IRatingAnalysisContext
  success: boolean
  errors: string[]
}