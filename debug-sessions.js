// Debug script to examine iRacing API session responses

async function debugRaceSession() {
  try {
    console.log('=== DEBUGGING RACE SESSION DATA ===');
    
    const subsessionId = 78090881;
    console.log(`Testing race API endpoint for subsession: ${subsessionId}`);
    
    // Test the processed API endpoint
    const response = await fetch(`http://localhost:9002/api/race/${subsessionId}`);
    const data = await response.json();
    
    if (data.race) {
      console.log(`\n✅ Race data found:`);
      console.log(`Track: ${data.race.trackName}`);
      console.log(`Series: ${data.race.seriesName}`);
      console.log(`Participants: ${data.race.participants.length}`);
      
      // Check fastest lap issue
      if (data.race.participants.length > 0) {
        console.log('\n=== FASTEST LAP ANALYSIS (First 5 drivers) ===');
        
        data.race.participants.slice(0, 5).forEach((participant, index) => {
          console.log(`\nDriver ${index + 1}: ${participant.name}`);
          console.log(`  Position: ${participant.position}`);
          console.log(`  Fastest lap: ${participant.fastestLap}`);
          console.log(`  Total time: ${participant.totalTime}`);
          
          if (participant.laps && participant.laps.length > 0) {
            console.log(`  Total laps: ${participant.laps.length}`);
            
            // Show first few lap times
            console.log(`  First 3 lap times:`);
            participant.laps.slice(0, 3).forEach((lap, i) => {
              console.log(`    Lap ${i+1}: ${lap.time} ${lap.invalid ? '(INVALID)' : ''}`);
            });
            
            // Find fastest valid lap manually
            const validLaps = participant.laps.filter(lap => 
              !lap.invalid && 
              lap.time !== 'N/A' && 
              lap.time.includes(':')
            );
            
            if (validLaps.length > 0) {
              const fastestValidLap = validLaps.reduce((fastest, current) => {
                const fastestMs = lapTimeToMs(fastest.time);
                const currentMs = lapTimeToMs(current.time);
                return currentMs < fastestMs ? current : fastest;
              });
              
              console.log(`  Calculated fastest: ${fastestValidLap.time} (Lap ${fastestValidLap.lapNumber})`);
              console.log(`  API reported fastest: ${participant.fastestLap}`);
              
              const match = fastestValidLap.time === participant.fastestLap;
              console.log(`  ✅ Match: ${match ? 'YES' : 'NO'}`);
              
              if (!match) {
                console.log(`  ⚠️  MISMATCH DETECTED! This suggests the fastest lap fix is working.`);
              }
            } else {
              console.log(`  ❌ No valid laps found`);
            }
          } else {
            console.log(`  ❌ No lap data available`);
          }
        });
        
        console.log('\n=== SUMMARY ===');
        const driversWithLaps = data.race.participants.filter(p => p.laps && p.laps.length > 0);
        console.log(`Drivers with lap data: ${driversWithLaps.length}/${data.race.participants.length}`);
        
        const driversWithValidFastestLap = driversWithLaps.filter(p => 
          p.fastestLap && p.fastestLap !== 'N/A' && p.fastestLap.includes(':')
        );
        console.log(`Drivers with valid fastest lap: ${driversWithValidFastestLap.length}/${driversWithLaps.length}`);
      }
    } else if (data.error) {
      console.log(`❌ Error: ${data.error}`);
      
      // Check if this is a session type issue
      if (data.error.includes('session') || data.error.includes('RACE')) {
        console.log('\n🔍 This appears to be a session detection issue.');
        console.log('The API is likely not finding a session named "RACE".');
        console.log('Our enhanced session detection should handle this.');
      }
    } else {
      console.log('❌ Unexpected response format:', Object.keys(data));
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    if (error.message.includes('fetch failed')) {
      console.log('💡 Make sure the development server is running: npm run dev');
    }
  }
}
// Debug script to examine iRacing API session responses

async function debugRaceSession() {
  try {
    console.log('=== DEBUGGING RACE SESSION DATA ===');
    
    const subsessionId = 78090881;
    console.log(`Testing race API endpoint for subsession: ${subsessionId}`);
    
    // Test the processed API endpoint
    const response = await fetch(`http://localhost:9002/api/race/${subsessionId}`);
    const data = await response.json();
    
    if (data.race) {
      console.log(`\n✅ Race data found:`);
      console.log(`Track: ${data.race.trackName}`);
      console.log(`Series: ${data.race.seriesName}`);
      console.log(`Participants: ${data.race.participants.length}`);
      
      // Check fastest lap issue
      if (data.race.participants.length > 0) {
        console.log('\n=== FASTEST LAP ANALYSIS (First 5 drivers) ===');
        
        data.race.participants.slice(0, 5).forEach((participant, index) => {
          console.log(`\nDriver ${index + 1}: ${participant.name}`);
          console.log(`  Position: ${participant.position}`);
          console.log(`  Fastest lap: ${participant.fastestLap}`);
          console.log(`  Total time: ${participant.totalTime}`);
          
          if (participant.laps && participant.laps.length > 0) {
            console.log(`  Total laps: ${participant.laps.length}`);
            
            // Show first few lap times
            console.log(`  First 3 lap times:`);
            participant.laps.slice(0, 3).forEach((lap, i) => {
              console.log(`    Lap ${i+1}: ${lap.time} ${lap.invalid ? '(INVALID)' : ''}`);
            });
            
            // Find fastest valid lap manually
            const validLaps = participant.laps.filter(lap => 
              !lap.invalid && 
              lap.time !== 'N/A' && 
              lap.time.includes(':')
            );
            
            if (validLaps.length > 0) {
              const fastestValidLap = validLaps.reduce((fastest, current) => {
                const fastestMs = lapTimeToMs(fastest.time);
                const currentMs = lapTimeToMs(current.time);
                return currentMs < fastestMs ? current : fastest;
              });
              
              console.log(`  Calculated fastest: ${fastestValidLap.time} (Lap ${fastestValidLap.lapNumber})`);
              console.log(`  API reported fastest: ${participant.fastestLap}`);
              
              const match = fastestValidLap.time === participant.fastestLap;
              console.log(`  ✅ Match: ${match ? 'YES' : 'NO'}`);
              
              if (!match) {
                console.log(`  ⚠️  MISMATCH DETECTED! This suggests the fastest lap fix is working.`);
              }
            } else {
              console.log(`  ❌ No valid laps found`);
            }
          } else {
            console.log(`  ❌ No lap data available`);
          }
        });
        
        console.log('\n=== SUMMARY ===');
        const driversWithLaps = data.race.participants.filter(p => p.laps && p.laps.length > 0);
        console.log(`Drivers with lap data: ${driversWithLaps.length}/${data.race.participants.length}`);
        
        const driversWithValidFastestLap = driversWithLaps.filter(p => 
          p.fastestLap && p.fastestLap !== 'N/A' && p.fastestLap.includes(':')
        );
        console.log(`Drivers with valid fastest lap: ${driversWithValidFastestLap.length}/${driversWithLaps.length}`);
      }
    } else if (data.error) {
      console.log(`❌ Error: ${data.error}`);
      
      // Check if this is a session type issue
      if (data.error.includes('session') || data.error.includes('RACE')) {
        console.log('\n🔍 This appears to be a session detection issue.');
        console.log('The API is likely not finding a session named "RACE".');
        console.log('Our enhanced session detection should handle this.');
      }
    } else {
      console.log('❌ Unexpected response format:', Object.keys(data));
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    if (error.message.includes('fetch failed')) {
      console.log('💡 Make sure the development server is running: npm run dev');
    }
  }
}

function lapTimeToMs(time) {
  if (!time || !time.includes(':') || !time.includes('.')) return Infinity;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  return (minutes * 60 + seconds) * 1000 + ms;
}

// Run the debug
debugRaceSession();
