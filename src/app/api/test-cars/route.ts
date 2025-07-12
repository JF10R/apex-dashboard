import { NextResponse } from 'next/server';
import { 
  getCarName, 
  getCarCacheStats, 
  preWarmCarCache,
  getCategoryId,
  getConstantsCacheStats,
  preWarmConstantsCache 
} from '@/lib/iracing-api-core';

export async function GET() {
  try {
    console.log('🧪 Testing car name and constants lookup performance...');
    
    // Show initial cache stats
    const initialCarStats = getCarCacheStats();
    const initialConstantsStats = getConstantsCacheStats();
    console.log('📊 Initial cache stats:', { cars: initialCarStats, constants: initialConstantsStats });
    
    // Pre-warm caches if needed
    await Promise.all([
      preWarmCarCache(),
      preWarmConstantsCache()
    ]);
    
    // Test with some common car IDs and categories
    const testCarIds = [173, 203, 5, 1, 2]; // Mix of car IDs from your data
    const testCategories = ['Road', 'Oval', 'Dirt', 'Sports Car'];
    
    const startTime = Date.now();
    
    // Test car lookups
    console.log('� Testing car name lookups...');
    const carResults = await Promise.all(
      testCarIds.map(async (carId) => {
        const start = Date.now();
        const carName = await getCarName(carId);
        const end = Date.now();
        return { carId, carName, timeMs: end - start };
      })
    );
    
    const afterCarLookups = Date.now();
    
    // Test category lookups
    console.log('📊 Testing category lookups...');
    const categoryResults = await Promise.all(
      testCategories.map(async (categoryName) => {
        const start = Date.now();
        const categoryId = await getCategoryId(categoryName);
        const end = Date.now();
        return { categoryName, categoryId, timeMs: end - start };
      })
    );
    
    const endTime = Date.now();
    
    // Get final stats
    const finalCarStats = getCarCacheStats();
    const finalConstantsStats = getConstantsCacheStats();
    
    return NextResponse.json({
      success: true,
      cacheStats: {
        cars: {
          initial: initialCarStats,
          final: finalCarStats,
        },
        constants: {
          initial: initialConstantsStats,
          final: finalConstantsStats,
        },
      },
      performance: {
        carLookupsTime: afterCarLookups - startTime,
        categoryLookupsTime: endTime - afterCarLookups,
        totalTime: endTime - startTime,
        averageCarLookupTime: Math.round((afterCarLookups - startTime) / testCarIds.length),
        averageCategoryLookupTime: Math.round((endTime - afterCarLookups) / testCategories.length),
      },
      results: {
        cars: carResults,
        categories: categoryResults,
      },
      analysis: {
        carsFound: carResults.filter(r => !r.carName.startsWith('Car ')).length,
        categoriesFound: categoryResults.filter(r => r.categoryId !== null).length,
        availableCategories: finalConstantsStats.availableCategories,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Lookup test error:', error);
    return NextResponse.json(
      { error: 'Failed to test lookup performance', details: error },
      { status: 500 }
    );
  }
}
