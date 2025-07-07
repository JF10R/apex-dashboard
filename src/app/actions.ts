'use server';

import { analyzeDriverStats } from '@/ai/flows/analyze-driver-stats';
import type { Driver } from '@/lib/mock-data';

export async function getAnalysis(driver: Driver) {
  try {
    const result = await analyzeDriverStats({
      driverName: driver.name,
      iratingHistory: JSON.stringify(driver.iratingHistory.map(d => d.value)),
      safetyRatingHistory: JSON.stringify(driver.safetyRatingHistory.map(d => d.value)),
      racePaceHistory: JSON.stringify(driver.racePaceHistory.map(d => d.value)),
    });
    return { summary: result.summary, error: null };
  } catch (e) {
    console.error('AI Analysis Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { summary: null, error: `Failed to analyze stats. ${errorMessage}` };
  }
}
