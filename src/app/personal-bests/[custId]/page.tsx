'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/app-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DriverPersonalBests } from '@/lib/personal-bests-types';
import { getPersonalBestsData } from '@/app/data-actions';
import { PersonalBestsSeriesSection } from '@/components/personal-bests-series-section';

export default function PersonalBestsPage() {
  const params = useParams();
  const custId = Number(params.custId);
  const [data, setData] = useState<DriverPersonalBests | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getPersonalBestsData(custId);
      if (result.error) {
        setError(result.error);
      }
      setData(result.data);
      setLoading(false);
    };
    if (!Number.isNaN(custId)) {
      fetchData();
    }
  }, [custId]);

  if (loading) {
    return (
      <main className="container mx-auto p-4 md:p-8">
        <AppHeader subtitle="Loading personal bests..." />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container mx-auto p-4 md:p-8">
        <AppHeader subtitle="Personal Bests" />
        <Alert>
          <AlertDescription>{error || 'No personal bests available'}</AlertDescription>
        </Alert>
        <Link href={`/${custId}`}>
          <Button variant="outline" className="mt-4">
            Back to Dashboard
          </Button>
        </Link>
      </main>
    );
  }

  const seriesList = Object.values(data.seriesBests);

  return (
    <main className="container mx-auto p-4 md:p-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AppHeader subtitle={`Personal Bests for ${data.driverName}`} />
      <div className="mb-4">
        <Link href={`/${custId}`}>
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="space-y-8">
        {seriesList.length === 0 ? (
          <Alert>
            <AlertDescription>
              No personal bests found yet. Personal bests will appear as you complete more races with valid lap timing data.
            </AlertDescription>
          </Alert>
        ) : (
          seriesList.map((series) => (
            <PersonalBestsSeriesSection key={series.seriesName} series={series} />
          ))
        )}
      </div>
    </main>
  );
}

