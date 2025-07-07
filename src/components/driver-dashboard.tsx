'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { Bot, Loader2, Rocket, ShieldCheck, Timer, TrendingUp } from 'lucide-react';
import { type Driver, type HistoryPoint } from '@/lib/mock-data';
import { StatCard } from './stat-card';
import { HistoryChart } from './history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { RecentRaces } from './recent-races';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

export default function DriverDashboard({ driver }: { driver: Driver }) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);

  const [category, setCategory] = useState('all');
  const [year, setYear] = useState('all');
  const [season, setSeason] = useState('all');
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

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

  // Memoize all possible filter values from the full dataset
  const { allYears, allSeasons, allCategories } = useMemo(() => {
    const years = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.year.toString()))).sort((a,b) => Number(b) - Number(a))];
    const seasons = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.season)))];
    const categories = ['all', ...Array.from(new Set(driver.recentRaces.map(r => r.category)))];
    return { allYears: years, allSeasons: seasons, allCategories: categories };
  }, [driver]);

  // Update available seasons when the selected year changes
  useEffect(() => {
    if (year === 'all') {
      setAvailableSeasons(allSeasons);
    } else {
      const seasonsInYear = ['all', ...Array.from(new Set(driver.recentRaces
        .filter(r => r.year.toString() === year)
        .map(r => r.season)
      ))];
      setAvailableSeasons(seasonsInYear);
    }
    // Reset season selection when year changes
    setSeason('all');
  }, [year, driver.recentRaces, allSeasons]);

  const filteredRaces = useMemo(() => {
    return driver.recentRaces.filter(race => {
      const categoryMatch = category === 'all' || race.category === category;
      const yearMatch = year === 'all' || race.year.toString() === year;
      const seasonMatch = season === 'all' || race.season === season;
      return categoryMatch && yearMatch && seasonMatch;
    });
  }, [driver.recentRaces, category, year, season]);

  const areFiltersActive = useMemo(() => year !== 'all' || season !== 'all' || category !== 'all', [year, season, category]);

  const filteredStats = useMemo(() => {
    if (!areFiltersActive) {
      return {
        iRating: driver.currentIRating.toLocaleString('en-US'),
      };
    }
    if (filteredRaces.length === 0) {
      return { iRating: 'N/A' };
    }

    const sortedRaces = [...filteredRaces].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestRace = sortedRaces[0];
    const driverParticipant = latestRace.participants.find(p => p.name === driver.name);
    const iRating = driverParticipant ? driverParticipant.irating : driver.currentIRating;

    return {
      iRating: iRating.toLocaleString('en-US'),
    };
  }, [filteredRaces, driver, areFiltersActive]);


  const filteredHistory = useMemo(() => {
    const filterByDate = (data: HistoryPoint[]) => {
      if (!areFiltersActive) return data;
      const getMonthFromDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const yearNum = year !== 'all' ? parseInt(year, 10) : null;
      
      const relevantMonths = new Set(
        filteredRaces.map(r => getMonthFromDate(r.date))
      );

      return data.filter(h => relevantMonths.has(h.month) && (!yearNum || driver.recentRaces.some(r => r.year === yearNum && getMonthFromDate(r.date) === h.month)));
    };

    return {
      iratingHistory: filterByDate(driver.iratingHistory),
      safetyRatingHistory: filterByDate(driver.safetyRatingHistory),
      racePaceHistory: filterByDate(driver.racePaceHistory),
    };
  }, [driver, filteredRaces, areFiltersActive, year]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Stats for {driver.name}</h2>
         <Card className="mb-4">
          <CardContent className='p-4 flex flex-col md:flex-row gap-4'>
              <div className='flex-1'>
                <label className='text-sm font-medium'>Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allYears.map(y => <SelectItem key={y} value={y}>{y === 'all' ? 'All Years' : y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
               <div className='flex-1'>
                <label className='text-sm font-medium'>Season</label>
                <Select value={season} onValueChange={setSeason} disabled={year === 'all'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{availableSeasons.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Seasons' : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className='flex-1'>
                <label className='text-sm font-medium'>Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="iRating" value={filteredStats.iRating} icon={TrendingUp} description={areFiltersActive ? "Based on latest filtered race" : "Driver skill rating"} />
          <StatCard title="Safety Rating" value={driver.currentSafetyRating} icon={ShieldCheck} description={areFiltersActive ? "Overall safety rating" : "On-track cleanliness"} />
          <StatCard title="Avg. Race Pace" value={driver.avgRacePace} icon={Timer} description={areFiltersActive ? "Overall average pace" : "Typical lap time"} />
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Performance History</h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <HistoryChart
            data={filteredHistory.iratingHistory}
            title="iRating History"
            description="Progression over the selected period."
            dataKey="value"
            color="--primary"
            yAxisFormatter={(value) => value.toLocaleString('en-US')}
          />
          <HistoryChart
            data={filteredHistory.safetyRatingHistory}
            title="Safety Rating History"
            description="Progression over the selected period."
            dataKey="value"
            color="--chart-2"
            yAxisFormatter={(value) => value.toFixed(2)}
          />
          <div className="lg:col-span-2">
            <HistoryChart
              data={filteredHistory.racePaceHistory}
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
         <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Races</CardTitle>
            <CardDescription>Filtered race performance. Click a race for full details.</CardDescription>
          </CardHeader>
          <CardContent>
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
