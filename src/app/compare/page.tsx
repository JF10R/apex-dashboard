'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, Users, Loader2, Search, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DRIVER_DATA, type Driver } from '@/lib/mock-data';
import DriverComparisonDashboard from '@/components/driver-comparison-dashboard';

function DriverSearch({
  driverNumber,
  onSearch,
  initialQuery = '',
}: {
  driverNumber: 'A' | 'B';
  onSearch: (driver: Driver | null, query: string) => void;
  initialQuery?: string;
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      onSearch(null, '');
      return;
    };

    setIsSearching(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const driverKey = Object.keys(DRIVER_DATA).find(
      (key) => key.toLowerCase() === searchQuery.toLowerCase().trim()
    );
    const driver = driverKey ? DRIVER_DATA[driverKey] : null;

    onSearch(driver, searchQuery);
    setIsSearching(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Driver {driverNumber}</h2>
      <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for a driver..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={`Driver ${driverNumber} Name`}
          />
        </div>
        <Button type="submit" disabled={isSearching} className="w-28">
          {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
        </Button>
      </form>
    </div>
  )
}

export default function ComparePage() {
  const [driverA, setDriverA] = useState<Driver | null>(() => DRIVER_DATA['Daniel Ricciardo']);
  const [driverB, setDriverB] = useState<Driver | null>(() => DRIVER_DATA['Lando Norris']);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);

  const handleSearchA = (driver: Driver | null, query: string) => {
    setDriverA(driver);
    setErrorA(driver ? null : `Driver "${query}" not found.`);
  };

  const handleSearchB = (driver: Driver | null, query: string) => {
    setDriverB(driver);
    setErrorB(driver ? null : `Driver "${query}" not found.`);
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
        <DriverSearch driverNumber="A" onSearch={handleSearchA} initialQuery='Daniel Ricciardo' />
        <DriverSearch driverNumber="B" onSearch={handleSearchB} initialQuery='Lando Norris'/>
      </div>
      
      {(errorA || errorB) && (
        <Card className="text-center py-12 max-w-4xl mx-auto border-destructive">
          <CardHeader>
            <CardTitle>Search Error</CardTitle>
            <CardDescription className="text-destructive">
              {errorA && <div>{errorA}</div>}
              {errorB && <div>{errorB}</div>}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="animate-in fade-in duration-500">
        {driverA && driverB ? (
          <DriverComparisonDashboard driverA={driverA} driverB={driverB} />
        ) : !errorA && !errorB ? (
            <Card className="text-center py-12 max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Select Two Drivers</CardTitle>
                <CardDescription>
                  Use the search boxes above to select two drivers to compare. Try "Daniel Ricciardo" and "Lando Norris".
                </CardDescription>
              </CardHeader>
            </Card>
        ) : null}
      </div>
    </main>
  );
}
