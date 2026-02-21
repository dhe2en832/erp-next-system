'use client';

/**
 * Loading State Hook
 * 
 * A custom hook for managing loading states in components.
 * Provides utilities for tracking multiple async operations.
 */

import { useState, useCallback } from 'react';

interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for managing a single loading state
 */
export function useLoading(initialState = false): UseLoadingReturn {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true);
      return await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}

interface UseMultipleLoadingReturn {
  isLoading: (key: string) => boolean;
  isAnyLoading: boolean;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for managing multiple loading states
 */
export function useMultipleLoading(): UseMultipleLoadingReturn {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] ?? false;
  }, [loadingStates]);

  const isAnyLoading = Object.values(loadingStates).some(state => state);

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const withLoading = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
    try {
      setLoadingStates(prev => ({ ...prev, [key]: true }));
      return await fn();
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  return {
    isLoading,
    isAnyLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
}
