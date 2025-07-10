'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type SearchedDriver } from '@/lib/mock-data';
import DriverDashboard from '@/components/driver-dashboard';
import DriverSearch from '@/components/driver-search';
import TrackedDrivers from '@/components/tracked-drivers';
import RecentProfiles from '@/components/recent-profiles';
import { ThemeToggle } from '@/components/theme-toggle';
import { AppHeader } from '@/components/app-header';

export default function Home() {
  const [searchedDriver, setSearchedDriver] = useState<SearchedDriver | null>(null);

  const handleDriverSelect = (driver: SearchedDriver | null) => {
    setSearchedDriver(driver);
  };

  const compareHref = searchedDriver
    ? `/compare?driverA=${encodeURIComponent(searchedDriver.name)}&custIdA=${searchedDriver.custId}`
    : '/compare';

  return (
    <main className="container mx-auto p-4 md:p-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <AppHeader subtitle="Your iRacing performance dashboard." />

      <div className="max-w-2xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
        <DriverSearch
          onDriverSelect={handleDriverSelect}
          initialDriverName={searchedDriver?.name}
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
          <DriverDashboard custId={searchedDriver.custId} driverName={searchedDriver.name} />
        ) : (
          <div className="grid gap-6 max-w-4xl mx-auto">
            <RecentProfiles />
            <TrackedDrivers currentDriver={searchedDriver} />
            <Card className="text-center py-12">
              <CardHeader>
                <CardTitle>Welcome to Apex Stats</CardTitle>
                <CardDescription>
                  Enter a driver's name above to see their stats, or click the star icon to track drivers for quick access.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
