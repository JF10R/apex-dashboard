// Quick test script to verify API functions are working
const { searchDriversByName, getDriverData, getRaceResultData } = require('./src/lib/iracing-api-core.ts');

async function testAPI() {
  console.log('Testing API functions...');
  
  try {
    // Test 1: Search for Jeff Noel
    console.log('\n1. Testing searchDriversByName with "Jeff Noel"...');
    const searchResults = await searchDriversByName('Jeff Noel');
    console.log('Search results:', JSON.stringify(searchResults, null, 2));
    
    if (searchResults && searchResults.length > 0) {
      const jeffNoel = searchResults[0];
      console.log(`Found: ${jeffNoel.name} (ID: ${jeffNoel.custId})`);
      
      // Test 2: Get driver data for Jeff Noel
      console.log('\n2. Testing getDriverData...');
      const driverData = await getDriverData(jeffNoel.custId);
      console.log('Driver data structure:', {
        name: driverData?.name,
        currentIRating: driverData?.currentIRating,
        currentSafetyRating: driverData?.currentSafetyRating,
        recentRacesCount: driverData?.recentRaces?.length,
        iratingHistoryCount: driverData?.iratingHistory?.length,
        safetyRatingHistoryCount: driverData?.safetyRatingHistory?.length
      });
      
      // Test 3: Get race result data if there are recent races
      if (driverData?.recentRaces && driverData.recentRaces.length > 0) {
        console.log('\n3. Testing getRaceResultData...');
        const raceId = parseInt(driverData.recentRaces[0].id);
        const raceResult = await getRaceResultData(raceId);
        console.log('Race result structure:', {
          trackName: raceResult?.trackName,
          participantCount: raceResult?.participants?.length,
          strengthOfField: raceResult?.strengthOfField,
          category: raceResult?.category
        });
      }
    } else {
      console.log('No search results found for "Jeff Noel"');
    }
    
  } catch (error) {
    console.error('API Test Error:', error);
  }
}

testAPI();
