/**
 * iRating Analysis Module
 * 
 * This module implements the core iRating equivalency calculation engine for Personal Bests.
 * Follows DRY, SOLID, KISS, and atomic development principles with mathematical approach
 * to pace analysis and skill level estimation.
 */

import {
  type PacePercentile,
  type IRatingEquivalency,
  type IRatingDelta,
  type IRatingAnalysis,
  type IRatingAnalysisConfig,
  type FieldParticipant,
  type RaceFieldAnalysis,
  type IRatingAnalysisContext,
  type IRatingAnalysisResult,
  PacePercentileSchema,
  IRatingEquivalencySchema,
  IRatingDeltaSchema,
  IRatingAnalysisSchema,
  IRatingAnalysisConfigSchema,
} from './irating-analyzer-types'
import { type PersonalBestRecord } from './personal-bests-types'
import { type RecentRace, type RaceParticipant } from './iracing-types'
import { lapTimeToMs } from './iracing-data-transform'

/**
 * Default configuration for iRating analysis calculations
 * Follows SOLID principles with configurable parameters
 */
export const DEFAULT_IRATING_ANALYSIS_CONFIG: IRatingAnalysisConfig = 
  IRatingAnalysisConfigSchema.parse({})

/**
 * Calculate pace percentile within a race field
 * Atomic function following KISS principles for percentile calculation
 */
export function calculatePacePercentile(
  lapTimeMs: number,
  fieldLapTimes: number[]
): PacePercentile {
  if (fieldLapTimes.length === 0) {
    throw new Error('Cannot calculate percentile with empty field data')
  }
  
  // Sort lap times in ascending order (fastest to slowest)
  const sortedTimes = [...fieldLapTimes].sort((a, b) => a - b)
  
  // Find position in sorted array (0-based)
  let position = sortedTimes.findIndex(time => time >= lapTimeMs)
  if (position === -1) {
    // Lap time is slower than all field times
    position = sortedTimes.length
  }
  
  // Calculate percentile (0-100, where 100 is fastest)
  const percentile = Math.max(0, Math.min(100, 
    ((sortedTimes.length - position) / sortedTimes.length) * 100
  ))
  
  // Determine performance level
  let performanceLevel: PacePercentile['performanceLevel']
  if (percentile >= 95) performanceLevel = 'Elite'
  else if (percentile >= 90) performanceLevel = 'Excellent'
  else if (percentile >= 75) performanceLevel = 'Strong'
  else if (percentile >= 25) performanceLevel = 'Average'
  else if (percentile >= 10) performanceLevel = 'Below Average'
  else performanceLevel = 'Struggling'
  
  return PacePercentileSchema.parse({
    percentile,
    fieldPosition: position + 1, // 1-based position
    totalDrivers: sortedTimes.length,
    performanceLevel,
  })
}

/**
 * Calculate iRating equivalency based on pace and field strength
 * Atomic function implementing skill level estimation algorithm
 */
export function calculateIRatingEquivalency(
  pacePercentile: PacePercentile,
  strengthOfField: number,
  fieldAnalysis: RaceFieldAnalysis,
  config: IRatingAnalysisConfig = DEFAULT_IRATING_ANALYSIS_CONFIG
): IRatingEquivalency {
  // Get percentile multiplier based on performance level
  const multiplier = config.iratingCalculation.percentileMultipliers[
    pacePercentile.performanceLevel.toLowerCase().replace(' ', '') as keyof typeof config.iratingCalculation.percentileMultipliers
  ]
  
  // Calculate base estimated iRating from SoF and percentile
  let estimatedIRating = Math.round(strengthOfField * multiplier)
  
  // Apply bounds
  estimatedIRating = Math.max(
    config.iratingCalculation.minIRating,
    Math.min(config.iratingCalculation.maxIRating, estimatedIRating)
  )
  
  // Calculate confidence factors
  const confidenceFactors = {
    // Field size confidence (larger fields = more reliable)
    fieldSize: Math.min(100, (fieldAnalysis.totalParticipants / 20) * 100),
    
    // Strength of field confidence (higher SoF = more reliable)
    strengthOfField: Math.min(100, 
      Math.max(0, (strengthOfField - config.minStrengthOfField) / 
        (3000 - config.minStrengthOfField) * 100)
    ),
    
    // Data quality confidence
    dataQuality: fieldAnalysis.validLapTimes / fieldAnalysis.totalParticipants * 100,
  }
  
  // Calculate overall confidence
  const confidence = Math.round(
    (confidenceFactors.fieldSize * config.confidenceWeights.fieldSize) +
    (confidenceFactors.strengthOfField * config.confidenceWeights.strengthOfField) +
    (confidenceFactors.dataQuality * config.confidenceWeights.dataQuality)
  )
  
  return IRatingEquivalencySchema.parse({
    estimatedIRating,
    confidence: Math.max(0, Math.min(100, confidence)),
    confidenceFactors,
    analysisMethod: 'fieldPercentile', // Primary method for now
  })
}

/**
 * Calculate delta comparison with current iRating
 * Atomic function for skill level comparison
 */
export function calculateIRatingDelta(
  estimatedIRating: number,
  currentIRating: number
): IRatingDelta {
  const delta = estimatedIRating - currentIRating

  // Percentage change handling - avoid division by zero
  let percentageChange = 0
  if (currentIRating > 0) {
    percentageChange = (delta / currentIRating) * 100
  }

  // Determine assessment level. For a zero baseline, use the sign of the delta
  let assessment: IRatingDelta['assessment']
  if (currentIRating === 0) {
    if (delta > 0) assessment = 'significantly_above'
    else if (delta < 0) assessment = 'significantly_below'
    else assessment = 'consistent'
  } else if (percentageChange >= 15) assessment = 'significantly_above'
  else if (percentageChange >= 5) assessment = 'moderately_above'
  else if (percentageChange >= 1) assessment = 'slightly_above'
  else if (percentageChange >= -1) assessment = 'consistent'
  else if (percentageChange >= -5) assessment = 'slightly_below'
  else if (percentageChange >= -15) assessment = 'moderately_below'
  else assessment = 'significantly_below'

  return IRatingDeltaSchema.parse({
    delta,
    currentIRating,
    estimatedIRating,
    percentageChange: Math.round(percentageChange * 100) / 100, // Round to 2 decimal places
    assessment,
  })
}

/**
 * Extract race field data from RecentRace participants
 * Atomic function for data extraction and validation
 */
export function extractRaceFieldAnalysis(
  race: RecentRace,
  config: IRatingAnalysisConfig = DEFAULT_IRATING_ANALYSIS_CONFIG
): RaceFieldAnalysis | null {
  if (!race.participants || race.participants.length < config.minFieldSize) {
    return null
  }
  
  const participants: FieldParticipant[] = []
  let validLapTimes = 0
  const lapTimesMs: number[] = []
  
  for (const participant of race.participants) {
    if (!participant.fastestLap || participant.fastestLap === 'N/A') {
      continue
    }
    
    const lapTimeMs = lapTimeToMs(participant.fastestLap)
    if (lapTimeMs <= 0 || lapTimeMs === Infinity) {
      continue
    }
    
    participants.push({
      custId: participant.custId,
      displayName: participant.name,
      lapTime: participant.fastestLap,
      lapTimeMs,
      irating: participant.irating || 0,
      finishPosition: participant.finishPosition,
    })
    
    lapTimesMs.push(lapTimeMs)
    validLapTimes++
  }
  
  if (validLapTimes < config.minFieldSize) {
    return null
  }
  
  // Calculate statistical data
  const sortedTimes = [...lapTimesMs].sort((a, b) => a - b)
  const fastestLapMs = sortedTimes[0]
  const slowestLapMs = sortedTimes[sortedTimes.length - 1]
  const averageLapMs = lapTimesMs.reduce((sum, time) => sum + time, 0) / lapTimesMs.length
  const medianLapMs = sortedTimes[Math.floor(sortedTimes.length / 2)]
  
  return {
    totalParticipants: race.participants.length,
    validLapTimes,
    strengthOfField: race.strengthOfField,
    officialSession: true, // Assume official for now
    participants,
    fastestLapMs,
    slowestLapMs,
    averageLapMs,
    medianLapMs,
  }
}

/**
 * Generate human-readable summary of iRating analysis
 * Utility function for user-friendly output
 */
export function generateAnalysisSummary(analysis: IRatingAnalysis): string {
  const { pacePercentile, iratingEquivalency, iratingDelta } = analysis
  const confidence = iratingEquivalency.confidence
  
  // Base pace description
  const paceDesc = `${pacePercentile.performanceLevel.toLowerCase()} pace (${pacePercentile.percentile.toFixed(1)}th percentile)`
  
  // iRating comparison
  const deltaSign = iratingDelta.delta >= 0 ? '+' : ''
  const deltaDesc = `${deltaSign}${iratingDelta.delta} vs current ${iratingDelta.currentIRating} iR`
  
  // Confidence qualifier
  let confidenceDesc = ''
  if (confidence >= 80) confidenceDesc = 'high confidence'
  else if (confidence >= 60) confidenceDesc = 'moderate confidence'
  else confidenceDesc = 'low confidence'
  
  return `Your lap shows ${paceDesc}, equivalent to ~${iratingEquivalency.estimatedIRating} iR (${deltaDesc}) with ${confidenceDesc}.`
}

/**
 * Main function: Analyze iRating equivalency for a personal best
 * Combines all atomic functions following SOLID principles
 */
export function analyzePersonalBestIRating(
  personalBest: PersonalBestRecord,
  race: RecentRace,
  currentDriverIRating: number,
  config: IRatingAnalysisConfig = DEFAULT_IRATING_ANALYSIS_CONFIG
): IRatingAnalysisResult {
  const context: IRatingAnalysisContext = {
    personalBestId: personalBest.id,
    subsessionId: personalBest.subsessionId,
    raceDate: personalBest.raceDate,
    trackName: personalBest.trackName,
    carName: personalBest.carName,
    driverCurrentIRating: currentDriverIRating,
    fieldDataComplete: false,
    analysisReliable: false,
    warnings: [],
  }
  
  const errors: string[] = []
  
  try {
    // Step 1: Extract and validate field data
    const fieldAnalysis = extractRaceFieldAnalysis(race, config)
    if (!fieldAnalysis) {
      errors.push('Insufficient field data for analysis')
      return { analysis: null, context, success: false, errors }
    }
    
    context.fieldDataComplete = fieldAnalysis.validLapTimes >= config.minFieldSize
    
    // Step 2: Calculate pace percentile
    const fieldLapTimes = fieldAnalysis.participants.map(p => p.lapTimeMs)
    const pacePercentile = calculatePacePercentile(personalBest.fastestLapMs, fieldLapTimes)
    
    // Step 3: Calculate iRating equivalency
    const iratingEquivalency = calculateIRatingEquivalency(
      pacePercentile, 
      fieldAnalysis.strengthOfField,
      fieldAnalysis,
      config
    )
    
    // Step 4: Calculate delta with current iRating
    const iratingDelta = calculateIRatingDelta(
      iratingEquivalency.estimatedIRating,
      currentDriverIRating
    )
    
    // Step 5: Add context warnings
    if (fieldAnalysis.strengthOfField < config.minStrengthOfField) {
      context.warnings.push('Low strength of field may affect accuracy')
    }
    if (iratingEquivalency.confidence < 70) {
      context.warnings.push('Analysis confidence is below 70%')
    }
    if (fieldAnalysis.totalParticipants < config.minFieldSize * 1.5) {
      context.warnings.push('Small field size may limit accuracy')
    }
    
    context.analysisReliable = iratingEquivalency.confidence >= 60
    
    // Step 6: Build final analysis
    const analysis: IRatingAnalysis = {
      pacePercentile,
      iratingEquivalency,
      iratingDelta,
      analysisMetadata: {
        calculatedAt: new Date().toISOString(),
        raceConditions: {
          strengthOfField: fieldAnalysis.strengthOfField,
          fieldSize: fieldAnalysis.totalParticipants,
          officialSession: fieldAnalysis.officialSession,
        },
        dataQuality: {
          hasCompleteFieldData: context.fieldDataComplete,
          hasLapTimesForAllDrivers: fieldAnalysis.validLapTimes === fieldAnalysis.totalParticipants,
          minimumLapsSample: fieldAnalysis.validLapTimes >= fieldAnalysis.totalParticipants * 0.75,
        },
      },
      summary: generateAnalysisSummary({
        pacePercentile,
        iratingEquivalency,
        iratingDelta,
        analysisMetadata: {
          calculatedAt: new Date().toISOString(),
          raceConditions: {
            strengthOfField: fieldAnalysis.strengthOfField,
            fieldSize: fieldAnalysis.totalParticipants,
            officialSession: fieldAnalysis.officialSession,
          },
          dataQuality: {
            hasCompleteFieldData: context.fieldDataComplete,
            hasLapTimesForAllDrivers: fieldAnalysis.validLapTimes === fieldAnalysis.totalParticipants,
            minimumLapsSample: fieldAnalysis.validLapTimes >= fieldAnalysis.totalParticipants * 0.75,
          },
        },
        summary: '', // Will be replaced
      }),
    }
    
    // Validate the final analysis
    const validatedAnalysis = IRatingAnalysisSchema.parse(analysis)
    
    return {
      analysis: validatedAnalysis,
      context,
      success: true,
      errors: [],
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    errors.push(`Analysis failed: ${errorMessage}`)
    return { analysis: null, context, success: false, errors }
  }
}

/**
 * Utility function to get performance assessment text
 * Helper for UI display and reporting
 */
export function getPerformanceAssessmentText(assessment: IRatingDelta['assessment']): string {
  switch (assessment) {
    case 'significantly_above':
      return 'significantly faster than your current skill level'
    case 'moderately_above':
      return 'moderately faster than your current skill level'
    case 'slightly_above':
      return 'slightly faster than your current skill level'
    case 'consistent':
      return 'consistent with your current skill level'
    case 'slightly_below':
      return 'slightly slower than your current skill level'
    case 'moderately_below':
      return 'moderately slower than your current skill level'
    case 'significantly_below':
      return 'significantly slower than your current skill level'
    default:
      return 'unknown performance level'
  }
}

/**
 * Utility function to get confidence level text
 * Helper for UI display
 */
export function getConfidenceLevelText(confidence: number): string {
  if (confidence >= 85) return 'Very High'
  if (confidence >= 70) return 'High'
  if (confidence >= 55) return 'Moderate'
  if (confidence >= 40) return 'Low'
  return 'Very Low'
}

/**
 * Batch analyze multiple personal bests
 * Utility function for processing multiple records
 */
export function analyzeBatchPersonalBests(
  personalBests: PersonalBestRecord[],
  races: RecentRace[],
  currentDriverIRating: number,
  config: IRatingAnalysisConfig = DEFAULT_IRATING_ANALYSIS_CONFIG
): Map<string, IRatingAnalysisResult> {
  const results = new Map<string, IRatingAnalysisResult>()
  
  // Create lookup map for races by subsessionId
  const raceMap = new Map<string, RecentRace>()
  for (const race of races) {
    raceMap.set(race.id, race)
  }
  
  // Analyze each personal best
  for (const personalBest of personalBests) {
    const race = raceMap.get(personalBest.subsessionId)
    if (!race) {
      results.set(personalBest.id, {
        analysis: null,
        context: {
          personalBestId: personalBest.id,
          subsessionId: personalBest.subsessionId,
          raceDate: personalBest.raceDate,
          trackName: personalBest.trackName,
          carName: personalBest.carName,
          driverCurrentIRating: currentDriverIRating,
          fieldDataComplete: false,
          analysisReliable: false,
          warnings: ['Race data not found for analysis'],
        },
        success: false,
        errors: ['Race data not available for subsession'],
      })
      continue
    }
    
    const result = analyzePersonalBestIRating(personalBest, race, currentDriverIRating, config)
    results.set(personalBest.id, result)
  }
  
  return results
}