'use client';

import { useState } from 'react';
import { Loader2, Search, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DRIVER_DATA, type Driver } from '@/lib/mock-data';
import DriverDashboard from '@/components/driver-dashboard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('Daniel Ricciardo');
  const [searchedDriver, setSearchedDriver] = useState<Driver | null>(() => DRIVER_DATA[searchQuery] || null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    // This is where you would place your real API call.
    // For now, we'll simulate a delay and use mock data.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const driverKey = Object.keys(DRIVER_DATA).find(
      (key) => key.toLowerCase() === searchQuery.toLowerCase().trim()
    );
    const driver = driverKey ? DRIVER_DATA[driverKey] : undefined;

    if (driver) {
      setSearchedDriver(driver);
      setError(null);
    } else {
      setSearchedDriver(null);
      setError(`Driver "${searchQuery}" not found. Try "Daniel Ricciardo" or "Lando Norris".`);
    }
    setIsSearching(false);
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col items-center text-center mb-8">
        <Trophy className="w-12 h-12 text-primary mb-2" />
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
        <p className="text-muted-foreground mt-2">Your iRacing performance dashboard.</p>
      </header>

      <div className="max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSearch} className="flex w-full items-center space-x-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a driver..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Driver Name"
            />
          </div>
          <Button type="submit" disabled={isSearching}>
            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Search
          </Button>
        </form>
      </div>

      <div className="animate-in fade-in duration-500">
        {isSearching ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Searching for driver...</span>
              </CardTitle>
              <CardDescription>
                Please wait while we look up the driver data.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : searchedDriver ? (
          <DriverDashboard driver={searchedDriver} />
        ) : (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>{error ? 'Search Error' : 'Welcome to Apex Stats'}</CardTitle>
              <CardDescription>
                {error || 'Enter a driver\'s name above to see their stats. Try "Daniel Ricciardo" or "Lando Norris" to get started.'}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}
