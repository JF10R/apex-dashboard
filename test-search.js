// Test script to verify driver search functionality
const { searchDriversAction } = require('./src/app/data-actions.ts');

async function testDriverSearch() {
  console.log('Testing driver search for "Jeff Noel"...');
  
  try {
    const result = await searchDriversAction('Jeff Noel');
    console.log('Search result:', JSON.stringify(result, null, 2));
    
    if (result.data && result.data.length > 0) {
      console.log('✅ Search successful! Found drivers:');
      result.data.forEach((driver, index) => {
        console.log(`  ${index + 1}. ${driver.name} (ID: ${driver.custId})`);
      });
    } else if (result.error) {
      console.log('❌ Search failed with error:', result.error);
    } else {
      console.log('⚠️  No drivers found for "Jeff Noel"');
    }
  } catch (error) {
    console.error('❌ Error during search:', error);
  }
}

testDriverSearch();
