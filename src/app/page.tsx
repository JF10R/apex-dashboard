'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DRIVER_DATA, type Driver } from '@/lib/mock-data';
import DriverDashboard from '@/components/driver-dashboard';
import DriverSearch from '@/components/driver-search';

export default function Home() {
  const [searchedDriver, setSearchedDriver] = useState<Driver | null>(() => DRIVER_DATA['Daniel Ricciardo'] || null);

  const handleDriverSelect = (driver: Driver | null) => {
    setSearchedDriver(driver);
  };

  const compareHref = searchedDriver
    ? `/compare?driverA=${encodeURIComponent(searchedDriver.name)}`
    : '/compare';

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col items-center text-center mb-8">
        <Trophy className="w-12 h-12 text-primary mb-2" />
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
        <p className="text-muted-foreground mt-2">Your iRacing performance dashboard.</p>
      </header>

      <div className="max-w-2xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
        <DriverSearch
          onDriverSelect={handleDriverSelect}
          initialDriver={searchedDriver}
        />
        <Button variant="outline" asChild>
          <Link href={compareHref}>
            <Users />
            Compare
          </Link>
        </Button>
      </div>

      <div className="animate-in fade-in duration-500">
        {searchedDriver ? (
          <DriverDashboard driver={searchedDriver} />
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Welcome to Apex Stats</CardTitle>
              <CardDescription>
                Enter a driver's name above to see their stats. Try "Daniel Ricciardo" or "Lando Norris" to get started.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
