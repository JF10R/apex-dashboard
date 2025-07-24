import { NextRequest, NextResponse } from 'next/server';
import { getRaceResultDataProgressive, type ProgressiveLoadingCallbacks } from '@/lib/iracing-api-core';
import { type RecentRace, type Lap } from '@/lib/iracing-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  try {
    const { raceId: raceIdParam } = await params;
    const raceId = parseInt(raceIdParam, 10);

    if (isNaN(raceId)) {
      return NextResponse.json(
        { error: 'Invalid race ID' },
        { status: 400 }
      );
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    
    const customReadable = new ReadableStream({
      start(controller) {
        // Start the progressive loading process
        getRaceResultDataProgressive(raceId, {
          onInitialData: (race: RecentRace) => {
            const data = JSON.stringify({ type: 'initial', race }) + '\n';
            controller.enqueue(encoder.encode(data));
          },
          
          onProgress: (processed: number, total: number, currentParticipant?: string) => {
            const data = JSON.stringify({ 
              type: 'progress', 
              processed, 
              total, 
              currentParticipant 
            }) + '\n';
            controller.enqueue(encoder.encode(data));
          },
          
          onParticipantUpdate: (custId: number, laps: Lap[]) => {
            const data = JSON.stringify({ 
              type: 'participant_update', 
              custId, 
              laps 
            }) + '\n';
            controller.enqueue(encoder.encode(data));
          },
          
          onComplete: (race: RecentRace) => {
            const data = JSON.stringify({ type: 'complete', race }) + '\n';
            controller.enqueue(encoder.encode(data));
            controller.close();
          },
          
          onError: (error: Error) => {
            const data = JSON.stringify({ 
              type: 'error', 
              message: error.message 
            }) + '\n';
            controller.enqueue(encoder.encode(data));
            controller.close();
          }
        } as ProgressiveLoadingCallbacks).catch((error: Error) => {
          const data = JSON.stringify({ 
            type: 'error', 
            message: error.message 
          }) + '\n';
          controller.enqueue(encoder.encode(data));
          controller.close();
        });
      }
    });

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in progressive race API:', error);
    return NextResponse.json(
      { error: 'Failed to load race data' },
      { status: 500 }
    );
  }
}
