'use client';

import { useState, useTransition, useMemo, useEffect, useCallback } from 'react';
import { Bot, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import { type Driver, type HistoryPoint } from '@/lib/mock-data';
import { StatCard } from './stat-card';
import { HistoryChart } from './history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { RecentRaces } from './recent-races';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { lapTimeToSeconds } from '@/lib/utils';
import SeriesPerformanceSummary from './series-performance-summary';
import { getDriverPageData } from '../app/data-actions';
import { useToast } from '@/hooks/use-toast';

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4"><Skeleton className="h-8 w-48" /></h2>
        <Card className="mb-4">
          <CardContent className='p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4"><Skeleton className="h-8 w-64" /></h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <div className="lg:col-span-2"><Skeleton className="h-80 w-full" /></div>
        </div>
      </section>
      <section>
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </section>
    </div>
  )
}


export default function DriverDashboard({ custId, driverName }: { custId: number; driverName: string }) {
  const { toast } = useToast();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);

  const [category, setCategory] = useState('all');
  const [year, setYear] = useState('all');
  const [season, setSeason] = useState('all');
  const [track, setTrack] = useState('all');
  const [car, setCar] = useState('all');

  useEffect(() => {
    if (!custId) return;
    const fetchData = async () => {
        setIsLoading(true);
        setDriver(null);
        const { data, error } = await getDriverPageData(custId);
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching driver data', description: error });
        } else {
            setDriver(data);
            
            // Set default filters to most recent/most common values
            if (data && data.recentRaces.length > 0) {
              // Get the most recent year
              const mostRecentYear = Math.max(...data.recentRaces.map(r => r.year)).toString();
              
              // Get the most recent season from the most recent year
              const racesByYear = data.recentRaces.filter(r => r.year.toString() === mostRecentYear);
              const racesByYearSorted = racesByYear.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const mostRecentSeason = racesByYearSorted.length > 0 ? racesByYearSorted[0].season : 'all';
              
              // Get the most raced category
              const categoryCount = data.recentRaces.reduce((acc, race) => {
                acc[race.category] = (acc[race.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const mostRacedCategory = Object.entries(categoryCount).reduce((a, b) => 
                categoryCount[a[0]] > categoryCount[b[0]] ? a : b
              )[0];
              
              setYear(mostRecentYear);
              setSeason(mostRecentSeason);
              setCategory(mostRacedCategory);
            }
        }
        setIsLoading(false);
    }
    fetchData();
  }, [custId, toast]);


  const handleAnalysis = () => {
    if (!driver) return;
    startTransition(async () => {
      const result = await getAnalysis(driver);
      setAnalysis(result);
    });
  };

  const formatRacePace = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  }, []);

  // Memoize master lists for filters that don't change
  const { allYears, allCategories, allSeasons } = useMemo(() => {
    if (!driver) return { allYears: ['all'], allCategories: ['all'], allSeasons: ['all'] };
    const races = driver.recentRaces;
    const years = ['all', ...Array.from(new Set(races.map(r => r.year.toString()))).sort((a, b) => Number(b) - Number(a))];
    const categories = ['all', ...Array.from(new Set(races.map(r => r.category)))];
    const seasons = ['all', ...Array.from(new Set(races.map(r => r.season)))];
    return { allYears: years, allCategories: categories, allSeasons: seasons };
  }, [driver]);

  // Kaskading Filter Logic
  const availableSeasons = useMemo(() => {
    if (year === 'all' || !driver) return allSeasons;
    return ['all', ...Array.from(new Set(driver.recentRaces.filter(r => r.year.toString() === year).map(r => r.season)))];
  }, [year, driver, allSeasons]);

  const { availableTracks, availableCars } = useMemo(() => {
    if (!driver) return { availableTracks: ['all'], availableCars: ['all'] };
    const relevantRaces = driver.recentRaces.filter(race => {
      const yearMatch = year === 'all' || race.year.toString() === year;
      const seasonMatch = season === 'all' || race.season === season;
      const categoryMatch = category === 'all' || race.category === category;
      return yearMatch && seasonMatch && categoryMatch;
    });
    const tracks = ['all', ...Array.from(new Set(relevantRaces.map(r => r.trackName)))];
    const cars = ['all', ...Array.from(new Set(relevantRaces.map(r => r.car)))];
    return { availableTracks: tracks, availableCars: cars };
  }, [driver, year, season, category]);

  // Reset dependent filters when a broader filter changes
  useEffect(() => {
    setSeason('all');
  }, [year]);

  useEffect(() => {
    setTrack('all');
    setCar('all');
  }, [year, season, category]);


  const filteredRaces = useMemo(() => {
    if (!driver) return [];
    return driver.recentRaces.filter(race => {
      const categoryMatch = category === 'all' || race.category === category;
      const yearMatch = year === 'all' || race.year.toString() === year;
      const seasonMatch = season === 'all' || race.season === season;
      const trackMatch = track === 'all' || race.trackName === track;
      const carMatch = car === 'all' || race.car === car;
      return categoryMatch && yearMatch && seasonMatch && trackMatch && carMatch;
    });
  }, [driver, category, year, season, track, car]);

  const areFiltersActive = useMemo(() => year !== 'all' || season !== 'all' || category !== 'all' || track !== 'all' || car !== 'all', [year, season, category, track, car]);

  const filteredStats = useMemo(() => {
    if (!driver) return { iRating: 'N/A' };
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
    if (!driver) return { iratingHistory: [], safetyRatingHistory: [], racePaceHistory: [] };
    
    // iRating and Safety Rating history should always show the full progression
    // Only filter them if no filters are active at all
    const shouldFilterHistoryCharts = !areFiltersActive;
    
    const filterByDate = (data: HistoryPoint[]) => {
      if (shouldFilterHistoryCharts) return data;
      const getMonthFromDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const yearNum = year !== 'all' ? parseInt(year, 10) : null;
      
      const relevantMonths = new Set(
        filteredRaces.map(r => getMonthFromDate(r.date))
      );

      return data.filter(h => relevantMonths.has(h.month) && (!yearNum || driver.recentRaces.some(r => r.year === yearNum && getMonthFromDate(r.date) === h.month)));
    };

    let racePaceData: HistoryPoint[];
    const trackOrCarFilterActive = track !== 'all' || car !== 'all';
    
    if (trackOrCarFilterActive && filteredRaces.length > 0) {
      racePaceData = [...filteredRaces]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(race => ({
          month: new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
          value: lapTimeToSeconds(race.avgLapTime)
        }));
    } else {
      racePaceData = filterByDate(driver.racePaceHistory);
    }

    return {
      // Always show full progression for iRating and Safety Rating history
      iratingHistory: driver.iratingHistory,
      safetyRatingHistory: driver.safetyRatingHistory,
      racePaceHistory: racePaceData,
    };
  }, [driver, filteredRaces, areFiltersActive, year, track, car]);

  const racePaceChartDescription = useMemo(() => {
    const trackOrCarFilterActive = track !== 'all' || car !== 'all';
    if (trackOrCarFilterActive) {
      return `Pace for selected combination. Each point is a race.`;
    }
    return "Average lap time progression (lower is better)."
  }, [track, car]);

  const seriesPerformanceStats = useMemo(() => {
    if (!driver || filteredRaces.length === 0) {
      return [];
    }

    const statsBySeries = filteredRaces.reduce((acc, race) => {
      const seriesName = race.car;
      if (!acc[seriesName]) {
        acc[seriesName] = {
          car: seriesName,
          raceCount: 0,
          totalIRatingChange: 0,
          totalSRChange: 0,
        };
      }

      acc[seriesName].raceCount += 1;
      acc[seriesName].totalIRatingChange += race.iratingChange;
      acc[seriesName].totalSRChange += typeof race.safetyRatingChange === 'string' ? (parseFloat(race.safetyRatingChange) || 0) : race.safetyRatingChange;

      return acc;
    }, {} as Record<string, { car: string; raceCount: number; totalIRatingChange: number; totalSRChange: number }>);

    return Object.values(statsBySeries).sort((a, b) => b.raceCount - a.raceCount);
  }, [filteredRaces, driver]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }
  
  if (!driver) {
    return (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>Could not load driver data</CardTitle>
                <CardDescription>
                Please try searching again or check your iRacing credentials in .env.local.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }


  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Stats for {driver.name}</h2>
         <Card className="mb-4">
          <CardContent className='p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
              <div>
                <label className='text-sm font-medium'>Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allYears.map(y => <SelectItem key={y} value={y}>{y === 'all' ? 'All Years' : y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
               <div>
                <label className='text-sm font-medium'>Season</label>
                <Select value={season} onValueChange={setSeason} disabled={year === 'all'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{availableSeasons.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Seasons' : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className='text-sm font-medium'>Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className='text-sm font-medium'>Track</label>
                <Select value={track} onValueChange={setTrack}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{availableTracks.map(t => <SelectItem key={t} value={t}>{t === 'all' ? 'All Tracks' : t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className='text-sm font-medium'>Car</label>
                <Select value={car} onValueChange={setCar}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{availableCars.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'All Cars' : c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="iRating" value={filteredStats.iRating} icon={TrendingUp} description={areFiltersActive ? "Based on latest filtered race" : "Driver skill rating"} />
          <StatCard title="Safety Rating" value={driver.currentSafetyRating} icon={ShieldCheck} description={areFiltersActive ? "Overall safety rating" : "On-track cleanliness"} />
        </div>
      </section>
      
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Performance History</h2>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <HistoryChart
            data={filteredHistory.iratingHistory}
            title="iRating History"
            description="Full progression over time (unfiltered)."
            dataKey="value"
            color="--primary"
            yAxisFormatter={(value) => value.toLocaleString('en-US')}
          />
          <HistoryChart
            data={filteredHistory.safetyRatingHistory}
            title="Safety Rating History"
            description="Full progression over time (unfiltered)."
            dataKey="value"
            color="--chart-2"
            yAxisFormatter={(value) => value.toFixed(2)}
          />
          <div className="lg:col-span-2">
            <HistoryChart
              data={filteredHistory.racePaceHistory}
              title="Race Pace History"
              description={racePaceChartDescription}
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
            <RecentRaces races={filteredRaces} driverId={custId} />
          </CardContent>
        </Card>
      </section>
      
      <section>
        <SeriesPerformanceSummary seriesStats={seriesPerformanceStats} />
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

            <Button onClick={handleAnalysis} disabled={isPending || !driver} className="mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
