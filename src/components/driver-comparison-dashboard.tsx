'use client';

import { useState, useTransition } from 'react';
import { Bot, Loader2, ShieldCheck, TrendingUp, User, Users } from 'lucide-react';
import { type Driver } from '@/lib/mock-data';
import { StatCard } from './stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getComparisonAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { ComparisonHistoryChart } from './comparison-history-chart';

function StatRow({ title, valueA, valueB, icon }: { title: string, valueA: string | number, valueB: string | number, icon: React.ElementType }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center text-center p-4 border-b md:border-b-0 md:border-r last:border-0">
      <Icon className="w-6 h-6 text-muted-foreground mb-2" />
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-4 w-full mt-2 items-center">
        <p className="text-xl font-bold text-primary">{valueA}</p>
        <p className="text-xl font-bold text-accent">{valueB}</p>
      </div>
    </div>
  )
}

export default function DriverComparisonDashboard({ driverA, driverB }: { driverA: Driver; driverB: Driver }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);

  const handleAnalysis = () => {
    startTransition(async () => {
      const result = await getComparisonAnalysis(driverA, driverB);
      setAnalysis(result);
    });
  };

  const formatRacePace = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Users className="w-6 h-6"/>
              Tale of the Tape
            </CardTitle>
             <div className="grid grid-cols-2 gap-4 w-full items-center pt-2">
                <h3 className="text-lg font-bold text-primary text-center">{driverA.name}</h3>
                <h3 className="text-lg font-bold text-accent text-center">{driverB.name}</h3>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2">
                <StatCard title={driverA.name} value={driverA.currentIRating.toLocaleString('en-US')} icon={TrendingUp} description="iRating" />
                <StatCard title={driverB.name} value={driverB.currentIRating.toLocaleString('en-US')} icon={TrendingUp} description="iRating" />
                 <StatCard title={driverA.name} value={driverA.currentSafetyRating} icon={ShieldCheck} description="Safety Rating" />
                <StatCard title={driverB.name} value={driverB.currentSafetyRating} icon={ShieldCheck} description="Safety Rating" />
            </div>
          </CardContent>
        </Card>
      </section>
      
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
              Get an AI-generated comparison of these drivers based on their historical data and recent races.
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
