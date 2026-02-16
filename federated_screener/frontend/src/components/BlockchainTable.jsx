import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, TableSkeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem } from '../utils/motionVariants';

const formatTimestamp = (t) => {
  if (!t) return '-';
  const ms = t > 1e12 ? t : t * 1000;
  return new Date(ms).toLocaleString();
};

const ACTION_ICONS = {
  SYSTEM_STARTUP:        '⚡',
  USER_LOGIN:            '🔑',
  LOGIN_FAILED:          '🚫',
  USER_LOGOUT:           '🚪',
  DASHBOARD_VIEWED:      '🏠',
  DATA_UPLOAD:           '📤',
  PATIENTS_VIEWED:       '👁️',
  TRIALS_VIEWED:         '📊',
  ELIGIBILITY_SCREEN:    '🔍',
  ELIGIBILITY_PREDICTION:'🎯',
  TRAINING_STARTED:      '🚀',
  TRAINING_ROUND:        '🔄',
  TAB_NAVIGATION:        '📍',
};

const getActionIcon = (action) => ACTION_ICONS[action] || '📋';

const BlockchainTable = memo(function BlockchainTable({ blockchainData = [], loading = false }) {
  const data = Array.isArray(blockchainData) ? blockchainData : [];
  const isDark = useThemeStore((s) => s.theme === 'dark');

  // Performance: only animate the first 20 rows, render rest instantly
  const ANIMATE_LIMIT = 20;

  // Memoize action summary counts
  const actionSummary = useMemo(() => {
    const counts = {};
    for (const entry of data) {
      const a = entry.action || 'UNKNOWN';
      counts[a] = (counts[a] || 0) + 1;
    }
    return counts;
  }, [data]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={staggerItem}>
        <Card padding="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Blockchain Audit Log</h2>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Immutable record of all system actions</p>
            </div>
            <div className="flex items-center gap-3">
              {loading && <div className="animate-spin rounded-full h-4 w-4" style={{ borderBottom: '2px solid var(--brand-primary)' }} />}
              <span
                className="badge"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
              >
                {data.length} entries
              </span>
            </div>
          </div>

          {/* Legend with counts */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(ACTION_ICONS).map(([key, icon]) => {
              const count = actionSummary[key] || 0;
              return (
                <span
                  key={key}
                  className="badge text-[11px]"
                  style={{
                    background: count > 0 ? 'var(--status-info-bg)' : 'var(--bg-tertiary)',
                    color: count > 0 ? 'var(--status-info)' : 'var(--text-tertiary)',
                    border: `1px solid ${count > 0 ? 'var(--status-info-border)' : 'var(--border-primary)'}`,
                  }}
                >
                  <span>{icon}</span>
                  <span>{key.replace(/_/g, ' ')}</span>
                  {count > 0 && <span className="font-bold ml-1">({count})</span>}
                </span>
              );
            })}
          </div>

          {loading && data.length === 0 ? (
            <TableSkeleton cols={6} rows={5} />
          ) : data.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🔗</div>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No blockchain audit entries yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Upload patient data or navigate the app to generate audit entries</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ border: '1px solid var(--table-border)', borderRadius: 'var(--radius-md)' }}>
                <table className="min-w-full w-full table-auto text-left themed-table">
                  <thead>
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Details</th>
                      <th className="px-3 py-2.5">Actor</th>
                      <th className="px-3 py-2.5 text-right">Records</th>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {data.map((entry, idx) => {
                        const shouldAnimate = idx < ANIMATE_LIMIT;
                        return (
                        <motion.tr
                          key={entry.txHash || idx}
                          initial={shouldAnimate ? { opacity: 0, x: -8 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={shouldAnimate ? { delay: idx * 0.015, duration: 0.15 } : { duration: 0 }}
                        >
                          <td className="px-3 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>{data.length - idx}</td>
                          <td className="px-3 py-3 align-top">
                            <span
                              className="badge"
                              style={{ background: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info-border)' }}
                            >
                              <span>{getActionIcon(entry.action)}</span>
                              <span>{(entry.action || 'UNKNOWN').replace(/_/g, ' ')}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-sm max-w-xs truncate" style={{ color: 'var(--text-primary)' }} title={entry.details}>{entry.details || '-'}</td>
                          <td className="px-3 py-3 align-top text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.actor || '-'}</td>
                          <td className="px-3 py-3 align-top text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{entry.record_count != null ? entry.record_count.toLocaleString() : '-'}</td>
                          <td className="px-3 py-3 align-top text-sm whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{formatTimestamp(entry.timestamp)}</td>
                          <td className="px-3 py-3 align-top text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                            {entry.txHash ? (
                              <span title={entry.txHash} className="cursor-help" style={{ color: 'var(--brand-primary)' }}>
                                {entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}
                              </span>
                            ) : '-'}
                          </td>
                        </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
            </div>
          )}

          {/* Privacy note */}
          <div
            className="mt-4 p-3 rounded-lg text-sm flex items-start gap-2"
            style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}
          >
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span><strong>Blockchain Audit:</strong> Every action is logged with a cryptographic hash for tamper-proof auditability. In production, these entries are written to an on-chain smart contract.</span>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
});

export default BlockchainTable;