/**
 * Test script to validate the season filtering improvements
 * This tests that we're fetching more than 20 races for comprehensive season analysis
 */

const baseUrl = 'http://localhost:9002';

async function testEndpoint(url, validator) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    validator(data);
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

console.log('🎯 Season Filtering Test');
console.log('==================================================');

const jeffNoelCustId = 539129; // Jeff Noel's customer ID for testing

// Test the enhanced race data fetching
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver && data.driver.recentRaces) {
    const races = data.driver.recentRaces;
    
    console.log('✅ Enhanced Race Data Results:');
    console.log(`   Total races fetched: ${races.length} (previously limited to 20)`);
    
    if (races.length > 20) {
      console.log('   🎉 SUCCESS: Now fetching more than 20 races for better season coverage!');
    } else {
      console.log('   ⚠️  Still limited to 20 races - check if API has more data available');
    }
    
    // Analyze season distribution
    const seasonStats = races.reduce((acc, race) => {
      const key = `${race.year} ${race.season}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Season Distribution:');
    const sortedSeasons = Object.entries(seasonStats)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by season descending
      .slice(0, 10); // Show top 10 seasons

    sortedSeasons.forEach(([season, count]) => {
      console.log(`   ${season}: ${count} races`);
    });

    // Check if we have good coverage for recent seasons
    const currentYear = new Date().getFullYear();
    const recentSeasons = sortedSeasons.filter(([season]) => {
      const year = parseInt(season.split(' ')[0]);
      return year >= currentYear - 1; // Current and previous year
    });

    if (recentSeasons.length >= 4) { // Should have multiple seasons represented
      console.log('\n✅ Good season coverage for filtering!');
    } else {
      console.log('\n⚠️  Limited recent season coverage - may still impact filtering');
    }

    // Test example season filtering scenarios
    console.log('\n🔍 Season Filtering Scenarios:');
    
    // Find the most recent season with data
    if (sortedSeasons.length > 0) {
      const [mostRecentSeason, raceCount] = sortedSeasons[0];
      console.log(`   Most recent season (${mostRecentSeason}): ${raceCount} races available for filtering`);
      
      if (raceCount >= 10) {
        console.log('   ✅ Sufficient races for meaningful season analysis');
      } else {
        console.log('   ⚠️  Limited races - may still show partial season data');
      }
    }

    // Check for Season 2 specifically (as mentioned in the original issue)
    const season2Races = races.filter(race => race.season === 'Season 2');
    if (season2Races.length > 0) {
      const season2Years = [...new Set(season2Races.map(r => r.year))];
      console.log(`   Season 2 data: ${season2Races.length} races across years [${season2Years.join(', ')}]`);
    }

  } else {
    console.log('❌ No race data found in response');
  }
});

console.log('==================================================');
console.log('📋 Next Steps:');
console.log('   1. Start the development server: npm run dev');
console.log('   2. Navigate to http://localhost:9002/539129');
console.log('   3. Filter by "Season 2" and verify complete data is shown');
console.log('   4. Check series performance stats are now comprehensive');
console.log('==================================================');
