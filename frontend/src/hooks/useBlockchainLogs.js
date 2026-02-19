import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';

export function useBlockchainLogs(enabled = false, pollInterval = 12000) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastHash = useRef('');  // dedup: skip re-render if data unchanged

  const fetchFromBackend = useCallback(async () => {
    try {
      const backendLogs = await apiService.getBlockchainLogs();
      const list = Array.isArray(backendLogs) ? backendLogs : [];
      // Quick hash: compare count + newest txHash to avoid re-renders
      const hash = `${list.length}_${list[0]?.txHash || ''}`;
      if (hash !== lastHash.current) {
        lastHash.current = hash;
        setLogs(list);
      }
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchFromBackend();
  }, [fetchFromBackend]);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        await refresh();
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refresh, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    refresh();
    intervalRef.current = setInterval(fetchFromBackend, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollInterval, refresh, fetchFromBackend]);

  return { logs, loading, error, refresh };
}
