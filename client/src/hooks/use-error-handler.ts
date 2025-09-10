
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  onError?: (error: Error) => void;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: Error | unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        toastTitle = 'Error',
        logError = true,
        onError,
      } = options;

      // Normalize error
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      // Log error
      if (logError) {
        console.error('Error handled:', normalizedError);
      }

      // Show toast notification
      if (showToast) {
        toast({
          title: toastTitle,
          description: normalizedError.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }

      // Call custom error handler
      onError?.(normalizedError);

      // In production, you might want to send this to an error reporting service
      // Example: Sentry.captureException(normalizedError);
    },
    [toast]
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}

export default useErrorHandler;
