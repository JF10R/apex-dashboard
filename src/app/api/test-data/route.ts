import { NextResponse } from 'next/server';
import { 
  getMemberProfile,
  getMemberRecentRaces,
  getMemberSummary,
  getMemberCareer,
  getMemberChartData
} from '@/lib/iracing-api-core';

export async function GET(request: Request) {
  // Only allow test endpoints in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints not available in production' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const custId = parseInt(searchParams.get('custId') || '539129');
    
    console.log(`🔍 Testing data for customer ID: ${custId}`);
    
    // Get all available data
    const [
      memberProfile,
      recentRaces,
      memberSummary,
      memberCareer,
      iRatingChart,
      safetyRatingChart
    ] = await Promise.all([
      getMemberProfile(custId),
      getMemberRecentRaces(custId),
      getMemberSummary(custId),
      getMemberCareer(custId),
      getMemberChartData(custId, 1, 'irating'),
      getMemberChartData(custId, 1, 'safety_rating')
    ]);

    return NextResponse.json({
      success: true,
      custId,
      data: {
        memberProfile,
        recentRaces,
        memberSummary,
        memberCareer,
        charts: {
          iRating: iRatingChart,
          safetyRating: safetyRatingChart
        }
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Data test error:', error);
    return NextResponse.json(
      { error: 'Failed to test data', details: error },
      { status: 500 }
    );
  }
}
