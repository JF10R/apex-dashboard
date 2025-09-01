import { render, screen, fireEvent } from '@testing-library/react'
import { PersonalBestCard } from '../personal-best-card'
import type { PersonalBestRecord } from '@/lib/personal-bests-types'

describe('PersonalBestCard', () => {
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

  test('renders personal best information', () => {
    render(<PersonalBestCard record={mockRecord} />)
    expect(screen.getByText('Nurburgring (GP)')).toBeDefined()
    expect(screen.getByText('Ferrari 296 GT3')).toBeDefined()
    expect(screen.getByText('1:55.000')).toBeDefined()
  })

  test('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<PersonalBestCard record={mockRecord} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('1:55.000'))
    expect(onSelect).toHaveBeenCalledWith(mockRecord)
  })
})
