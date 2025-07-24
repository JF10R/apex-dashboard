import { NextResponse } from 'next/server';
import { ensureApiInitialized } from '@/lib/iracing-auth';

export async function GET(request: Request) {
  // Only allow test endpoints in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints not available in production' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const custId = parseInt(searchParams.get('custId') || '539129');
    
    console.log(`🔍 Testing raw API for customer ID: ${custId}`);
    
    const iracingApi = await ensureApiInitialized();
    
    // Test the raw API calls
    console.log('Testing member summary...');
    const summaryResponse = await iracingApi.stats.getMemberSummary({
      customerId: custId,
    });
    
    console.log('Testing member career...');
    const careerResponse = await iracingApi.stats.getMemberCareer({
      customerId: custId,
    });
    
    console.log('Testing member recent races...');
    const recentRacesResponse = await iracingApi.stats.getMemberRecentRaces({
      customerId: custId,
    });

    return NextResponse.json({
      success: true,
      custId,
      rawResponses: {
        summary: summaryResponse,
        career: careerResponse,
        recentRaces: recentRacesResponse
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Raw API test error:', error);
    return NextResponse.json(
      { error: 'Failed to test raw API', details: error },
      { status: 500 }
    );
  }
}
