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

interface RecentRacesProps {
  races: RecentRace[];
}

export function RecentRaces({ races }: RecentRacesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Races</CardTitle>
        <CardDescription>Performance in the last few official races.</CardDescription>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {races.map((race) => (
              <TableRow key={`${race.trackName}-${race.date}`}>
                <TableCell className="font-medium">{race.trackName}</TableCell>
                <TableCell>{new Date(race.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">{race.startPosition}</TableCell>
                <TableCell className="text-right">{race.finishPosition}</TableCell>
                <TableCell className="text-right">{race.incidents}</TableCell>
                <TableCell className="text-right">{race.strengthOfField.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
