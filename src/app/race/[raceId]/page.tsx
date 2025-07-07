import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, ShieldAlert, Timer, Users } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RaceResultsTable from '@/components/race-results-table';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRaceResultAction } from '@/app/data-actions';
import { type RaceParticipant } from '@/lib/mock-data';

const lapTimeToMs = (time: string): number => {
  if (!time || !time.includes(':') || !time.includes('.')) return Infinity;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  return (minutes * 60 + seconds) * 1000 + ms;
}

const getOverallFastestLap = (participants: RaceParticipant[]): string => {
  let fastestLap = '99:99.999';
  let fastestMs = Infinity;

  participants.forEach(p => {
    if (p.fastestLap) {
      const currentMs = lapTimeToMs(p.fastestLap);
      if (currentMs < fastestMs) {
        fastestMs = currentMs;
        fastestLap = p.fastestLap;
      }
    }
  });

  return fastestLap === '99:99.999' ? 'N/A' : fastestLap;
};


export default async function RaceDetailsPage({ params }: { params: { raceId: string } }) {
  const subsessionId = parseInt(params.raceId, 10);
  if (isNaN(subsessionId)) {
    notFound();
  }

  const { data: race, error } = await getRaceResultAction(subsessionId);

  if (error || !race) {
    notFound();
  }

  const winner = race.participants.find((p) => p.finishPosition === 1);
  const overallFastestLap = getOverallFastestLap(race.participants);

  return (
    <main className="container mx-auto p-4 md:p-8 animate-in fade-in duration-500 relative">
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
        <RaceResultsTable participants={race.participants} overallFastestLap={overallFastestLap} />
      </section>
    </main>
  )
}
