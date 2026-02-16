import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { blockchainService } from '../services/blockchainService';

export function useBlockchainLogs(enabled = false, pollInterval = 5000) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const chainAttempted = useRef(false);
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

  const fetchFromChain = useCallback(async () => {
    if (chainAttempted.current) return;
    chainAttempted.current = true;

    try {
      const rounds = await blockchainService.getAllTrainingRounds();
      if (Array.isArray(rounds) && rounds.length > 0) {
        setLogs((prev) => {
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
    } catch {
      // Blockchain node not available
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchFromBackend();
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

    try {
      const handler = (entry) => setLogs((prev) => [entry, ...prev]);
      blockchainService.onTrainingRoundLogged(handler);
    } catch {
      // ignore
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, pollInterval, refresh, fetchFromBackend]);

  return { logs, loading, error, refresh };
}
