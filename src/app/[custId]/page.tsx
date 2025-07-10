'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DriverDashboard from '@/components/driver-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTrackedDrivers } from '@/hooks/use-tracked-drivers';
import { useRecentProfiles } from '@/hooks/use-recent-profiles';
import { type Driver } from '@/lib/mock-data';
import { AppHeader } from '@/components/app-header';

export default function CustomerPage() {
  const params = useParams();
  const router = useRouter();
  const custId = params.custId as string;
  
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>('');
  
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

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, try to get driver info from our API
        const response = await fetch(`/api/driver/${custId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch driver data: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setDriverData(data.driver);
        setDriverName(data.driver?.name || `Driver ${custId}`);
        
        // Add to recent profiles if we have driver data
        if (data.driver?.name) {
          addRecentProfile({
            name: data.driver.name,
            custId: custId
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching driver data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (custId) {
      fetchDriverData();
    }
  }, [custId]);

  if (loading) {
    return (
      <main className="container mx-auto p-4 md:p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <AppHeader />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Loading Driver Data...</CardTitle>
            <CardDescription>Please wait while we fetch the driver information.</CardDescription>
          </CardHeader>
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

      <div className="max-w-2xl mx-auto mb-8">
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
                  <StarOff className="w-4 h-4 mr-2" />
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
