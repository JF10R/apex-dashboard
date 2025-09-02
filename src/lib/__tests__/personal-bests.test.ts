/**
 * Personal Bests Transformation Tests
 * 
 * Unit tests for personal bests transformation functions following atomic testing principles.
 */

import { describe, test, expect } from '@jest/globals'
import {
  generateTrackLayoutKey,
  extractTrackLayoutIdentifier,
  findFastestLapInRace,
  extractDriverFastestLap,
  createPersonalBestRecord,
  transformRecentRacesToPersonalBests,
  getPersonalBestForCarAndTrack,
  getPersonalBestsForCar,
  getPersonalBestsForTrack,
  filterRacesByOptions,
  buildPersonalBestRecords,
  aggregateByHierarchy,
  calculateGlobalStatistics,
  findFastestLapTime,
} from '../personal-bests'
import type { RecentRace, RaceParticipant, Lap } from '../iracing-types'

// Mock data for testing
const createMockRace = (overrides: Partial<RecentRace> = {}): RecentRace => ({
  id: '12345',
  trackName: 'Silverstone Circuit',
  date: '2024-01-15T14:30:00Z',
  year: 2024,
  season: 'Season 1',
  category: 'Sports Car',
  seriesName: 'Global GT Sprint',
  startPosition: 5,
  finishPosition: 3,
  incidents: 2,
  strengthOfField: 2500,
  lapsLed: 0,
  fastestLap: '1:26.543',
  car: 'McLaren 720S GT3',
  avgLapTime: '1:27.123',
  iratingChange: 25,
  safetyRatingChange: 0.05,
  participants: [],
  avgRaceIncidents: 3.2,
  avgRaceLapTime: '1:27.456',
  ...overrides,
})

const createMockParticipant = (overrides: Partial<RaceParticipant> = {}): RaceParticipant => ({
  name: 'Test Driver',
  custId: 123456,
  startPosition: 1,
  finishPosition: 1,
  incidents: 0,
  fastestLap: '1:25.123',
  irating: 3000,
  laps: [],
  totalTime: '25:30.456',
  ...overrides,
})

const createMockLap = (overrides: Partial<Lap> = {}): Lap => ({
  lapNumber: 1,
  time: '1:26.789',
  invalid: false,
  ...overrides,
})

describe('Personal Bests - Track Layout Utilities', () => {
  test('generateTrackLayoutKey - creates consistent keys', () => {
    const identifier = {
      trackId: 123,
      trackName: 'Silverstone Circuit',
      configName: 'Grand Prix'
    }
    
    const key = generateTrackLayoutKey(identifier)
    expect(key).toBe('123_Grand_Prix')
  })
  
  test('generateTrackLayoutKey - handles no config name', () => {
    const identifier = {
      trackId: 456,
      trackName: 'Monza',
    }
    
    const key = generateTrackLayoutKey(identifier)
    expect(key).toBe('456_default')
  })
  
  test('generateTrackLayoutKey - sanitizes special characters in config name', () => {
    const identifier = {
      trackId: 789,
      trackName: 'Nürburgring',
      configName: 'Nordschleife (Tourist)'
    }
    
    const key = generateTrackLayoutKey(identifier)
    expect(key).toBe('789_Nordschleife__Tourist_')
  })
  
  test('extractTrackLayoutIdentifier - extracts from valid race', () => {
    const race = createMockRace({ trackName: 'Spa-Francorchamps' })
    const identifier = extractTrackLayoutIdentifier(race)
    
    expect(identifier).toBeTruthy()
    expect(identifier?.trackName).toBe('Spa-Francorchamps')
    expect(identifier?.trackId).toBeGreaterThan(0)
  })
  
  test('extractTrackLayoutIdentifier - handles invalid race', () => {
    const race = createMockRace({ trackName: '' })
    const identifier = extractTrackLayoutIdentifier(race)
    
    expect(identifier).toBeNull()
  })
})

describe('Personal Bests - Lap Time Extraction', () => {
  test('findFastestLapInRace - finds fastest from participants', () => {
    const participants = [
      createMockParticipant({ fastestLap: '1:26.123' }),
      createMockParticipant({ fastestLap: '1:25.456' }), // Fastest
      createMockParticipant({ fastestLap: '1:27.789' }),
    ]
    
    const fastest = findFastestLapInRace(participants)
    expect(fastest).toBe('1:25.456')
  })
  
  test('findFastestLapInRace - handles empty participants', () => {
    const fastest = findFastestLapInRace([])
    expect(fastest).toBe('N/A')
  })
  
  test('findFastestLapInRace - finds fastest from individual laps', () => {
    const participants = [
      createMockParticipant({
        fastestLap: 'N/A',
        laps: [
          createMockLap({ time: '1:26.123' }),
          createMockLap({ time: '1:24.999' }), // Fastest
          createMockLap({ time: '1:25.456' }),
        ]
      }),
    ]
    
    const fastest = findFastestLapInRace(participants)
    expect(fastest).toBe('1:24.999')
  })
  
  test('extractDriverFastestLap - extracts from first participant', () => {
    const race = createMockRace({
      participants: [
        createMockParticipant({ fastestLap: '1:25.123' }),
        createMockParticipant({ fastestLap: '1:26.456' }),
      ]
    })
    
    const fastestLap = extractDriverFastestLap(race)
    expect(fastestLap).toBe('1:25.123')
  })
  
  test('extractDriverFastestLap - fallback to individual laps', () => {
    const race = createMockRace({
      participants: [
        createMockParticipant({
          fastestLap: 'N/A',
          laps: [
            createMockLap({ time: '1:26.123' }),
            createMockLap({ time: '1:24.567' }), // Fastest
          ]
        }),
      ]
    })
    
    const fastestLap = extractDriverFastestLap(race)
    expect(fastestLap).toBe('1:24.567')
  })
})

describe('Personal Bests - Record Creation', () => {
  test('createPersonalBestRecord - creates valid record', () => {
    const race = createMockRace()
    const identifier = extractTrackLayoutIdentifier(race)!
    const fastestLap = '1:25.123'
    
    const record = createPersonalBestRecord(race, identifier, fastestLap)
    
    expect(record).toBeTruthy()
    expect(record?.fastestLap).toBe(fastestLap)
    expect(record?.carName).toBe('McLaren 720S GT3')
    expect(record?.seriesName).toBe('Global GT Sprint')
    expect(record?.category).toBe('Sports Car')
    expect(record?.fastestLapMs).toBeGreaterThan(0)
  })
  
  test('createPersonalBestRecord - rejects invalid lap time', () => {
    const race = createMockRace()
    const identifier = extractTrackLayoutIdentifier(race)!
    const invalidLap = 'N/A'
    
    const record = createPersonalBestRecord(race, identifier, invalidLap)
    
    expect(record).toBeNull()
  })
})

describe('Personal Bests - Full Transformation', () => {
  test('transformRecentRacesToPersonalBests - basic transformation', () => {
    const recentRaces = [
      createMockRace({
        id: '1',
        trackName: 'Silverstone',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        trackName: 'Spa-Francorchamps',
        car: 'Ferrari 488 GT3',
        participants: [createMockParticipant({ fastestLap: '1:45.456' })]
      }),
      createMockRace({
        id: '3',
        trackName: 'Silverstone',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:24.789' })] // Better time
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', recentRaces)
    
    expect(result.errors).toHaveLength(0)
    expect(result.personalBests.custId).toBe(123456)
    expect(result.personalBests.driverName).toBe('Test Driver')
    expect(result.personalBests.totalRaces).toBe(3)
    expect(result.personalBests.totalSeries).toBe(1)
    expect(result.personalBests.totalTrackLayouts).toBe(2) // Silverstone and Spa
    expect(result.personalBests.totalCars).toBe(2) // McLaren and Ferrari
    
    // Check that the better Silverstone time is kept
    const silverstone = getPersonalBestForCarAndTrack(
      result.personalBests,
      'McLaren 720S GT3',
      'Silverstone'
    )
    expect(silverstone?.fastestLap).toBe('1:24.789')
  })
  
  test('transformRecentRacesToPersonalBests - with filters', () => {
    const recentRaces = [
      createMockRace({
        id: '1',
        category: 'Sports Car',
        seriesName: 'Global GT Sprint',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        category: 'Formula Car',
        seriesName: 'Formula Sprint',
        participants: [createMockParticipant({ fastestLap: '1:15.456' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(
      123456,
      'Test Driver',
      recentRaces,
      { categoryFilter: ['Sports Car'] }
    )
    
    expect(result.personalBests.totalRaces).toBe(1)
    expect(result.context.ignoredRaces).toHaveLength(1)
    expect(result.context.ignoredRaces[0].reason).toContain('Formula Car not in filter')
  })
})

describe('Personal Bests - Utility Functions', () => {
  test('getPersonalBestForCarAndTrack - finds correct record', () => {
    const recentRaces = [
      createMockRace({
        id: '1',
        trackName: 'Silverstone',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', recentRaces)
    const personalBest = getPersonalBestForCarAndTrack(
      result.personalBests,
      'McLaren 720S GT3',
      'Silverstone'
    )
    
    expect(personalBest).toBeTruthy()
    expect(personalBest?.fastestLap).toBe('1:25.123')
  })
  
  test('getPersonalBestsForCar - finds all records for car', () => {
    const recentRaces = [
      createMockRace({
        id: '1',
        trackName: 'Silverstone',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        trackName: 'Spa-Francorchamps',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:45.456' })]
      }),
      createMockRace({
        id: '3',
        trackName: 'Silverstone',
        car: 'Ferrari 488 GT3',
        participants: [createMockParticipant({ fastestLap: '1:26.789' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', recentRaces)
    const mclarenBests = getPersonalBestsForCar(result.personalBests, 'McLaren 720S GT3')
    
    expect(mclarenBests).toHaveLength(2)
    expect(mclarenBests.map(b => b.trackName).sort()).toEqual(['Silverstone', 'Spa-Francorchamps'])
  })
  
  test('getPersonalBestsForTrack - finds all records for track', () => {
    const recentRaces = [
      createMockRace({
        id: '1',
        trackName: 'Silverstone',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        trackName: 'Silverstone',
        car: 'Ferrari 488 GT3',
        participants: [createMockParticipant({ fastestLap: '1:26.456' })]
      }),
      createMockRace({
        id: '3',
        trackName: 'Spa-Francorchamps',
        car: 'McLaren 720S GT3',
        participants: [createMockParticipant({ fastestLap: '1:45.789' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', recentRaces)
    const silverstoneBests = getPersonalBestsForTrack(result.personalBests, 'Silverstone')
    
    expect(silverstoneBests).toHaveLength(2)
    expect(silverstoneBests.map(b => b.carName).sort()).toEqual(['Ferrari 488 GT3', 'McLaren 720S GT3'])
  })
})

describe('Personal Bests - Shared Fastest Lap Utility', () => {
  test('findFastestLapTime - finds fastest from array', () => {
    const lapTimes = ['1:26.123', '1:24.456', '1:27.789']
    const result = findFastestLapTime(lapTimes)
    
    expect(result.fastestLap).toBe('1:24.456')
    expect(result.fastestMs).toBeGreaterThan(0)
  })
  
  test('findFastestLapTime - handles empty array', () => {
    const result = findFastestLapTime([])
    
    expect(result.fastestLap).toBe('N/A')
    expect(result.fastestMs).toBe(Infinity)
  })
  
  test('findFastestLapTime - ignores invalid lap times', () => {
    const lapTimes = ['N/A', '1:26.123', '', '1:24.456']
    const result = findFastestLapTime(lapTimes)
    
    expect(result.fastestLap).toBe('1:24.456')
  })
})

describe('Personal Bests - Filter Functions', () => {
  test('filterRacesByOptions - category filter', () => {
    const races = [
      createMockRace({ id: '1', category: 'Sports Car' }),
      createMockRace({ id: '2', category: 'Formula Car' }),
      createMockRace({ id: '3', category: 'Sports Car' }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const filtered = filterRacesByOptions(races, { categoryFilter: ['Sports Car'] }, ignoredRaces)
    
    expect(filtered).toHaveLength(2)
    expect(filtered.map(r => r.id)).toEqual(['1', '3'])
    expect(ignoredRaces).toHaveLength(1)
    expect(ignoredRaces[0].reason).toContain('Formula Car not in filter')
  })
  
  test('filterRacesByOptions - series filter', () => {
    const races = [
      createMockRace({ id: '1', seriesName: 'Global GT Sprint' }),
      createMockRace({ id: '2', seriesName: 'Formula Sprint' }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const filtered = filterRacesByOptions(races, { seriesFilter: ['Global GT Sprint'] }, ignoredRaces)
    
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('1')
    expect(ignoredRaces).toHaveLength(1)
  })
  
  test('filterRacesByOptions - date range filter', () => {
    const races = [
      createMockRace({ id: '1', date: '2024-01-01T00:00:00Z' }),
      createMockRace({ id: '2', date: '2024-02-01T00:00:00Z' }),
      createMockRace({ id: '3', date: '2024-03-01T00:00:00Z' }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const filtered = filterRacesByOptions(races, {
      dateFrom: new Date('2024-01-15T00:00:00Z'),
      dateTo: new Date('2024-02-15T00:00:00Z')
    }, ignoredRaces)
    
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('2')
    expect(ignoredRaces).toHaveLength(2)
  })
  
  test('filterRacesByOptions - strength of field filter', () => {
    const races = [
      createMockRace({ id: '1', strengthOfField: 1500 }),
      createMockRace({ id: '2', strengthOfField: 2500 }),
      createMockRace({ id: '3', strengthOfField: 3500 }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const filtered = filterRacesByOptions(races, { minStrengthOfField: 2000 }, ignoredRaces)
    
    expect(filtered).toHaveLength(2)
    expect(filtered.map(r => r.id)).toEqual(['2', '3'])
    expect(ignoredRaces).toHaveLength(1)
    expect(ignoredRaces[0].reason).toContain('SoF 1500 below minimum')
  })
})

describe('Personal Bests - Build Records Function', () => {
  test('buildPersonalBestRecords - creates valid records', () => {
    const races = [
      createMockRace({
        id: '1',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        participants: [createMockParticipant({ fastestLap: '1:26.456' })]
      }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const records = buildPersonalBestRecords(races, ignoredRaces)
    
    expect(records).toHaveLength(2)
    expect(records[0].fastestLap).toBe('1:25.123')
    expect(records[1].fastestLap).toBe('1:26.456')
    expect(ignoredRaces).toHaveLength(0)
  })
  
  test('buildPersonalBestRecords - handles invalid track layouts', () => {
    const races = [
      createMockRace({
        id: '1',
        trackName: '', // Invalid track name
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const records = buildPersonalBestRecords(races, ignoredRaces)
    
    expect(records).toHaveLength(0)
    expect(ignoredRaces).toHaveLength(1)
    expect(ignoredRaces[0].reason).toBe('Invalid track layout identifier')
  })
  
  test('buildPersonalBestRecords - handles missing fastest laps', () => {
    const races = [
      createMockRace({
        id: '1',
        participants: [] // No participants
      }),
    ]
    const ignoredRaces: Array<{ raceId: string; reason: string }> = []
    
    const records = buildPersonalBestRecords(races, ignoredRaces)
    
    expect(records).toHaveLength(0)
    expect(ignoredRaces).toHaveLength(1)
    expect(ignoredRaces[0].reason).toBe('No valid fastest lap found')
  })
})

describe('Personal Bests - Aggregation Function', () => {
  test('aggregateByHierarchy - creates series structure', () => {
    const records = [
      {
        id: '1',
        trackId: 123,
        trackName: 'Silverstone',
        carName: 'McLaren 720S GT3',
        fastestLap: '1:25.123',
        fastestLapMs: 85123,
        seriesName: 'Global GT Sprint',
        category: 'Sports Car' as const,
        subsessionId: '12345',
        raceDate: '2024-01-15T14:30:00Z',
        year: 2024,
        season: 'Season 1',
        strengthOfField: 2500,
        finishPosition: 3,
        totalRaceIncidents: 2,
      }
    ]
    const warnings: string[] = []
    
    const result = aggregateByHierarchy(records, {}, warnings)
    
    expect(Object.keys(result)).toHaveLength(1)
    expect(result['Global GT Sprint']).toBeTruthy()
    expect(result['Global GT Sprint'].seriesName).toBe('Global GT Sprint')
    expect(warnings).toHaveLength(0)
  })
  
  test('aggregateByHierarchy - applies minimum races filter', () => {
    const records = [
      {
        id: '1',
        trackId: 123,
        trackName: 'Silverstone',
        carName: 'McLaren 720S GT3',
        fastestLap: '1:25.123',
        fastestLapMs: 85123,
        seriesName: 'Global GT Sprint',
        category: 'Sports Car' as const,
        subsessionId: '12345',
        raceDate: '2024-01-15T14:30:00Z',
        year: 2024,
        season: 'Season 1',
        strengthOfField: 2500,
        finishPosition: 3,
        totalRaceIncidents: 2,
      }
    ]
    const warnings: string[] = []
    
    const result = aggregateByHierarchy(records, { minRaces: 5 }, warnings)
    
    expect(Object.keys(result)).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('has only 1 races, minimum is 5')
  })
})

describe('Personal Bests - Global Statistics Function', () => {
  test('calculateGlobalStatistics - computes correct stats', () => {
    const seriesBests = {
      'Global GT Sprint': {
        seriesName: 'Global GT Sprint',
        category: 'Sports Car' as const,
        trackLayoutBests: {
          '123_default': {
            trackLayoutKey: '123_default',
            trackName: 'Silverstone',
            trackId: 123,
            category: 'Sports Car' as const,
            carBests: {
              'McLaren 720S GT3': {
                id: '1',
                trackId: 123,
                trackName: 'Silverstone',
                carName: 'McLaren 720S GT3',
                fastestLap: '1:24.500',
                fastestLapMs: 84500,
                seriesName: 'Global GT Sprint',
                category: 'Sports Car' as const,
                subsessionId: '12345',
                raceDate: '2024-01-15T14:30:00Z',
                year: 2024,
                season: 'Season 1',
                strengthOfField: 2500,
                finishPosition: 1,
                totalRaceIncidents: 0,
              }
            },
            totalRaces: 1,
            fastestOverall: '1:24.500',
            fastestOverallMs: 84500,
            mostRecentRace: '2024-01-15T14:30:00Z',
          }
        },
        totalRaces: 1,
        uniqueTrackLayouts: 1,
        uniqueCars: 1,
        averageSoF: 2500,
        bestOverallLap: '1:24.500',
        bestOverallLapMs: 84500,
      }
    }
    const personalBestRecords = [
      {
        id: '1',
        trackId: 123,
        trackName: 'Silverstone',
        carName: 'McLaren 720S GT3',
        fastestLap: '1:24.500',
        fastestLapMs: 84500,
        seriesName: 'Global GT Sprint',
        category: 'Sports Car' as const,
        subsessionId: '12345',
        raceDate: '2024-01-15T14:30:00Z',
        year: 2024,
        season: 'Season 1',
        strengthOfField: 2500,
        finishPosition: 1,
        totalRaceIncidents: 0,
      }
    ]
    
    const stats = calculateGlobalStatistics(seriesBests, personalBestRecords)
    
    expect(stats.fastestLapOverall).toBe('1:24.500')
    expect(stats.fastestLapOverallMs).toBe(84500)
    expect(stats.fastestLapTrack).toBe('Silverstone')
    expect(stats.fastestLapCar).toBe('McLaren 720S GT3')
    expect(stats.totalTrackLayouts).toBe(1)
    expect(stats.totalCars).toBe(1)
  })
})

describe('Personal Bests - Error Conditions', () => {
  test('transformRecentRacesToPersonalBests - handles schema validation failures gracefully', () => {
    // Create race with invalid data that would cause schema validation to fail
    const invalidRace = createMockRace({
      id: '1',
      participants: [createMockParticipant({ 
        fastestLap: '1:25.123' 
      })],
      // Set an invalid trackName to cause validation failure
      trackName: '', // Empty track name should fail validation
    })
    
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', [invalidRace])
    
    // Should handle gracefully with warnings/errors rather than throwing
    expect(result.personalBests).toBeTruthy()
    expect(result.context.ignoredRaces.length).toBeGreaterThan(0)
  })
  
  test('transformRecentRacesToPersonalBests - handles empty race list', () => {
    const result = transformRecentRacesToPersonalBests(123456, 'Test Driver', [])
    
    expect(result.personalBests.totalRaces).toBe(0)
    expect(result.personalBests.totalSeries).toBe(0)
    expect(result.personalBests.fastestLapOverall).toBe('N/A')
    expect(result.errors).toHaveLength(0)
  })
  
  test('transformRecentRacesToPersonalBests - handles all races filtered out', () => {
    const races = [
      createMockRace({ 
        category: 'Formula Car',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(
      123456, 
      'Test Driver', 
      races,
      { categoryFilter: ['Sports Car'] } // Filter out all races
    )
    
    expect(result.personalBests.totalRaces).toBe(0)
    expect(result.context.ignoredRaces).toHaveLength(1)
    expect(result.personalBests.fastestLapOverall).toBe('N/A')
  })
})

describe('Personal Bests - Complex Filter Combinations', () => {
  test('transformRecentRacesToPersonalBests - multiple filters applied together', () => {
    const races = [
      createMockRace({
        id: '1',
        category: 'Sports Car',
        seriesName: 'Global GT Sprint',
        strengthOfField: 2500,
        date: '2024-02-01T00:00:00Z',
        participants: [createMockParticipant({ fastestLap: '1:25.123' })]
      }),
      createMockRace({
        id: '2',
        category: 'Formula Car', // Wrong category
        seriesName: 'Global GT Sprint',
        strengthOfField: 2500,
        date: '2024-02-01T00:00:00Z',
        participants: [createMockParticipant({ fastestLap: '1:15.123' })]
      }),
      createMockRace({
        id: '3',
        category: 'Sports Car',
        seriesName: 'Formula Sprint', // Wrong series
        strengthOfField: 2500,
        date: '2024-02-01T00:00:00Z',
        participants: [createMockParticipant({ fastestLap: '1:25.456' })]
      }),
      createMockRace({
        id: '4',
        category: 'Sports Car',
        seriesName: 'Global GT Sprint',
        strengthOfField: 1500, // Too low SoF
        date: '2024-02-01T00:00:00Z',
        participants: [createMockParticipant({ fastestLap: '1:25.789' })]
      }),
    ]
    
    const result = transformRecentRacesToPersonalBests(
      123456,
      'Test Driver',
      races,
      {
        categoryFilter: ['Sports Car'],
        seriesFilter: ['Global GT Sprint'],
        minStrengthOfField: 2000,
      }
    )
    
    expect(result.personalBests.totalRaces).toBe(1)
    expect(result.context.ignoredRaces).toHaveLength(3)
    expect(result.personalBests.fastestLapOverall).toBe('1:25.123')
  })
})