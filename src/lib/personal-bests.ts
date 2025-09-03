/**
 * Personal Bests Transformation Module
 * 
 * This module implements pure transformation functions to convert driver.recentRaces
 * data into structured personal best lap times. Follows atomic development principles
 * with single-responsibility functions and comprehensive error handling.
 */

import { 
  type RecentRace, 
  type RaceCategory, 
  type RaceParticipant,
  type Lap 
} from './iracing-types'
import { 
  formatLapTime, 
  lapTimeToMs, 
  lapTimeToSeconds 
} from './iracing-data-transform'
import {
  type PersonalBestRecord,
  type TrackLayoutPersonalBests,
  type SeriesPersonalBests,
  type DriverPersonalBests,
  type PersonalBestTransformResult,
  type PersonalBestTransformContext,
  type PersonalBestTransformOptions,
  type TrackLayoutIdentifier,
  PersonalBestRecordSchema,
  TrackLayoutPersonalBestsSchema,
  SeriesPersonalBestsSchema,
  DriverPersonalBestsSchema,
} from './personal-bests-types'

/**
 * Generate a unique track layout key from track identification
 * Follows DRY principle by creating reusable track layout identification
 */
export function generateTrackLayoutKey(identifier: TrackLayoutIdentifier): string {
  const { trackId, configName } = identifier
  
  // Use trackId as primary key, append configName if available
  if (configName && configName.trim() !== '') {
    // Sanitize configName for use as key
    const sanitizedConfig = configName.replace(/[^a-zA-Z0-9\-_]/g, '_')
    return `${trackId}_${sanitizedConfig}`
  }
  
  return `${trackId}_default`
}

/**
 * Extract track layout identifier from RecentRace
 * Atomic function following SOLID principles
 */
export function extractTrackLayoutIdentifier(race: RecentRace): TrackLayoutIdentifier | null {
  // Validate required fields
  if (!race.trackName || typeof race.trackName !== 'string') {
    return null
  }
  
  // Extract trackId if available (may need to be derived from race data)
  // For now, we'll generate a trackId from trackName hash as fallback
  const trackId = generateTrackIdFromName(race.trackName)
  
  return {
    trackId,
    trackName: race.trackName,
    configName: undefined, // RecentRace doesn't currently include configName
  }
}

/**
 * Generate a numeric trackId from track name (fallback when trackId not available)
 * Simple hash function for consistent track identification
 */
function generateTrackIdFromName(trackName: string): number {
  let hash = 0
  for (let i = 0; i < trackName.length; i++) {
    const char = trackName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Shared fastest lap utility for consistent lap time comparison
 * Atomic function following DRY principles
 */
export function findFastestLapTime(lapTimes: string[]): { fastestLap: string; fastestMs: number } {
  if (!lapTimes || lapTimes.length === 0) {
    return { fastestLap: 'N/A', fastestMs: Infinity }
  }
  
  let fastestLap = 'N/A'
  let fastestMs = Infinity
  
  for (const lapTime of lapTimes) {
    if (lapTime && lapTime !== 'N/A') {
      const lapMs = lapTimeToMs(lapTime)
      if (lapMs < fastestMs && lapMs > 0) {
        fastestMs = lapMs
        fastestLap = lapTime
      }
    }
  }
  
  return { fastestLap, fastestMs }
}

/**
 * Find the fastest valid lap time from race participants
 * Refactored to use shared fastest lap utility
 */
export function findFastestLapInRace(participants: RaceParticipant[]): string {
  if (!participants || participants.length === 0) {
    return 'N/A'
  }
  
  const lapTimes: string[] = []
  
  for (const participant of participants) {
    // Add participant fastest lap
    if (participant.fastestLap && participant.fastestLap !== 'N/A') {
      lapTimes.push(participant.fastestLap)
    }
    
    // Add individual lap times if available
    if (participant.laps) {
      for (const lap of participant.laps) {
        if (!lap.invalid && lap.time !== 'N/A') {
          lapTimes.push(lap.time)
        }
      }
    }
  }
  
  return findFastestLapTime(lapTimes).fastestLap
}

/**
 * Extract driver's fastest lap from a race
 * Refactored to use shared fastest lap utility
 */
export function extractDriverFastestLap(race: RecentRace): string | null {
  if (!race.participants || race.participants.length === 0) {
    return null
  }
  
  // Get the driver's participant data (assuming first participant is the driver)
  const driverParticipant = race.participants[0]
  const lapTimes: string[] = []
  
  // Add participant fastest lap if available
  if (driverParticipant.fastestLap && driverParticipant.fastestLap !== 'N/A') {
    lapTimes.push(driverParticipant.fastestLap)
  }
  
  // Add individual lap times if available
  if (driverParticipant.laps && driverParticipant.laps.length > 0) {
    for (const lap of driverParticipant.laps) {
      if (!lap.invalid && lap.time !== 'N/A') {
        lapTimes.push(lap.time)
      }
    }
  }
  
  const result = findFastestLapTime(lapTimes)
  return result.fastestLap !== 'N/A' ? result.fastestLap : null
}

/**
 * Create a personal best record from race data
 * Atomic function with comprehensive validation
 */
export function createPersonalBestRecord(
  race: RecentRace,
  trackLayoutIdentifier: TrackLayoutIdentifier,
  fastestLap: string
): PersonalBestRecord | null {
  try {
    const fastestLapMs = lapTimeToMs(fastestLap)
    
    // Validate lap time
    if (fastestLapMs <= 0 || fastestLapMs === Infinity) {
      return null
    }
    
    const record: PersonalBestRecord = {
      id: `${race.id}_${trackLayoutIdentifier.trackId}_${race.car.replace(/\s+/g, '_')}`,
      trackId: trackLayoutIdentifier.trackId,
      trackName: trackLayoutIdentifier.trackName,
      configName: trackLayoutIdentifier.configName,
      carId: undefined, // Not available in RecentRace
      carName: race.car,
      fastestLap,
      fastestLapMs,
      seriesName: race.seriesName,
      category: race.category,
      subsessionId: race.id,
      raceDate: race.date,
      year: race.year,
      season: race.season,
      strengthOfField: race.strengthOfField,
      finishPosition: race.finishPosition,
      totalRaceIncidents: race.incidents,
    }
    
    // Validate using schema
    const validatedRecord = PersonalBestRecordSchema.parse(record)
    return validatedRecord
  } catch (error) {
    // Silently ignore validation failures - they are handled gracefully
    return null
  }
}

/**
 * Group personal best records by track layout
 * Pure transformation function following DRY principles
 */
export function groupRecordsByTrackLayout(
  records: PersonalBestRecord[]
): Record<string, PersonalBestRecord[]> {
  const grouped: Record<string, PersonalBestRecord[]> = {}
  
  for (const record of records) {
    const trackLayoutKey = generateTrackLayoutKey({
      trackId: record.trackId,
      trackName: record.trackName,
      configName: record.configName,
    })
    
    if (!grouped[trackLayoutKey]) {
      grouped[trackLayoutKey] = []
    }
    
    grouped[trackLayoutKey].push(record)
  }
  
  return grouped
}

/**
 * Find fastest lap time per car for a track layout
 * Implements atomic logic for personal best selection
 */
export function findPersonalBestsByCarForTrackLayout(
  records: PersonalBestRecord[]
): Record<string, PersonalBestRecord> {
  const carBests: Record<string, PersonalBestRecord> = {}
  
  for (const record of records) {
    const carName = record.carName
    const existingBest = carBests[carName]
    
    if (!existingBest || record.fastestLapMs < existingBest.fastestLapMs) {
      carBests[carName] = record
    }
  }
  
  return carBests
}

/**
 * Create track layout personal bests object
 * Atomic function with comprehensive statistics
 */
export function createTrackLayoutPersonalBests(
  trackLayoutKey: string,
  records: PersonalBestRecord[]
): TrackLayoutPersonalBests | null {
  if (records.length === 0) {
    return null
  }
  
  try {
    // Use first record for metadata
    const firstRecord = records[0]
    
    // Find personal bests by car
    const carBests = findPersonalBestsByCarForTrackLayout(records)
    
    // Calculate overall fastest lap using shared utility
    const carBestTimes = Object.values(carBests).map(carBest => carBest.fastestLap)
    const { fastestLap: fastestOverall, fastestMs: fastestOverallMs } = findFastestLapTime(carBestTimes)
    
    // Find most recent race
    const mostRecentRace = records
      .sort((a, b) => new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime())[0]
      .raceDate
    
    const trackLayoutBests: TrackLayoutPersonalBests = {
      trackLayoutKey,
      trackName: firstRecord.trackName,
      configName: firstRecord.configName,
      trackId: firstRecord.trackId,
      category: firstRecord.category,
      carBests,
      totalRaces: records.length,
      fastestOverall,
      fastestOverallMs,
      mostRecentRace,
    }
    
    // Validate using schema
    const validated = TrackLayoutPersonalBestsSchema.parse(trackLayoutBests)
    return validated
  } catch (error) {
    console.warn(`Failed to create track layout personal bests for ${trackLayoutKey}:`, error)
    return null
  }
}

/**
 * Group track layouts by series
 * Pure function following SOLID principles
 */
export function groupTrackLayoutsBySeries(
  trackLayouts: TrackLayoutPersonalBests[]
): Record<string, TrackLayoutPersonalBests[]> {
  const grouped: Record<string, TrackLayoutPersonalBests[]> = {}
  
  for (const trackLayout of trackLayouts) {
    // Use the first car's series name as representative
    const firstCarBest = Object.values(trackLayout.carBests)[0]
    if (!firstCarBest) continue
    
    const seriesName = firstCarBest.seriesName
    
    if (!grouped[seriesName]) {
      grouped[seriesName] = []
    }
    
    grouped[seriesName].push(trackLayout)
  }
  
  return grouped
}

/**
 * Create series personal bests object
 * Atomic function with statistical aggregation
 */
export function createSeriesPersonalBests(
  seriesName: string,
  trackLayouts: TrackLayoutPersonalBests[]
): SeriesPersonalBests | null {
  if (trackLayouts.length === 0) {
    return null
  }
  
  try {
    // Use first track layout for metadata
    const firstTrackLayout = trackLayouts[0]
    
    // Convert array to record structure
    const trackLayoutBests: Record<string, TrackLayoutPersonalBests> = {}
    let totalRaces = 0
    const uniqueCars = new Set<string>()
    let totalSoF = 0
    let sofCount = 0
    let bestOverallLapMs = Infinity
    let bestOverallLap = 'N/A'
    
    for (const trackLayout of trackLayouts) {
      trackLayoutBests[trackLayout.trackLayoutKey] = trackLayout
      totalRaces += trackLayout.totalRaces
      
      // Collect unique cars and calculate statistics
      for (const carBest of Object.values(trackLayout.carBests)) {
        uniqueCars.add(carBest.carName)
        totalSoF += carBest.strengthOfField
        sofCount++
        
        if (carBest.fastestLapMs < bestOverallLapMs) {
          bestOverallLapMs = carBest.fastestLapMs
          bestOverallLap = carBest.fastestLap
        }
      }
    }
    
    const seriesBests: SeriesPersonalBests = {
      seriesName,
      category: firstTrackLayout.category,
      trackLayoutBests,
      totalRaces,
      uniqueTrackLayouts: trackLayouts.length,
      uniqueCars: uniqueCars.size,
      averageSoF: sofCount > 0 ? totalSoF / sofCount : 0,
      bestOverallLap,
      bestOverallLapMs,
    }
    
    // Validate using schema
    const validated = SeriesPersonalBestsSchema.parse(seriesBests)
    return validated
  } catch (error) {
    console.warn(`Failed to create series personal bests for ${seriesName}:`, error)
    return null
  }
}

/**
 * Filter races based on transformation options
 * Atomic function for race filtering logic
 */
export function filterRacesByOptions(
  recentRaces: RecentRace[],
  options: PersonalBestTransformOptions,
  ignoredRaces: Array<{ raceId: string; reason: string }>
): RecentRace[] {
  return recentRaces.filter(race => {
    // Category filter
    if (options.categoryFilter && !options.categoryFilter.includes(race.category)) {
      ignoredRaces.push({ raceId: race.id, reason: `Category ${race.category} not in filter` })
      return false
    }
    
    // Series filter
    if (options.seriesFilter && !options.seriesFilter.includes(race.seriesName)) {
      ignoredRaces.push({ raceId: race.id, reason: `Series ${race.seriesName} not in filter` })
      return false
    }
    
    // Date range filter
    if (options.dateFrom || options.dateTo) {
      const raceDate = new Date(race.date)
      if (options.dateFrom && raceDate < options.dateFrom) {
        ignoredRaces.push({ raceId: race.id, reason: 'Race date before filter range' })
        return false
      }
      if (options.dateTo && raceDate > options.dateTo) {
        ignoredRaces.push({ raceId: race.id, reason: 'Race date after filter range' })
        return false
      }
    }
    
    // Strength of field filter
    if (options.minStrengthOfField && race.strengthOfField < options.minStrengthOfField) {
      ignoredRaces.push({ raceId: race.id, reason: `SoF ${race.strengthOfField} below minimum` })
      return false
    }
    
    return true
  })
}

/**
 * Build personal best records from filtered races
 * Atomic function for record creation logic
 */
export function buildPersonalBestRecords(
  filteredRaces: RecentRace[],
  ignoredRaces: Array<{ raceId: string; reason: string }>
): PersonalBestRecord[] {
  const personalBestRecords: PersonalBestRecord[] = []
  
  for (const race of filteredRaces) {
    const trackLayoutIdentifier = extractTrackLayoutIdentifier(race)
    if (!trackLayoutIdentifier) {
      ignoredRaces.push({ raceId: race.id, reason: 'Invalid track layout identifier' })
      continue
    }
    
    const fastestLap = extractDriverFastestLap(race)
    if (!fastestLap) {
      ignoredRaces.push({ raceId: race.id, reason: 'No valid fastest lap found' })
      continue
    }
    
    const record = createPersonalBestRecord(race, trackLayoutIdentifier, fastestLap)
    if (record) {
      personalBestRecords.push(record)
    } else {
      ignoredRaces.push({ raceId: race.id, reason: 'Failed to create personal best record' })
    }
  }
  
  return personalBestRecords
}

/**
 * Aggregate personal best records into hierarchical structure
 * Atomic function for data aggregation logic
 */
export function aggregateByHierarchy(
  personalBestRecords: PersonalBestRecord[],
  options: PersonalBestTransformOptions,
  warnings: string[]
): Record<string, SeriesPersonalBests> {
  // Group records by track layout
  const recordsByTrackLayout = groupRecordsByTrackLayout(personalBestRecords)
  
  // Create track layout personal bests
  const trackLayoutBests: TrackLayoutPersonalBests[] = []
  
  for (const [trackLayoutKey, records] of Object.entries(recordsByTrackLayout)) {
    // Apply minimum races filter
    if (options.minRaces && records.length < options.minRaces) {
      warnings.push(`Track layout ${trackLayoutKey} has only ${records.length} races, minimum is ${options.minRaces}`)
      continue
    }
    
    const trackLayoutPersonalBests = createTrackLayoutPersonalBests(trackLayoutKey, records)
    if (trackLayoutPersonalBests) {
      trackLayoutBests.push(trackLayoutPersonalBests)
    }
  }
  
  // Group by series
  const trackLayoutsBySeries = groupTrackLayoutsBySeries(trackLayoutBests)
  
  // Create series personal bests
  const seriesBests: Record<string, SeriesPersonalBests> = {}
  
  for (const [seriesName, trackLayouts] of Object.entries(trackLayoutsBySeries)) {
    const seriesPersonalBests = createSeriesPersonalBests(seriesName, trackLayouts)
    if (seriesPersonalBests) {
      seriesBests[seriesName] = seriesPersonalBests
    }
  }
  
  return seriesBests
}

/**
 * Calculate global driver statistics from series data
 * Atomic function for statistics calculation
 */
export function calculateGlobalStatistics(
  seriesBests: Record<string, SeriesPersonalBests>,
  personalBestRecords: PersonalBestRecord[]
): {
  fastestLapOverall: string
  fastestLapOverallMs: number
  fastestLapTrack: string
  fastestLapCar: string
  totalTrackLayouts: number
  totalCars: number
} {
  let fastestLapOverallMs = Infinity
  let fastestLapOverall = 'N/A'
  let fastestLapTrack = ''
  let fastestLapCar = ''
  let totalTrackLayouts = 0
  
  for (const series of Object.values(seriesBests)) {
    totalTrackLayouts += series.uniqueTrackLayouts
    
    if (series.bestOverallLapMs < fastestLapOverallMs) {
      fastestLapOverallMs = series.bestOverallLapMs
      fastestLapOverall = series.bestOverallLap
      
      // Find the track and car for this fastest lap
      for (const trackLayout of Object.values(series.trackLayoutBests)) {
        for (const carBest of Object.values(trackLayout.carBests)) {
          if (carBest.fastestLapMs === fastestLapOverallMs) {
            fastestLapTrack = trackLayout.trackName
            fastestLapCar = carBest.carName
            break
          }
        }
      }
    }
  }
  
  const totalCars = new Set(personalBestRecords.map(r => r.carName)).size
  
  return {
    fastestLapOverall,
    fastestLapOverallMs,
    fastestLapTrack,
    fastestLapCar,
    totalTrackLayouts,
    totalCars
  }
}

/**
 * Main transformation function: Convert recent races to personal bests
 * Refactored to use smaller, focused helper functions
 */
export function transformRecentRacesToPersonalBests(
  custId: number,
  driverName: string,
  recentRaces: RecentRace[],
  currentIRating: number,
  options: PersonalBestTransformOptions = {}
): PersonalBestTransformResult {
  const startTime = performance.now()
  const warnings: string[] = []
  const errors: string[] = []
  const ignoredRaces: Array<{ raceId: string; reason: string }> = []
  
  try {
    // Step 1: Filter races based on options
    const filteredRaces = filterRacesByOptions(recentRaces, options, ignoredRaces)
    
    // Step 2: Convert races to personal best records
    const personalBestRecords = buildPersonalBestRecords(filteredRaces, ignoredRaces)
    
    // Step 3: Aggregate into hierarchical structure
    const seriesBests = aggregateByHierarchy(personalBestRecords, options, warnings)
    
    // Step 4: Calculate global statistics
    const globalStats = calculateGlobalStatistics(seriesBests, personalBestRecords)
    
    // Step 5: Create final driver personal bests object
    const driverPersonalBests: DriverPersonalBests = {
      custId,
      driverName,
      lastUpdated: new Date().toISOString(),
      dataSource: 'recentRaces',
      seriesBests,
      totalRaces: personalBestRecords.length,
      totalSeries: Object.keys(seriesBests).length,
      totalTrackLayouts: globalStats.totalTrackLayouts,
      totalCars: globalStats.totalCars,
      fastestLapOverall: globalStats.fastestLapOverall,
      fastestLapOverallMs: globalStats.fastestLapOverallMs,
      fastestLapTrack: globalStats.fastestLapTrack,
      fastestLapCar: globalStats.fastestLapCar,
    }

    const personalBestsWithAnalysis = addIRatingAnalysisToDriverPersonalBests(
      driverPersonalBests,
      filteredRaces,
      currentIRating
    )

    // Validate final result
    const validated = DriverPersonalBestsSchema.parse(personalBestsWithAnalysis)
    
    const endTime = performance.now()
    const processingTimeMs = endTime - startTime
    
    const context: PersonalBestTransformContext = {
      sourceRaceCount: recentRaces.length,
      transformedAt: new Date().toISOString(),
      processingTimeMs: Math.round(processingTimeMs),
      ignoredRaces,
    }
    
    return {
      personalBests: validated,
      context,
      warnings,
      errors,
    }
    
  } catch (error) {
    errors.push(`Transformation failed: ${error instanceof Error ? error.message : String(error)}`)
    
    // Return empty result in case of critical failure
    const emptyResult: DriverPersonalBests = {
      custId,
      driverName,
      lastUpdated: new Date().toISOString(),
      dataSource: 'recentRaces',
      seriesBests: {},
      totalRaces: 0,
      totalSeries: 0,
      totalTrackLayouts: 0,
      totalCars: 0,
      fastestLapOverall: 'N/A',
      fastestLapOverallMs: Infinity,
      fastestLapTrack: '',
      fastestLapCar: '',
    }
    
    const endTime = performance.now()
    const processingTimeMs = endTime - startTime
    
    const context: PersonalBestTransformContext = {
      sourceRaceCount: recentRaces.length,
      transformedAt: new Date().toISOString(),
      processingTimeMs: Math.round(processingTimeMs),
      ignoredRaces,
    }
    
    return {
      personalBests: emptyResult,
      context,
      warnings,
      errors,
    }
  }
}

/**
 * Utility function to get personal best for a specific car on a specific track
 * Atomic lookup function following KISS principles
 */
export function getPersonalBestForCarAndTrack(
  personalBests: DriverPersonalBests,
  carName: string,
  trackName: string
): PersonalBestRecord | null {
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      if (trackLayout.trackName === trackName) {
        const carBest = trackLayout.carBests[carName]
        if (carBest) {
          return carBest
        }
      }
    }
  }
  
  return null
}

/**
 * Get all personal bests for a specific car across all tracks
 * Utility function for car-specific analysis
 */
export function getPersonalBestsForCar(
  personalBests: DriverPersonalBests,
  carName: string
): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = []
  
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      const carBest = trackLayout.carBests[carName]
      if (carBest) {
        results.push(carBest)
      }
    }
  }
  
  return results
}

/**
 * Get all personal bests for a specific track across all cars
 * Utility function for track-specific analysis
 */
export function getPersonalBestsForTrack(
  personalBests: DriverPersonalBests,
  trackName: string
): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = []
  
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      if (trackLayout.trackName === trackName) {
        for (const carBest of Object.values(trackLayout.carBests)) {
          results.push(carBest)
        }
      }
    }
  }
  
  return results
}

/**
 * Add iRating analysis to a personal best record
 * Utility function for on-demand analysis integration
 */
export function addIRatingAnalysisToPersonalBest(
  personalBest: PersonalBestRecord,
  race: RecentRace,
  currentDriverIRating: number
): PersonalBestRecord {
  // Import here to avoid circular dependencies
  const { analyzePersonalBestIRating } = require('./irating-analyzer')
  
  const analysisResult = analyzePersonalBestIRating(
    personalBest,
    race,
    currentDriverIRating
  )
  
  return {
    ...personalBest,
    iratingAnalysis: analysisResult.success ? analysisResult.analysis : undefined,
  }
}

/**
 * Batch add iRating analysis to multiple personal best records
 * Utility function for processing driver's complete personal best collection
 */
export function addIRatingAnalysisToDriverPersonalBests(
  personalBests: DriverPersonalBests,
  races: RecentRace[],
  currentDriverIRating: number
): DriverPersonalBests {
  // Import here to avoid circular dependencies
  const { analyzeBatchPersonalBests } = require('./irating-analyzer')
  
  // Collect all personal best records
  const allPersonalBestRecords: PersonalBestRecord[] = []
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      for (const carBest of Object.values(trackLayout.carBests)) {
        allPersonalBestRecords.push(carBest)
      }
    }
  }
  
  // Batch analyze
  const analysisResults = analyzeBatchPersonalBests(
    allPersonalBestRecords,
    races,
    currentDriverIRating
  )

  let successfulAnalyses = 0
  let failedAnalyses = 0
  for (const result of analysisResults.values()) {
    if (result.success && result.analysis) successfulAnalyses++
    else failedAnalyses++
  }
  
  // Apply results back to the nested structure
  const updatedSeriesBests = { ...personalBests.seriesBests }
  
  for (const [seriesName, series] of Object.entries(updatedSeriesBests)) {
    const updatedTrackLayoutBests = { ...series.trackLayoutBests }
    
    for (const [trackLayoutKey, trackLayout] of Object.entries(updatedTrackLayoutBests)) {
      const updatedCarBests = { ...trackLayout.carBests }
      
      for (const [carName, carBest] of Object.entries(updatedCarBests)) {
        const analysisResult = analysisResults.get(carBest.id)
        if (analysisResult?.success && analysisResult.analysis) {
          updatedCarBests[carName] = {
            ...carBest,
            iratingAnalysis: analysisResult.analysis,
          }
        }
      }
      
      updatedTrackLayoutBests[trackLayoutKey] = {
        ...trackLayout,
        carBests: updatedCarBests,
      }
    }
    
    updatedSeriesBests[seriesName] = {
      ...series,
      trackLayoutBests: updatedTrackLayoutBests,
    }
  }
  
  return {
    ...personalBests,
    seriesBests: updatedSeriesBests,
    iratingAnalysisSummary: {
      totalRecords: allPersonalBestRecords.length,
      successfulAnalyses,
      failedAnalyses,
    },
  }
}

/**
 * Get personal best records with iRating analysis above a threshold
 * Utility function for filtering high-performance laps
 */
export function getPersonalBestsWithHighIRatingAnalysis(
  personalBests: DriverPersonalBests,
  thresholdIRating: number
): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = []
  
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      for (const carBest of Object.values(trackLayout.carBests)) {
        if (
          carBest.iratingAnalysis &&
          carBest.iratingAnalysis.iratingEquivalency.estimatedIRating >= thresholdIRating
        ) {
          results.push(carBest)
        }
      }
    }
  }
  
  // Sort by estimated iRating descending
  return results.sort((a, b) => {
    const aEstimated = a.iratingAnalysis?.iratingEquivalency.estimatedIRating || 0
    const bEstimated = b.iratingAnalysis?.iratingEquivalency.estimatedIRating || 0
    return bEstimated - aEstimated
  })
}

/**
 * Get personal best records showing significant improvement potential
 * Utility function for identifying breakthrough performances
 */
export function getPersonalBestsWithSignificantImprovement(
  personalBests: DriverPersonalBests,
  minimumDelta: number = 100 // Minimum iRating improvement
): PersonalBestRecord[] {
  const results: PersonalBestRecord[] = []
  
  for (const series of Object.values(personalBests.seriesBests)) {
    for (const trackLayout of Object.values(series.trackLayoutBests)) {
      for (const carBest of Object.values(trackLayout.carBests)) {
        if (
          carBest.iratingAnalysis &&
          carBest.iratingAnalysis.iratingDelta.delta >= minimumDelta &&
          carBest.iratingAnalysis.iratingEquivalency.confidence >= 60
        ) {
          results.push(carBest)
        }
      }
    }
  }
  
  // Sort by delta descending
  return results.sort((a, b) => {
    const aDelta = a.iratingAnalysis?.iratingDelta.delta || 0
    const bDelta = b.iratingAnalysis?.iratingDelta.delta || 0
    return bDelta - aDelta
  })
}