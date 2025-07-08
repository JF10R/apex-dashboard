import { NextRequest, NextResponse } from 'next/server';
import { searchDriversAction, getDriverPageData } from '@/app/data-actions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const query = searchParams.get('query');
  const custId = searchParams.get('custId');

  try {
    if (action === 'search' && query) {
      const result = await searchDriversAction(query);
      return NextResponse.json(result);
    }
    
    if (action === 'driver' && custId) {
      const result = await getDriverPageData(parseInt(custId));
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
