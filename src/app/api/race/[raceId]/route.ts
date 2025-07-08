import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultAction } from '@/app/data-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  try {
    const raceId = parseInt(params.raceId);
    
    if (isNaN(raceId)) {
      return NextResponse.json(
        { error: 'Invalid race ID' },
        { status: 400 }
      );
    }

    const result = await getRaceResultAction(raceId);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      race: result.data,
      raceId: raceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in /api/race/[raceId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
