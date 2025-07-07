import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { HistoryPoint } from "./mock-data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function mergeHistoryData(
  dataA: HistoryPoint[],
  dataB: HistoryPoint[],
  keyA: string,
  keyB: string
): any[] {
  const mergedData: { [month: string]: any } = {};

  const allMonths = new Set([...dataA.map(p => p.month), ...dataB.map(p => p.month)]);

  allMonths.forEach(month => {
    mergedData[month] = { month };
  });

  dataA.forEach(point => {
    mergedData[point.month][keyA] = point.value;
  });

  dataB.forEach(point => {
    mergedData[point.month][keyB] = point.value;
  });

  // Ensure sorting, e.g., by a predefined order of months if necessary
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Object.values(mergedData).sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
}

export const lapTimeToSeconds = (time: string): number => {
  if (!time || !time.includes(':') || !time.includes('.')) return NaN;
  const parts = time.split(':');
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const ms = parseInt(secondsParts[1], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(ms)) return NaN;
  return minutes * 60 + seconds + ms / 1000;
};
