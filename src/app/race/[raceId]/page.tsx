'use client';

import React from 'react';

import { useSearchParams, useParams } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert, Timer, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RaceResultsTable from '@/components/race-results-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { EnhancedLoading, useLoadingSteps } from '@/components/enhanced-loading';
import { type RaceParticipant } from '@/lib/iracing-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgressiveRaceLoading } from '@/hooks/use-progressive-race-loading';
import { getOverallFastestLap } from '@/lib/iracing-data-transform';
import { RaceEventsLog } from '@/components/race-events-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/error-boundary';

function EventLogError({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>{error.message || 'Failed to load event log.'}</AlertDescription>
      </Alert>
      <Button onClick={resetError} className="mt-4">
        Retry
      </Button>
    </div>
  );
}

export default function RaceDetailsPage() {
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

  const {
    steps,
    startStep,
    completeStep,
    errorStep,
    updateStep
  } = useLoadingSteps([
    { id: 'initial', label: 'Loading race data' },
    { id: 'lap-data', label: 'Processing lap data' },
    { id: 'complete', label: 'Complete' }
  ]);

  const prevPhase = React.useRef<typeof progress.phase | null>(null);

  React.useEffect(() => {
    if (progress.phase !== prevPhase.current) {
      switch (progress.phase) {
        case 'initial':
          startStep('initial');
          break;
        case 'lap-data':
          completeStep('initial');
          startStep('lap-data');
          break;
        case 'complete':
          completeStep('lap-data');
          completeStep('complete');
          break;
        case 'error':
          errorStep(prevPhase.current === 'initial' ? 'initial' : 'lap-data', error || 'Failed to load race data');
          break;
      }
      prevPhase.current = progress.phase;
    }
  }, [progress.phase, startStep, completeStep, errorStep, error]);

  React.useEffect(() => {
    if (progress.phase === 'lap-data') {
      updateStep('lap-data', {
        progress: progress.totalParticipants
          ? (progress.participantsProcessed / progress.totalParticipants) * 100
          : 0,
        message: progress.currentParticipant
          ? `Processing ${progress.currentParticipant}'s lap times...`
          : undefined,
      });
    }
  }, [
    progress.phase,
    progress.participantsProcessed,
    progress.totalParticipants,
    progress.currentParticipant,
    updateStep,
  ]);

  // Use enhanced data if available, otherwise fall back to initial data
  const race = enhancedData || initialData;

  const trackName = React.useMemo(() => {
    return race?.trackName || '';
  }, [race?.trackName]);

  const fastestLap = React.useMemo(() => {
    if (!race?.participants || !Array.isArray(race.participants)) return null;
    return getOverallFastestLap(race.participants);
  }, [race?.participants]);

  const simsessionNumber = race?.simsessionNumber ?? 0;
  const subsessionIdNumber = React.useMemo(() => parseInt(subsessionId, 10), [subsessionId]);

  const handleBack = () => {
    const fromDriver = searchParams?.get('from');
    const target = fromDriver ? `/${fromDriver}` : '/';
    window.location.href = target;
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
          <EnhancedLoading steps={steps} showTimestamp />
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
    const participant = race.participants?.find((p: RaceParticipant) => p.name === driverName);
    if (participant?.custId) {
      window.location.href = `/${participant.custId}`;
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
          <EnhancedLoading steps={steps} showTimestamp />
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
        <Tabs defaultValue="results">
          <TabsList className="mb-4">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>
          <TabsContent value="results">
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
          </TabsContent>
          <TabsContent value="events">
            <ErrorBoundary fallback={EventLogError}>
              <RaceEventsLog subsessionId={subsessionIdNumber} simsessionNumber={simsessionNumber} />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
