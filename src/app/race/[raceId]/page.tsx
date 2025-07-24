'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert, Timer, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RaceResultsTable from '@/components/race-results-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { LoadingProgress } from '@/components/loading-progress';
import { type RaceParticipant, type RecentRace } from '@/lib/iracing-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgressiveRaceLoading } from '@/hooks/use-progressive-race-loading';
import { getOverallFastestLap } from '@/lib/iracing-data-transform';

export default function RaceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const raceId = params?.raceId as string;
  const subsessionId = searchParams?.get('subsessionId') || raceId;

  const {
    initialData,
    enhancedData,
    loading,
    error,
    progress
  } = useProgressiveRaceLoading(subsessionId);

  // Use enhanced data if available, otherwise fall back to initial data
  const race = enhancedData || initialData;

  const trackName = React.useMemo(() => {
    return race?.trackName || '';
  }, [race?.trackName]);

  const safeLaps = React.useMemo(() => {
    return race?.participants?.map((participant: RaceParticipant) => 
      participant.laps || []
    ).flat() || [];
  }, [race?.participants]);

  const fastestLap = React.useMemo(() => {
    if (!race?.participants) return null;
    return getOverallFastestLap(race.participants);
  }, [race?.participants]);

  const handleBack = () => {
    const fromDriver = searchParams?.get('from');
    if (fromDriver) {
      router.push(`/${fromDriver}`);
    } else {
      router.push('/');
    }
  };

  if (!subsessionId) {
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
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Missing subsession ID. Please navigate from a race results page.
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (error) {
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
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  if (loading && !race) {
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
          <LoadingProgress 
            phase={progress.phase}
            percentage={progress.percentage}
            currentParticipant={progress.currentParticipant}
            participantsProcessed={progress.participantsProcessed}
            totalParticipants={progress.totalParticipants}
          />
        </div>
      </main>
    );
  }

  if (!race) {
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
          <div className="text-center py-8">
            <p className="text-muted-foreground">No race data available</p>
          </div>
        </div>
      </main>
    );
  }

  const winner = race.participants?.find((p: RaceParticipant) => p.finishPosition === 1);

  // Handler for when a driver name is clicked in the results table
  const handleDriverClick = (driverName: string) => {
    // Look for customer ID in participants
    const participant = race.participants?.find((p: RaceParticipant) => p.name === driverName);
    if (participant?.custId) {
      router.push(`/${participant.custId}`);
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

      {/* Progressive Loading Indicator */}
      {loading && (
        <div className="mb-6">
          <LoadingProgress 
            phase={progress.phase}
            percentage={progress.percentage}
            currentParticipant={progress.currentParticipant}
            participantsProcessed={progress.participantsProcessed}
            totalParticipants={progress.totalParticipants}
          />
        </div>
      )}

      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter">
              {trackName || race.trackName || 'Race Session'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date(race.date).toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })}
            </p>
          </div>
          <Badge variant="outline" className="text-base py-1 px-3 w-fit">
            {race.seriesName || 'Series'}
          </Badge>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Race Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Winner" 
            value={winner?.name || 'N/A'} 
            icon={Award} 
            description={winner ? `Finished P1` : "Data not available"} 
          />
          <StatCard 
            title="Participants" 
            value={race.participants?.length?.toString() || '0'} 
            icon={Users} 
            description="Total drivers" 
          />
          {fastestLap && (
            <StatCard
              title="Fastest Lap"
              value={race.fastestLap || 'N/A'}
              icon={Timer}
              description="Overall fastest"
            />
          )}
          {race.strengthOfField && (
            <StatCard 
              title="Strength of Field" 
              value={race.strengthOfField.toLocaleString('en-US')} 
              icon={Users} 
              description="Average iRating" 
            />
          )}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Race Results</CardTitle>
            <CardDescription>
              Final positions and race statistics
              {loading && progress.phase !== 'complete' && (
                <span className="ml-2 text-blue-600">
                  (Loading detailed lap data...)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RaceResultsTable 
              participants={race.participants || []}
              overallFastestLap={fastestLap || ''}
              raceId={raceId}
              onDriverClick={handleDriverClick}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
