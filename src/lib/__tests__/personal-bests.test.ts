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