import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { blockchainService } from '../services/blockchainService';

export function useBlockchainLogs(enabled = false, pollInterval = 2000) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchFromBackend = useCallback(async () => {
    try {
      const backendLogs = await apiService.getBlockchainLogs();
      setLogs(Array.isArray(backendLogs) ? backendLogs : []);
      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, []);

  const fetchFromChain = useCallback(async () => {
    // In the new audit-log model the backend is the primary source.
    // On-chain fetch is supplementary and only merges training rounds.
    try {
      const rounds = await blockchainService.getAllTrainingRounds();
      if (Array.isArray(rounds) && rounds.length > 0) {
        setLogs((prev) => {
          // Merge on-chain training rounds into existing audit logs
          const existing = new Set((prev || []).filter(l => l.action === 'TRAINING_ROUND').map(l => l.metadata?.round || l.round));
          const newEntries = rounds
            .filter(r => !existing.has(r.round || r.round_number))
            .map(r => ({
              action: 'TRAINING_ROUND',
              details: `Round ${r.round || r.round_number} (on-chain)`,
              actor: 'Blockchain',
              record_count: 1,
              timestamp: r.timestamp,
              txHash: r.txHash || r.metadata_hash || '',
              metadata: r,
            }));
          if (newEntries.length === 0) return prev;
          return [...newEntries, ...prev];
        });
      }
    } catch (err) {
      console.warn('blockchain fetch failed, falling back to backend', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Backend is the primary fast source — fetch it first and update immediately
    await fetchFromBackend();
    // On-chain is supplementary, fetch in background (non-blocking)
    fetchFromChain().catch(() => {});
  }, [fetchFromBackend, fetchFromChain]);

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

    return () => {
      mounted = false;
    };
  }, [refresh, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Do an immediate fetch when tab becomes active
    refresh();

    intervalRef.current = setInterval(() => {
      refresh();
    }, pollInterval);

    // subscribe to on-chain events if available
    const handler = (entry) => setLogs((prev) => [entry, ...prev]);
    try {
      blockchainService.onTrainingRoundLogged(handler);
    } catch (e) {
      // ignore
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      try {
        // no-op for cleanup; ethers will handle listeners if needed
      } catch (e) {
        console.debug('error cleaning blockchain listeners', e);
      }
    };
  }, [enabled, pollInterval, refresh]);

  return { logs, loading, error, refresh };
}
