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


const AnalyzeDriverStatsInputSchema = z.object({
  driverName: z.string().describe('The name of the driver to analyze.'),
  iratingHistory: z.array(z.number()).describe('The iRating history of the driver.'),
  safetyRatingHistory: z.array(z.number()).describe('The Safety Rating history of the driver.'),
  racePaceHistory: z.array(z.number()).describe('The Race Pace history of the driver in seconds.'),
  recentRaces: z.array(RecentRaceSchema).describe('The recent race results for the driver.'),
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
  prompt: `You are an expert iRacing coach and data analyst. Your goal is to provide a detailed analysis of a driver's performance, identifying strengths, weaknesses, and offering actionable advice for improvement based on granular data.

**Driver Data:**
- **Driver Name:** {{{driverName}}}
- **iRating History:** {{{iratingHistory}}} (A measure of skill. Higher is better.)
- **Safety Rating History:** {{{safetyRatingHistory}}} (A measure of on-track safety. Higher is better. A.B format, e.g., A 4.99 is the highest.)
- **Race Pace History (in seconds):** {{{racePaceHistory}}} (Average lap times. Lower is better.)
- **Recent Races Data:** A collection of recent race results with detailed data for each event.

**Analysis Instructions:**

1.  **Overall Trend Analysis:**
    *   Analyze the trends in iRating, Safety Rating, and Race Pace over the provided history. Are they improving, declining, or stagnating?
    *   Correlate these trends. For example, is an improvement in race pace leading to a higher iRating but a lower Safety Rating?

2.  **Recent Race Deep Dive (Analyze the \`recentRaces\` data):**
    *   **Performance vs. Field (Racecraft):** Compare the driver's finishing position to their starting position. A consistent positive gain across multiple races is a sign of strong racecraft and overtaking ability. A negative trend suggests issues with pace or race management.
    *   **Incidents & Safety:** Analyze the number of incidents per race. In iRacing, incidents negatively impact Safety Rating. A high average number of incidents, especially in races where the driver finished poorly, indicates a need to focus on cleaner driving and risk assessment. Are the incidents concentrated in specific races or a recurring theme?
    *   **Context is Key (Strength of Field):** Consider the 'strengthOfField' (SOF). A good result (high finish, low incidents) in a high SOF race is far more impressive than in a low SOF race. Conversely, high incidents in a high SOF race might be more understandable but still an area for improvement.
    *   **Rating Changes:** The \`iratingChange\` and \`safetyRatingChange\` for each race are critical. Large positive iRating gains confirm strong performances. Consistent negative Safety Rating changes, even with few incidents, might point to aggressive but fair racing, but when combined with high incidents, it's a clear area for improvement.
    *   **Pace Analysis:** Look at the driver's fastest lap compared to the overall fastest lap in a subsession (found within the \`participants\` data). How close are they? Is their pace competitive for the given SOF?

3.  **Synthesize and Advise:**
    *   Based on your detailed analysis, provide a concise summary of the driver's key **strengths** (e.g., "Excellent racecraft in high SOF races, consistently gaining positions," "Shows strong raw pace, often near the fastest lap") and **weaknesses** (e.g., "Struggles with consistency in lower SOF races," "High incident counts, particularly at starts, are hurting both iRating and Safety Rating").
    *   Provide at least one piece of specific, actionable advice based on the granular data. For example: "To improve Safety Rating and race results, focus on incident avoidance in the first two laps. The data shows you have top-5 pace later in the race, so a cleaner start will yield better positions." or "Your pace is strong, but you lose iRating in races where you qualify poorly. Focus on qualifying setup and practice to start higher up the grid."
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
