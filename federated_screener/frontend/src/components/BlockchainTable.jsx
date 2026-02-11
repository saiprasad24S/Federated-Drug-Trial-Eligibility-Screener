import React from 'react';

const formatTimestamp = (t) => {
  if (!t) return '-';
  const ms = t > 1e12 ? t : t * 1000; // detect seconds vs ms
  return new Date(ms).toLocaleString();
};

const ACTION_STYLES = {
  SYSTEM_STARTUP:        { bg: 'bg-gray-100',   text: 'text-gray-700',   icon: '⚡' },
  DATA_UPLOAD:           { bg: 'bg-blue-100',   text: 'text-blue-800',   icon: '📤' },
  PATIENTS_VIEWED:       { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: '👁️' },
  ELIGIBILITY_SCREEN:    { bg: 'bg-green-100',  text: 'text-green-800',  icon: '🔍' },
  ELIGIBILITY_PREDICTION:{ bg: 'bg-teal-100',   text: 'text-teal-800',   icon: '🎯' },
  TRAINING_STARTED:      { bg: 'bg-amber-100',  text: 'text-amber-800',  icon: '🚀' },
  TRAINING_ROUND:        { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🔄' },
};

const getActionStyle = (action) => ACTION_STYLES[action] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' };

const BlockchainTable = ({ blockchainData = [], loading = false }) => {
  const data = Array.isArray(blockchainData) ? blockchainData : [];

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Blockchain Audit Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">Immutable record of all system actions</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
          <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{data.length} entries</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(ACTION_STYLES).map(([key, style]) => (
          <span key={key} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
            <span>{style.icon}</span>
            <span>{key.replace(/_/g, ' ')}</span>
          </span>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-gray-600 font-medium">No blockchain audit entries yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload patient data or navigate the app to generate audit entries</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full w-full table-auto text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50">
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Records</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.map((entry, idx) => {
                  const style = getActionStyle(entry.action);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-400">{data.length - idx}</td>
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                          <span>{style.icon}</span>
                          <span>{(entry.action || 'UNKNOWN').replace(/_/g, ' ')}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-sm text-gray-800 max-w-xs truncate" title={entry.details}>{entry.details || '-'}</td>
                      <td className="px-3 py-3 align-top text-sm text-gray-600">{entry.actor || '-'}</td>
                      <td className="px-3 py-3 align-top text-sm text-gray-700 text-right font-medium">{entry.record_count != null ? entry.record_count.toLocaleString() : '-'}</td>
                      <td className="px-3 py-3 align-top text-sm text-gray-500 whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                      <td className="px-3 py-3 align-top text-xs text-gray-400 font-mono">
                        {entry.txHash ? (
                          <span title={entry.txHash} className="cursor-help hover:text-blue-600 transition">
                            {entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Privacy note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span><strong>Blockchain Audit:</strong> Every action is logged with a cryptographic hash for tamper-proof auditability. In production, these entries are written to an on-chain smart contract.</span>
      </div>
    </div>
  );
};

export default BlockchainTable;