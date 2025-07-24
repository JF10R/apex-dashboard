'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Users, Zap } from 'lucide-react';

interface LoadingProgressProps {
  phase: 'initial' | 'lap-data' | 'complete' | 'error';
  participantsProcessed: number;
  totalParticipants: number;
  currentParticipant?: string;
  percentage: number;
}

export function LoadingProgress({ 
  phase, 
  participantsProcessed, 
  totalParticipants, 
  currentParticipant, 
  percentage 
}: LoadingProgressProps) {
  const getPhaseInfo = () => {
    switch (phase) {
      case 'initial':
        return {
          icon: <Clock className="w-5 h-5 text-blue-500" />,
          title: 'Loading Race Data',
          description: 'Fetching basic race information...'
        };
      case 'lap-data':
        return {
          icon: <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />,
          title: 'Loading Lap Data',
          description: currentParticipant 
            ? `Processing ${currentParticipant}'s lap times...`
            : 'Processing participant lap times...'
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          title: 'Complete',
          description: 'All race data loaded successfully!'
        };
      case 'error':
        return {
          icon: <div className="w-5 h-5 bg-red-500 rounded-full" />,
          title: 'Error',
          description: 'Failed to load race data'
        };
    }
  };

  const { icon, title, description } = getPhaseInfo();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(percentage * 10) / 10}%</span>
          </div>
          <Progress value={percentage} className="w-full" />
        </div>
        
        {phase === 'lap-data' && totalParticipants > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {participantsProcessed} of {totalParticipants} participants processed
            </span>
          </div>
        )}

        {phase === 'lap-data' && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            💡 <strong>What's happening?</strong> We're fetching detailed lap data for each driver to show you comprehensive race statistics. This helps avoid API rate limits while ensuring you get complete information.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
