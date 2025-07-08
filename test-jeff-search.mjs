#!/usr/bin/env node
import { searchDriversAction } from './src/app/data-actions.js';

async function testJeffNoel() {
  console.log('🔍 Testing driver search for "Jeff Noel"...\n');
  
  try {
    const result = await searchDriversAction('Jeff Noel');
    
    console.log('📝 Raw result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('❌ Search failed:', result.error);
      return;
    }
    
    if (result.data && result.data.length > 0) {
      console.log('✅ Search successful! Found drivers:');
      result.data.forEach((driver, index) => {
        console.log(`  ${index + 1}. ${driver.name} (Customer ID: ${driver.custId})`);
      });
      
      // Test specific driver retrieval
      const jeffNoel = result.data.find(d => d.name.toLowerCase().includes('jeff noel'));
      if (jeffNoel) {
        console.log(`\n🎯 Found exact match: ${jeffNoel.name} (ID: ${jeffNoel.custId})`);
      }
    } else {
      console.log('⚠️  No drivers found for query "Jeff Noel"');
    }
  } catch (error) {
    console.error('❌ Error during search:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Also test variations
async function testVariations() {
  const queries = ['Jeff Noel', 'jeff noel', 'JEFF NOEL', 'Jeff', 'Noel'];
  
  for (const query of queries) {
    console.log(`\n🔍 Testing query: "${query}"`);
    try {
      const result = await searchDriversAction(query);
      if (result.data && result.data.length > 0) {
        console.log(`  Found ${result.data.length} results`);
        result.data.forEach(driver => {
          console.log(`    - ${driver.name} (${driver.custId})`);
        });
      } else {
        console.log('  No results found');
      }
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
}

console.log('🚀 Starting driver search tests...\n');
testJeffNoel().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('Testing search variations...');
  return testVariations();
}).catch(console.error);
