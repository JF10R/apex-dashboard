import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert, Timer, Users } from 'lucide-react';
import { DRIVER_DATA, type RecentRace } from '@/lib/mock-data';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RaceResultsTable from '@/components/race-results-table';

export async function generateStaticParams() {
  const raceIds: { raceId: string }[] = [];
  for (const driver of Object.values(DRIVER_DATA)) {
    for (const race of driver.recentRaces) {
      raceIds.push({ raceId: race.id });
    }
  }
  return raceIds;
}

const findRaceById = (raceId: string): RecentRace | null => {
  for (const driver of Object.values(DRIVER_DATA)) {
    const race = driver.recentRaces.find((r) => r.id === raceId);
    if (race) return race;
  }
  return null;
};

export default function RaceDetailsPage({ params }: { params: { raceId: string } }) {
  const race = findRaceById(params.raceId);

  if (!race) {
    notFound();
  }

  const winner = race.participants.find((p) => p.finishPosition === 1);

  return (
    <main className="container mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter">{race.trackName}</h1>
            <p className="text-muted-foreground mt-1">
              {new Date(race.date).toLocaleDateString('en-US', { dateStyle: 'full', timeZone: 'UTC' })}
            </p>
          </div>
          <Badge variant="outline" className="text-base py-1 px-3 w-fit">{race.car}</Badge>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="text-2xl font-headline font-bold tracking-tight mb-4">Race Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Winner" value={winner?.name || 'N/A'} icon={Award} description={winner ? `Finished P1` : "Data not available"} />
          <StatCard title="Avg. Lap Time" value={race.avgRaceLapTime} icon={Timer} description="Across all drivers" />
          <StatCard title="Avg. Incidents" value={race.avgRaceIncidents > 0 ? race.avgRaceIncidents.toFixed(2) : 'N/A'} icon={ShieldAlert} description="Across all drivers" />
          <StatCard title="Strength of Field" value={race.strengthOfField.toLocaleString('en-US')} icon={Users} description="Average iRating of drivers" />
        </div>
      </section>

      <section>
        <RaceResultsTable participants={race.participants} />
      </section>
    </main>
  )
}
