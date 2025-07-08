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

    const result = await getDriverPageData(custId);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      driver: result.data,
      custId: custId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error in /api/driver/[custId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
