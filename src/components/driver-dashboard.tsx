'use client';

import { useState, useTransition, useMemo } from 'react';
import { Bot, Loader2, Rocket, ShieldCheck, Timer, TrendingUp } from 'lucide-react';
import { type Driver } from '@/lib/mock-data';
import { StatCard } from './stat-card';
import { HistoryChart } from './history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecentRaces } from './recent-races';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

export default function DriverDashboard({ driver }: { driver: Driver }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);
  const [timeRange, setTimeRange] = useState('all');

  const [category, setCategory] = useState('all');
  const [year, setYear] = useState('all');
  const [season, setSeason] = useState('all');

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

  const { years, seasons, categories } = useMemo(() => {
    const years = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.year.toString()))).sort((a,b) => Number(b) - Number(a))];
    const seasons = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.season)))];
    const categories = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.category)))];
    return { years, seasons, categories };
  }, [driver]);

  const filteredRaces = useMemo(() => {
    return driver.recentRaces.filter(race => {
      const categoryMatch = category === 'all' || race.category === category;
      const yearMatch = year === 'all' || race.year.toString() === year;
      const seasonMatch = season === 'all' || race.season === season;
      return categoryMatch && yearMatch && seasonMatch;
    });
  }, [driver.recentRaces, category, year, season]);

  const filteredData = useMemo(() => {
    const sliceData = (data: any[]) => {
      if (timeRange === 'all') return data;
      return data.slice(-parseInt(timeRange, 10));
    };

    return {
      iratingHistory: sliceData(driver.iratingHistory),
      safetyRatingHistory: sliceData(driver.safetyRatingHistory),
      racePaceHistory: sliceData(driver.racePaceHistory),
    };
  }, [driver, timeRange]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Current Stats for {driver.name}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="iRating" value={driver.currentIRating.toLocaleString('en-US')} icon={TrendingUp} description="Driver skill rating" />
          <StatCard title="Safety Rating" value={driver.currentSafetyRating} icon={ShieldCheck} description="On-track cleanliness" />
          <StatCard title="Avg. Race Pace" value={driver.avgRacePace} icon={Timer} description="Typical lap time" />
        </div>
      </section>
      
      <section>
        <Tabs defaultValue="all" onValueChange={setTimeRange} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-headline font-bold tracking-tight">Performance History</h2>
            <TabsList>
              <TabsTrigger value="3">3 Months</TabsTrigger>
              <TabsTrigger value="6">6 Months</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </div>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <HistoryChart
              data={filteredData.iratingHistory}
              title="iRating History"
              description="Progression over the selected period."
              dataKey="value"
              color="--primary"
              yAxisFormatter={(value) => value.toLocaleString('en-US')}
            />
            <HistoryChart
              data={filteredData.safetyRatingHistory}
              title="Safety Rating History"
              description="Progression over the selected period."
              dataKey="value"
              color="--chart-2"
              yAxisFormatter={(value) => value.toFixed(2)}
            />
            <div className="lg:col-span-2">
              <HistoryChart
                data={filteredData.racePaceHistory}
                title="Race Pace History"
                description="Average lap time progression (lower is better)."
                dataKey="value"
                color="--chart-4"
                yAxisFormatter={formatRacePace}
              />
            </div>
          </div>
        </Tabs>
      </section>

      <section>
         <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Races</CardTitle>
            <CardDescription>Filter and review recent race performance. Click a race for full details.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <div className="flex flex-col md:flex-row gap-4">
              <div className='flex-1'>
                <label className='text-sm font-medium'>Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className='flex-1'>
                <label className='text-sm font-medium'>Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y === 'all' ? 'All Years' : y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
               <div className='flex-1'>
                <label className='text-sm font-medium'>Season</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{seasons.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Seasons' : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <RecentRaces races={filteredRaces} />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">AI Analysis</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline"><Bot className="w-5 h-5" /> AI-Powered Analysis</CardTitle>
            <CardDescription>
              Get an AI-generated summary of this driver's strengths and weaknesses based on their historical data and recent races.
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
