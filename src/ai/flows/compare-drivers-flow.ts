'use server';

/**
 * @fileOverview An AI agent for comparing two iRacing drivers.
 *
 * - compareDrivers - A function that handles the driver comparison process.
 * - CompareDriversInput - The input type for the compareDrivers function.
 * - CompareDriversOutput - The return type for the compareDrivers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


const LapSchema = z.object({
  lapNumber: z.number(),
  time: z.string(),
  invalid: z.boolean(),
});

const RaceParticipantSchema = z.object({
  name: z.string(),
  startPosition: z.number(),
  finishPosition: z.number(),
  incidents: z.number(),
  fastestLap: z.string(),
  irating: z.number(),
  laps: z.array(LapSchema),
});

const RecentRaceSchema = z.object({
  id: z.string(),
  trackName: z.string(),
  date: z.string(),
  startPosition: z.number(),
  finishPosition: z.number(),
  incidents: z.number(),
  strengthOfField: z.number(),
  lapsLed: z.number(),
  fastestLap: z.string(),
  car: z.string(),
  avgLapTime: z.string(),
  iratingChange: z.number(),
  safetyRatingChange: z.string(),
  participants: z.array(RaceParticipantSchema),
  avgRaceIncidents: z.number(),
  avgRaceLapTime: z.string(),
});

const DriverCompareDataSchema = z.object({
  driverName: z.string().describe('The name of the driver.'),
  currentIRating: z.number().describe('The current iRating of the driver.'),
  currentSafetyRating: z.string().describe('The current Safety Rating of the driver.'),
  iratingHistory: z.array(z.number()).describe('The iRating history of the driver.'),
  recentRaces: z.array(RecentRaceSchema).describe('Recent race results for the driver.'),
});

const CompareDriversInputSchema = z.object({
  driverA: DriverCompareDataSchema,
  driverB: DriverCompareDataSchema,
});
export type CompareDriversInput = z.infer<typeof CompareDriversInputSchema>;

const CompareDriversOutputSchema = z.object({
  comparisonSummary: z.string().describe('A head-to-head comparison of the two drivers, highlighting their relative strengths, weaknesses, and predicting who might have an edge in a race.'),
});
export type CompareDriversOutput = z.infer<typeof CompareDriversOutputSchema>;

export async function compareDrivers(input: CompareDriversInput): Promise<CompareDriversOutput> {
  return compareDriversFlow(input);
}

const prompt = ai.definePrompt({
  name: 'compareDriversPrompt',
  input: {schema: CompareDriversInputSchema},
  output: {schema: CompareDriversOutputSchema},
  prompt: `You are an expert iRacing commentator and data analyst. Your task is to provide a "tale of the tape" style head-to-head comparison for two drivers. Your analysis must be insightful, find races they competed in together, and help determine who has the upper hand.

**Driver A Data:**
- **Name:** {{{driverA.driverName}}}
- **Current iRating:** {{{driverA.currentIRating}}}
- **Current Safety Rating:** {{{driverA.currentSafetyRating}}}
- **iRating History:** {{{driverA.iratingHistory}}}
- **Recent Races:** Full data object for Driver A's recent races.

**Driver B Data:**
- **Name:** {{{driverB.driverName}}}
- **Current iRating:** {{{driverB.currentIRating}}}
- **Current Safety Rating:** {{{driverB.currentSafetyRating}}}
- **iRating History:** {{{driverB.iratingHistory}}}
- **Recent Races:** Full data object for Driver B's recent races.

**Analysis Instructions:**

1.  **Overall "Tale of the Tape":** Start with a direct comparison of their core stats: current iRating and Safety Rating. Who has the higher skill rating? Who is the safer driver on paper? Also, look at their iRating history trends. Is one on an upward trajectory while the other is inconsistent?

2.  **Head-to-Head Analysis (CRITICAL):**
    *   **Identify Common Races:** First, scan the \`recentRaces\` from both drivers. Identify any races where they competed against each other (races with the same 'id').
    *   **If Common Races Exist:** This is your most important analysis. For each race they shared, directly compare them:
        *   Who finished in a better position?
        *   Who had fewer incidents?
        *   Who had a better iRating change?
        *   Synthesize this into a "head-to-head record" summary. For example: "In the 2 races they competed in together, Lando Norris out-finished Daniel Ricciardo both times and had fewer incidents, suggesting he has the edge in direct competition."
    *   **If No Common Races Exist:** State that they have not recently competed in the same subsession and proceed with the general analysis.

3.  **General Racecraft & Consistency (If no common races, or to supplement):**
    *   Analyze their recent races individually. Who is better at converting their starting position into a better finishing position (positions gained)?
    *   Who has a lower average incident count? A driver might be fast, but if they are constantly involved in incidents, it's a major weakness.
    *   Who performs better in high Strength of Field (SOF) races?

4.  **The Verdict:** Conclude with a summary paragraph. Based on all the data, especially the head-to-head record if available, who has the edge and why? Is it Driver A's raw pace, or Driver B's consistency and safety? Provide a nuanced final take.

Keep the language engaging, like a pre-race broadcast segment.`,
});

const compareDriversFlow = ai.defineFlow(
  {
    name: 'compareDriversFlow',
    inputSchema: CompareDriversInputSchema,
    outputSchema: CompareDriversOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
