'use client';

import { useState, useTransition, useMemo } from 'react';
import { Bot, Loader2, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { type Driver, type RecentRace } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getComparisonAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { ComparisonHistoryChart } from './comparison-history-chart';
import CommonRacesTable from './common-races-table';
import { Separator } from './ui/separator';

interface CommonRace {
  raceA: RecentRace;
  raceB: RecentRace;
}

const TaleOfTheTapeStat = ({ label, valueA, valueB, highlight }: { label: string; valueA: string | number; valueB: string | number; highlight: 'A' | 'B' | 'NONE' }) => (
  <div className="grid grid-cols-3 items-center text-center">
    <div className={`text-lg font-bold ${highlight === 'A' ? 'text-primary' : ''}`}>{valueA}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
    <div className={`text-lg font-bold ${highlight === 'B' ? 'text-accent' : ''}`}>{valueB}</div>
  </div>
);

export default function DriverComparisonDashboard({ driverA, driverB }: { driverA: Driver; driverB: Driver }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);

  const handleAnalysis = () => {
    startTransition(async () => {
      const result = await getComparisonAnalysis(driverA, driverB);
      setAnalysis(result);
    });
  };

  const commonRaces = useMemo(() => {
    const raceMapA = new Map(driverA.recentRaces.map(r => [r.id, r]));
    const commonRacesData: CommonRace[] = driverB.recentRaces
      .filter(raceB => raceMapA.has(raceB.id))
      .map(raceB => ({
        raceA: raceMapA.get(raceB.id)!,
        raceB: raceB,
      }));
    return commonRacesData;
  }, [driverA, driverB]);


  return (
    <div className="flex flex-col gap-8">
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Users className="w-6 h-6"/>
              Tale of the Tape
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-[1fr_auto_1fr] gap-4 w-full items-center pt-2">
                <h3 className="text-xl font-bold text-primary text-center">{driverA.name}</h3>
                <div className="text-sm text-muted-foreground font-bold">VS</div>
                <h3 className="text-xl font-bold text-accent text-center">{driverB.name}</h3>
            </div>
            <Separator />
            <div className="space-y-2">
              <TaleOfTheTapeStat
                label="iRating"
                valueA={driverA.currentIRating.toLocaleString('en-US')}
                valueB={driverB.currentIRating.toLocaleString('en-US')}
                highlight={driverA.currentIRating > driverB.currentIRating ? 'A' : 'B'}
              />
              <TaleOfTheTapeStat
                label="Safety Rating"
                valueA={driverA.currentSafetyRating}
                valueB={driverB.currentSafetyRating}
                highlight={'NONE'}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {commonRaces.length > 0 && (
        <section>
          <CommonRacesTable commonRaces={commonRaces} driverAName={driverA.name} driverBName={driverB.name} />
        </section>
      )}
      
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Performance History</h2>
        <div className="grid gap-4">
            <ComparisonHistoryChart
                seriesA={{ name: driverA.name, data: driverA.iratingHistory, color: '--primary' }}
                seriesB={{ name: driverB.name, data: driverB.iratingHistory, color: '--accent' }}
                title="iRating History"
                description="Side-by-side iRating progression."
                yAxisFormatter={(value) => value.toLocaleString('en-US')}
            />
            <ComparisonHistoryChart
                seriesA={{ name: driverA.name, data: driverA.safetyRatingHistory, color: '--primary' }}
                seriesB={{ name: driverB.name, data: driverB.safetyRatingHistory, color: '--accent' }}
                title="Safety Rating History"
                description="Side-by-side Safety Rating progression."
                yAxisFormatter={(value) => value.toFixed(2)}
            />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">AI Head-to-Head</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Bot className="w-5 h-5" /> AI-Powered Comparison</CardTitle>
            <CardDescription>
              Get an AI-generated comparison of these drivers, including an analysis of any races they've competed in together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[6rem] p-4 rounded-lg bg-background/50 flex items-center justify-center">
              {analysis?.summary && !isPending && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
              )}
              {analysis?.error && !isPending && (
                  <p className="text-destructive">{analysis.error}</p>
              )}
              {isPending && (
                  <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                  </div>
              )}
              {!analysis && !isPending && (
                  <p className="text-sm text-muted-foreground">Click the button to generate a head-to-head analysis.</p>
              )}
            </div>

            <Button onClick={handleAnalysis} disabled={isPending} className="mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Analyzing...' : 'Analyze Head-to-Head'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
