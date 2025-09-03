'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DebugData {
  timestamp: string;
  custId: number;
  driverName: string;
  rawData: {
    driver: {
      name: string;
      currentIRating: number;
      recentRacesCount: number;
    };
    racesAnalysis: {
      totalRaces: number;
      categoryDistribution: Record<string, number>;
      seriesDistribution: Record<string, number>;
      lapTimeDistribution: {
        withFastestLap: number;
        withParticipants: number;
        withValidParticipantLaps: number;
      };
      sampleRaces: Array<{
        id: string;
        trackName: string;
        category: string;
        categoryType: string;
        seriesName: string;
        car: string;
        fastestLap: string;
        participants: number;
        hasValidParticipants: boolean;
      }>;
    };
  };
  transformation: {
    input: {
      racesProvided: number;
      firstThreeRaces: any[];
    };
    output: {
      personalBests: any;
      context: any;
      errors: string[];
      warnings: string[];
    };
    metrics: {
      racesProcessed: number;
      racesIgnored: number;
      seriesGenerated: number;
      trackLayoutsGenerated: number;
      carBestsGenerated: number;
    };
  };
  failures: {
    ignoredRaces: any[];
    errors: string[];
    warnings: string[];
    potentialCauses: {
      noValidLapTimes: boolean;
      noParticipants: boolean;
      categoryIssues: boolean;
      emptyTrackNames: boolean;
    };
  };
}

export default function DebugPersonalBestsPage() {
  const params = useParams();
  const custId = Number(params.custId);
  const [data, setData] = useState<DebugData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/debug-personal-bests?custId=${custId}`);
        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error || 'Failed to fetch debug data');
          return;
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (!Number.isNaN(custId)) {
      fetchDebugData();
    }
  }, [custId]);

  if (loading) {
    return (
      <main className="container mx-auto p-4 md:p-8">
        <AppHeader subtitle="Loading debug data..." />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container mx-auto p-4 md:p-8">
        <AppHeader subtitle="Personal Bests Debug" />
        <Alert>
          <AlertTitle>Debug Error</AlertTitle>
          <AlertDescription>{error || 'No debug data available'}</AlertDescription>
        </Alert>
        <Link href={`/${custId}`}>
          <Button variant="outline" className="mt-4">
            Back to Dashboard
          </Button>
        </Link>
      </main>
    );
  }

  const { rawData, transformation, failures } = data;

  return (
    <main className="container mx-auto p-4 md:p-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <AppHeader subtitle={`Personal Bests Debug - ${data.driverName}`} />
      
      <div className="mb-6 flex gap-2">
        <Link href={`/${custId}`}>
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
        <Link href={`/personal-bests/${custId}`}>
          <Button variant="outline">
            View Personal Bests
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Executive Summary
              <Badge variant={transformation.metrics.seriesGenerated > 0 ? "default" : "destructive"}>
                {transformation.metrics.seriesGenerated > 0 ? "SUCCESS" : "FAILURE"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Debug analysis for custId {data.custId} at {new Date(data.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{rawData.racesAnalysis.totalRaces}</div>
                <div className="text-sm text-muted-foreground">Total Races</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{transformation.metrics.racesProcessed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{transformation.metrics.seriesGenerated}</div>
                <div className="text-sm text-muted-foreground">Series Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{transformation.output.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Issues */}
        {Object.values(failures.potentialCauses).some(Boolean) && (
          <Alert>
            <AlertTitle>⚠️ Potential Issues Detected</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {failures.potentialCauses.noValidLapTimes && (
                  <div>• No races have valid fastest lap times</div>
                )}
                {failures.potentialCauses.noParticipants && (
                  <div>• No races have participant data</div>
                )}
                {failures.potentialCauses.categoryIssues && (
                  <div>• Some races have undefined/invalid categories</div>
                )}
                {failures.potentialCauses.emptyTrackNames && (
                  <div>• Some races have empty track names</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Raw Data Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Raw Data Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Driver Information</h4>
              <div className="text-sm space-y-1">
                <div>Name: {rawData.driver.name}</div>
                <div>iRating: {rawData.driver.currentIRating}</div>
                <div>Recent Races Count: {rawData.driver.recentRacesCount}</div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Category Distribution</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(rawData.racesAnalysis.categoryDistribution).map(([category, count]) => (
                  <div key={category} className="flex justify-between">
                    <span>{category || 'undefined'}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Lap Time Analysis</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold">{rawData.racesAnalysis.lapTimeDistribution.withFastestLap}</div>
                  <div className="text-muted-foreground">With Fastest Lap</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{rawData.racesAnalysis.lapTimeDistribution.withParticipants}</div>
                  <div className="text-muted-foreground">With Participants</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{rawData.racesAnalysis.lapTimeDistribution.withValidParticipantLaps}</div>
                  <div className="text-muted-foreground">Valid Participant Laps</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Race Data */}
        <Card>
          <CardHeader>
            <CardTitle>🏁 Sample Race Data</CardTitle>
            <CardDescription>First 3 races from recent races data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rawData.racesAnalysis.sampleRaces.map((race, index) => (
                <div key={race.id} className="border rounded p-3">
                  <div className="font-semibold mb-2">Race {index + 1}: {race.trackName}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Series: {race.seriesName}</div>
                    <div>Car: {race.car}</div>
                    <div>Category: {race.category} ({race.categoryType})</div>
                    <div>Fastest Lap: {race.fastestLap}</div>
                    <div>Participants: {race.participants}</div>
                    <div>Valid Laps: {race.hasValidParticipants ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transformation Results */}
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Transformation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold">{transformation.metrics.racesProcessed}</div>
                  <div className="text-muted-foreground">Races Processed</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{transformation.metrics.racesIgnored}</div>
                  <div className="text-muted-foreground">Races Ignored</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{transformation.metrics.seriesGenerated}</div>
                  <div className="text-muted-foreground">Series Generated</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{transformation.metrics.trackLayoutsGenerated}</div>
                  <div className="text-muted-foreground">Track Layouts</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{transformation.metrics.carBestsGenerated}</div>
                  <div className="text-muted-foreground">Car Bests</div>
                </div>
              </div>
            </div>

            {transformation.output.errors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Transformation Errors</h4>
                  <div className="space-y-1">
                    {transformation.output.errors.map((error, index) => (
                      <div key={index} className="text-sm bg-red-50 dark:bg-red-950 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {transformation.output.warnings.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-yellow-600">Warnings</h4>
                  <div className="space-y-1">
                    {transformation.output.warnings.map((warning, index) => (
                      <div key={index} className="text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Raw JSON Data */}
        <Card>
          <CardHeader>
            <CardTitle>📄 Raw Debug Data</CardTitle>
            <CardDescription>Complete debug response for technical analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}