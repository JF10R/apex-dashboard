'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DriverDashboard from '@/components/driver-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { type Driver } from '@/lib/mock-data';

export default function CustomerPage() {
  const params = useParams();
  const router = useRouter();
  const custId = params.custId as string;
  
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string>('');

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
        <header className="flex flex-col items-center text-center mb-8">
          <Trophy className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
        </header>
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
        <header className="flex flex-col items-center text-center mb-8">
          <Trophy className="w-12 h-12 text-primary mb-2" />
          <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
        </header>
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
      <header className="flex flex-col items-center text-center mb-8">
        <Trophy className="w-12 h-12 text-primary mb-2" />
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
        <p className="text-muted-foreground mt-2">Driver profile for {driverName}</p>
      </header>

      <div className="max-w-2xl mx-auto mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>
      </div>

      <div className="animate-in fade-in duration-500">
        <DriverDashboard custId={parseInt(custId)} driverName={driverName} />
      </div>
    </main>
  );
}
