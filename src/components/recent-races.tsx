'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type RecentRace } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface RecentRacesProps {
  races: RecentRace[];
}

export function RecentRaces({ races }: RecentRacesProps) {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const pageCount = Math.ceil(races.length / pageSize);

  const paginatedRaces = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return races.slice(start, end);
  }, [races, pageIndex, pageSize]);
  
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
          <div className="overflow-x-auto">
            <Table>
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
                {paginatedRaces.map((race) => (
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
          </div>
          <div className="flex items-center justify-between px-2 mt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {Math.min(pageIndex * pageSize + 1, races.length)} - {Math.min((pageIndex + 1) * pageSize, races.length)} of {races.length} races.
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
        </CardContent>
      </Card>
    </>
  )
}
