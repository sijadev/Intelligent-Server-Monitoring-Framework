import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Database, Wifi } from 'lucide-react';

interface ErrorStateProps {
  error: any;
  onRetry?: () => void;
  fallbackData?: any;
}

export function ErrorState({ error, onRetry, fallbackData }: ErrorStateProps) {
  const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');
  const isDatabaseError = error?.status === 503 || error?.message?.includes('database');

  const getErrorIcon = () => {
    if (isDatabaseError) return <Database className="h-4 w-4" />;
    if (isNetworkError) return <Wifi className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getErrorTitle = () => {
    if (isDatabaseError) return 'Database Connection Failed';
    if (isNetworkError) return 'Network Connection Failed';
    return 'Service Unavailable';
  };

  const getErrorMessage = () => {
    if (error?.message) return error.message;
    if (isDatabaseError)
      return 'Unable to connect to the database. This may indicate a system issue.';
    if (isNetworkError) return 'Unable to connect to the server. Please check your connection.';
    return 'An unexpected error occurred. Please try again.';
  };

  return (
    <div className="p-6">
      <Alert variant="destructive" className="mb-4">
        {getErrorIcon()}
        <AlertTitle>{getErrorTitle()}</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p>{getErrorMessage()}</p>
            {error?.status && <p className="text-sm opacity-75">Status Code: {error.status}</p>}
            {error?.timestamp && (
              <p className="text-xs opacity-60">
                Error Time: {new Date(error.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2 mb-4">
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      )}

      {fallbackData && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Showing cached/fallback data. Some information may not be current.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
