/**
 * Test script for CategoryMappingService
 * 
 * This script tests the category mapping functionality to ensure it works correctly
 * and provides examples of how to use the service.
 */

import { CategoryMappingService } from '../lib/category-mapping-service';

async function testCategoryMapping() {
  console.log('🧪 Testing Category Mapping Service...\n');

  try {
    // Test 1: Pre-warm cache
    console.log('1️⃣ Pre-warming cache...');
    await CategoryMappingService.preWarmCache();
    console.log('✅ Cache pre-warmed successfully\n');

    // Test 2: Get cache stats
    console.log('2️⃣ Cache statistics:');
    const stats = CategoryMappingService.getCacheStats();
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // Test 3: Get available categories
    console.log('3️⃣ Available API categories:');
    const availableCategories = await CategoryMappingService.getAvailableCategories();
    console.log(availableCategories);
    console.log('');

    // Test 4: Test category ID lookups
    console.log('4️⃣ Testing category ID lookups...');
    const testCategories = ['Road', 'Oval', 'Dirt', 'Sports Car', 'Formula Car', 'Prototype', 'Dirt Oval'];
    
    for (const categoryName of testCategories) {
      const categoryId = await CategoryMappingService.getCategoryId(categoryName);
      const fallbackId = await CategoryMappingService.getCategoryIdWithFallback(categoryName);
      console.log(`  ${categoryName}: ID=${categoryId}, Fallback=${fallbackId}`);
    }
    console.log('');

    // Test 5: Test reverse lookups
    console.log('5️⃣ Testing reverse category lookups...');
    const testIds = [1, 2, 3, 4, 5];
    
    for (const categoryId of testIds) {
      const categoryName = await CategoryMappingService.getCategoryName(categoryId);
      console.log(`  ID ${categoryId}: ${categoryName || 'Not found'}`);
    }
    console.log('');

    // Test 6: Test API category to RaceCategory mapping
    console.log('6️⃣ Testing API category to RaceCategory mapping...');
    const apiCategories = ['Road', 'Oval', 'Dirt', 'Formula', 'Sports Car'];
    
    for (const apiCategory of apiCategories) {
      const raceCategory = await CategoryMappingService.mapApiCategoryToRaceCategory(apiCategory);
      console.log(`  API "${apiCategory}" → RaceCategory "${raceCategory}"`);
    }
    console.log('');

    // Test 7: Test car category lookups (if available)
    console.log('7️⃣ Testing car category lookups...');
    const testCarIds = [1, 2, 3, 10, 20]; // Common car IDs
    
    for (const carId of testCarIds) {
      const category = await CategoryMappingService.getCarCategory(carId);
      console.log(`  Car ID ${carId}: ${category || 'Not found'}`);
    }
    console.log('');

    // Test 8: Test fallback functionality
    console.log('8️⃣ Testing fallback functionality...');
    const fallbackTests = ['Sports Car', 'Formula Car', 'Prototype', 'Oval', 'Dirt Oval'];
    
    for (const category of fallbackTests) {
      const fallbackId = CategoryMappingService.getFallbackCategoryId(category);
      console.log(`  ${category}: Fallback ID=${fallbackId}`);
    }
    console.log('');

    // Test 9: Performance test
    console.log('9️⃣ Performance test (10 lookups)...');
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await CategoryMappingService.getCategoryId('Road');
    }
    
    const endTime = Date.now();
    console.log(`  10 cached lookups took ${endTime - startTime}ms (${(endTime - startTime) / 10}ms per lookup)`);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Test fallback behavior
    console.log('\n🔄 Testing fallback behavior...');
    const fallbackId = CategoryMappingService.getFallbackCategoryId('Sports Car');
    console.log(`Fallback ID for Sports Car: ${fallbackId}`);
  }
}

// Helper function to run tests with proper error handling
async function runTests() {
  try {
    await testCategoryMapping();
  } catch (error) {
    console.error('Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { testCategoryMapping, runTests };