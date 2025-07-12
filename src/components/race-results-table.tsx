'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { cn } from '@/lib/utils';
import { Loader2, ExternalLink } from 'lucide-react';

interface LapData {
  driverName: string;
  raceId: number;
  laps: Lap[];
  fastestLap: string;
  totalLaps: number;
}

interface ClickableDriverNameProps {
  name: string;
  custId: number;
  className?: string;
  onDriverClick?: (driverName: string) => void;
}

function ClickableDriverName({ name, custId, className, onDriverClick }: ClickableDriverNameProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onDriverClick) {
      onDriverClick(name);
    } else {
      // Fallback to direct navigation if no callback provided
      window.open(`/${custId}`, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'font-medium text-left hover:text-primary hover:underline transition-colors inline-flex items-center gap-1',
        className
      )}
      title={`Click to view ${name}'s profile`}
    >
      {name}
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function LapTimesDialog({
  driverName,
  driverId, // custId as string
  raceId,
  driverFastestLap,
}: {
  driverName: string;
  driverId: string; // custId as string for API route
  raceId: string;
  driverFastestLap: string;
}) {
  const [lapData, setLapData] = useState<LapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchLapData = async () => {
    if (lapData) return; // Already loaded
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/race/${raceId}/laps/${driverId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lap data');
      }
      
      setLapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lap data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !lapData && !loading) {
      fetchLapData();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Laps
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lap Times: {driverName}</DialogTitle>
          <DialogDescription>
            Fastest lap: {driverFastestLap}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading lap data...
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}
          
          {lapData && (
            <ScrollArea className="max-h-[350px]">
              {lapData.laps && lapData.laps.length > 0 ? (
                <div className="space-y-1">
                  {lapData.laps.map((lap) => (
                    <div
                      key={lap.lapNumber}
                      className={cn(
                        'flex justify-between items-center p-2 rounded text-sm',
                        lap.invalid && 'bg-red-100 dark:bg-red-900/20',
                        lap.time === driverFastestLap && !lap.invalid && 'bg-purple-100 dark:bg-purple-900/20'
                      )}
                    >
                      <span className="font-medium">Lap {lap.lapNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{lap.time}</span>
                        {lap.invalid && (
                          <span className="text-xs text-red-500 font-medium">INVALID</span>
                        )}
                        {lap.time === driverFastestLap && !lap.invalid && (
                          <span className="text-xs text-purple-500 font-medium">FASTEST</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No lap data available for this driver.
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RaceResultsTable({
  participants,
  overallFastestLap,
  raceId,
  onDriverClick,
}: {
  participants: RaceParticipant[];
  overallFastestLap: string;
  raceId: string;
  onDriverClick?: (driverName: string) => void;
}) {
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
                <TableRow key={p.name} className="group">
                  <TableCell className="text-center font-bold">{p.finishPosition}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.startPosition}</TableCell>
                  <TableCell>
                    <ClickableDriverName name={p.name} custId={p.custId} onDriverClick={onDriverClick} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono',
                      p.fastestLap === overallFastestLap && 'text-purple-400 font-bold'
                    )}
                  >
                    {p.fastestLap}
                  </TableCell>
                  <TableCell className="text-right">{p.incidents}</TableCell>
                  <TableCell className="text-right font-mono">{p.irating.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-center">
                    <LapTimesDialog
                      driverName={p.name}
                      driverId={p.custId.toString()}
                      raceId={raceId}
                      driverFastestLap={p.fastestLap}
                    />
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
