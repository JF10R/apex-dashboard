'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type SearchedDriver } from '@/lib/mock-data';
import DriverComparisonDashboard from '@/components/driver-comparison-dashboard';
import DriverSearch from '@/components/driver-search';
import { ThemeToggle } from '@/components/theme-toggle';

function CompareView() {
  const searchParams = useSearchParams();

  const [driverA, setDriverA] = useState<SearchedDriver | null>(null);
  const [driverB, setDriverB] = useState<SearchedDriver | null>(null);

  useEffect(() => {
    const driverAName = searchParams.get('driverA');
    const driverACustId = searchParams.get('custIdA');
    if (driverAName && driverACustId) {
        setDriverA({ name: driverAName, custId: parseInt(driverACustId) });
    }
  }, [searchParams]);

  const handleSelectA = (driver: SearchedDriver | null) => {
    setDriverA(driver);
  };

  const handleSelectB = (driver: SearchedDriver | null) => {
    setDriverB(driver);
  };

  return (
    <main className="container mx-auto p-4 md:p-8 relative">
       <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <header className="flex flex-col items-center text-center mb-8">
        <Users className="w-12 h-12 text-primary mb-2" />
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Driver Comparison</h1>
        <p className="text-muted-foreground mt-2">Compare two drivers head-to-head.</p>
      </header>

      <div className="max-w-4xl mx-auto mb-8 grid md:grid-cols-2 gap-8">
        <DriverSearch onDriverSelect={handleSelectA} initialDriverName={driverA?.name} label="Driver A"/>
        <DriverSearch onDriverSelect={handleSelectB} initialDriverName={driverB?.name} label="Driver B" />
      </div>

      <div className="animate-in fade-in duration-500">
        {driverA && driverB ? (
          <DriverComparisonDashboard driverA={driverA} driverB={driverB} />
        ) : (
          <Card className="text-center py-12 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Select Two Drivers</CardTitle>
              <CardDescription>
                Use the search boxes above to select two drivers to compare.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompareView />
    </Suspense>
  )
}
