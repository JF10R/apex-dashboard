'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Here you would send error to your monitoring service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const isNetworkError = error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch');
  const isAPIError = error.message.includes('API') || error.message.includes('iRacing');
  const isCAPTCHAError = error.message.includes('CAPTCHA') || error.message.includes('verification');

  const getErrorIcon = () => {
    if (isNetworkError) return <RefreshCw className="h-8 w-8 text-orange-500" />;
    if (isCAPTCHAError) return <FileText className="h-8 w-8 text-blue-500" />;
    return <AlertTriangle className="h-8 w-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (isNetworkError) return "Connection Issue";
    if (isCAPTCHAError) return "Authentication Required";
    if (isAPIError) return "iRacing API Issue";
    return "Something went wrong";
  };

  const getErrorDescription = () => {
    if (isNetworkError) {
      return "Unable to connect to the iRacing API. This could be due to network issues or iRacing maintenance.";
    }
    if (isCAPTCHAError) {
      return "iRacing requires CAPTCHA verification. Please log in to iRacing.com manually to complete verification.";
    }
    if (isAPIError) {
      return "There's an issue with the iRacing API. This might be temporary - try refreshing the page.";
    }
    return "An unexpected error occurred while loading the dashboard.";
  };

  const getRecommendedActions = () => {
    if (isNetworkError) {
      return [
        "Check your internet connection",
        "Try refreshing the page",
        "Check if iRacing.com is accessible",
        "Wait a few minutes and try again"
      ];
    }
    if (isCAPTCHAError) {
      return [
        "Open iRacing.com in a new tab",
        "Log in with your credentials",
        "Complete any CAPTCHA challenge",
        "Wait a few minutes, then try again"
      ];
    }
    if (isAPIError) {
      return [
        "Try refreshing the page",
        "Check your .env.local credentials",
        "Wait a few minutes and try again",
        "Contact support if issue persists"
      ];
    }
    return [
      "Try refreshing the page",
      "Clear your browser cache",
      "Contact support if issue persists"
    ];
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-2xl">{getErrorTitle()}</CardTitle>
          <CardDescription className="text-base">
            {getErrorDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Technical Details:</strong> {error.message}
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="font-medium mb-2">Recommended Actions:</h4>
            <ul className="space-y-1">
              {getRecommendedActions().map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={resetError} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && errorInfo && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium mb-2">Developer Details</summary>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                {error.stack}
              </pre>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32 mt-2">
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for easier wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default ErrorBoundary;