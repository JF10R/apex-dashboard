'use server'

// NOTE: The live iRacing API integration has been temporarily disabled 
// to resolve a recurring installation error in this development environment.
// To re-enable live data, please follow these steps:
// 1. Run `npm install iracing-api` in your terminal.
// 2. Delete the stub functions directly below this comment block.
// 3. Uncomment the full code block at the bottom of this file.
// 4. Ensure your .env.local file has your iRacing credentials.

import {
  type Driver,
  type RecentRace,
} from '@/lib/mock-data'

export const searchDriversByName = async (
  query: string
): Promise<{ name: string; custId: number }[]> => {
  console.warn("Live iRacing API call for 'searchDriversByName' is disabled.");
  return [];
}

export const getRaceResultData = async (
  subsessionId: number
): Promise<RecentRace | null> => {
  console.warn("Live iRacing API call for 'getRaceResultData' is disabled.");
  return null;
}

export const getDriverData = async (custId: number): Promise<Driver | null> => {
  console.warn("Live iRacing API call for 'getDriverData' is disabled.");
  return null;
}


/*
// --- UNCOMMENT THIS ENTIRE BLOCK TO RE-ENABLE LIVE IRACING API DATA ---

import { iRacingAPI } from 'iracing-api'
import {
  type Driver,
  type RecentRace,
  type HistoryPoint,
  type RaceParticipant,
  type RaceCategory,
  type Lap,
} from '@/lib/mock-data'

// This will be null on the client-side, but that's okay because this file is 'use server'
const email = process.env.IRACING_EMAIL ?? null
const password = process.env.IRACING_PASSWORD ?? null

let api: iRacingAPI | null = null

if (email && password) {
  api = new iRacingAPI({ email, password })
} else {
  console.warn(
    'iRacing credentials are not set in .env.local. API calls will not work.'
  )
}

const seriesCategoryMap: Record<string, RaceCategory> = {
  F3: 'Formula Car',
  'Formula Vee': 'Formula Car',
  'Formula 1600': 'Formula Car',
  'GT3': 'Sports Car',
  'GT4': 'Sports Car',
  'Touring Car': 'Sports Car',
  'LMP2': 'Prototype',
  'Dallara P217': 'Prototype',
  'NASCAR': 'Oval',
  'Late Model': 'Dirt Oval',
}

const getCategoryFromSeriesName = (seriesName: string): RaceCategory => {
  for (const key in seriesCategoryMap) {
    if (seriesName.includes(key)) {
      return seriesCategoryMap[key]
    }
  }
  if (seriesName.toLowerCase().includes('oval')) return 'Oval'
  if (seriesName.toLowerCase().includes('dirt')) return 'Dirt Oval'
  if (seriesName.toLowerCase().includes('formula')) return 'Formula Car'
  return 'Sports Car' // Default
}

const formatLapTime = (timeInMs: number): string => {
  if (timeInMs < 0 || isNaN(timeInMs)) return 'N/A'
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
};

const getSeasonFromDate = (date: Date): { year: number, season: string } => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1;
    return { year, season: `${year} S${quarter}` };
}

const lapTimeToSeconds = (time: string): number => {
  if (!time || !time.includes(':') || !time.includes('.')) return NaN;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) return NaN;
  return minutes * 60 + seconds + ms / 1000;
};


export const searchDriversByName = async (
  query: string
): Promise<{ name: string; custId: number }[]> => {
  if (!api || !query) return []
  try {
    const results = await api.searchDrivers({ searchTerm: query })
    return results
      .slice(0, 5) // Limit to 5 results
      .map((d: any) => ({ name: d.displayName, custId: d.custId }))
  } catch (error) {
    console.error('Error searching for drivers:', error)
    return []
  }
}

export const getRaceResultData = async (
  subsessionId: number
): Promise<RecentRace | null> => {
    if (!api) throw new Error('iRacing API not configured.');
    try {
        const result = await api.getResult({ subsessionId });
        if (!result) return null;

        const { year, season } = getSeasonFromDate(new Date(result.startTime));
        const category = getCategoryFromSeriesName(result.seriesName);

        const participants: RaceParticipant[] = result.sessionResults[1].results.map((p: any) => ({
            name: p.displayName,
            startPosition: p.startingPosition + 1,
            finishPosition: p.finishPosition + 1,
            incidents: p.incidents,
            fastestLap: formatLapTime(p.bestLapTime),
            irating: p.newiRating,
            laps: p.laps.map((l: any, index: number) => ({
                lapNumber: index + 1,
                time: formatLapTime(l.lapTime),
                invalid: l.lapEvents.includes('invalid'),
            })),
        }));

        const avgIncidents = participants.reduce((acc, p) => acc + p.incidents, 0) / participants.length;
        const validLaps = participants.flatMap(p => p.laps.filter(l => !l.invalid && l.time !== 'N/A'));
        const avgLapTimeMs = validLaps.reduce((acc, l) => acc + (l.time !== 'N/A' ? (parseFloat(l.time.split(':')[0]) * 60 + parseFloat(l.time.split(':')[1])) * 1000 : 0), 0) / validLaps.length;

        const raceData: RecentRace = {
            id: subsessionId.toString(),
            trackName: result.track.trackName,
            date: result.startTime,
            year,
            season,
            category,
            startPosition: 0, // Will be updated for the specific driver later
            finishPosition: 0, // Will be updated for the specific driver later
            incidents: 0, // Will be updated for the specific driver later
            strengthOfField: result.eventStrengthOfField,
            lapsLed: 0, // Will be updated for the specific driver later
            fastestLap: '', // Will be updated for the specific driver later
            car: result.carClassName,
            avgLapTime: '', // Will be updated for the specific driver later
            iratingChange: 0, // Will be updated for the specific driver later
            safetyRatingChange: '', // Will be updated for the specific driver later
            participants,
            avgRaceIncidents: avgIncidents,
            avgRaceLapTime: formatLapTime(avgLapTimeMs),
        };

        return raceData;
    } catch (error) {
        console.error(`Error fetching race result for ${subsessionId}:`, error);
        return null;
    }
}


export const getDriverData = async (custId: number): Promise<Driver | null> => {
  if (!api) throw new Error('iRacing API not configured.');
  try {
    const [memberData, memberStats, iratingChart, srChart, recentRacesRaw] =
      await Promise.all([
        api.getMemberData({ custIds: [custId] }),
        api.getMemberStats(custId),
        api.getMemberChartData({ custId, chartType: 1 }), // 1 for iRating
        api.getMemberChartData({ custId, chartType: 2 }), // 2 for Safety Rating
        api.getMemberRecentRaces(custId),
      ])

    if (!memberData || !memberData.members[0]) {
      throw new Error('Driver not found');
    }

    const driverName = memberData.members[0].displayName;

    const recentRaces: RecentRace[] = (await Promise.all(
        recentRacesRaw.races.slice(0, 20).map(async (race: any) => {
            const raceResult = await getRaceResultData(race.subsessionId);
            if (!raceResult) return null;

            const driverInRace = raceResult.participants.find(p => p.name === driverName);

            if (driverInRace) {
                raceResult.startPosition = driverInRace.startPosition;
                raceResult.finishPosition = driverInRace.finishPosition;
                raceResult.incidents = driverInRace.incidents;
                raceResult.fastestLap = driverInRace.fastestLap;
                raceResult.iratingChange = race.newiRating - race.oldiRating;
                raceResult.safetyRatingChange = (race.newSubLevel - race.oldSubLevel) / 100;
                raceResult.lapsLed = race.lapsLed;
                raceResult.avgLapTime = formatLapTime(race.averageLap);
            }
            return raceResult;
        })
    )).filter((r): r is RecentRace => r !== null);


    const iratingHistory: HistoryPoint[] = iratingChart.data.map((p: any) => ({
      month: new Date(p.when).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: p.value,
    }));

    const safetyRatingHistory: HistoryPoint[] = srChart.data.map((p: any) => ({
      month: new Date(p.when).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      value: p.value / 100, // API returns SR as integer (e.g., 499)
    }));

    const racePaceHistory: HistoryPoint[] = recentRaces.map(r => ({
        month: new Date(r.date).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        value: lapTimeToSeconds(r.avgLapTime)
    })).filter(p => !isNaN(p.value));
    
    const avgRacePaceSeconds = racePaceHistory.reduce((acc, p) => acc + p.value, 0) / racePaceHistory.length;


    const driver: Driver = {
      id: custId,
      name: driverName,
      currentIRating: memberStats.stats.iRating,
      currentSafetyRating: `${memberStats.stats.licenseClass} ${memberStats.stats.srPrime}.${memberStats.stats.srSub}`,
      avgRacePace: formatLapTime(avgRacePaceSeconds * 1000),
      iratingHistory,
      safetyRatingHistory,
      racePaceHistory,
      recentRaces,
    }

    return driver
  } catch (error) {
    console.error(`Error fetching data for driver ${custId}:`, error)
    return null
  }
}

*/
