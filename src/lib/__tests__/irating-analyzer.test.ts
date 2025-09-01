/**
 * iRating Analysis Module Tests
 * 
 * Comprehensive test suite for iRating equivalency calculations and pace analysis.
 * Tests atomic functions, edge cases, and integration with Personal Bests.
 */

import {
  calculatePacePercentile,
  calculateIRatingEquivalency,
  calculateIRatingDelta,
  extractRaceFieldAnalysis,
  analyzePersonalBestIRating,
  generateAnalysisSummary,
  getPerformanceAssessmentText,
  getConfidenceLevelText,
  analyzeBatchPersonalBests,
  DEFAULT_IRATING_ANALYSIS_CONFIG,
} from '../irating-analyzer'

import {
  type PacePercentile,
  type IRatingEquivalency,
  type IRatingDelta,
  type IRatingAnalysis,
  type RaceFieldAnalysis,
} from '../irating-analyzer-types'

import {
  type PersonalBestRecord,
} from '../personal-bests-types'

import {
  type RecentRace,
  type RaceParticipant,
} from '../iracing-types'

describe('iRating Analysis Module', () => {
  describe('calculatePacePercentile', () => {
    it('should calculate percentile for fastest lap', () => {
      const lapTimeMs = 85000 // 1:25.000
      const fieldLapTimes = [85000, 86000, 87000, 88000, 89000] // 5 drivers
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(100) // Fastest lap = 100th percentile
      expect(result.fieldPosition).toBe(1)
      expect(result.totalDrivers).toBe(5)
      expect(result.performanceLevel).toBe('Elite')
    })
    
    it('should calculate percentile for middle-of-field lap', () => {
      const lapTimeMs = 87000 // 1:27.000
      const fieldLapTimes = [85000, 86000, 87000, 88000, 89000] // 5 drivers
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(60) // 3rd fastest out of 5 = 60th percentile
      expect(result.fieldPosition).toBe(3)
      expect(result.totalDrivers).toBe(5)
      expect(result.performanceLevel).toBe('Average')
    })
    
    it('should calculate percentile for slowest lap', () => {
      const lapTimeMs = 89000 // 1:29.000
      const fieldLapTimes = [85000, 86000, 87000, 88000, 89000] // 5 drivers
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(20) // Last place in 5-person field = 20th percentile
      expect(result.fieldPosition).toBe(5)
      expect(result.totalDrivers).toBe(5)
      expect(result.performanceLevel).toBe('Below Average') // 20th percentile = Below Average
    })
    
    it('should handle lap slower than entire field', () => {
      const lapTimeMs = 95000 // 1:35.000
      const fieldLapTimes = [85000, 86000, 87000, 88000, 89000]
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(0)
      expect(result.fieldPosition).toBe(6)
      expect(result.totalDrivers).toBe(5)
      expect(result.performanceLevel).toBe('Struggling')
    })
    
    it('should assign correct performance levels', () => {
      const fieldTimes = Array.from({ length: 20 }, (_, i) => 85000 + (i * 500))
      
      // Elite: 95th percentile (fastest lap)
      const elite = calculatePacePercentile(85000, fieldTimes)
      expect(elite.performanceLevel).toBe('Elite')
      
      // Excellent: 90th percentile (2nd fastest)
      const excellent = calculatePacePercentile(85500, fieldTimes)
      expect(excellent.performanceLevel).toBe('Elite') // Still top 5%
      
      // Strong: 75th percentile (around 5th fastest)
      const strong = calculatePacePercentile(87000, fieldTimes) // Position 5 = 80th percentile
      expect(strong.performanceLevel).toBe('Strong')
      
      // Below Average: 10th percentile
      const belowAverage = calculatePacePercentile(93500, fieldTimes)
      expect(belowAverage.performanceLevel).toBe('Below Average')
    })
    
    it('should throw error with empty field data', () => {
      expect(() => {
        calculatePacePercentile(85000, [])
      }).toThrow('Cannot calculate percentile with empty field data')
    })
  })
  
  describe('calculateIRatingEquivalency', () => {
    const mockFieldAnalysis: RaceFieldAnalysis = {
      totalParticipants: 20,
      validLapTimes: 18,
      strengthOfField: 2500,
      officialSession: true,
      participants: [],
      fastestLapMs: 85000,
      slowestLapMs: 95000,
      averageLapMs: 90000,
      medianLapMs: 89000,
    }
    
    it('should calculate iRating for elite pace performance', () => {
      const pacePercentile: PacePercentile = {
        percentile: 95,
        fieldPosition: 1,
        totalDrivers: 20,
        performanceLevel: 'Elite',
      }
      
      const result = calculateIRatingEquivalency(
        pacePercentile,
        2500,
        mockFieldAnalysis
      )
      
      expect(result.estimatedIRating).toBe(3125) // 2500 * 1.25
      expect(result.analysisMethod).toBe('fieldPercentile')
      expect(result.confidence).toBeGreaterThan(70)
      expect(result.confidenceFactors.fieldSize).toBeGreaterThan(0)
      expect(result.confidenceFactors.strengthOfField).toBeGreaterThan(0)
      expect(result.confidenceFactors.dataQuality).toBeGreaterThan(0)
    })
    
    it('should calculate iRating for average pace performance', () => {
      const pacePercentile: PacePercentile = {
        percentile: 50,
        fieldPosition: 10,
        totalDrivers: 20,
        performanceLevel: 'Average',
      }
      
      const result = calculateIRatingEquivalency(
        pacePercentile,
        2000,
        mockFieldAnalysis
      )
      
      expect(result.estimatedIRating).toBe(1900) // 2000 * 0.95
      expect(result.analysisMethod).toBe('fieldPercentile')
    })
    
    it('should apply iRating bounds correctly', () => {
      const pacePercentile: PacePercentile = {
        percentile: 95,
        fieldPosition: 1,
        totalDrivers: 20,
        performanceLevel: 'Elite',
      }
      
      // Test minimum bound
      const lowSoF = calculateIRatingEquivalency(
        pacePercentile,
        200, // Very low SoF
        mockFieldAnalysis
      )
      expect(lowSoF.estimatedIRating).toBe(350) // Minimum iRating
      
      // Test maximum bound (theoretical)
      const highSoF = calculateIRatingEquivalency(
        pacePercentile,
        15000, // Impossibly high SoF
        mockFieldAnalysis
      )
      expect(highSoF.estimatedIRating).toBe(12000) // Maximum iRating
    })
    
    it('should calculate confidence factors correctly', () => {
      const pacePercentile: PacePercentile = {
        percentile: 85,
        fieldPosition: 3,
        totalDrivers: 25,
        performanceLevel: 'Excellent',
      }
      
      const highQualityField: RaceFieldAnalysis = {
        ...mockFieldAnalysis,
        totalParticipants: 25,
        validLapTimes: 25, // 100% data quality
        strengthOfField: 3500, // High SoF
      }
      
      const result = calculateIRatingEquivalency(
        pacePercentile,
        3500,
        highQualityField
      )
      
      expect(result.confidenceFactors.dataQuality).toBe(100)
      expect(result.confidenceFactors.strengthOfField).toBeGreaterThan(80)
      expect(result.confidence).toBeGreaterThan(85)
    })
  })
  
  describe('calculateIRatingDelta', () => {
    it('should calculate positive delta for improvement', () => {
      const result = calculateIRatingDelta(2800, 2400)
      
      expect(result.delta).toBe(400)
      expect(result.currentIRating).toBe(2400)
      expect(result.estimatedIRating).toBe(2800)
      expect(result.percentageChange).toBe(16.67)
      expect(result.assessment).toBe('significantly_above')
    })
    
    it('should calculate negative delta for decline', () => {
      const result = calculateIRatingDelta(2200, 2400)
      
      expect(result.delta).toBe(-200)
      expect(result.currentIRating).toBe(2400)
      expect(result.estimatedIRating).toBe(2200)
      expect(result.percentageChange).toBe(-8.33)
      expect(result.assessment).toBe('moderately_below')
    })
    
    it('should identify consistent performance', () => {
      const result = calculateIRatingDelta(2410, 2400)
      
      expect(result.delta).toBe(10)
      expect(result.percentageChange).toBe(0.42)
      expect(result.assessment).toBe('consistent')
    })
    
    it('should assign correct assessment levels', () => {
      // Significantly above (+15% or more)
      expect(calculateIRatingDelta(2760, 2400).assessment).toBe('significantly_above')
      
      // Moderately above (+5% to +15%)
      expect(calculateIRatingDelta(2520, 2400).assessment).toBe('moderately_above')
      
      // Slightly above (+1% to +5%)
      expect(calculateIRatingDelta(2436, 2400).assessment).toBe('slightly_above')
      
      // Consistent (-1% to +1%)
      expect(calculateIRatingDelta(2400, 2400).assessment).toBe('consistent')
      
      // Slightly below (-5% to -1%)
      expect(calculateIRatingDelta(2364, 2400).assessment).toBe('slightly_below')
      
      // Moderately below (-15% to -5%) - 2280 is -5% from 2400
      expect(calculateIRatingDelta(2240, 2400).assessment).toBe('moderately_below')
      
      // Significantly below (-15% or less) - 2040 is -15% from 2400
      expect(calculateIRatingDelta(2000, 2400).assessment).toBe('significantly_below')
    })
    
    it('should handle zero current iRating', () => {
      const result = calculateIRatingDelta(1500, 0)
      
      expect(result.delta).toBe(1500)
      expect(result.currentIRating).toBe(0)
      expect(result.estimatedIRating).toBe(1500)
      expect(result.percentageChange).toBe(0) // Division by zero handled
      expect(result.assessment).toBe('significantly_above')
    })
  })
  
  describe('extractRaceFieldAnalysis', () => {
    const createMockParticipant = (
      name: string,
      custId: number,
      fastestLap: string,
      irating: number = 2000,
      finishPosition: number = 1
    ): RaceParticipant => ({
      name,
      custId,
      startPosition: finishPosition,
      finishPosition,
      incidents: 0,
      fastestLap,
      irating,
      laps: [],
    })
    
    it('should extract valid field analysis', () => {
      const mockRace: RecentRace = {
        id: '12345',
        trackName: 'Watkins Glen',
        date: '2024-01-01',
        year: 2024,
        season: 'Season 1',
        category: 'Sports Car',
        seriesName: 'IMSA',
        startPosition: 1,
        finishPosition: 1,
        incidents: 0,
        strengthOfField: 2500,
        lapsLed: 5,
        fastestLap: '1:25.123',
        car: 'BMW M4',
        avgLapTime: '1:26.500',
        iratingChange: 50,
        safetyRatingChange: '0.15',
        avgRaceIncidents: 2,
        avgRaceLapTime: '1:26.500',
        participants: [
          createMockParticipant('Driver 1', 1, '1:25.123', 2600, 1),
          createMockParticipant('Driver 2', 2, '1:25.456', 2550, 2),
          createMockParticipant('Driver 3', 3, '1:25.789', 2500, 3),
          createMockParticipant('Driver 4', 4, '1:26.123', 2450, 4),
          createMockParticipant('Driver 5', 5, '1:26.456', 2400, 5),
          createMockParticipant('Driver 6', 6, '1:26.789', 2350, 6),
          createMockParticipant('Driver 7', 7, '1:27.123', 2300, 7),
          createMockParticipant('Driver 8', 8, '1:27.456', 2250, 8),
        ],
      }
      
      const result = extractRaceFieldAnalysis(mockRace)
      
      expect(result).toBeDefined()
      expect(result!.totalParticipants).toBe(8)
      expect(result!.validLapTimes).toBe(8)
      expect(result!.strengthOfField).toBe(2500)
      expect(result!.participants).toHaveLength(8)
      expect(result!.fastestLapMs).toBe(85123) // 1:25.123
      expect(result!.slowestLapMs).toBe(87456) // 1:27.456
    })
    
    it('should filter out invalid lap times', () => {
      const mockRace: RecentRace = {
        id: '12345',
        trackName: 'Watkins Glen',
        date: '2024-01-01',
        year: 2024,
        season: 'Season 1',
        category: 'Sports Car',
        seriesName: 'IMSA',
        startPosition: 1,
        finishPosition: 1,
        incidents: 0,
        strengthOfField: 2500,
        lapsLed: 5,
        fastestLap: '1:25.123',
        car: 'BMW M4',
        avgLapTime: '1:26.500',
        iratingChange: 50,
        safetyRatingChange: '0.15',
        avgRaceIncidents: 2,
        avgRaceLapTime: '1:26.500',
        participants: [
          createMockParticipant('Driver 1', 1, '1:25.123', 2600, 1),
          createMockParticipant('Driver 2', 2, 'N/A', 2550, 2), // Invalid
          createMockParticipant('Driver 3', 3, '1:25.789', 2500, 3),
          createMockParticipant('Driver 4', 4, '', 2450, 4), // Invalid
          createMockParticipant('Driver 5', 5, '1:26.456', 2400, 5),
        ],
      }
      
      const result = extractRaceFieldAnalysis(mockRace)
      
      // Should return null because only 3 valid times < minFieldSize (8)
      expect(result).toBeNull()
    })
    
    it('should return null for insufficient field size', () => {
      const mockRace: RecentRace = {
        id: '12345',
        trackName: 'Watkins Glen',
        date: '2024-01-01',
        year: 2024,
        season: 'Season 1',
        category: 'Sports Car',
        seriesName: 'IMSA',
        startPosition: 1,
        finishPosition: 1,
        incidents: 0,
        strengthOfField: 2500,
        lapsLed: 5,
        fastestLap: '1:25.123',
        car: 'BMW M4',
        avgLapTime: '1:26.500',
        iratingChange: 50,
        safetyRatingChange: '0.15',
        avgRaceIncidents: 2,
        avgRaceLapTime: '1:26.500',
        participants: [
          createMockParticipant('Driver 1', 1, '1:25.123', 2600, 1),
          createMockParticipant('Driver 2', 2, '1:25.456', 2550, 2),
        ], // Only 2 participants
      }
      
      const result = extractRaceFieldAnalysis(mockRace)
      
      expect(result).toBeNull()
    })
  })
  
  describe('analyzePersonalBestIRating', () => {
    const mockPersonalBest: PersonalBestRecord = {
      id: 'test-pb-1',
      trackId: 123,
      trackName: 'Watkins Glen',
      carName: 'BMW M4',
      fastestLap: '1:25.123',
      fastestLapMs: 85123,
      seriesName: 'IMSA',
      category: 'Sports Car',
      subsessionId: '12345',
      raceDate: '2024-01-01',
      year: 2024,
      season: 'Season 1',
      strengthOfField: 2500,
      finishPosition: 1,
      totalRaceIncidents: 2,
    }
    
    const mockRace: RecentRace = {
      id: '12345',
      trackName: 'Watkins Glen',
      date: '2024-01-01',
      year: 2024,
      season: 'Season 1',
      category: 'Sports Car',
      seriesName: 'IMSA',
      startPosition: 1,
      finishPosition: 1,
      incidents: 0,
      strengthOfField: 2500,
      lapsLed: 5,
      fastestLap: '1:25.123',
      car: 'BMW M4',
      avgLapTime: '1:26.500',
      iratingChange: 50,
      safetyRatingChange: '0.15',
      avgRaceIncidents: 2,
      avgRaceLapTime: '1:26.500',
      participants: [
        { name: 'Driver 1', custId: 1, startPosition: 1, finishPosition: 1, incidents: 0, fastestLap: '1:25.123', irating: 2600, laps: [] },
        { name: 'Driver 2', custId: 2, startPosition: 2, finishPosition: 2, incidents: 1, fastestLap: '1:25.456', irating: 2550, laps: [] },
        { name: 'Driver 3', custId: 3, startPosition: 3, finishPosition: 3, incidents: 0, fastestLap: '1:25.789', irating: 2500, laps: [] },
        { name: 'Driver 4', custId: 4, startPosition: 4, finishPosition: 4, incidents: 2, fastestLap: '1:26.123', irating: 2450, laps: [] },
        { name: 'Driver 5', custId: 5, startPosition: 5, finishPosition: 5, incidents: 1, fastestLap: '1:26.456', irating: 2400, laps: [] },
        { name: 'Driver 6', custId: 6, startPosition: 6, finishPosition: 6, incidents: 0, fastestLap: '1:26.789', irating: 2350, laps: [] },
        { name: 'Driver 7', custId: 7, startPosition: 7, finishPosition: 7, incidents: 3, fastestLap: '1:27.123', irating: 2300, laps: [] },
        { name: 'Driver 8', custId: 8, startPosition: 8, finishPosition: 8, incidents: 2, fastestLap: '1:27.456', irating: 2250, laps: [] },
      ],
    }
    
    it('should successfully analyze personal best with sufficient data', () => {
      const result = analyzePersonalBestIRating(mockPersonalBest, mockRace, 2400)
      
      expect(result.success).toBe(true)
      expect(result.analysis).toBeDefined()
      expect(result.errors).toHaveLength(0)
      
      const analysis = result.analysis!
      expect(analysis.pacePercentile.performanceLevel).toBe('Elite')
      expect(analysis.iratingEquivalency.estimatedIRating).toBeGreaterThan(2400)
      expect(analysis.iratingDelta.delta).toBeGreaterThan(0)
      expect(analysis.summary).toContain('pace')
      expect(analysis.summary).toContain('iR')
    })
    
    it('should handle insufficient field data gracefully', () => {
      const smallRace: RecentRace = {
        ...mockRace,
        participants: mockRace.participants.slice(0, 2), // Only 2 participants
      }
      
      const result = analyzePersonalBestIRating(mockPersonalBest, smallRace, 2400)
      
      expect(result.success).toBe(false)
      expect(result.analysis).toBeNull()
      expect(result.errors).toContain('Insufficient field data for analysis')
    })
    
    it('should include appropriate warnings', () => {
      const lowSoFRace: RecentRace = {
        ...mockRace,
        strengthOfField: 1000, // Low SoF
      }
      
      const result = analyzePersonalBestIRating(mockPersonalBest, lowSoFRace, 2400)
      
      expect(result.success).toBe(true)
      expect(result.context.warnings).toContain('Low strength of field may affect accuracy')
    })
  })
  
  describe('generateAnalysisSummary', () => {
    it('should generate clear summary for high-confidence analysis', () => {
      const mockAnalysis: IRatingAnalysis = {
        pacePercentile: {
          percentile: 95,
          fieldPosition: 1,
          totalDrivers: 20,
          performanceLevel: 'Elite',
        },
        iratingEquivalency: {
          estimatedIRating: 2800,
          confidence: 85,
          confidenceFactors: { fieldSize: 90, strengthOfField: 85, dataQuality: 95 },
          analysisMethod: 'fieldPercentile',
        },
        iratingDelta: {
          delta: 400,
          currentIRating: 2400,
          estimatedIRating: 2800,
          percentageChange: 16.67,
          assessment: 'significantly_above',
        },
        analysisMetadata: {
          calculatedAt: '2024-01-01T00:00:00.000Z',
          raceConditions: { strengthOfField: 2500, fieldSize: 20, officialSession: true },
          dataQuality: { hasCompleteFieldData: true, hasLapTimesForAllDrivers: true, minimumLapsSample: true },
        },
        summary: '',
      }
      
      const summary = generateAnalysisSummary(mockAnalysis)
      
      expect(summary).toContain('elite pace')
      expect(summary).toContain('95.0th percentile')
      expect(summary).toContain('~2800 iR')
      expect(summary).toContain('+400 vs current 2400 iR')
      expect(summary).toContain('high confidence')
    })
    
    it('should generate summary for low-confidence analysis', () => {
      const mockAnalysis: IRatingAnalysis = {
        pacePercentile: {
          percentile: 60,
          fieldPosition: 8,
          totalDrivers: 20,
          performanceLevel: 'Average',
        },
        iratingEquivalency: {
          estimatedIRating: 2300,
          confidence: 45,
          confidenceFactors: { fieldSize: 40, strengthOfField: 30, dataQuality: 65 },
          analysisMethod: 'fieldPercentile',
        },
        iratingDelta: {
          delta: -100,
          currentIRating: 2400,
          estimatedIRating: 2300,
          percentageChange: -4.17,
          assessment: 'slightly_below',
        },
        analysisMetadata: {
          calculatedAt: '2024-01-01T00:00:00.000Z',
          raceConditions: { strengthOfField: 1800, fieldSize: 12, officialSession: true },
          dataQuality: { hasCompleteFieldData: false, hasLapTimesForAllDrivers: false, minimumLapsSample: true },
        },
        summary: '',
      }
      
      const summary = generateAnalysisSummary(mockAnalysis)
      
      expect(summary).toContain('average pace')
      expect(summary).toContain('60.0th percentile')
      expect(summary).toContain('~2300 iR')
      expect(summary).toContain('-100 vs current 2400 iR')
      expect(summary).toContain('low confidence')
    })
  })
  
  describe('Utility Functions', () => {
    describe('getPerformanceAssessmentText', () => {
      it('should return correct assessment descriptions', () => {
        expect(getPerformanceAssessmentText('significantly_above'))
          .toBe('significantly faster than your current skill level')
        expect(getPerformanceAssessmentText('consistent'))
          .toBe('consistent with your current skill level')
        expect(getPerformanceAssessmentText('moderately_below'))
          .toBe('moderately slower than your current skill level')
      })
    })
    
    describe('getConfidenceLevelText', () => {
      it('should return correct confidence descriptions', () => {
        expect(getConfidenceLevelText(90)).toBe('Very High')
        expect(getConfidenceLevelText(75)).toBe('High')
        expect(getConfidenceLevelText(65)).toBe('Moderate')
        expect(getConfidenceLevelText(45)).toBe('Low')
        expect(getConfidenceLevelText(25)).toBe('Very Low')
      })
    })
  })
  
  describe('analyzeBatchPersonalBests', () => {
    it('should analyze multiple personal bests correctly', () => {
      const personalBests: PersonalBestRecord[] = [
        {
          id: 'test-pb-1',
          trackId: 123,
          trackName: 'Watkins Glen',
          carName: 'BMW M4',
          fastestLap: '1:25.123',
          fastestLapMs: 85123,
          seriesName: 'IMSA',
          category: 'Sports Car',
          subsessionId: '12345',
          raceDate: '2024-01-01',
          year: 2024,
          season: 'Season 1',
          strengthOfField: 2500,
          finishPosition: 1,
          totalRaceIncidents: 2,
        },
        {
          id: 'test-pb-2',
          trackId: 124,
          trackName: 'Road America',
          carName: 'Porsche 911',
          fastestLap: '2:05.456',
          fastestLapMs: 125456,
          seriesName: 'IMSA',
          category: 'Sports Car',
          subsessionId: '12346',
          raceDate: '2024-01-02',
          year: 2024,
          season: 'Season 1',
          strengthOfField: 2300,
          finishPosition: 3,
          totalRaceIncidents: 1,
        },
      ]
      
      const races: RecentRace[] = [
        {
          id: '12345',
          trackName: 'Watkins Glen',
          date: '2024-01-01',
          year: 2024,
          season: 'Season 1',
          category: 'Sports Car',
          seriesName: 'IMSA',
          startPosition: 1,
          finishPosition: 1,
          incidents: 0,
          strengthOfField: 2500,
          lapsLed: 5,
          fastestLap: '1:25.123',
          car: 'BMW M4',
          avgLapTime: '1:26.500',
          iratingChange: 50,
          safetyRatingChange: '0.15',
          avgRaceIncidents: 2,
          avgRaceLapTime: '1:26.500',
          participants: Array.from({ length: 15 }, (_, i) => ({
            name: `Driver ${i + 1}`,
            custId: i + 1,
            startPosition: i + 1,
            finishPosition: i + 1,
            incidents: Math.floor(Math.random() * 3),
            fastestLap: `1:${25 + Math.floor(i / 3)}.${123 + (i * 100)}`,
            irating: 2600 - (i * 25),
            laps: [],
          })),
        },
        {
          id: '12346',
          trackName: 'Road America',
          date: '2024-01-02',
          year: 2024,
          season: 'Season 1',
          category: 'Sports Car',
          seriesName: 'IMSA',
          startPosition: 3,
          finishPosition: 3,
          incidents: 1,
          strengthOfField: 2300,
          lapsLed: 0,
          fastestLap: '2:05.456',
          car: 'Porsche 911',
          avgLapTime: '2:06.500',
          iratingChange: 25,
          safetyRatingChange: '0.05',
          avgRaceIncidents: 1,
          avgRaceLapTime: '2:06.500',
          participants: Array.from({ length: 12 }, (_, i) => ({
            name: `Driver ${i + 1}`,
            custId: i + 1,
            startPosition: i + 1,
            finishPosition: i + 1,
            incidents: Math.floor(Math.random() * 2),
            fastestLap: `2:${5 + Math.floor(i / 4)}.${456 + (i * 200)}`,
            irating: 2400 - (i * 30),
            laps: [],
          })),
        },
      ]
      
      const results = analyzeBatchPersonalBests(personalBests, races, 2400)
      
      expect(results.size).toBe(2)
      expect(results.get('test-pb-1')?.success).toBe(true)
      expect(results.get('test-pb-2')?.success).toBe(true)
    })
    
    it('should handle missing race data gracefully', () => {
      const personalBests: PersonalBestRecord[] = [
        {
          id: 'test-pb-1',
          trackId: 123,
          trackName: 'Watkins Glen',
          carName: 'BMW M4',
          fastestLap: '1:25.123',
          fastestLapMs: 85123,
          seriesName: 'IMSA',
          category: 'Sports Car',
          subsessionId: '99999', // Non-existent race
          raceDate: '2024-01-01',
          year: 2024,
          season: 'Season 1',
          strengthOfField: 2500,
          finishPosition: 1,
          totalRaceIncidents: 2,
        },
      ]
      
      const races: RecentRace[] = [] // Empty races array
      
      const results = analyzeBatchPersonalBests(personalBests, races, 2400)
      
      expect(results.size).toBe(1)
      const result = results.get('test-pb-1')!
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Race data not available for subsession')
      expect(result.context.warnings).toContain('Race data not found for analysis')
    })
  })
  
  describe('Edge Cases', () => {
    it('should handle identical lap times in field', () => {
      const lapTimeMs = 85000
      const fieldLapTimes = [85000, 85000, 85000, 85000, 85000] // All identical
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(100) // First occurrence gets best percentile
      expect(result.fieldPosition).toBe(1)
    })
    
    it('should handle single driver field', () => {
      const lapTimeMs = 85000
      const fieldLapTimes = [85000] // Only one driver
      
      const result = calculatePacePercentile(lapTimeMs, fieldLapTimes)
      
      expect(result.percentile).toBe(100)
      expect(result.fieldPosition).toBe(1)
      expect(result.totalDrivers).toBe(1)
    })
    
    it('should handle very small iRating differences', () => {
      const result = calculateIRatingDelta(2401, 2400)
      
      expect(result.delta).toBe(1)
      expect(result.percentageChange).toBe(0.04)
      expect(result.assessment).toBe('consistent')
    })
  })
})