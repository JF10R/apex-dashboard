'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import DriverDashboard from '@/components/driver-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTrackedDrivers } from '@/hooks/use-tracked-drivers';
import { useRecentProfiles } from '@/hooks/use-recent-profiles';
import { type Driver } from '@/lib/iracing-types';
import { AppHeader } from '@/components/app-header';
import { CacheStatus } from '@/components/cache-status';
import { cacheKeys } from '@/lib/cache';

export default function CustomerPage() {
  const params = useParams();
  const router = useRouter();
  const custId = params.custId as string;
  
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>('');
  const [cacheInfo, setCacheInfo] = useState<{
    fromCache: boolean;
    cacheAge?: string;
    warning?: string;
  }>({
    fromCache: false
  });
  const [loadingStage, setLoadingStage] = useState<{
    stage: string;
    progress: number;
    description: string;
  }>({
    stage: 'initializing',
    progress: 0,
    description: 'Initializing request...'
  });
  
  const { addTrackedDriver, removeTrackedDriver, isDriverTracked } = useTrackedDrivers();
  const { addRecentProfile } = useRecentProfiles();

  const handleToggleTracking = () => {
    if (driverData) {
      const driver = {
        name: driverData.name,
        custId: driverData.id
      };
      
      if (isDriverTracked(driverData.id)) {
        removeTrackedDriver(driverData.id);
      } else {
        addTrackedDriver(driver);
      }
    }
  };

  const fetchDriverData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      setCacheInfo({ fromCache: false }); // Reset cache info

      // Stage 1: Initializing
      setLoadingStage({
        stage: 'initializing',
        progress: 10,
        description: 'Preparing driver data request...'
      });

      // Small delay to show the first stage
      await new Promise(resolve => setTimeout(resolve, 200));

      // Stage 2: Fetching basic data
      setLoadingStage({
        stage: 'fetching',
        progress: 30,
        description: `Fetching data for driver ${custId}...`
      });

      // Pass forceRefresh parameter to the API
      const url = `/api/driver/${custId}${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      
      // Stage 3: Processing response
      setLoadingStage({
        stage: 'processing',
        progress: 60,
        description: 'Processing driver information...'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch driver data: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Update cache info
      setCacheInfo({
        fromCache: data.fromCache || false,
        cacheAge: data.cacheAge,
        warning: data.warning
      });

      // Stage 4: Finalizing
      setLoadingStage({
        stage: 'finalizing',
        progress: 90,
        description: 'Finalizing driver profile...'
      });

      // Small delay to show finalization
      await new Promise(resolve => setTimeout(resolve, 300));

      setDriverData(data.driver);
      const finalDriverName = data.driver?.name || `Driver ${custId}`;
      setDriverName(finalDriverName);
      
      // Add to recent profiles with the name (either actual or fallback)
      addRecentProfile({
        name: finalDriverName,
        custId: custId
      });

      // Stage 5: Complete
      setLoadingStage({
        stage: 'complete',
        progress: 100,
        description: 'Driver data loaded successfully!'
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching driver data:', err);
    } finally {
      setLoading(false);
    }
  }, [custId]); // Remove addRecentProfile from dependencies

  useEffect(() => {
    if (custId) {
      fetchDriverData();
    }
  }, [custId]); // Remove fetchDriverData from dependencies to prevent infinite loop

  // Update document title when driver data is loaded
  useEffect(() => {
    if (driverData?.name) {
      document.title = `${driverData.name} - Apex Stats`;
    } else if (driverName) {
      document.title = `${driverName} - Apex Stats`;
    } else {
      document.title = `Driver ${custId} - Apex Stats`;
    }
  }, [driverData, driverName, custId]);

  if (loading) {
    return (
      <main className="container mx-auto p-4 md:p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <AppHeader />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading Driver Data
            </CardTitle>
            <CardDescription>{loadingStage.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={loadingStage.progress} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="capitalize">{loadingStage.stage}</span>
                <span>{Math.round(loadingStage.progress)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-4 md:p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <AppHeader />
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Alert>
            <AlertDescription>
              Error loading driver data: {error}
            </AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 md:p-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AppHeader subtitle={`Driver profile for ${driverName}`} />

      {/* Display cache warning if data is from cache due to rate limiting */}
      {cacheInfo.fromCache && cacheInfo.warning && (
        <div className="max-w-2xl mx-auto mb-4">
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Using cached data:</strong> {cacheInfo.warning}
              {cacheInfo.cacheAge && (
                <span className="block mt-1 text-sm">
                  Data age: {cacheInfo.cacheAge}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="max-w-2xl mx-auto mb-8">
        {/* Cache status and refresh button */}
        <div className="flex items-center justify-center mb-4">
          <CacheStatus
            cacheKey={cacheKeys.driver(custId)}
            onRefresh={() => fetchDriverData(true)}
            isLoading={loading}
          />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
          {driverData && (
            <Button
              variant={isDriverTracked(driverData.id) ? "default" : "outline"}
              onClick={handleToggleTracking}
            >
              {isDriverTracked(driverData.id) ? (
                <>
                  <Star className="w-4 h-4 mr-2 fill-current" />
                  Untrack Driver
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Track Driver
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        <DriverDashboard custId={parseInt(custId)} driverName={driverName} />
      </div>
    </main>
  );
}
