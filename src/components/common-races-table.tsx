'use client';

import Link from 'next/link';
import type { RecentRace } from '@/lib/iracing-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Info } from 'lucide-react';

interface CommonRace {
  raceA: RecentRace;
  raceB: RecentRace;
}

interface CommonRacesTableProps {
  commonRaces: CommonRace[];
  driverAName: string;
  driverBName: string;
}

const StatCell = ({ value, isBetter }: { value: string | number; isBetter: boolean }) => (
  <TableCell className={`text-center ${isBetter ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
    {value}
  </TableCell>
);

export default function CommonRacesTable({ commonRaces, driverAName, driverBName }: CommonRacesTableProps) {
  const formatChange = (change: number | string, isRating: boolean = false) => {
    const value = typeof change === 'string' ? parseFloat(change) : change;
    const formattedValue = isRating ? value.toFixed(2) : value;
    if (value > 0) return <span className="flex items-center justify-center gap-1 text-green-500">+{formattedValue}</span>;
    if (value < 0) return <span className="flex items-center justify-center gap-1 text-red-500">{formattedValue}</span>;
    return <span className="text-muted-foreground text-center">{isRating ? '0.00' : '-'}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Users className="w-5 h-5" />
          Head-to-Head Races
        </CardTitle>
        <CardDescription>
          A summary of races where both drivers competed in the same subsession.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {commonRaces.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-bottom pb-2">Track</TableHead>
                  <TableHead colSpan={3} className="text-center border-b border-l text-primary">{driverAName}</TableHead>
                  <TableHead colSpan={3} className="text-center border-b border-l text-accent">{driverBName}</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-center border-l">Fin</TableHead>
                  <TableHead className="text-center">Inc</TableHead>
                  <TableHead className="text-center">iR +/-</TableHead>
                  <TableHead className="text-center border-l">Fin</TableHead>
                  <TableHead className="text-center">Inc</TableHead>
                  <TableHead className="text-center">iR +/-</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commonRaces.map(({ raceA, raceB }) => (
                  <TableRow key={raceA.id}>
                    <TableCell className="font-medium">
                      <Link href={`/race/${raceA.id}`} className="hover:underline">
                        {raceA.trackName}
                        <div className="text-xs text-muted-foreground">{raceA.car}</div>
                      </Link>
                    </TableCell>
                    
                    {/* Driver A Stats */}
                    <StatCell value={raceA.finishPosition} isBetter={raceA.finishPosition < raceB.finishPosition} />
                    <StatCell value={raceA.incidents} isBetter={raceA.incidents < raceB.incidents} />
                    <TableCell className="text-center">{formatChange(raceA.iratingChange)}</TableCell>

                    {/* Driver B Stats */}
                    <StatCell value={raceB.finishPosition} isBetter={raceB.finishPosition < raceA.finishPosition} />
                    <StatCell value={raceB.incidents} isBetter={raceB.incidents < raceA.incidents} />
                    <TableCell className="text-center">{formatChange(raceB.iratingChange)}</TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
            <Info className="w-5 h-5" />
            <span>These drivers have not recently competed in the same race.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
