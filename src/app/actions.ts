'use server';

import { analyzeDriverStats } from '@/ai/flows/analyze-driver-stats';
import { compareDrivers } from '@/ai/flows/compare-drivers-flow';
import type { Driver } from '@/lib/mock-data';

export async function getAnalysis(driver: Driver) {
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
