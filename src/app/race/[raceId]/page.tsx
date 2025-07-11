'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert, Timer, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RaceResultsTable from '@/components/race-results-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRaceResultAction } from '@/app/data-actions';
import { type RaceParticipant, type RecentRace } from '@/lib/mock-data';
import { useState, useEffect, useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const lapTimeToMs = (time: string): number => {
  if (!time || !time.includes(':') || !time.includes('.')) return Infinity;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  return (minutes * 60 + seconds) * 1000 + ms;
}

const getOverallFastestLap = (participants: RaceParticipant[]): string => {
  let fastestLap = '99:99.999';
  let fastestMs = Infinity;

  participants.forEach(p => {
    if (p.fastestLap) {
      const currentMs = lapTimeToMs(p.fastestLap);
      if (currentMs < fastestMs) {
        fastestMs = currentMs;
        fastestLap = p.fastestLap;
      }
    }
  });

  return fastestLap === '99:99.999' ? 'N/A' : fastestLap;
};

export default function RaceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [race, setRace] = useState<RecentRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const raceId = params.raceId as string;
  const fromDriver = searchParams.get('from');

  // Create a mapping of driver names to customer IDs for easy navigation
  // This hook must be called before any conditional returns
  const driverNameToCustomerId = useMemo(() => {
    if (!race?.participants) return {};
    
    const mapping: Record<string, string> = {};
    race.participants.forEach(participant => {
      if (participant.name && participant.custId) {
        mapping[participant.name] = participant.custId.toString();
      }
    });
    return mapping;
  }, [race?.participants]);

  useEffect(() => {
    const fetchRace = async () => {
      try {
        const subsessionId = parseInt(raceId, 10);
        if (isNaN(subsessionId)) {
          setError('Invalid race ID');
          return;
        }

        const { data, error } = await getRaceResultAction(subsessionId);
        if (error || !data) {
          setError(error || 'Race not found');
          return;
        }

        setRace(data);
      } catch (err) {
        setError('Failed to load race data');
      } finally {
        setLoading(false);
      }
    };

    fetchRace();
  }, [raceId]);

  // Update document title when race data is loaded
  useEffect(() => {
    if (race) {
      document.title = `${race.trackName} - ${race.seriesName} - Apex Stats`;
    } else {
      document.title = `Race ${raceId} - Apex Stats`;
    }
  }, [race, raceId]);

  const handleBack = () => {
    if (fromDriver) {
      router.push(`/${fromDriver}`);
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto p-4 md:p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Loading Race Data...</CardTitle>
            <CardDescription>Please wait while we fetch the race information.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (error || !race) {
    return (
      <main className="container mx-auto p-4 md:p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Alert>
            <AlertDescription>
              Error loading race data: {error}
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  const winner = race.participants.find((p) => p.finishPosition === 1);
  const overallFastestLap = getOverallFastestLap(race.participants);

  // Handler for when a driver name is clicked in the results table
  const handleDriverClick = (driverName: string) => {
    const customerId = driverNameToCustomerId[driverName];
    if (customerId) {
      router.push(`/${customerId}`);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 animate-in fade-in duration-500 relative">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft />
          Back to Dashboard
        </Button>
      </div>

      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter">{race.trackName}</h1>
            <p className="text-muted-foreground mt-1">
              {new Date(race.date).toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })}
            </p>
          </div>
          <Badge variant="outline" className="text-base py-1 px-3 w-fit">{race.car}</Badge>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Race Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Winner" value={winner?.name || 'N/A'} icon={Award} description={winner ? `Finished P1` : "Data not available"} />
          <StatCard title="Avg. Lap Time" value={race.avgRaceLapTime} icon={Timer} description="Across all drivers" />
          <StatCard title="Avg. Incidents" value={race.avgRaceIncidents > 0 ? race.avgRaceIncidents.toFixed(2) : 'N/A'} icon={ShieldAlert} description="Across all drivers" />
          <StatCard title="Strength of Field" value={race.strengthOfField.toLocaleString('en-US')} icon={Users} description="Average iRating of drivers" />
        </div>
      </section>

      <section>
        <RaceResultsTable 
          participants={race.participants} 
          overallFastestLap={overallFastestLap} 
          raceId={raceId}
          onDriverClick={handleDriverClick}
        />
      </section>
    </main>
  )
}
