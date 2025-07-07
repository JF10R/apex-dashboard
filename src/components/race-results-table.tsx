'use client';

import type { RaceParticipant, Lap } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';

function LapTimesDialog({ driverName, laps }: { driverName: string; laps: Lap[] }) {
  if (!laps || laps.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        No Laps
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">View Laps</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lap Times: {driverName}</DialogTitle>
          <DialogDescription>
            Detailed lap-by-lap breakdown for the race.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Lap</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laps.map((lap) => (
                <TableRow key={lap.lapNumber} className={lap.invalid ? 'bg-destructive/10' : ''}>
                  <TableCell className="font-medium">{lap.lapNumber}</TableCell>
                  <TableCell className="font-mono">{lap.time}</TableCell>
                  <TableCell className="text-right">
                    {lap.invalid ? <span className="text-destructive">Invalid</span> : <span className="text-green-500">Valid</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function RaceResultsTable({ participants }: { participants: RaceParticipant[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Full Results</CardTitle>
        <CardDescription>Detailed results for all participants in this subsession.</CardDescription>
      </CardHeader>
      <CardContent>
        {participants && participants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-[50px]">Fin</TableHead>
                <TableHead className="text-center w-[50px]">St</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Fastest Lap</TableHead>
                <TableHead className="text-right">Incidents</TableHead>
                <TableHead className="text-right">iRating</TableHead>
                <TableHead className="text-center">Lap Times</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.sort((a, b) => a.finishPosition - b.finishPosition).map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="text-center font-bold">{p.finishPosition}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.startPosition}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right font-mono">{p.fastestLap}</TableCell>
                  <TableCell className="text-right">{p.incidents}</TableCell>
                  <TableCell className="text-right font-mono">{p.irating.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-center">
                    <LapTimesDialog driverName={p.name} laps={p.laps} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Full participant data is not available for this race.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
