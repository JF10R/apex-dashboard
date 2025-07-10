'use client';

import { useState, useEffect } from 'react';

export interface RecentProfile {
  name: string;
  custId: string;
  lastAccessed: string; // ISO date string
}

const STORAGE_KEY = 'apex-stats-recent-profiles';
const MAX_RECENT_PROFILES = 8;

export function useRecentProfiles() {
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([]);

  // Load recent profiles from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RecentProfile[];
          // Sort by lastAccessed date (most recent first)
          const sorted = parsed.sort((a, b) => 
            new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
          );
          setRecentProfiles(sorted);
        }
      } catch (error) {
        console.error('Failed to load recent profiles:', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const addRecentProfile = (profile: Omit<RecentProfile, 'lastAccessed'>) => {
    const newProfile: RecentProfile = {
      ...profile,
      lastAccessed: new Date().toISOString()
    };

    setRecentProfiles(current => {
      // Remove existing entry if it exists
      const filtered = current.filter(p => p.custId !== profile.custId);
      
      // Add new entry at the beginning
      const updated = [newProfile, ...filtered];
      
      // Keep only the most recent profiles
      const trimmed = updated.slice(0, MAX_RECENT_PROFILES);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch (error) {
          console.error('Failed to save recent profiles:', error);
        }
      }
      
      return trimmed;
    });
  };

  const removeRecentProfile = (custId: string) => {
    setRecentProfiles(current => {
      const filtered = current.filter(p => p.custId !== custId);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
          console.error('Failed to save recent profiles:', error);
        }
      }
      
      return filtered;
    });
  };

  const clearRecentProfiles = () => {
    setRecentProfiles([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    recentProfiles,
    addRecentProfile,
    removeRecentProfile,
    clearRecentProfiles
  };
}
