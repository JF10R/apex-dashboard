// Debug script to examine lap data fetching specifically

async function debugLapDataFetching() {
  try {
    console.log('=== DEBUGGING LAP DATA FETCHING ===');
    
    const subsessionId = 78090881;
    console.log(`Testing subsession: ${subsessionId}`);
    
    // Make a direct call to the race API to get raw response
    const response = await fetch(`http://localhost:9002/api/race/${subsessionId}`);
    const data = await response.json();
    
    if (data.error) {
      console.log(`❌ Error from API: ${data.error}`);
      return;
    }
    
    if (!data.race) {
      console.log('❌ No race data returned');
      return;
    }
    
    console.log(`✅ Race data received for: ${data.race.trackName}`);
    console.log(`Series: ${data.race.seriesName}`);
    console.log(`Participants: ${data.race.participants.length}`);
    
    // Check if any participants have lap data
    let participantsWithLaps = 0;
    let participantsWithValidFastestLap = 0;
    
    data.race.participants.forEach((participant, index) => {
      if (participant.laps && participant.laps.length > 0) {
        participantsWithLaps++;
        console.log(`\nParticipant ${index + 1}: ${participant.name}`);
        console.log(`  Laps: ${participant.laps.length}`);
        console.log(`  Fastest lap: ${participant.fastestLap}`);
        
        if (participant.fastestLap !== 'N/A') {
          participantsWithValidFastestLap++;
        }
        
        // Show first few laps
        const firstLaps = participant.laps.slice(0, 3);
        firstLaps.forEach((lap, i) => {
          console.log(`    Lap ${i + 1}: ${lap.time} ${lap.invalid ? '(INVALID)' : ''}`);
        });
      }
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Participants with lap data: ${participantsWithLaps}/${data.race.participants.length}`);
    console.log(`Participants with valid fastest lap: ${participantsWithValidFastestLap}/${data.race.participants.length}`);
    
    if (participantsWithLaps === 0) {
      console.log('\n❌ NO LAP DATA FOUND FOR ANY PARTICIPANT');
      console.log('This suggests the lap data fetching is failing in the API.');
    }
    
  } catch (error) {
    console.error('Debug error:', error.message);
  }
}

// Run the debug
debugLapDataFetching();
