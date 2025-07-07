'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type RecentRace } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChevronsDown, ChevronsUp } from 'lucide-react';

interface RecentRacesProps {
  races: RecentRace[];
}

export function RecentRaces({ races }: RecentRacesProps) {
  const router = useRouter();
  
  const formatChange = (change: number | string, isRating: boolean = false) => {
    const value = typeof change === 'string' ? parseFloat(change) : change;
    if (value > 0) return <span className="flex items-center justify-end gap-1 text-green-500">+{isRating ? value.toFixed(2) : value}</span>;
    if (value < 0) return <span className="flex items-center justify-end gap-1 text-red-500">{isRating ? value.toFixed(2) : value}</span>;
    return <span className="text-muted-foreground text-right">{isRating ? '0.00' : '-'}</span>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Races</CardTitle>
          <CardDescription>Click a race to view detailed subsession information.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A summary of recent race results.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Start</TableHead>
                <TableHead className="text-right">Finish</TableHead>
                <TableHead className="text-right">Incidents</TableHead>
                <TableHead className="text-right">SOF</TableHead>
                <TableHead className="text-right">iRating +/-</TableHead>
                <TableHead className="text-right">SR +/-</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {races.map((race) => (
                <TableRow
                  key={race.id}
                  onClick={() => router.push(`/race/${race.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{race.trackName}</TableCell>
                  <TableCell>{new Date(race.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</TableCell>
                  <TableCell className="text-right">{race.startPosition}</TableCell>
                  <TableCell className="text-right">{race.finishPosition}</TableCell>
                  <TableCell className="text-right">{race.incidents}</TableCell>
                  <TableCell className="text-right">{race.strengthOfField.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-right">{formatChange(race.iratingChange)}</TableCell>
                  <TableCell className="text-right">{formatChange(race.safetyRatingChange, true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
