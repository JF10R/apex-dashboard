import { NextResponse } from 'next/server';
import { 
  getMemberSummary,
  getMemberRecentRaces,
  getMemberCareer,
  getMemberRecap,
  getMemberChartData,
  getResultsEventLog,
  getResultsLapChartData,
  clearStatsCache,
  clearResultsCache,
  getStatsCacheStats,
  getResultsCacheStats
} from '@/lib/iracing-api-core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const custId = parseInt(searchParams.get('custId') || '539129');
    const clearCache = searchParams.get('clearCache') === 'true';
    
    console.log('🧪 Testing enhanced Stats and Results APIs...');
    
    if (clearCache) {
      clearStatsCache();
      clearResultsCache();
      console.log('🗑️ Cleared all caches');
    }
    
    // Show initial cache stats
    const initialStatsCache = getStatsCacheStats();
    const initialResultsCache = getResultsCacheStats();
    console.log('📊 Initial cache stats:', { stats: initialStatsCache, results: initialResultsCache });
    
    const startTime = Date.now();
    
    // Test enhanced Stats APIs
    console.log('📊 Testing Stats APIs...');
    const [
      memberSummary,
      memberRecentRaces,
      memberCareer,
      memberRecap,
      iRatingChart,
      safetyRatingChart
    ] = await Promise.all([
      getMemberSummary(custId),
      getMemberRecentRaces(custId),
      getMemberCareer(custId),
      getMemberRecap(custId),
      getMemberChartData(custId, 1, 2), // iRating chart for Road
      getMemberChartData(custId, 3, 2), // Safety Rating chart for Road
    ]);
    
    const afterStatsTime = Date.now();
    
    // Test enhanced Results APIs with recent race data
    console.log('🏁 Testing Results APIs...');
    let eventLog = null;
    let lapChartData = null;
    
    if (memberRecentRaces?.races && memberRecentRaces.races.length > 0) {
      const recentRace = memberRecentRaces.races[0];
      [eventLog, lapChartData] = await Promise.all([
        getResultsEventLog(recentRace.subsessionId),
        getResultsLapChartData(recentRace.subsessionId),
      ]);
    }
    
    const endTime = Date.now();
    
    // Get final cache stats
    const finalStatsCache = getStatsCacheStats();
    const finalResultsCache = getResultsCacheStats();
    
    return NextResponse.json({
      success: true,
      custId,
      performance: {
        statsTime: afterStatsTime - startTime,
        resultsTime: endTime - afterStatsTime,
        totalTime: endTime - startTime,
      },
      cacheStats: {
        stats: {
          initial: initialStatsCache,
          final: finalStatsCache,
        },
        results: {
          initial: initialResultsCache,
          final: finalResultsCache,
        },
      },
      data: {
        stats: {
          summary: memberSummary,
          recentRacesCount: memberRecentRaces?.races?.length || 0,
          careerStats: memberCareer?.stats?.length || 0,
          recap: memberRecap ? { year: memberRecap.year, hasData: !!memberRecap.stats } : null,
          charts: {
            iRating: iRatingChart?.data?.length || 0,
            safetyRating: safetyRatingChart?.data?.length || 0,
          },
        },
        results: {
          eventLogEntries: eventLog?.eventLog?.length || 0,
          lapChartEntries: lapChartData?.lapChartData?.length || 0,
          recentRaceSubsessionId: memberRecentRaces?.races?.[0]?.subsessionId || null,
        },
      },
      analysis: {
        statsAPIsWorking: {
          memberSummary: !!memberSummary,
          memberRecentRaces: !!memberRecentRaces,
          memberCareer: !!memberCareer,
          memberRecap: !!memberRecap,
          chartData: !!(iRatingChart && safetyRatingChart),
        },
        resultsAPIsWorking: {
          eventLog: !!eventLog,
          lapChartData: !!lapChartData,
        },
        cacheWorking: {
          statsEntriesAdded: finalStatsCache.activeEntries - initialStatsCache.activeEntries,
          resultsEntriesAdded: finalResultsCache.activeEntries - initialResultsCache.activeEntries,
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
