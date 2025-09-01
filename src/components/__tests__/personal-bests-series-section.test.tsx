import { render, screen, fireEvent } from '@testing-library/react'
import { PersonalBestsSeriesSection } from '../personal-bests-series-section'
import type { SeriesPersonalBests, PersonalBestRecord } from '@/lib/personal-bests-types'

describe('PersonalBestsSeriesSection', () => {
  const mockRecord: PersonalBestRecord = {
    id: '1',
    trackId: 123,
    trackName: 'Nurburgring',
    configName: 'GP',
    carId: 456,
    carName: 'Ferrari 296 GT3',
    fastestLap: '1:55.000',
    fastestLapMs: 115000,
    seriesName: 'GT3 Challenge',
    category: 'Sports Car',
    subsessionId: '789',
    raceDate: '2024-01-01T00:00:00Z',
    year: 2024,
    season: 'Season 1',
    strengthOfField: 2500,
    finishPosition: 1,
    totalRaceIncidents: 0,
  }

  const mockSeries: SeriesPersonalBests = {
    seriesName: 'GT3 Challenge',
    category: 'Sports Car',
    trackLayoutBests: {
      '123_GP': {
        trackLayoutKey: '123_GP',
        trackName: 'Nurburgring',
        configName: 'GP',
        trackId: 123,
        category: 'Sports Car',
        carBests: {
          'Ferrari 296 GT3': mockRecord,
        },
        totalRaces: 1,
        fastestOverall: '1:55.000',
        fastestOverallMs: 115000,
        mostRecentRace: '2024-01-01T00:00:00Z',
      },
    },
    totalRaces: 1,
    uniqueTrackLayouts: 1,
    uniqueCars: 1,
    averageSoF: 2500,
    bestOverallLap: '1:55.000',
    bestOverallLapMs: 115000,
  }

  test('renders series section with cards and opens modal', () => {
    render(<PersonalBestsSeriesSection series={mockSeries} />)
    expect(screen.getByText('GT3 Challenge')).toBeDefined()
    expect(screen.getByText('Nurburgring (GP)')).toBeDefined()

    fireEvent.click(screen.getByText('1:55.000'))
    expect(screen.getByText('Strength of Field')).toBeDefined()
  })
})
