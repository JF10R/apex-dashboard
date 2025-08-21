import { NextResponse } from 'next/server';
import { 
  getCategoryId, 
  getCategoryName, 
  getConstantsCacheStats, 
  preWarmConstantsCache 
} from '@/lib/iracing-api-core';

export async function GET() {
  // Only allow test endpoints in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Test endpoints not available in production' }, { status: 404 });
  }

  try {
    console.log('🧪 Testing constants lookup performance...');
    
    // Show initial cache stats
    const initialStats = getConstantsCacheStats();
    console.log('📊 Initial constants cache stats:', initialStats);
    
    // Pre-warm cache if needed
    await preWarmConstantsCache();
    
    // Test category lookups with common category names
    const testCategories = [
      'Road', 'Oval', 'Dirt', 'Sports Car', 'Formula Car', 'Prototype', 'Dirt Oval'
    ];
    
    const startTime = Date.now();
    
    // Test category name -> ID lookups
    console.log('📥 Testing category name -> ID lookups...');
    const categoryIdResults = await Promise.all(
      testCategories.map(async (categoryName) => {
        const start = Date.now();
        const categoryId = await getCategoryId(categoryName);
        const end = Date.now();
        return { categoryName, categoryId, timeMs: end - start };
      })
    );
    
    const afterIdLookups = Date.now();
    
    // Test category ID -> name lookups (reverse lookup)
    console.log('📤 Testing category ID -> name lookups...');
    const validIds = categoryIdResults
      .filter(result => result.categoryId !== null)
      .map(result => result.categoryId!);
    
    const categoryNameResults = await Promise.all(
      validIds.map(async (categoryId) => {
        const start = Date.now();
        const categoryName = await getCategoryName(categoryId);
        const end = Date.now();
        return { categoryId, categoryName, timeMs: end - start };
      })
    );
    
    const endTime = Date.now();
    const finalStats = getConstantsCacheStats();
    
    return NextResponse.json({
      success: true,
      cacheStats: {
        initial: initialStats,
        final: finalStats,
      },
      performance: {
        categoryIdLookupsTime: afterIdLookups - startTime,
        categoryNameLookupsTime: endTime - afterIdLookups,
        totalTime: endTime - startTime,
        averageIdLookupTime: Math.round((afterIdLookups - startTime) / testCategories.length),
        averageNameLookupTime: validIds.length > 0 ? Math.round((endTime - afterIdLookups) / validIds.length) : 0,
      },
      results: {
        categoryIdLookups: categoryIdResults,
        categoryNameLookups: categoryNameResults,
      },
      analysis: {
        foundCategories: categoryIdResults.filter(r => r.categoryId !== null).length,
        totalTested: testCategories.length,
        successRate: `${Math.round((categoryIdResults.filter(r => r.categoryId !== null).length / testCategories.length) * 100)}%`,
        availableCategories: finalStats.availableCategories,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Constants lookup test error:', error);
    return NextResponse.json(
      { error: 'Failed to test constants lookup performance', details: error },
      { status: 500 }
    );
  }
}
