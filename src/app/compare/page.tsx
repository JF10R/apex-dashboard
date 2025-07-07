'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DRIVER_DATA, type Driver } from '@/lib/mock-data';
import DriverComparisonDashboard from '@/components/driver-comparison-dashboard';
import DriverSearch from '@/components/driver-search';

export default function ComparePage() {
  const [driverA, setDriverA] = useState<Driver | null>(() => DRIVER_DATA['Daniel Ricciardo']);
  const [driverB, setDriverB] = useState<Driver | null>(() => DRIVER_DATA['Lando Norris']);

  const handleSelectA = (driver: Driver | null) => {
    setDriverA(driver);
  };

  const handleSelectB = (driver: Driver | null) => {
    setDriverB(driver);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
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
        <DriverSearch onDriverSelect={handleSelectA} initialDriver={driverA} label="Driver A"/>
        <DriverSearch onDriverSelect={handleSelectB} initialDriver={driverB} label="Driver B" />
      </div>

      <div className="animate-in fade-in duration-500">
        {driverA && driverB ? (
          <DriverComparisonDashboard driverA={driverA} driverB={driverB} />
        ) : (
          <Card className="text-center py-12 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Select Two Drivers</CardTitle>
              <CardDescription>
                Use the search boxes above to select two drivers to compare. Try "Daniel Ricciardo" and "Lando Norris".
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
