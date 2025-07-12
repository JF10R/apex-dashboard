import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Award } from 'lucide-react';

interface SeriesStat {
  car: string;
  raceCount: number;
  totalIRatingChange: number;
  totalSRChange: number;
}

interface SeriesPerformanceSummaryProps {
  seriesStats: SeriesStat[];
}

export default function SeriesPerformanceSummary({ seriesStats }: SeriesPerformanceSummaryProps) {
  const formatChange = (change: number, isRating: boolean = false) => {
    const value = change;
    const formattedValue = isRating ? value.toFixed(2) : Math.round(value);
    if (value > 0) return <span className="flex items-center justify-end gap-1 text-green-500">+{formattedValue}</span>;
    if (value < 0) return <span className="flex items-center justify-end gap-1 text-red-500">{formattedValue}</span>;
    return <span className="text-muted-foreground text-right">{isRating ? '+0.00' : '0'}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Award className="w-5 h-5" />
          Series Performance
        </CardTitle>
        <CardDescription>
          Performance summary by series for the selected filters.
          <br />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Note: Data based on recent races available from iRacing API. Historical season data may be incomplete.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {seriesStats.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Series (Car)</TableHead>
                  <TableHead className="text-center">Races</TableHead>
                  <TableHead className="text-right">Total iRating +/-</TableHead>
                  <TableHead className="text-right">Total SR +/-</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesStats.map((stat) => (
                  <TableRow key={stat.car}>
                    <TableCell className="font-medium">{stat.car}</TableCell>
                    <TableCell className="text-center">{stat.raceCount}</TableCell>
                    <TableCell className="text-right">{formatChange(stat.totalIRatingChange)}</TableCell>
                    <TableCell className="text-right">{formatChange(stat.totalSRChange, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No series data to display for the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
