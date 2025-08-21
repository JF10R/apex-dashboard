import { useState, useEffect } from 'react';
import { type SearchedDriver } from '@/lib/iracing-types';

const TRACKED_DRIVERS_KEY = 'apex-stats-tracked-drivers';

export function useTrackedDrivers() {
  const [trackedDrivers, setTrackedDrivers] = useState<SearchedDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load tracked drivers from localStorage on component mount
    const loadTrackedDrivers = () => {
      try {
        const stored = localStorage.getItem(TRACKED_DRIVERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setTrackedDrivers(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Failed to load tracked drivers:', error);
        setTrackedDrivers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrackedDrivers();
  }, []);

  const addTrackedDriver = (driver: SearchedDriver) => {
    setTrackedDrivers(prev => {
      // Check if driver is already tracked
      const exists = prev.some(d => d.custId === driver.custId);
      if (exists) return prev;

      const updated = [...prev, driver];
      localStorage.setItem(TRACKED_DRIVERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeTrackedDriver = (custId: number) => {
    setTrackedDrivers(prev => {
      const updated = prev.filter(d => d.custId !== custId);
      localStorage.setItem(TRACKED_DRIVERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isDriverTracked = (custId: number) => {
    return trackedDrivers.some(d => d.custId === custId);
  };

  const clearAllTrackedDrivers = () => {
    setTrackedDrivers([]);
    localStorage.removeItem(TRACKED_DRIVERS_KEY);
  };

  return {
    trackedDrivers,
    isLoading,
    addTrackedDriver,
    removeTrackedDriver,
    isDriverTracked,
    clearAllTrackedDrivers
  };
}
