'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { Bot, Loader2, Users } from 'lucide-react';
import { type Driver, type RecentRace, type SearchedDriver } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getComparisonAnalysis } from '@/app/actions';
import { Skeleton } from './ui/skeleton';
import { ComparisonHistoryChart } from './comparison-history-chart';
import CommonRacesTable from './common-races-table';
import { Separator } from './ui/separator';
import { getDriverPageData } from '@/app/data-actions';
import { useToast } from '@/hooks/use-toast';

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

function ComparisonSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <section><Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card></section>
            <section><Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card></section>
            <section>
                <h2 className="text-2xl font-headline font-bold tracking-tight mb-4"><Skeleton className="h-8 w-64" /></h2>
                <div className="grid gap-4">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </section>
        </div>
    )
}

export default function DriverComparisonDashboard({ driverA: driverAInfo, driverB: driverBInfo }: { driverA: SearchedDriver; driverB: SearchedDriver }) {
  const { toast } = useToast();
  const [driverAData, setDriverAData] = useState<Driver | null>(null);
  const [driverBData, setDriverBData] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<{ summary: string | null; error: string | null } | null>(null);
  
  useEffect(() => {
    if (!driverAInfo || !driverBInfo) return;
    const fetchData = async () => {
        setIsLoading(true);
        setDriverAData(null);
        setDriverBData(null);

        const [resultA, resultB] = await Promise.all([
            getDriverPageData(driverAInfo.custId),
            getDriverPageData(driverBInfo.custId)
        ]);

        if (resultA.error || !resultA.data) {
            toast({ variant: 'destructive', title: `Error fetching data for ${driverAInfo.name}`, description: resultA.error });
        } else {
            setDriverAData(resultA.data);
        }

        if (resultB.error || !resultB.data) {
            toast({ variant: 'destructive', title: `Error fetching data for ${driverBInfo.name}`, description: resultB.error });
        } else {
            setDriverBData(resultB.data);
        }
        
        setIsLoading(false);
    }
    fetchData();
  }, [driverAInfo, driverBInfo, toast]);


  const handleAnalysis = () => {
    if (!driverAData || !driverBData) return;
    startTransition(async () => {
      const result = await getComparisonAnalysis(driverAData, driverBData);
      setAnalysis(result);
    });
  };

  const commonRaces = useMemo(() => {
    if (!driverAData || !driverBData) return [];
    const raceMapA = new Map(driverAData.recentRaces.map(r => [r.id, r]));
    const commonRacesData: CommonRace[] = driverBData.recentRaces
      .filter(raceB => raceMapA.has(raceB.id))
      .map(raceB => ({
        raceA: raceMapA.get(raceB.id)!,
        raceB: raceB,
      }));
    return commonRacesData;
  }, [driverAData, driverBData]);

  if (isLoading) {
    return <ComparisonSkeleton />;
  }

  if (!driverAData || !driverBData) {
    return (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>Could not load comparison data</CardTitle>
                <CardDescription>
                One or more drivers could not be found. Please try searching again.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

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
                <h3 className="text-xl font-bold text-primary text-center">{driverAData.name}</h3>
                <div className="text-sm text-muted-foreground font-bold">VS</div>
                <h3 className="text-xl font-bold text-accent text-center">{driverBData.name}</h3>
            </div>
            <Separator />
            <div className="space-y-2">
              <TaleOfTheTapeStat
                label="iRating"
                valueA={driverAData.currentIRating.toLocaleString('en-US')}
                valueB={driverBData.currentIRating.toLocaleString('en-US')}
                highlight={driverAData.currentIRating > driverBData.currentIRating ? 'A' : 'B'}
              />
              <TaleOfTheTapeStat
                label="Safety Rating"
                valueA={driverAData.currentSafetyRating}
                valueB={driverBData.currentSafetyRating}
                highlight={'NONE'}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {commonRaces.length > 0 && (
        <section>
          <CommonRacesTable commonRaces={commonRaces} driverAName={driverAData.name} driverBName={driverBData.name} />
        </section>
      )}
      
      <section>
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Performance History</h2>
        <div className="grid gap-4">
            <ComparisonHistoryChart
                seriesA={{ name: driverAData.name, data: driverAData.iratingHistory, color: '--primary' }}
                seriesB={{ name: driverBData.name, data: driverBData.iratingHistory, color: '--accent' }}
                title="iRating History"
                description="Side-by-side iRating progression."
                yAxisFormatter={(value) => value.toLocaleString('en-US')}
            />
            <ComparisonHistoryChart
                seriesA={{ name: driverAData.name, data: driverAData.safetyRatingHistory, color: '--primary' }}
                seriesB={{ name: driverBData.name, data: driverBData.safetyRatingHistory, color: '--accent' }}
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

            <Button onClick={handleAnalysis} disabled={isPending || !driverAData || !driverBData} className="mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Analyzing...' : 'Analyze Head-to-Head'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
