import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';

export function useTrainingData(pollInterval = 5000) {
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const logs = await apiService.getTrainingLogs();
      setTrainingLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await apiService.getTrainingStatus();
      setIsTraining(Boolean(status?.is_training));
      return status;
    } catch (err) {
      setError(err);
      return null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      await fetchLogs();
      const status = await fetchStatus();
      if (!status || !status.is_training) {
        // stop polling if training finished
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, pollInterval);
  }, [fetchLogs, fetchStatus, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTraining = useCallback(async (config) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.startTraining(config);
      setIsTraining(true);
      await fetchLogs();
      startPolling();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchLogs, startPolling]);

  const stopTraining = useCallback(async () => {
    try {
      await apiService.stopTraining();
    } catch (err) {
      console.error('stopTraining error', err);
    } finally {
      setIsTraining(false);
      stopPolling();
      await fetchLogs();
    }
  }, [stopPolling, fetchLogs]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await fetchStatus();
        if (mounted) {
          setIsTraining(Boolean(status?.is_training));
        }
        await fetchLogs();
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [fetchLogs, fetchStatus, stopPolling]);

  return {
    trainingLogs,
    isTraining,
    loading,
    error,
    startTraining,
    stopTraining,
    startPolling,
    stopPolling,
    refresh: fetchLogs,
  };
}
