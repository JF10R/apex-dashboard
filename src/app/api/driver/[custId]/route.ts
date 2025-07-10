import { NextRequest, NextResponse } from 'next/server';
import { getDriverPageData } from '@/app/data-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { custId: string } }
) {
  try {
    const custId = parseInt(params.custId);
    
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
      fromCache: !forceRefresh
    });
  } catch (error) {
    console.error('API Error in /api/driver/[custId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
