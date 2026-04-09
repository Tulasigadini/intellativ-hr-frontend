import { useState, useCallback, useRef } from 'react';

/**
 * useAsync - prevents double-clicks, tracks loading state per action
 * Usage: const { run, loading } = useAsync()
 *        <button onClick={() => run(myApiCall)} disabled={loading}>Submit</button>
 */
export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const run = useCallback(async (fn) => {
    if (inFlight.current) return; // block duplicate calls
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  return { run, loading, error };
}

/**
 * useButtonLoading - per-button loading state map
 * Usage: const { isLoading, run } = useButtonLoading()
 *        <button onClick={() => run('save', saveData)} disabled={isLoading('save')}>
 */
export function useButtonLoading() {
  const [loadingMap, setLoadingMap] = useState({});
  const inFlight = useRef({});

  const run = useCallback(async (key, fn) => {
    if (inFlight.current[key]) return;
    inFlight.current[key] = true;
    setLoadingMap(m => ({ ...m, [key]: true }));
    try {
      return await fn();
    } finally {
      setLoadingMap(m => ({ ...m, [key]: false }));
      inFlight.current[key] = false;
    }
  }, []);

  const isLoading = useCallback((key) => !!loadingMap[key], [loadingMap]);

  return { run, isLoading };
}
