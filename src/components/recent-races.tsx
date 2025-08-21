'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { type RecentRace } from "@/lib/iracing-types";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface RecentRacesProps {
  races: RecentRace[];
  driverId?: number;
}

export function RecentRaces({ races, driverId }: RecentRacesProps) {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Reset page index when filtered races change
  useEffect(() => {
    setPageIndex(0);
  }, [races]);

  const pageCount = Math.ceil(races.length / pageSize);

  const paginatedRaces = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return races.slice(start, end);
  }, [races, pageIndex, pageSize]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      })
    };
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-500 font-bold';
    if (position <= 3) return 'text-orange-500 font-semibold';
    if (position <= 10) return 'text-green-500';
    return 'text-muted-foreground';
  };

  if (races.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No races found for the selected filters.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">{/* Reduced from space-y-3 */}
        {paginatedRaces.map((race) => {
          const { date, time } = formatDateTime(race.date);
          return (
            <Card 
              key={race.id}
              onClick={() => router.push(`/race/${race.id}${driverId ? `?from=${driverId}` : ''}`)}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-2xl font-bold ${getPositionColor(race.finishPosition)} flex-shrink-0`}>
                      {race.finishPosition}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1">
                        {race.seriesName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-1">
                        {race.car}
                      </div>
                      <div className="text-sm font-medium truncate">
                        {race.trackName}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-muted-foreground mb-1">
                      {date} {time}
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm">
                      <div className="flex items-center justify-between gap-2 min-w-[60px]">
                        <span className="text-muted-foreground text-xs">iR:</span>
                        <span className={race.iratingChange > 0 ? 'text-green-500' : race.iratingChange < 0 ? 'text-red-500' : 'text-muted-foreground'}>
                          {race.iratingChange > 0 ? '+' : ''}{race.iratingChange}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 min-w-[60px]">
                        <span className="text-muted-foreground text-xs">SR:</span>
                        <span className={
                          typeof race.safetyRatingChange === 'number' 
                            ? race.safetyRatingChange > 0 ? 'text-green-500' : race.safetyRatingChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                            : parseFloat(race.safetyRatingChange) > 0 ? 'text-green-500' : parseFloat(race.safetyRatingChange) < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }>
                          {typeof race.safetyRatingChange === 'number' 
                            ? (race.safetyRatingChange > 0 ? '+' : '') + race.safetyRatingChange.toFixed(2)
                            : (parseFloat(race.safetyRatingChange) > 0 ? '+' : '') + parseFloat(race.safetyRatingChange).toFixed(2)
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 min-w-[60px]">
                        <span className="text-muted-foreground text-xs">Inc:</span>
                        <span>{race.incidents}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-2 mt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {races.length > 0 ? Math.min(pageIndex * pageSize + 1, races.length) : 0} - {Math.min((pageIndex + 1) * pageSize, races.length)} of {races.length} races.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPageIndex(0)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex(pageIndex - 1)}
              disabled={pageIndex === 0}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={pageIndex >= pageCount - 1}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
