/**
 * Data transformation utilities for iRacing API responses
 * 
 * This module handles transforming official iRacing API responses to our application's interfaces,
 * ensuring type safety and proper data handling with comprehensive schemas.
 */

import { 
  GetResultResponseSchema, 
  type GetResultResponse, 
  type RaceResult,
  type SessionResult,
  type RecentRace,
  type RaceParticipant,
  type RaceCategory,
  type Lap,
  type LapDataItem,
  LapDataItemSchema,
  GetResultsLapDataResponseSchema,
} from './iracing-types'

/**
 * Format lap time from iRacing's 10,000ths of a second format to MM:SS.mmm
 */
export function formatLapTimeFrom10000ths(lapTimeIn10000ths: number): string {
  if (lapTimeIn10000ths <= 0) return "N/A";
  
  const totalSeconds = lapTimeIn10000ths / 10000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

/**
 * Format lap time from milliseconds
 */
export function formatLapTime(timeInMs: number): string {
  if (timeInMs < 0 || isNaN(timeInMs)) return 'N/A'
  const totalSeconds = timeInMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
}

/**
 * Convert lap time string to seconds for calculations
 */
export function lapTimeToSeconds(time: string): number {
  if (!time || !time.includes(':') || !time.includes('.')) return NaN;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) return NaN;
  return minutes * 60 + seconds + ms / 1000;
}

/**
 * Transform lap data from official API format to application format
 */
export function transformLapData(lapDataItems: LapDataItem[]): Lap[] {
  return lapDataItems.map((lapInfo, index) => {
    const lapTimeIn10000ths = lapInfo.lapTime;
    const lapTime = lapTimeIn10000ths > 0 ? formatLapTimeFrom10000ths(lapTimeIn10000ths) : 'N/A';
    
    // Check if lap is invalid based on lap events or flags
    const lapEvents = lapInfo.lapEvents || [];
    const isInvalid = lapInfo.incident || lapEvents.length > 0 || lapTimeIn10000ths <= 0;
    
    return {
      lapNumber: lapInfo.lapNumber || (index + 1),
      time: lapTime,
      invalid: isInvalid,
    };
  });
}

/**
 * Calculate fastest lap from a list of laps
 */
export function calculateFastestLap(laps: Lap[]): string {
  let fastestLap = 'N/A';
  let fastestMs = Infinity;
  
  laps.forEach(lap => {
    if (!lap.invalid && lap.time !== 'N/A') {
      const lapMs = lapTimeToSeconds(lap.time) * 1000;
      if (lapMs < fastestMs) {
        fastestMs = lapMs;
        fastestLap = lap.time;
      }
    }
  });
  
  return fastestLap;
}

/**
 * Get race category from series name
 */
export function getCategoryFromSeriesName(seriesName: string): RaceCategory {
  const name = seriesName.toLowerCase();
  
  // Formula and Open Wheel cars
  if (name.includes('formula') || 
      name.includes('f1') || 
      name.includes('f2') || 
      name.includes('f3') ||
      name.includes('f4') ||
      name.includes('skip barber') ||
      name.includes('pro mazda') ||
      name.includes('usf2000') ||
      name.includes('indy pro 2000') ||
      name.includes('indy lights') ||
      name.includes('super formula') ||
      name.includes('dallara') ||
      name.includes('williams fw') ||
      name.includes('mclaren mp4') ||
      name.includes('lotus 79') ||
      name.includes('lotus 49') ||
      name.includes('ray ff1600') ||
      name.includes('formula ford') ||
      name.includes('formula vee') ||
      name.includes('formula renault') ||
      name.includes('formula mazda')) {
    return 'Formula Car';
  }
  
  // Dirt racing
  if (name.includes('dirt oval') || 
      name.includes('dirt track') ||
      name.includes('sprint car') ||
      name.includes('late model') ||
      name.includes('modified')) {
    return 'Dirt Oval';
  }
  
  // Oval racing
  if (name.includes('oval') || 
      name.includes('nascar') || 
      name.includes('indycar') ||
      name.includes('stock car') ||
      name.includes('xfinity') ||
      name.includes('truck') ||
      name.includes('arca')) {
    return 'Oval';
  }
  
  // Prototype racing
  if (name.includes('prototype') || 
      name.includes('lmp') || 
      name.includes('dpi') ||
      name.includes('gtp') ||
      name.includes('riley') ||
      name.includes('oreca') ||
      name.includes('ligier') ||
      name.includes('cadillac dpi') ||
      name.includes('acura arx') ||
      name.includes('porsche 963') ||
      name.includes('bmm m hybrid')) {
    return 'Prototype';
  }
  
  return 'Sports Car'; // Default fallback for GT cars, touring cars, etc.
}

/**
 * Get season info from date using iRacing's season system
 * iRacing has 4 seasons per year (quarterly)
 */
export function getSeasonFromDate(date: Date): { year: number; season: string } {
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  
  // iRacing uses Season 1, Season 2, Season 3, Season 4 format
  const season = `Season ${quarter}`;
  
  return { year, season };
}

/**
 * Transform official iRacing API race result to our RecentRace interface
 * Now supports lap data integration for enhanced accuracy
 */
export function transformIracingRaceResult(
  apiResult: GetResultResponse, 
  subsessionId: number,
  lapDataMap?: Map<number, LapDataItem[]>
): RecentRace | null {
  try {
    // Try to validate the API response structure
    let validatedResult: GetResultResponse;
    try {
      validatedResult = GetResultResponseSchema.parse(apiResult);
    } catch (error) {
      console.warn(`Schema validation failed for subsessionId ${subsessionId}, attempting fallback validation`);
      
      // Check if the response has essential fields for race result processing
      if (!apiResult || typeof apiResult !== 'object' || 
          !('subsessionId' in apiResult) || !('sessionResults' in apiResult)) {
        console.error(`Essential fields missing from API response for subsessionId ${subsessionId}`);
        return null;
      }
      
      // Use the raw response despite validation failure
      validatedResult = apiResult as GetResultResponse;
    }
    
    // Find the race session (primary session with results)
    let raceSession: SessionResult | undefined = validatedResult.sessionResults.find(
      (s) => s.simsessionName && s.simsessionName.toUpperCase().includes('RACE')
    );

    if (!raceSession && validatedResult.sessionResults.length) {
      // Try other common session names for race sessions
      raceSession = validatedResult.sessionResults.find(
        (s) => s.simsessionName && (
          s.simsessionName.toUpperCase().includes('FEATURE') ||
          s.simsessionName.toUpperCase().includes('MAIN') ||
          s.simsessionName.toUpperCase() === 'R' ||
          s.simsessionName.toUpperCase() === 'RACE SESSION'
        )
      );
      
      if (!raceSession) {
        if (validatedResult.sessionResults.length === 1) {
          raceSession = validatedResult.sessionResults[0];
        } else {
          // Fallback: pick the session with the most participants
          raceSession = validatedResult.sessionResults.reduce((prev, current) =>
            (prev.results.length > current.results.length) ? prev : current,
            validatedResult.sessionResults[0]
          );
        }
      }
    }

    if (!raceSession || !raceSession.results) {
      console.warn(`Could not determine a valid race session with results for subsessionId ${subsessionId}`);
      return null;
    }

    const { year, season } = getSeasonFromDate(new Date(validatedResult.startTime));
    const category = getCategoryFromSeriesName(validatedResult.seriesName);

    // Transform participants with enhanced lap data handling
    const participants: RaceParticipant[] = raceSession.results.map((result: RaceResult) => {
      // Get lap data for this participant if available
      const participantLapData = lapDataMap?.get(result.custId) || [];
      const transformedLaps = transformLapData(participantLapData);
      
      // Calculate fastest lap from actual lap data or fallback to API
      let fastestLap = 'N/A';
      if (transformedLaps.length > 0) {
        fastestLap = calculateFastestLap(transformedLaps);
      }
      
      // Fallback to API bestLapTime if no lap data available
      if (fastestLap === 'N/A' && result.bestLapTime && result.bestLapTime > 0 && result.bestLapTime < 999999) {
        fastestLap = formatLapTimeFrom10000ths(result.bestLapTime);
      }
      
      return {
        name: result.displayName,
        custId: result.custId,
        startPosition: result.startingPosition + 1, // Convert from 0-indexed to 1-indexed
        finishPosition: result.finishPosition + 1, // Convert from 0-indexed to 1-indexed  
        incidents: result.incidents,
        fastestLap,
        irating: result.newiRating,
        laps: transformedLaps,
        totalTime: result.interval >= 0 ? formatLapTime(result.interval) : 'N/A',
      };
    });

    // Calculate average stats from actual data
    const avgIncidents = participants.length > 0 
      ? participants.reduce((sum, p) => sum + p.incidents, 0) / participants.length 
      : 0;

    // Calculate average lap time from all valid laps
    const allValidLaps = participants.flatMap(p => p.laps?.filter(l => !l.invalid && l.time !== 'N/A') || []);
    const avgLapTimeMs = allValidLaps.length > 0
      ? allValidLaps.reduce((acc, l) => acc + lapTimeToSeconds(l.time) * 1000, 0) / allValidLaps.length
      : validatedResult.eventAverageLap; // Fallback to API average

    const avgLapTime = !isNaN(avgLapTimeMs) 
      ? (avgLapTimeMs > 1000 ? formatLapTime(avgLapTimeMs) : formatLapTimeFrom10000ths(avgLapTimeMs))
      : 'N/A';

    // Find our participant if we have race data (would need to be passed as parameter)
    const ourParticipant = participants[0]; // This would need to be determined based on who requested the data

    const recentRace: RecentRace = {
      id: subsessionId.toString(),
      trackName: validatedResult.track.trackName,
      date: validatedResult.startTime,
      year,
      season,
      category,
      seriesName: validatedResult.seriesName,
      startPosition: ourParticipant?.startPosition || 0,
      finishPosition: ourParticipant?.finishPosition || 0,
      incidents: ourParticipant?.incidents || 0,
      strengthOfField: validatedResult.eventStrengthOfField,
      lapsLed: ourParticipant ? 0 : 0, // Would need lap-by-lap data to calculate
      fastestLap: formatLapTimeFrom10000ths(validatedResult.eventBestLapTime),
      car: validatedResult.carClasses[0]?.name || 'Unknown Car',
      avgLapTime,
      iratingChange: 0, // Would need before/after comparison
      safetyRatingChange: 0, // Would need before/after comparison
      participants,
      avgRaceIncidents: parseFloat(avgIncidents.toFixed(2)),
      avgRaceLapTime: avgLapTime,
    };

    return recentRace;

  } catch (error) {
    console.error('Error transforming iRacing API result:', error);
    return null;
  }
}

/**
 * Validate an iRacing API response structure
 */
export function validateIracingRaceResult(data: unknown): data is GetResultResponse {
  try {
    GetResultResponseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate lap data response from iRacing API
 */
export function validateLapDataResponse(data: unknown): data is LapDataItem[] {
  try {
    // Handle both direct array and response object formats
    if (Array.isArray(data)) {
      // Use proper validation with updated schema
      data.forEach(item => LapDataItemSchema.parse(item));
      return true;
    } else if (data && typeof data === 'object' && 'lapData' in data) {
      const responseData = data as any;
      if (Array.isArray(responseData.lapData)) {
        // Use proper validation with updated schema
        responseData.lapData.forEach((item: unknown) => LapDataItemSchema.parse(item));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`[LAP VALIDATION ERROR] Schema validation failed:`, error);
    console.error(`[LAP DATA DEBUG] Invalid data structure:`, JSON.stringify(data, null, 2));
    return false;
  }
}

/**
 * Extract lap data array from API response (handles different response formats)
 */
export function extractLapDataFromResponse(response: unknown): LapDataItem[] {
  if (Array.isArray(response)) {
    return response;
  } else if (response && typeof response === 'object' && 'lapData' in response) {
    const responseData = response as any;
    if (Array.isArray(responseData.lapData)) {
      return responseData.lapData;
    }
  }
  return [];
}

/**
 * Get the fastest lap time from a list of participants
 */
export function getOverallFastestLap(participants: RaceParticipant[]): string {
  if (!participants.length) return 'N/A';
  
  let fastestLap = '99:99.999';
  let fastestMs = Infinity;

  participants.forEach(p => {
    if (p.fastestLap && p.fastestLap !== 'N/A') {
      const lapTimeToMs = (time: string): number => {
        if (!time || !time.includes(':') || !time.includes('.')) return Infinity;
        const parts = time.split(':');
        const minutes = parseInt(parts[0], 10);
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0], 10);
        const ms = parseInt(secondsParts[1], 10);
        return (minutes * 60 + seconds) * 1000 + ms;
      };

      const currentMs = lapTimeToMs(p.fastestLap);
      if (currentMs < fastestMs) {
        fastestMs = currentMs;
        fastestLap = p.fastestLap;
      }
    }
  });

  return fastestLap === '99:99.999' ? 'N/A' : fastestLap;
}

/**
 * Parse a simple lap time string to milliseconds for comparison
 */
export function lapTimeToMs(time: string): number {
  if (!time || !time.includes(':') || !time.includes('.')) return Infinity;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  return (minutes * 60 + seconds) * 1000 + ms;
}
