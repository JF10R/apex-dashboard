#!/usr/bin/env node

/**
 * Comprehensive Dashboard Components Test
 * 
 * This script tests all dashboard components to ensure they work correctly:
 * - iRating charts
 * - Safety rating charts
 * - Race pace charts
 * - Recent races table
 * - Statistics cards
 * - Filters functionality
 * - Series performance summary
 */

const https = require('http');

const baseUrl = 'http://localhost:9002';
const jeffNoelCustId = 539129;

console.log('🏁 Dashboard Components Test Suite');
console.log('=' .repeat(60));

// Test 1: Get driver data and validate structure
console.log('\n1. Testing Driver Data Structure...');
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver) {
    const driver = data.driver;
    console.log('✅ Driver data retrieved successfully');
    
    // Check basic driver info
    console.log(`   Name: ${driver.name}`);
    console.log(`   Current iRating: ${driver.currentIRating}`);
    console.log(`   Current Safety Rating: ${driver.currentSafetyRating}`);
    console.log(`   Average Race Pace: ${driver.avgRacePace}`);
    
    // Check history data
    if (driver.iratingHistory && driver.iratingHistory.length > 0) {
      console.log('✅ iRating history data available');
      console.log(`   History entries: ${driver.iratingHistory.length}`);
      console.log(`   Sample entry: ${driver.iratingHistory[0].month} = ${driver.iratingHistory[0].value}`);
    } else {
      console.log('❌ iRating history data missing');
    }
    
    if (driver.safetyRatingHistory && driver.safetyRatingHistory.length > 0) {
      console.log('✅ Safety rating history data available');
      console.log(`   History entries: ${driver.safetyRatingHistory.length}`);
      console.log(`   Sample entry: ${driver.safetyRatingHistory[0].month} = ${driver.safetyRatingHistory[0].value}`);
    } else {
      console.log('❌ Safety rating history data missing');
    }
    
    if (driver.racePaceHistory && driver.racePaceHistory.length > 0) {
      console.log('✅ Race pace history data available');
      console.log(`   History entries: ${driver.racePaceHistory.length}`);
      console.log(`   Sample entry: ${driver.racePaceHistory[0].month} = ${driver.racePaceHistory[0].value}`);
    } else {
      console.log('❌ Race pace history data missing');
    }
    
    // Check recent races
    if (driver.recentRaces && driver.recentRaces.length > 0) {
      console.log('✅ Recent races data available');
      console.log(`   Recent races count: ${driver.recentRaces.length}`);
      
      const race = driver.recentRaces[0];
      console.log('   Sample race:');
      console.log(`     Track: ${race.trackName}`);
      console.log(`     Date: ${race.date}`);
      console.log(`     Category: ${race.category}`);
      console.log(`     Car: ${race.car}`);
      console.log(`     Position: ${race.startPosition} → ${race.finishPosition}`);
      console.log(`     iRating Change: ${race.iratingChange}`);
      console.log(`     Safety Rating Change: ${race.safetyRatingChange}`);
      console.log(`     Incidents: ${race.incidents}`);
      console.log(`     Fastest Lap: ${race.fastestLap}`);
      console.log(`     Average Lap Time: ${race.avgLapTime}`);
      
      // Check participants data
      if (race.participants && race.participants.length > 0) {
        console.log('✅ Race participants data available');
        console.log(`     Participants: ${race.participants.length}`);
        
        const participant = race.participants[0];
        console.log(`     Sample participant: ${participant.name}`);
        console.log(`       Position: ${participant.startPosition} → ${participant.finishPosition}`);
        console.log(`       iRating: ${participant.irating}`);
        console.log(`       Incidents: ${participant.incidents}`);
        console.log(`       Fastest Lap: ${participant.fastestLap}`);
        
        // Check lap data
        if (participant.laps && participant.laps.length > 0) {
          console.log('✅ Lap data available');
          console.log(`       Laps: ${participant.laps.length}`);
          console.log(`       Sample lap: ${participant.laps[0].lapNumber} - ${participant.laps[0].time}`);
        } else {
          console.log('❌ Lap data missing');
        }
      } else {
        console.log('❌ Race participants data missing');
      }
    } else {
      console.log('❌ Recent races data missing');
    }
  } else {
    console.log('❌ Driver data not found');
  }
});

// Test 2: Validate data consistency
console.log('\n2. Testing Data Consistency...');
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver) {
    const driver = data.driver;
    
    // Check if all history arrays have the same structure
    const validateHistoryStructure = (history, name) => {
      if (!history || history.length === 0) {
        console.log(`❌ ${name} history is empty`);
        return false;
      }
      
      const hasValidStructure = history.every(point => 
        point.hasOwnProperty('month') && 
        point.hasOwnProperty('value') &&
        typeof point.month === 'string' &&
        typeof point.value === 'number'
      );
      
      if (hasValidStructure) {
        console.log(`✅ ${name} history has valid structure`);
      } else {
        console.log(`❌ ${name} history has invalid structure`);
      }
      
      return hasValidStructure;
    };
    
    validateHistoryStructure(driver.iratingHistory, 'iRating');
    validateHistoryStructure(driver.safetyRatingHistory, 'Safety Rating');
    validateHistoryStructure(driver.racePaceHistory, 'Race Pace');
    
    // Check recent races structure
    if (driver.recentRaces && driver.recentRaces.length > 0) {
      const race = driver.recentRaces[0];
      const requiredFields = ['id', 'trackName', 'date', 'category', 'car', 'startPosition', 'finishPosition', 'incidents', 'iratingChange', 'safetyRatingChange'];
      
      const hasAllFields = requiredFields.every(field => race.hasOwnProperty(field));
      
      if (hasAllFields) {
        console.log('✅ Recent races have all required fields');
      } else {
        console.log('❌ Recent races missing required fields');
        console.log('   Missing fields:', requiredFields.filter(field => !race.hasOwnProperty(field)));
      }
    }
  }
});

// Test 3: Check filtering capabilities
console.log('\n3. Testing Filter Data Availability...');
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver && data.driver.recentRaces) {
    const races = data.driver.recentRaces;
    
    // Extract unique values for filters
    const years = [...new Set(races.map(r => r.year))];
    const categories = [...new Set(races.map(r => r.category))];
    const seasons = [...new Set(races.map(r => r.season))];
    const tracks = [...new Set(races.map(r => r.trackName))];
    const cars = [...new Set(races.map(r => r.car))];
    
    console.log('✅ Filter data extracted successfully:');
    console.log(`   Years: ${years.length} (${years.join(', ')})`);
    console.log(`   Categories: ${categories.length} (${categories.join(', ')})`);
    console.log(`   Seasons: ${seasons.length} (${seasons.join(', ')})`);
    console.log(`   Tracks: ${tracks.length} (${tracks.slice(0, 5).join(', ')}${tracks.length > 5 ? '...' : ''})`);
    console.log(`   Cars: ${cars.length} (${cars.join(', ')})`);
  }
});

// Test 4: Race subsession data
console.log('\n4. Testing Race Subsession Data...');
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver && data.driver.recentRaces && data.driver.recentRaces.length > 0) {
    const race = data.driver.recentRaces[0];
    
    // Test race details
    console.log('✅ Race subsession data:');
    console.log(`   Race ID: ${race.id}`);
    console.log(`   Strength of Field: ${race.strengthOfField}`);
    console.log(`   Laps Led: ${race.lapsLed}`);
    console.log(`   Average Race Incidents: ${race.avgRaceIncidents}`);
    console.log(`   Average Race Lap Time: ${race.avgRaceLapTime}`);
    
    // Test specific race endpoint
    testEndpoint(`${baseUrl}/api/race/${race.id}`, (raceData) => {
      if (raceData.race) {
        console.log('✅ Individual race endpoint works');
        console.log(`   Race track: ${raceData.race.trackName}`);
        console.log(`   Participants: ${raceData.race.participants.length}`);
      } else {
        console.log('❌ Individual race endpoint failed');
      }
    });
  }
});

console.log('\n🏆 Dashboard Components Test Suite Complete!');
console.log('=' .repeat(60));
console.log('\n📋 Manual UI Testing Checklist:');
console.log('   □ Navigate to http://localhost:9002/539129');
console.log('   □ Verify all stat cards show correct data');
console.log('   □ Check iRating chart renders and shows trend');
console.log('   □ Check Safety Rating chart renders and shows trend');
console.log('   □ Check Race Pace chart renders and shows trend');
console.log('   □ Verify Recent Races table displays correctly');
console.log('   □ Test pagination in Recent Races table');
console.log('   □ Test filter dropdowns (Year, Season, Category, Track, Car)');
console.log('   □ Verify filtered data updates charts and tables');
console.log('   □ Test "Get AI Analysis" button functionality');
console.log('   □ Check Series Performance Summary section');
console.log('   □ Click on individual race rows to view race details');
console.log('   □ Verify all tooltips and hover states work');
console.log('   □ Test responsive design on different screen sizes');

function testEndpoint(url, callback) {
  const options = {
    hostname: 'localhost',
    port: 9002,
    path: url.replace('http://localhost:9002', ''),
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        callback(parsedData);
      } catch (e) {
        console.log(`❌ Failed to parse response: ${e.message}`);
      }
    });
  });

  req.on('error', (e) => {
    console.log(`❌ Request failed: ${e.message}`);
  });

  req.end();
}
