import { useState, useEffect, useCallback, useRef } from 'react';
import { formatApiError } from '../services/api';

interface UseApiOptions<T> {
  immediate?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseApiResult<T, Args extends any[]> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: Args) => Promise<T | null>;
  refetch: () => Promise<T | null>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  clearError: () => void;
}

/**
 * Universal API execution hook with loading, error, and caching state.
 *
 * @param apiFunc Async function returning data promise
 * @param options immediate execution flag, initial data, callbacks
 * @param deps Dependency array for automatic refetching
 */
export function useApi<T, Args extends any[] = []>(
  apiFunc: (...args: Args) => Promise<T>,
  options: UseApiOptions<T> = {},
  deps: any[] = []
): UseApiResult<T, Args> {
  const { immediate = true, initialData = null, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);

  const lastArgsRef = useRef<Args | []>([]);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      lastArgsRef.current = args;
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunc(...args);
        setData(result);
        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        const formatted = formatApiError(err);
        setError(formatted);
        if (onError) onError(formatted);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc, onSuccess, onError]
  );

  const refetch = useCallback(async (): Promise<T | null> => {
    return execute(...(lastArgsRef.current as Args));
  }, [execute]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
    setData,
    clearError,
  };
}

export default useApi;

