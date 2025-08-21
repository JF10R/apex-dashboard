import { NextResponse } from 'next/server';
import { 
  getMemberSummary,
  getMemberRecentRaces,
  getMemberCareer,
  getMemberChartData,
  getSeasonResults,
  clearAllCaches,
  getComprehensiveCacheStats
} from '@/lib/iracing-api-core';

export async function GET(request: Request) {
  // Only allow test endpoints in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints not available in production' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const custId = parseInt(searchParams.get('custId') || '539129');
    const clearCache = searchParams.get('clearCache') === 'true';
    
    console.log('🧪 Testing enhanced modular APIs...');
    
    if (clearCache) {
      clearAllCaches();
      console.log('🗑️ Cleared all caches');
    }
    
    // Show initial cache stats
    const initialCacheStats = getComprehensiveCacheStats();
    console.log('📊 Initial cache stats:', initialCacheStats);
    
    const startTime = Date.now();
    
    // Test enhanced Stats APIs
    console.log('📊 Testing Stats APIs...');
    const [
      memberSummary,
      memberRecentRaces,
      memberCareer,
      iRatingChart,
      safetyRatingChart
    ] = await Promise.all([
      getMemberSummary(custId),
      getMemberRecentRaces(custId),
      getMemberCareer(custId),
      getMemberChartData(custId, 1, 'irating'), // iRating chart for Road
      getMemberChartData(custId, 1, 'safety_rating'), // Safety Rating chart for Road
    ]);
    
    const afterStatsTime = Date.now();
    
    // Test enhanced Results APIs with recent race data
    console.log('🏁 Testing Results APIs...');
    let subsessionResults = null;
    
    if (memberRecentRaces && memberRecentRaces.length > 0) {
      const recentRace = memberRecentRaces[0];
      subsessionResults = await getSeasonResults(recentRace.season_id || 0, recentRace.event_type || 5, recentRace.race_week_num || 1);
    }
    
    const endTime = Date.now();
    
    // Get final cache stats
    const finalCacheStats = getComprehensiveCacheStats();
    
    return NextResponse.json({
      success: true,
      custId,
      performance: {
        statsTime: afterStatsTime - startTime,
        resultsTime: endTime - afterStatsTime,
        totalTime: endTime - startTime,
      },
      cacheStats: {
        initial: initialCacheStats,
        final: finalCacheStats,
      },
      data: {
        stats: {
          summary: memberSummary,
          recentRacesCount: memberRecentRaces?.length || 0,
          careerStats: memberCareer?.length || 0,
          charts: {
            iRating: iRatingChart?.chart_data?.length || 0,
            safetyRating: safetyRatingChart?.chart_data?.length || 0,
          },
        },
        results: {
          subsessionResults: subsessionResults ? 'loaded' : 'not available',
          recentRaceSubsessionId: memberRecentRaces?.[0]?.subsession_id || null,
        },
      },
      analysis: {
        statsAPIsWorking: {
          memberSummary: !!memberSummary,
          memberRecentRaces: !!memberRecentRaces,
          memberCareer: !!memberCareer,
          chartData: !!(iRatingChart && safetyRatingChart),
        },
        resultsAPIsWorking: {
          subsessionResults: !!subsessionResults,
        },
        cacheWorking: {
          overall: 'Cache stats available in response',
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Enhanced API test error:', error);
    return NextResponse.json(
      { error: 'Failed to test enhanced APIs', details: error },
      { status: 500 }
    );
  }
}
