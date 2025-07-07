'use server';

/**
 * @fileOverview A driver stats analysis AI agent.
 *
 * - analyzeDriverStats - A function that handles the driver stats analysis process.
 * - AnalyzeDriverStatsInput - The input type for the analyzeDriverStats function.
 * - AnalyzeDriverStatsOutput - The return type for the analyzeDriverStats function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDriverStatsInputSchema = z.object({
  driverName: z.string().describe('The name of the driver to analyze.'),
  iratingHistory: z.string().describe('The iRating history of the driver as a stringified JSON array of numbers.'),
  safetyRatingHistory: z.string().describe('The Safety Rating history of the driver as a stringified JSON array of numbers.'),
  racePaceHistory: z.string().describe('The Race Pace history of the driver as a stringified JSON array of numbers.'),
  recentRaces: z.string().describe('The recent race results for the driver as a stringified JSON array of objects.'),
});
export type AnalyzeDriverStatsInput = z.infer<typeof AnalyzeDriverStatsInputSchema>;

const AnalyzeDriverStatsOutputSchema = z.object({
  summary: z.string().describe('A summary of the driver stats analysis, identifying strengths and weaknesses.'),
});
export type AnalyzeDriverStatsOutput = z.infer<typeof AnalyzeDriverStatsOutputSchema>;

export async function analyzeDriverStats(input: AnalyzeDriverStatsInput): Promise<AnalyzeDriverStatsOutput> {
  return analyzeDriverStatsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDriverStatsPrompt',
  input: {schema: AnalyzeDriverStatsInputSchema},
  output: {schema: AnalyzeDriverStatsOutputSchema},
  prompt: `You are an expert iRacing coach and data analyst. Your goal is to provide a detailed analysis of a driver's performance, identifying strengths, weaknesses, and offering actionable advice for improvement.

**Driver Data:**
- **Driver Name:** {{{driverName}}}
- **iRating History:** {{{iratingHistory}}} (A measure of skill. Higher is better.)
- **Safety Rating History:** {{{safetyRatingHistory}}} (A measure of on-track safety. Higher is better. A.B format, e.g., A 4.99 is the highest.)
- **Race Pace History:** {{{racePaceHistory}}} (Average lap times in seconds. Lower is better.)
- **Recent Races:** {{{recentRaces}}}

**Analysis Instructions:**

1.  **Overall Trend Analysis:**
    *   Analyze the trends in iRating, Safety Rating, and Race Pace over the provided history. Are they improving, declining, or stagnating?
    *   Correlate these trends. For example, is an improvement in race pace leading to a higher iRating but a lower Safety Rating?

2.  **Recent Race Deep Dive:**
    *   Examine the \`recentRaces\` data closely.
    *   **Performance vs. Field:** Compare the driver's finishing position to their starting position. A positive gain is a sign of good racecraft.
    *   **Incidents & Safety:** Analyze the number of incidents ('incidents'). In iRacing, incidents negatively impact Safety Rating. A high number of incidents, especially in races where the driver finished poorly, indicates a need to focus on cleaner driving.
    *   **Context is Key:** Consider the 'strengthOfField' (SOF). A good result in a high SOF race is more impressive than in a low SOF race. Conversely, high incidents in a high SOF race might be more understandable.

3.  **Synthesize and Advise:**
    *   Based on your analysis, provide a concise summary of the driver's key **strengths** (e.g., "Consistent iRating growth," "Excellent racecraft, often gaining positions") and **weaknesses** (e.g., "Struggles with consistency, indicated by fluctuating iRating," "High incident counts suggest a need for better risk assessment").
    *   Provide at least one piece of actionable advice. For example, "To improve Safety Rating, focus on leaving more space in close battles during the opening laps," or "The data shows strong pace. To capitalize on this, work on qualifying higher to avoid midfield incidents."
`,
});

const analyzeDriverStatsFlow = ai.defineFlow(
  {
    name: 'analyzeDriverStatsFlow',
    inputSchema: AnalyzeDriverStatsInputSchema,
    outputSchema: AnalyzeDriverStatsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
