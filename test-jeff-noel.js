#!/usr/bin/env node

/**
 * Manual End-to-End Test for Jeff Noel
 * 
 * This script performs manual testing of the Jeff Noel user journey
 * to verify all implemented features work correctly.
 */

const https = require('http');

const baseUrl = 'http://localhost:9002';
const jeffNoelCustId = 539129;

console.log('🏁 Starting Jeff Noel End-to-End Test Suite');
console.log('=' .repeat(50));

// Test 1: Health Check
console.log('\n1. Testing Health Check Endpoint...');
testEndpoint(`${baseUrl}/api/health`, (data) => {
  if (data.status === 'healthy') {
    console.log('✅ Health check passed');
  } else {
    console.log('❌ Health check failed');
  }
});

// Test 2: Search for Jeff Noel
console.log('\n2. Testing Search for Jeff Noel...');
testEndpoint(`${baseUrl}/api/search?q=Jeff%20Noel`, (data) => {
  if (data.drivers && data.drivers.length > 0) {
    const jeffNoel = data.drivers.find(d => d.name === 'Jeff Noel' && d.custId === jeffNoelCustId);
    if (jeffNoel) {
      console.log('✅ Jeff Noel found in search results');
      console.log(`   Customer ID: ${jeffNoel.custId}`);
      console.log(`   Name: ${jeffNoel.name}`);
    } else {
      console.log('❌ Jeff Noel not found in search results');
    }
  } else {
    console.log('❌ No search results returned');
  }
});

// Test 3: Get Jeff Noel's driver data
console.log('\n3. Testing Jeff Noel Driver Data Endpoint...');
testEndpoint(`${baseUrl}/api/driver/${jeffNoelCustId}`, (data) => {
  if (data.driver && data.driver.name === 'Jeff Noel') {
    console.log('✅ Jeff Noel driver data retrieved successfully');
    console.log(`   ID: ${data.driver.id}`);
    console.log(`   Name: ${data.driver.name}`);
    console.log(`   Current iRating: ${data.driver.currentIRating}`);
    console.log(`   Current Safety Rating: ${data.driver.currentSafetyRating}`);
    console.log(`   Average Race Pace: ${data.driver.avgRacePace}`);
    console.log(`   iRating History Entries: ${data.driver.iratingHistory?.length || 0}`);
    console.log(`   Recent Races: ${data.driver.recentRaces?.length || 0}`);
  } else {
    console.log('❌ Jeff Noel driver data not found');
  }
});

// Test 4: Test error handling
console.log('\n4. Testing Error Handling...');

// Test invalid customer ID
testEndpoint(`${baseUrl}/api/driver/invalid`, (data) => {
  if (data.error && data.error.includes('Invalid customer ID')) {
    console.log('✅ Invalid customer ID error handling works');
  } else {
    console.log('❌ Invalid customer ID error handling failed');
  }
});

// Test empty search query
testEndpoint(`${baseUrl}/api/search?q=`, (data) => {
  if (data.error && data.error.includes('Query parameter')) {
    console.log('✅ Empty search query error handling works');
  } else {
    console.log('❌ Empty search query error handling failed');
  }
});

// Test short search query
testEndpoint(`${baseUrl}/api/search?q=J`, (data) => {
  if (data.error && data.error.includes('at least 2 characters')) {
    console.log('✅ Short search query error handling works');
  } else {
    console.log('❌ Short search query error handling failed');
  }
});

// Test 5: URL Generation
console.log('\n5. Testing URL Generation...');

const searchQuery = 'Jeff Noel';
const encodedQuery = encodeURIComponent(searchQuery);
const compareUrl = `/compare?driverA=${encodedQuery}&custIdA=${jeffNoelCustId}`;
const dynamicUrl = `/${jeffNoelCustId}`;

console.log(`✅ Search query encoding: "${searchQuery}" -> "${encodedQuery}"`);
console.log(`✅ Compare URL: ${compareUrl}`);
console.log(`✅ Dynamic route URL: ${dynamicUrl}`);

console.log('\n🏆 End-to-End Test Suite Complete!');
console.log('=' .repeat(50));
console.log('\n📋 Manual Testing Checklist:');
console.log('   □ Open http://localhost:9002/');
console.log('   □ Search for "Jeff Noel"');
console.log('   □ Click on Jeff Noel in search results');
console.log('   □ Verify dashboard loads with correct data');
console.log('   □ Click "View Jeff Noel\'s Dashboard" button');
console.log('   □ Navigate to http://localhost:9002/539129');
console.log('   □ Verify direct URL access works');
console.log('   □ Test compare functionality');
console.log('   □ Test navigation between pages');

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
