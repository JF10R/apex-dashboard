'use client';

import { useState, useEffect, useCallback } from 'react';
import { type RecentRace } from '@/lib/iracing-types';

export interface ProgressiveLoadingState {
  initialData: RecentRace | null;
  enhancedData: RecentRace | null;
  loading: boolean;
  error: string | null;
  progress: {
    phase: 'initial' | 'lap-data' | 'complete' | 'error';
    participantsProcessed: number;
    totalParticipants: number;
    currentParticipant?: string;
    percentage: number;
  };
}

export function useProgressiveRaceLoading(raceId: string) {
  const [state, setState] = useState<ProgressiveLoadingState>({
    initialData: null,
    enhancedData: null,
    loading: true,
    error: null,
    progress: {
      phase: 'initial',
      participantsProcessed: 0,
      totalParticipants: 0,
      percentage: 0,
    },
  });

  const updateProgress = useCallback((update: Partial<ProgressiveLoadingState['progress']>) => {
    setState(prev => ({
      ...prev,
      progress: { ...prev.progress, ...update }
    }));
  }, []);

  useEffect(() => {
    const loadRaceData = async () => {
      try {
        const subsessionId = parseInt(raceId, 10);
        if (isNaN(subsessionId)) {
          setState(prev => ({ 
            ...prev, 
            error: 'Invalid race ID', 
            loading: false,
            progress: { ...prev.progress, phase: 'error' }
          }));
          return;
        }

        // Phase 1: Load basic race data immediately
        updateProgress({ phase: 'initial', percentage: 10 });
        
        const response = await fetch(`/api/race/${raceId}/progressive`);
        
        if (!response.ok) {
          throw new Error('Failed to load race data');
        }

        // Use Server-Sent Events to get progressive updates
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response stream available');
        }

        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              const data = JSON.parse(line);
              
              switch (data.type) {
                case 'initial':
                  setState(prev => ({
                    ...prev,
                    initialData: data.race,
                    progress: {
                      ...prev.progress,
                      phase: 'lap-data',
                      totalParticipants: data.race.participants?.length || 0,
                      percentage: 20
                    }
                  }));
                  break;
                  
                case 'progress':
                  updateProgress({
                    participantsProcessed: data.processed,
                    currentParticipant: data.currentParticipant,
                    percentage: Math.round((20 + (data.processed / data.total) * 70) * 10) / 10 // 20-90%, rounded to 1 decimal
                  });
                  break;
                  
                case 'participant_update':
                  setState(prev => {
                    if (!prev.initialData) return prev;
                    
                    // Ensure participants exists and is an array before processing
                    if (!prev.initialData.participants || !Array.isArray(prev.initialData.participants)) {
                      console.warn('Cannot update participant: participants data is invalid');
                      return prev;
                    }
                    
                    const updatedParticipants = prev.initialData.participants.map(p => 
                      p.custId === data.custId ? { ...p, laps: data.laps } : p
                    );
                    
                    const updatedRace = {
                      ...prev.initialData,
                      participants: updatedParticipants
                    };
                    
                    return {
                      ...prev,
                      enhancedData: updatedRace
                    };
                  });
                  break;
                  
                case 'complete':
                  setState(prev => ({
                    ...prev,
                    enhancedData: data.race,
                    loading: false,
                    progress: {
                      ...prev.progress,
                      phase: 'complete',
                      percentage: 100
                    }
                  }));
                  break;
                  
                case 'error':
                  setState(prev => ({
                    ...prev,
                    error: data.message,
                    loading: false,
                    progress: {
                      ...prev.progress,
                      phase: 'error'
                    }
                  }));
                  break;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
        
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to load race data',
          loading: false,
          progress: {
            ...prev.progress,
            phase: 'error'
          }
        }));
      }
    };

    loadRaceData();
  }, [raceId, updateProgress]);

  return state;
}
