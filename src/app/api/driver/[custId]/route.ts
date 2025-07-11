import { NextRequest, NextResponse } from 'next/server';
import { getDriverPageData } from '@/app/data-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ custId: string }> }
) {
  try {
    const { custId: custIdParam } = await params;
    const custId = parseInt(custIdParam);
    
    if (isNaN(custId)) {
      return NextResponse.json(
        { error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if force refresh is requested
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const result = await getDriverPageData(custId, forceRefresh);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      driver: result.data,
      custId: custId,
      timestamp: new Date().toISOString(),
      fromCache: result.fromCache || false,
      cacheAge: result.cacheAge,
      warning: result.error // Include any warnings about using cached data
    });
  } catch (error) {
    console.error('API Error in /api/driver/[custId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
