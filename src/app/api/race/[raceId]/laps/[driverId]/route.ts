import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultAction } from '@/app/data-actions';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';
import { type RecentRace } from '@/lib/mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string; driverId: string }> }
) {
  try {
    const { raceId: raceIdParam, driverId: driverIdParam } = await params;
    const raceId = parseInt(raceIdParam, 10);
    const driverName = decodeURIComponent(driverIdParam);

    if (isNaN(raceId) || !driverName) {
      return NextResponse.json(
        { error: 'Invalid race ID or driver name' },
        { status: 400 }
      );
    }

    // Check cache first for lap data
    const cacheKey = cacheKeys.lapTimes(raceId, driverName);
    const cachedLapData = cache.get(cacheKey);
    if (cachedLapData) {
      return NextResponse.json(cachedLapData);
    }

    // Get the full race data (this will use its own caching)
    const { data: race, error } = await getRaceResultAction(raceId);

    if (error || !race) {
      return NextResponse.json(
        { error: error || 'Race not found' },
        { status: 404 }
      );
    }

    // Type assertion for the race data
    const raceData = race as RecentRace;

    // Find the specific driver in the race by name
    const participant = raceData.participants?.find((p: any) => p.name === driverName);
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Driver not found in this race' },
        { status: 404 }
      );
    }

    // Create lap data response
    const lapData = {
      driverName: participant.name,
      raceId: raceId,
      laps: participant.laps || [],
      fastestLap: participant.fastestLap,
      totalLaps: participant.laps?.length || 0
    };

    // Cache the lap data
    cache.set(cacheKey, lapData, cacheTTL.LAP_TIMES);

    return NextResponse.json(lapData);

  } catch (error) {
    console.error('Error in lap data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lap data' },
      { status: 500 }
    );
  }
}
