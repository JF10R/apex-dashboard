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
    const driverId = parseInt(driverIdParam, 10);

    if (isNaN(raceId) || isNaN(driverId)) {
      return NextResponse.json(
        { error: 'Invalid race ID or driver ID' },
        { status: 400 }
      );
    }

    // Check cache first for lap data
    const cacheKey = cacheKeys.lapTimes(raceId, driverId.toString());
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

    // Debug logging
    console.log(`Looking for driver ID: ${driverId}`);
    console.log(`Available participants: ${raceData.participants?.map(p => `${p.custId}:"${p.name}"`).join(', ')}`);
    
    // Find the specific driver in the race by custId
    const participant = raceData.participants?.find((p: any) => p.custId === driverId);
    
    if (!participant) {
      console.log(`Driver ID ${driverId} not found in race ${raceId}`);
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
