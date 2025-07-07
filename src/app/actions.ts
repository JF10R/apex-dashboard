'use server';

import { analyzeDriverStats } from '@/ai/flows/analyze-driver-stats';
import { compareDrivers } from '@/ai/flows/compare-drivers-flow';
import type { Driver } from '@/lib/mock-data';

/**
 * TODO: Integrate the real iRacing API here.
 *
 * This file contains the Server Actions that power the AI analysis features.
 * Currently, they use mock data from `@/lib/mock-data`. To connect your app
 * to the real iRacing API, you'll need to:
 *
 * 1. Initialize your iRacing API client (e.g., from the `iracing-api` package)
 *    in a separate service file (e.g., `src/services/iracing.ts`).
 *
 * 2. In the functions below, replace the mock `driver` object with data fetched
 *    from your iRacing API client. You'll need to fetch the driver's stats,
 *    historical data, and recent race results.
 *
 * 3. Adapt the fetched data to match the schema expected by the Genkit flows
 *    (`AnalyzeDriverStatsInput` and `CompareDriversInput`).
 */

export async function getAnalysis(driver: Driver) {
  // TODO: Replace the 'driver' parameter with a call to your iRacing API
  // to fetch live data for a given driver ID or name.
  try {
    const result = await analyzeDriverStats({
      driverName: driver.name,
      iratingHistory: driver.iratingHistory.map(d => d.value),
      safetyRatingHistory: driver.safetyRatingHistory.map(d => d.value),
      racePaceHistory: driver.racePaceHistory.map(d => d.value),
      recentRaces: driver.recentRaces,
    });
    return { summary: result.summary, error: null };
  } catch (e) {
    console.error('AI Analysis Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { summary: null, error: `Failed to analyze stats. ${errorMessage}` };
  }
}

export async function getComparisonAnalysis(driverA: Driver, driverB: Driver) {
  // TODO: Replace the 'driverA' and 'driverB' parameters with calls to your
  // iRacing API to fetch live data for the two drivers being compared.
  try {
    const result = await compareDrivers({
      driverA: {
        driverName: driverA.name,
        currentIRating: driverA.currentIRating,
        currentSafetyRating: driverA.currentSafetyRating,
        iratingHistory: driverA.iratingHistory.map(d => d.value),
        recentRaces: driverA.recentRaces,
      },
      driverB: {
        driverName: driverB.name,
        currentIRating: driverB.currentIRating,
        currentSafetyRating: driverB.currentSafetyRating,
        iratingHistory: driverB.iratingHistory.map(d => d.value),
        recentRaces: driverB.recentRaces,
      },
    });
    return { summary: result.comparisonSummary, error: null };
  } catch (e) {
    console.error('AI Comparison Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { summary: null, error: `Failed to compare drivers. ${errorMessage}` };
  }
}
