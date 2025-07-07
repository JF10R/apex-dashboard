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

const DriverCompareDataSchema = z.object({
  driverName: z.string().describe('The name of the driver.'),
  currentIRating: z.number().describe('The current iRating of the driver.'),
  currentSafetyRating: z.string().describe('The current Safety Rating of the driver.'),
  iratingHistory: z.string().describe('The iRating history as a stringified JSON array of numbers.'),
  recentRaces: z.string().describe('Recent race results as a stringified JSON array of objects.'),
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
  prompt: `You are an expert iRacing commentator and data analyst. Your task is to provide a "tale of the tape" style head-to-head comparison for two drivers based on the data provided. Your analysis should be insightful, concise, and help determine who might have the upper hand.

**Driver A Data:**
- **Name:** {{{driverA.driverName}}}
- **Current iRating:** {{{driverA.currentIRating}}}
- **Current Safety Rating:** {{{driverA.currentSafetyRating}}}
- **iRating History:** {{{driverA.iratingHistory}}}
- **Recent Races:** {{{driverA.recentRaces}}}

**Driver B Data:**
- **Name:** {{{driverB.driverName}}}
- **Current iRating:** {{{driverB.currentIRating}}}
- **Current Safety Rating:** {{{driverB.currentSafetyRating}}}
- **iRating History:** {{{driverB.iratingHistory}}}
- **Recent Races:** {{{driverB.recentRaces}}}

**Analysis Instructions:**

1.  **Tale of the Tape:** Start with a direct comparison of their core stats: iRating and Safety Rating. Who has the higher skill rating? Who is the safer driver on paper?

2.  **Performance Momentum:** Look at the iRating history for both drivers. Is one driver on a clear upward trend while the other is stagnating or declining? Mention their momentum.

3.  **Racecraft & Consistency:** Analyze their recent races.
    *   **Finishing Power:** Who is better at converting their starting position into a better finishing position?
    *   **Risk Management:** Who has a lower average incident count in their recent races? A driver might be fast, but if they are constantly involved in incidents, it's a major weakness.
    *   **Performance Under Pressure:** Compare their results in high Strength of Field (SOF) races. Who performs better against tougher competition?

4.  **The Verdict:** Conclude with a summary paragraph. Based on all the data, who has the edge and why? Is it Driver A's raw pace, or Driver B's consistency and safety? Provide a nuanced final take.

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
