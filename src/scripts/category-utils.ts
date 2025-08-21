/**
 * Category Mapping Utilities
 * 
 * This script provides utilities for managing and debugging the CategoryMappingService.
 */

import { CategoryMappingService } from '../lib/category-mapping-service';

/**
 * Pre-warm the category mapping cache
 */
export async function preWarmCache(): Promise<void> {
  console.log('🔥 Pre-warming category mapping cache...');
  try {
    await CategoryMappingService.preWarmCache();
    console.log('✅ Cache pre-warmed successfully');
  } catch (error) {
    console.error('❌ Failed to pre-warm cache:', error);
    throw error;
  }
}

/**
 * Display cache statistics and debugging information
 */
export async function showCacheInfo(): Promise<void> {
  console.log('📊 Category Mapping Cache Information\n');
  
  const stats = CategoryMappingService.getCacheStats();
  console.log('Cache Statistics:');
  console.log(`  Status: ${stats.isValid ? '✅ Valid' : '❌ Invalid/Expired'}`);
  console.log(`  Categories: ${stats.categoriesCount}`);
  console.log(`  Cars: ${stats.carsCount}`);
  console.log(`  API Categories: ${stats.apiCategoriesCount}`);
  console.log(`  Expires: ${stats.expiresAt}`);
  console.log(`  Time until expiry: ${stats.timeUntilExpiry}`);
  console.log('');

  try {
    const availableCategories = await CategoryMappingService.getAvailableCategories();
    console.log('Available API Categories:');
    if (availableCategories.length > 0) {
      availableCategories.forEach(category => {
        console.log(`  - ${category}`);
      });
    } else {
      console.log('  (No categories available - cache may be empty)');
    }
  } catch (error) {
    console.log('  (Error retrieving categories:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Test category mappings for common categories
 */
export async function testCommonMappings(): Promise<void> {
  console.log('🧪 Testing Common Category Mappings\n');
  
  const testCases = [
    { input: 'Sports Car', expected: 'API lookup or fallback to ID 2' },
    { input: 'Formula Car', expected: 'API lookup or fallback to ID 2' },
    { input: 'Prototype', expected: 'API lookup or fallback to ID 2' },
    { input: 'Oval', expected: 'API lookup or fallback to ID 1' },
    { input: 'Dirt Oval', expected: 'API lookup or fallback to ID 3' },
    { input: 'Road', expected: 'Direct API lookup' },
    { input: 'Dirt', expected: 'Direct API lookup' },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.input}`);
    
    try {
      const apiId = await CategoryMappingService.getCategoryId(testCase.input);
      const fallbackId = CategoryMappingService.getFallbackCategoryId(testCase.input as any);
      const enhancedId = await CategoryMappingService.getCategoryIdWithFallback(testCase.input);
      
      console.log(`  API ID: ${apiId}`);
      console.log(`  Fallback ID: ${fallbackId}`);
      console.log(`  Enhanced ID: ${enhancedId}`);
      console.log(`  Expected: ${testCase.expected}`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');
  }
}

/**
 * Clear the cache
 */
export function clearCache(): void {
  console.log('🗑️ Clearing category mapping cache...');
  CategoryMappingService.clearCache();
  console.log('✅ Cache cleared');
}

/**
 * Full diagnostic run
 */
export async function runDiagnostics(): Promise<void> {
  console.log('🔍 Running Category Mapping Diagnostics\n');
  console.log('='.repeat(50));
  
  try {
    await showCacheInfo();
    console.log('='.repeat(50));
    
    await testCommonMappings();
    console.log('='.repeat(50));
    
    // Test performance
    console.log('⚡ Performance Test\n');
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    console.log(`${iterations} lookups: ${endTime - startTime}ms total`);
    console.log(`Average: ${avgTime.toFixed(2)}ms per lookup`);
    
    if (avgTime < 5) {
      console.log('✅ Performance: Excellent');
    } else if (avgTime < 20) {
      console.log('✅ Performance: Good');
    } else {
      console.log('⚠️ Performance: May need optimization');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Diagnostics completed');
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
  }
}

/**
 * Command-line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'prewarm':
      await preWarmCache();
      break;
      
    case 'info':
      await showCacheInfo();
      break;
      
    case 'test':
      await testCommonMappings();
      break;
      
    case 'clear':
      clearCache();
      break;
      
    case 'diagnostics':
      await runDiagnostics();
      break;
      
    case 'help':
    default:
      console.log('Category Mapping Utilities');
      console.log('');
      console.log('Usage: node category-utils.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  prewarm     - Pre-warm the category mapping cache');
      console.log('  info        - Show cache information');
      console.log('  test        - Test common category mappings');
      console.log('  clear       - Clear the cache');
      console.log('  diagnostics - Run full diagnostics');
      console.log('  help        - Show this help message');
      break;
  }
}

// Run CLI if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}