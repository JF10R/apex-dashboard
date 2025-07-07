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
  prompt: `You are an expert iRacing analyst. Analyze the driver stats and identify strengths and weaknesses.

Driver Name: {{{driverName}}}
iRating History: {{{iratingHistory}}}
Safety Rating History: {{{safetyRatingHistory}}}
Race Pace History: {{{racePaceHistory}}}
Recent Races: {{{recentRaces}}}

Analyze these stats and provide a summary of the driver's performance, identifying key strengths and weaknesses based on the historical data and recent race results provided. Focus on trends, patterns over time, and recent race performance (like finishing compared to starting position, and number of incidents).
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
