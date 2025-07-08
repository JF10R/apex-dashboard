import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultAction } from '@/app/data-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { raceId: string; driverId: string } }
) {
  try {
    const raceId = parseInt(params.raceId, 10);
    const driverName = decodeURIComponent(params.driverId);

    if (isNaN(raceId) || !driverName) {
      return NextResponse.json(
        { error: 'Invalid race ID or driver name' },
        { status: 400 }
      );
    }

    // Get the full race data
    const { data: race, error } = await getRaceResultAction(raceId);

    if (error || !race) {
      return NextResponse.json(
        { error: error || 'Race not found' },
        { status: 404 }
      );
    }

    // Find the specific driver in the race by name
    const participant = race.participants.find(p => p.name === driverName);
    
    if (!participant) {
      return NextResponse.json(
        { error: 'Driver not found in this race' },
        { status: 404 }
      );
    }

    // Return the lap data for this specific driver
    return NextResponse.json({
      driverName: participant.name,
      raceId: raceId,
      laps: participant.laps || [],
      fastestLap: participant.fastestLap,
      totalLaps: participant.laps?.length || 0
    });

  } catch (error) {
    console.error('Error in lap data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lap data' },
      { status: 500 }
    );
  }
}
