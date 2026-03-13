import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, TableSkeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem, popIn, slideUp } from '../utils/motionVariants';

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
  TRIAL_CREATED:         '🧪',
  TRIAL_DELETED:         '🗑️',
  TRIAL_VIEWED:          '🔬',
  PATIENT_CHECK:         '🩺',
  ELIGIBILITY_SCREEN:    '🔍',
  ELIGIBILITY_PREDICTION:'🎯',
  TRAINING_STARTED:      '🚀',
  TRAINING_ROUND:        '🔄',
  TAB_NAVIGATION:        '📍',
};

const getActionIcon = (action) => ACTION_ICONS[action] || '📋';

const ACTION_COLORS = {
  TRIAL_CREATED:  { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success)' },
  TRIAL_DELETED:  { bg: 'var(--status-error-bg)',   border: 'var(--status-error-border)',   text: 'var(--status-error)' },
  TRIAL_VIEWED:   { bg: 'var(--status-info-bg)',     border: 'var(--status-info-border)',     text: 'var(--status-info)' },
  PATIENT_CHECK:  { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning)' },
  USER_LOGIN:     { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success)' },
  LOGIN_FAILED:   { bg: 'var(--status-error-bg)',   border: 'var(--status-error-border)',   text: 'var(--status-error)' },
  DATA_UPLOAD:    { bg: 'var(--status-info-bg)',     border: 'var(--status-info-border)',     text: 'var(--status-info)' },
  TRAINING_ROUND: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning)' },
};
const getActionColor = (action) => ACTION_COLORS[action] || { bg: 'var(--status-info-bg)', border: 'var(--status-info-border)', text: 'var(--status-info)' };

const BlockchainTable = memo(function BlockchainTable({ blockchainData = [], loading = false }) {
  const data = Array.isArray(blockchainData) ? blockchainData : [];
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [filterAction, setFilterAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const ANIMATE_LIMIT = 20;

  const actionSummary = useMemo(() => {
    const counts = {};
    for (const entry of data) {
      const a = entry.action || 'UNKNOWN';
      counts[a] = (counts[a] || 0) + 1;
    }
    return counts;
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    if (filterAction) result = result.filter(e => e.action === filterAction);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        (e.details || '').toLowerCase().includes(term) ||
        (e.actor || '').toLowerCase().includes(term) ||
        (e.action || '').toLowerCase().includes(term) ||
        (e.txHash || '').toLowerCase().includes(term)
      );
    }
    return result;
  }, [data, filterAction, searchTerm]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={staggerItem}>
        <Card padding="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Blockchain Audit Log</h2>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Immutable record of all system actions</p>
            </motion.div>
            <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              {loading && (
                <motion.div
                  className="rounded-full h-5 w-5"
                  style={{ border: '2px solid var(--border-primary)', borderTopColor: 'var(--brand-primary)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              )}
              <motion.span
                key={data.length}
                className="badge"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {data.length} entries
              </motion.span>
            </motion.div>
          </div>

          {/* Search bar */}
          <motion.div className="mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <input
              type="text"
              placeholder="Search logs by details, actor, action, or tx hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </motion.div>

          {/* Action filter chips */}
          <motion.div className="flex flex-wrap gap-2 mb-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <motion.button
              onClick={() => setFilterAction(null)}
              className="badge text-[11px] cursor-pointer transition-all"
              style={{
                background: !filterAction ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                color: !filterAction ? '#fff' : 'var(--text-tertiary)',
                border: `1px solid ${!filterAction ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              All ({data.length})
            </motion.button>
            {Object.entries(ACTION_ICONS).map(([key, icon]) => {
              const count = actionSummary[key] || 0;
              if (count === 0) return null;
              const isActive = filterAction === key;
              const colors = getActionColor(key);
              return (
                <motion.button
                  key={key}
                  onClick={() => setFilterAction(isActive ? null : key)}
                  className="badge text-[11px] cursor-pointer transition-all"
                  style={{
                    background: isActive ? colors.text : colors.bg,
                    color: isActive ? '#fff' : colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  <span>{icon}</span>
                  <span>{key.replace(/_/g, ' ')}</span>
                  <motion.span
                    key={count}
                    className="font-bold ml-1"
                    initial={{ scale: 1.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  >({count})</motion.span>
                </motion.button>
              );
            })}
          </motion.div>

          {loading && data.length === 0 ? (
            <TableSkeleton cols={6} rows={5} />
          ) : filteredData.length === 0 ? (
            <motion.div className="py-12 text-center" {...popIn}>
              <motion.div
                className="text-5xl mb-3"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >🔗</motion.div>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                {data.length === 0 ? 'No blockchain audit entries yet' : 'No matching entries found'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {data.length === 0 ? 'Create or view trials to generate audit entries' : 'Try different search terms or clear the filter'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="overflow-x-auto"
              style={{ border: '1px solid var(--table-border)', borderRadius: 'var(--radius-md)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
                <table className="min-w-full w-full table-auto text-left themed-table">
                  <thead>
                    <tr>
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Details</th>
                      <th className="px-3 py-2.5">Actor</th>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-3 py-2.5">Tx Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredData.map((entry, idx) => {
                        const shouldAnimate = idx < ANIMATE_LIMIT;
                        const isExpanded = expandedRow === (entry.txHash || idx);
                        const colors = getActionColor(entry.action);
                        return (
                        <React.Fragment key={entry.txHash || idx}>
                        <motion.tr
                          initial={shouldAnimate ? { opacity: 0, x: -12 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={shouldAnimate ? { delay: idx * 0.02, duration: 0.2, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                          onClick={() => setExpandedRow(isExpanded ? null : (entry.txHash || idx))}
                          className="cursor-pointer transition-colors duration-150"
                          style={{ background: isExpanded ? 'var(--bg-tertiary)' : undefined }}
                          whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <td className="px-3 py-3 align-top">
                            <motion.span
                              className="badge"
                              style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <span>{getActionIcon(entry.action)}</span>
                              <span>{(entry.action || 'UNKNOWN').replace(/_/g, ' ')}</span>
                            </motion.span>
                          </td>
                          <td className="px-3 py-3 align-top text-sm max-w-xs truncate" style={{ color: 'var(--text-primary)' }} title={entry.details}>{entry.details || '-'}</td>
                          <td className="px-3 py-3 align-top text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.actor || '-'}</td>
                          <td className="px-3 py-3 align-top text-sm whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{formatTimestamp(entry.timestamp)}</td>
                          <td className="px-3 py-3 align-top text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                            {entry.txHash ? (
                              <span title={entry.txHash} className="cursor-help" style={{ color: 'var(--brand-primary)' }}>
                                {entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}
                              </span>
                            ) : '-'}
                          </td>
                        </motion.tr>
                        {/* Expanded detail row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                            >
                              <td colSpan={5} className="px-4 py-3" style={{ background: 'var(--bg-tertiary)' }}>
                                <motion.div
                                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
                                  initial={{ opacity: 0, y: -8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.05 }}
                                >
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Full Details</p>
                                    <p style={{ color: 'var(--text-primary)' }}>{entry.details || 'No details'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Transaction Hash</p>
                                    <p className="font-mono text-xs break-all" style={{ color: 'var(--brand-primary)' }}>{entry.txHash || 'N/A'}</p>
                                  </div>
                                  {entry.record_count > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Records Affected</p>
                                      <p style={{ color: 'var(--text-primary)' }}>{entry.record_count.toLocaleString()}</p>
                                    </div>
                                  )}
                                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Metadata</p>
                                      <p className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{JSON.stringify(entry.metadata)}</p>
                                    </div>
                                  )}
                                </motion.div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                        </React.Fragment>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
            </motion.div>
          )}

          {/* Privacy note */}
          <motion.div
            className="mt-4 p-3 rounded-lg text-sm flex items-start gap-2"
            style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span><strong>Blockchain Audit:</strong> Every action — login, trial creation, deletion, eligibility checks — is logged with a cryptographic hash for tamper-proof auditability. Click any row to expand full details.</span>
          </motion.div>
        </Card>
      </motion.div>
    </motion.div>
  );
});

export default BlockchainTable;