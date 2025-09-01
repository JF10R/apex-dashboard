import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonalBestsDetailModal } from '../personal-bests-detail-modal';
import type { PersonalBestRecord } from '@/lib/personal-bests-types';

describe('PersonalBestsDetailModal', () => {
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
  };

  test('renders details when open', () => {
    render(
      <PersonalBestsDetailModal record={mockRecord} open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Nurburgring')).toBeInTheDocument();
    expect(screen.getByText('Ferrari 296 GT3')).toBeInTheDocument();
    expect(screen.getByText('1:55.000')).toBeInTheDocument();
    expect(screen.getByText('Strength of Field')).toBeInTheDocument();
  });
});
