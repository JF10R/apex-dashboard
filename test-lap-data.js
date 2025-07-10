const { getRaceResultData } = require('./src/lib/iracing-api-core.ts');

async function testLapData() {
  try {
    console.log('Testing lap data for race 78090881...');
    const race = await getRaceResultData(78090881);
    if (race) {
      console.log('Race loaded successfully');
      console.log('Participants:', race.participants.length);
      
      const sampleParticipant = race.participants[0];
      console.log('Sample participant:', sampleParticipant.name);
      console.log('Fastest lap:', sampleParticipant.fastestLap);
      console.log('Lap count:', sampleParticipant.laps?.length || 0);
      
      if (sampleParticipant.laps && sampleParticipant.laps.length > 0) {
        console.log('First few laps:');
        sampleParticipant.laps.slice(0, 3).forEach(lap => {
          console.log(`  Lap ${lap.lapNumber}: ${lap.time} ${lap.invalid ? '(INVALID)' : ''}`);
        });
      } else {
        console.log('No lap data available for this participant');
      }
    } else {
      console.log('Race not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLapData();
