'use client';

import { useState, useTransition } from 'react';
import { Rocket, ShieldCheck, Timer, TrendingUp, Bot, Loader2 } from 'lucide-react';
import { type Driver } from '@/lib/mock-data';
import { StatCard } from './stat-card';
import { HistoryChart } from './history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';

export default function DriverDashboard({ driver }: { driver: Driver }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);

  const handleAnalysis = () => {
    startTransition(async () => {
      const result = await getAnalysis(driver);
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
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Current Stats for {driver.name}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="iRating" value={driver.currentIRating.toLocaleString()} icon={TrendingUp} description="Driver skill rating" />
          <StatCard title="Safety Rating" value={driver.currentSafetyRating} icon={ShieldCheck} description="On-track cleanliness" />
          <StatCard title="Avg. Race Pace" value={driver.avgRacePace} icon={Timer} description="Typical lap time" />
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Performance History</h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <HistoryChart
            data={driver.iratingHistory}
            title="iRating History"
            description="Progression over the last 7 months."
            dataKey="value"
            color="--primary"
            yAxisFormatter={(value) => value.toLocaleString()}
          />
          <HistoryChart
            data={driver.safetyRatingHistory}
            title="Safety Rating History"
            description="Progression over the last 7 months."
            dataKey="value"
            color="--chart-2"
            yAxisFormatter={(value) => value.toFixed(2)}
          />
          <div className="lg:col-span-2">
            <HistoryChart
              data={driver.racePaceHistory}
              title="Race Pace History"
              description="Average lap time progression (lower is better)."
              dataKey="value"
              color="--chart-4"
              yAxisFormatter={formatRacePace}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">AI Analysis</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Bot className="w-5 h-5" /> AI-Powered Analysis</CardTitle>
            <CardDescription>
              Get an AI-generated summary of this driver's strengths and weaknesses based on their historical data.
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
                  <p className="text-sm text-muted-foreground">Click the button to generate an analysis.</p>
              )}
            </div>

            <Button onClick={handleAnalysis} disabled={isPending} className="mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
