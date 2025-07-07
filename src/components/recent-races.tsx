'use client';

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';
import { Award, ChevronsDown, ChevronsUp, ShieldAlert, Timer } from 'lucide-react';

interface RecentRacesProps {
  races: RecentRace[];
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
    <div className="rounded-full bg-background p-2">
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  </div>
);


export function RecentRaces({ races }: RecentRacesProps) {
  const [selectedRace, setSelectedRace] = useState<RecentRace | null>(null);

  const getPositionChange = (start: number, finish: number) => {
    const change = start - finish;
    if (change > 0) return <span className="flex items-center gap-1 text-green-500"><ChevronsUp className="w-4 h-4" /> +{change}</span>;
    if (change < 0) return <span className="flex items-center gap-1 text-red-500"><ChevronsDown className="w-4 h-4" /> {change}</span>;
    return <span className="text-muted-foreground">-</span>;
  };
  
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
                  key={`${race.trackName}-${race.date}`}
                  onClick={() => setSelectedRace(race)}
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

      <Dialog open={!!selectedRace} onOpenChange={(isOpen) => !isOpen && setSelectedRace(null)}>
        {selectedRace && (
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>Subsession: {selectedRace.trackName}</span>
                <Badge variant="outline">{selectedRace.car}</Badge>
              </DialogTitle>
              <DialogDescription>
                Race held on {new Date(selectedRace.date).toLocaleDateString('en-US', { timeZone: 'UTC' })} with a Strength of Field of {selectedRace.strengthOfField.toLocaleString('en-US')}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="flex flex-col gap-4">
                <DetailItem icon={ChevronsUp} label="Starting Position" value={selectedRace.startPosition} />
                <DetailItem icon={Timer} label="Fastest Lap" value={selectedRace.fastestLap} />
                <DetailItem icon={Award} label="Laps Led" value={selectedRace.lapsLed} />
              </div>
              <div className="flex flex-col gap-4">
                <DetailItem icon={ChevronsDown} label="Finishing Position" value={selectedRace.finishPosition} />
                <DetailItem icon={Timer} label="Average Lap" value={selectedRace.avgLapTime} />
                <DetailItem icon={ShieldAlert} label="Incidents" value={selectedRace.incidents} />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Position Change</p>
                <div className="text-2xl font-bold">
                    {getPositionChange(selectedRace.startPosition, selectedRace.finishPosition)}
                </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
