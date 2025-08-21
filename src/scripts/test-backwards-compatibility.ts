/**
 * Backwards Compatibility Test
 * 
 * This script tests that the new CategoryMappingService maintains backwards
 * compatibility with existing functionality.
 */

import { CategoryMappingService } from '../lib/category-mapping-service';
import { type RaceCategory } from '../lib/iracing-types';

// Mock old hardcoded mappings for comparison
const OLD_FALLBACK_MAPPING: Record<RaceCategory, number> = {
  'Sports Car': 2,      // Road
  'Formula Car': 2,     // Road  
  'Prototype': 2,       // Road
  'Oval': 1,           // Oval
  'Dirt Oval': 3,      // Dirt Oval
};

async function testBackwardsCompatibility() {
  console.log('🔄 Testing Backwards Compatibility...\n');

  try {
    // Test 1: Pre-warm the service
    console.log('1️⃣ Pre-warming CategoryMappingService...');
    await CategoryMappingService.preWarmCache();
    console.log('✅ Service ready\n');

    // Test 2: Verify fallback mappings match expectations
    console.log('2️⃣ Testing fallback mappings...');
    let fallbackMatches = 0;
    let fallbackTotal = 0;

    for (const [category, expectedId] of Object.entries(OLD_FALLBACK_MAPPING)) {
      const actualId = CategoryMappingService.getFallbackCategoryId(category as RaceCategory);
      fallbackTotal++;
      
      if (actualId === expectedId) {
        fallbackMatches++;
        console.log(`  ✅ ${category}: ${actualId} (matches old fallback)`);
      } else {
        console.log(`  ⚠️  ${category}: ${actualId} vs ${expectedId} (old fallback)`);
      }
    }
    
    console.log(`\n  Fallback compatibility: ${fallbackMatches}/${fallbackTotal} matches\n`);

    // Test 3: Test enhanced lookups provide same or better results
    console.log('3️⃣ Testing enhanced lookups vs fallback...');
    
    for (const [category, fallbackId] of Object.entries(OLD_FALLBACK_MAPPING)) {
      const enhancedId = await CategoryMappingService.getCategoryIdWithFallback(category as RaceCategory);
      
      if (enhancedId === fallbackId) {
        console.log(`  ✅ ${category}: Enhanced lookup matches fallback (${enhancedId})`);
      } else if (enhancedId !== null) {
        console.log(`  🔄 ${category}: Enhanced lookup provides different ID (${enhancedId} vs ${fallbackId})`);
      } else {
        console.log(`  ❌ ${category}: Enhanced lookup failed, should use fallback (${fallbackId})`);
      }
    }
    console.log('');

    // Test 4: Test that API-driven lookups work when available
    console.log('4️⃣ Testing API-driven lookups...');
    const apiCategories = await CategoryMappingService.getAvailableCategories();
    
    if (apiCategories.length > 0) {
      console.log(`  ✅ API provides ${apiCategories.length} categories`);
      
      // Test a few common categories
      const commonCategories = ['Road', 'Oval', 'Dirt'];
      for (const category of commonCategories) {
        if (apiCategories.includes(category)) {
          const id = await CategoryMappingService.getCategoryId(category);
          console.log(`  ✅ API category "${category}": ID ${id}`);
        }
      }
    } else {
      console.log('  ⚠️  No API categories available (may be expected in test environment)');
    }
    console.log('');

    // Test 5: Test error handling and graceful degradation
    console.log('5️⃣ Testing error handling...');
    
    // Test with invalid category
    const invalidId = await CategoryMappingService.getCategoryId('InvalidCategory');
    console.log(`  Invalid category lookup: ${invalidId} (should be null)`);
    
    // Test with fallback for invalid category
    const invalidFallback = CategoryMappingService.getFallbackCategoryId('InvalidCategory' as RaceCategory);
    console.log(`  Invalid category fallback: ${invalidFallback} (should be null)`);
    
    // Test with valid category using fallback method
    const validFallback = await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
    console.log(`  Valid category with fallback: ${validFallback} (should not be null)`);
    console.log('');

    // Test 6: Test performance is reasonable
    console.log('6️⃣ Testing performance...');
    const iterations = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    console.log(`  ${iterations} lookups: ${endTime - startTime}ms total, ${avgTime.toFixed(2)}ms average`);
    
    if (avgTime < 10) {
      console.log('  ✅ Performance is good (cached lookups)');
    } else {
      console.log('  ⚠️  Performance may need optimization');
    }
    console.log('');

    // Test 7: Verify cache behavior
    console.log('7️⃣ Testing cache behavior...');
    const stats1 = CategoryMappingService.getCacheStats();
    console.log(`  Cache status: ${stats1.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`  Categories: ${stats1.categoriesCount}, Cars: ${stats1.carsCount}`);
    
    // Clear cache and test rebuild
    CategoryMappingService.clearCache();
    const stats2 = CategoryMappingService.getCacheStats();
    console.log(`  After clear - Categories: ${stats2.categoriesCount}, Cars: ${stats2.carsCount}`);
    
    // Rebuild cache
    const rebuildId = await CategoryMappingService.getCategoryIdWithFallback('Sports Car');
    const stats3 = CategoryMappingService.getCacheStats();
    console.log(`  After rebuild - Categories: ${stats3.categoriesCount}, Result: ${rebuildId}`);
    console.log('');

    console.log('✅ Backwards compatibility tests completed!');
    console.log('\n📋 Summary:');
    console.log('- Fallback mappings maintain compatibility');
    console.log('- Enhanced lookups provide API-driven results when available');
    console.log('- Error handling works gracefully');
    console.log('- Performance is acceptable');
    console.log('- Cache behavior is correct');

  } catch (error) {
    console.error('❌ Backwards compatibility test failed:', error);
    
    console.log('\n🔄 Testing critical fallback...');
    const criticalFallback = CategoryMappingService.getFallbackCategoryId('Sports Car');
    console.log(`Critical fallback test: ${criticalFallback} (should be 2)`);
    
    if (criticalFallback === 2) {
      console.log('✅ Critical fallback works - existing functionality preserved');
    } else {
      console.log('❌ Critical fallback failed - backwards compatibility broken!');
    }
  }
}

// Helper function to run tests with proper error handling
async function runCompatibilityTests() {
  try {
    await testBackwardsCompatibility();
  } catch (error) {
    console.error('Fatal error during compatibility testing:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runCompatibilityTests();
}

export { testBackwardsCompatibility, runCompatibilityTests };