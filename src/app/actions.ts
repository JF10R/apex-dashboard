'use server';

import { analyzeDriverStats } from '@/ai/flows/analyze-driver-stats';
import { compareDrivers } from '@/ai/flows/compare-drivers-flow';
import type { Driver } from '@/lib/mock-data';

/**
 * Server Actions that power the AI analysis features. These actions
 * now expect full `Driver` objects that have been fetched from the live
 * iRacing API and mapped to the correct schema.
 */

export async function getAnalysis(driver: Driver) {
  try {
    // Convert recentRaces to match the expected schema
    const formattedRecentRaces = driver.recentRaces.map(race => ({
      ...race,
      safetyRatingChange: typeof race.safetyRatingChange === 'number' 
        ? race.safetyRatingChange.toString() 
        : race.safetyRatingChange
    }));

    // Combine all iRating history from all categories, sorted chronologically
    const allIratingHistory = Object.values(driver.iratingHistories)
      .flat()
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .map(d => d.value);

    const result = await analyzeDriverStats({
      driverName: driver.name,
      iratingHistory: allIratingHistory,
      safetyRatingHistory: driver.safetyRatingHistory.map(d => d.value),
      racePaceHistory: driver.racePaceHistory.map(d => d.value),
      recentRaces: formattedRecentRaces,
    });
    return { summary: result.summary, error: null };
  } catch (e) {
    console.error('AI Analysis Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { summary: null, error: `Failed to analyze stats. ${errorMessage}` };
  }
}

export async function getComparisonAnalysis(driverA: Driver, driverB: Driver) {
  try {
    // Convert recentRaces to match the expected schema for both drivers
    const formatRecentRaces = (races: typeof driverA.recentRaces) => 
      races.map(race => ({
        ...race,
        safetyRatingChange: typeof race.safetyRatingChange === 'number' 
          ? race.safetyRatingChange.toString() 
          : race.safetyRatingChange
      }));

    const result = await compareDrivers({
      driverA: {
        driverName: driverA.name,
        currentIRating: driverA.currentIRating,
        currentSafetyRating: driverA.currentSafetyRating,
        iratingHistory: Object.values(driverA.iratingHistories)
          .flat()
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          .map(d => d.value),
        recentRaces: formatRecentRaces(driverA.recentRaces),
      },
      driverB: {
        driverName: driverB.name,
        currentIRating: driverB.currentIRating,
        currentSafetyRating: driverB.currentSafetyRating,
        iratingHistory: Object.values(driverB.iratingHistories)
          .flat()
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          .map(d => d.value),
        recentRaces: formatRecentRaces(driverB.recentRaces),
      },
    });
    return { summary: result.comparisonSummary, error: null };
  } catch (e) {
    console.error('AI Comparison Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { summary: null, error: `Failed to compare drivers. ${errorMessage}` };
  }
}
