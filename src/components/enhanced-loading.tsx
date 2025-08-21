'use client';

import React from 'react';
import { Loader2, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  message?: string;
  progress?: number;
  timestamp?: number;
}

interface EnhancedLoadingProps {
  steps: LoadingStep[];
  title?: string;
  description?: string;
  showProgress?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export function EnhancedLoading({
  steps,
  title = "Loading Data",
  description = "Please wait while we fetch your racing data...",
  showProgress = true,
  showTimestamp = false,
  className = "",
}: EnhancedLoadingProps) {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const currentStep = steps.find(step => step.status === 'loading');
  const hasErrors = steps.some(step => step.status === 'error');
  
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStepIcon = (step: LoadingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepBadge = (step: LoadingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="success" className="text-xs">Done</Badge>;
      case 'loading':
        return <Badge variant="default" className="text-xs">Loading...</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Waiting</Badge>;
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp || !showTimestamp) return null;
    const elapsed = Date.now() - timestamp;
    return elapsed < 1000 ? '<1s' : `${Math.floor(elapsed / 1000)}s`;
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Activity className="h-8 w-8 text-blue-500" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        
        {showProgress && (
          <div className="mt-4 space-y-2">
            <Progress value={overallProgress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{completedSteps} of {totalSteps} completed</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            {hasErrors && (
              <div className="text-sm text-red-500 font-medium">
                Some steps encountered errors
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                step.status === 'loading' 
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                  : step.status === 'completed'
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : step.status === 'error'
                  ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  : 'bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{step.label}</span>
                  {getStepBadge(step)}
                  {showTimestamp && step.timestamp && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatTimestamp(step.timestamp)}
                    </span>
                  )}
                </div>
                
                {step.message && (
                  <p className={`text-xs ${
                    step.status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {step.message}
                  </p>
                )}
                
                {step.status === 'loading' && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {currentStep && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">
                Currently: {currentStep.label}
              </span>
            </div>
            {currentStep.message && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {currentStep.message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified loading component for basic use cases
interface SimpleLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SimpleLoading({
  message = "Loading...",
  size = 'md',
  className = ""
}: SimpleLoadingProps) {
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }[size];

  return (
    <div className={`flex items-center justify-center gap-3 p-4 ${className}`}>
      <Loader2 className={`${iconSize} animate-spin text-blue-500`} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

// Hook for managing loading steps
export function useLoadingSteps(initialSteps: Omit<LoadingStep, 'status' | 'timestamp'>[]) {
  const [steps, setSteps] = React.useState<LoadingStep[]>(
    initialSteps.map(step => ({
      ...step,
      status: 'pending' as const,
      timestamp: Date.now(),
    }))
  );

  const updateStep = React.useCallback((
    stepId: string, 
    update: Partial<Pick<LoadingStep, 'status' | 'message' | 'progress'>>
  ) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, ...update, timestamp: Date.now() }
        : step
    ));
  }, []);

  const startStep = React.useCallback((stepId: string, message?: string) => {
    updateStep(stepId, { status: 'loading', message });
  }, [updateStep]);

  const completeStep = React.useCallback((stepId: string, message?: string) => {
    updateStep(stepId, { status: 'completed', message });
  }, [updateStep]);

  const errorStep = React.useCallback((stepId: string, message?: string) => {
    updateStep(stepId, { status: 'error', message });
  }, [updateStep]);

  const resetSteps = React.useCallback(() => {
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      message: undefined,
      progress: undefined,
      timestamp: Date.now(),
    })));
  }, []);

  return {
    steps,
    updateStep,
    startStep,
    completeStep,
    errorStep,
    resetSteps,
  };
}

export default EnhancedLoading;