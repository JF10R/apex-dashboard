import { NextResponse } from 'next/server';
import { getCarName, getCarCacheStats, preWarmCarCache } from '@/lib/iracing-api-core';

export async function GET() {
  try {
    console.log('🧪 Testing car name lookup performance...');
    
    // Show initial cache stats
    const initialStats = getCarCacheStats();
    console.log('📊 Initial cache stats:', initialStats);
    
    // Pre-warm cache if needed
    await preWarmCarCache();
    
    // Test with some common car IDs (these should be real iRacing car IDs)
    const testCarIds = [173, 203, 5, 1, 2]; // Mix of car IDs from your data
    
    const startTime = Date.now();
    
    // First round - should fetch from API and cache
    console.log('📥 First round - loading into cache...');
    const firstRoundPromises = testCarIds.map(async (carId) => {
      const start = Date.now();
      const carName = await getCarName(carId);
      const end = Date.now();
      return { carId, carName, timeMs: end - start };
    });
    const firstRoundResults = await Promise.all(firstRoundPromises);
    
    const afterFirstRound = Date.now();
    
    // Second round - should use cache (much faster)
    console.log('⚡ Second round - using cache...');
    const secondRoundPromises = testCarIds.map(async (carId) => {
      const start = Date.now();
      const carName = await getCarName(carId);
      const end = Date.now();
      return { carId, carName, timeMs: end - start };
    });
    const secondRoundResults = await Promise.all(secondRoundPromises);
    
    const endTime = Date.now();
    const finalStats = getCarCacheStats();
    
    return NextResponse.json({
      success: true,
      cacheStats: {
        initial: initialStats,
        final: finalStats,
      },
      performance: {
        firstRoundTime: afterFirstRound - startTime,
        secondRoundTime: endTime - afterFirstRound,
        totalTime: endTime - startTime,
        speedImprovement: `${Math.round(((afterFirstRound - startTime) / (endTime - afterFirstRound)) * 100) / 100}x faster`,
      },
      results: {
        firstRound: firstRoundResults,
        secondRound: secondRoundResults,
      },
      cacheTest: {
        allMatching: firstRoundResults.every((first, index) => 
          first.carName === secondRoundResults[index].carName
        ),
        averageFirstRoundTime: Math.round(firstRoundResults.reduce((sum, r) => sum + r.timeMs, 0) / firstRoundResults.length),
        averageSecondRoundTime: Math.round(secondRoundResults.reduce((sum, r) => sum + r.timeMs, 0) / secondRoundResults.length),
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Car lookup test error:', error);
    return NextResponse.json(
      { error: 'Failed to test car lookup performance', details: error },
      { status: 500 }
    );
  }
}
