import { searchDriversAction, getDriverPageData } from './src/app/data-actions.ts';

async function testWithJeffNoel() {
  console.log('Testing with Jeff Noel...');
  
  try {
    // Test search
    console.log('\n1. Testing driver search for "Jeff Noel"...');
    const searchResult = await searchDriversAction('Jeff Noel');
    console.log('Search result:', JSON.stringify(searchResult, null, 2));
    
    if (searchResult.data && searchResult.data.length > 0) {
      const driver = searchResult.data[0];
      console.log(`Found driver: ${driver.name} (ID: ${driver.custId})`);
      
      // Test getting driver data
      console.log('\n2. Testing driver data retrieval...');
      const driverResult = await getDriverPageData(driver.custId);
      console.log('Driver data result:', JSON.stringify(driverResult, null, 2));
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testWithJeffNoel();
