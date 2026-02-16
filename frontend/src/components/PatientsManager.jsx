import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import { Card, Button, TableSkeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerItem } from '../utils/motionVariants';

/* ── helpers ─────────────────────────────────────────────────── */
const humanLabel = (key) => {
  const specials = { bmi: 'BMI', id: 'ID', dob: 'DOB' };
  return key.split('_').map((w) => specials[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const renderCell = (value, key) => {
  if (value == null || value === '') return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span style={{ color: 'var(--text-tertiary)' }}>None</span>;
  if (key === 'blood_group') return <span className="badge" style={{ background: 'var(--kpi-purple-bg)', color: 'var(--kpi-purple-text)', border: '1px solid var(--border-primary)' }}>{value}</span>;
  if (key === 'stage') return <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{value}</span>;
  if (key === 'gender') return <span className="badge" style={{ background: 'var(--kpi-purple-bg)', color: 'var(--kpi-purple-text)' }}>{value}</span>;
  if (key === 'phone') return <span className="font-mono text-xs" style={{ color: 'var(--brand-primary)' }}>{value}</span>;
  if (key === 'email') return <span className="text-xs underline truncate max-w-[180px] inline-block" style={{ color: 'var(--brand-primary)' }}>{value}</span>;
  if (key === 'address') return <span className="text-xs truncate max-w-[200px] inline-block" style={{ color: 'var(--text-secondary)' }} title={value}>{value}</span>;
  if (key === 'emergency_contact') return <span className="text-xs" style={{ color: 'var(--kpi-orange-text)' }}>{value}</span>;
  if (key === 'patient_name') return <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>;
  if (key === 'hospital') return <span className="badge" style={{ background: 'var(--kpi-teal-bg)', color: 'var(--kpi-teal-text)' }}>{value}</span>;
  if (key === 'admission_date' || key === 'diagnosis_date') return <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{value}</span>;
  return String(value);
};

const PAGE_SIZE = 50;

/* ── component ───────────────────────────────────────────────── */
export default function PatientsManager({ user }) {
  const [patients, setPatients] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('patient_id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [trainingMsg, setTrainingMsg] = useState(null);
  const [preprocessInfo, setPreprocessInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const progressTimerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const hospitalName = user?.hospital_name || '';

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  useEffect(() => { loadPatients(); }, [hospitalName, page, debouncedSearch, sortField, sortDir]);
  useEffect(() => () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPatients(hospitalName, { page, pageSize: PAGE_SIZE, search: debouncedSearch, sortBy: sortField, sortDir });
      setPatients(response.patients || []);
      setTotalPatients(response.total ?? 0);
      setTotalPages(response.total_pages ?? 1);
      if (response.columns?.length) setColumns(response.columns);
      else if (response.patients?.length) setColumns(Object.keys(response.patients[0]).filter(k => !['hospital','eligible','drug_worked'].includes(k)));
    } catch (error) { console.error('Error loading patients:', error); }
    finally { setLoading(false); }
  };

  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) { setUploadedFile(file); setUploadStatus(null); setPreprocessInfo(null); } };

  const startProgressPolling = useCallback((uploadId) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setUploadProgress({ percent: 5, stage: 'Starting upload...' });
    progressTimerRef.current = setInterval(async () => {
      try { const prog = await apiService.getUploadProgress(uploadId); setUploadProgress(prog); if (prog.percent >= 100 || prog.percent < 0) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; } } catch { /* ignore */ }
    }, 400);
  }, []);

  const handleUpload = async () => {
    if (!uploadedFile) { setUploadStatus({ type: 'error', message: 'Please select a file' }); return; }
    try {
      setLoading(true); setPreprocessInfo(null); setUploadProgress({ percent: 2, stage: 'Sending file to server...' });
      const onUploadProgress = (evt) => { if (evt.total) { const pct = Math.min(Math.round((evt.loaded / evt.total) * 10), 10); setUploadProgress({ percent: pct, stage: 'Uploading file...' }); } };
      const resultPromise = apiService.uploadFile(uploadedFile, hospitalName, onUploadProgress);
      let simPercent = 10;
      const stages = ['Parsing file...','Detecting columns...','Normalising data...','Generating patient IDs...','Saving standard CSV...','Merging into store...','Persisting JSON...','Generating training CSV...','Logging to blockchain...'];
      const simTimer = setInterval(() => { if (simPercent < 90) { simPercent += Math.random() * 12 + 3; if (simPercent > 90) simPercent = 90; const stageIdx = Math.min(Math.floor((simPercent - 10) / 10), stages.length - 1); setUploadProgress({ percent: Math.round(simPercent), stage: stages[stageIdx] }); } }, 600);
      const result = await resultPromise;
      clearInterval(simTimer);
      setUploadProgress({ percent: 100, stage: 'Complete!' });
      setUploadStatus({ type: 'success', message: result.message });
      setPreprocessInfo({ fileType: (result.file_type || '').toUpperCase(), newPatients: result.new_patients || 0, hospitals: result.hospitals_in_file || [], totalPatients: result.total_patients || 0 });
      if (result.columns?.length) setColumns(result.columns);
      setUploadedFile(null); setPage(0); setTimeout(() => { setPage(1); }, 50);
      try { setTrainingMsg({ type: 'info', message: 'Preprocessing complete. Starting federated model training...' }); await apiService.startTraining({ num_rounds: 10 }); setTrainingMsg({ type: 'success', message: 'Model training started automatically.' }); setTimeout(() => setTrainingMsg(null), 6000); } catch (trainErr) { const msg = trainErr?.response?.data?.detail || 'Training could not be started'; setTrainingMsg({ type: 'warning', message: msg }); setTimeout(() => setTrainingMsg(null), 4000); }
      setTimeout(() => { setShowUploadForm(false); setPreprocessInfo(null); setUploadProgress(null); }, 5000);
    } catch (error) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setUploadProgress(null);
      setUploadStatus({ type: 'error', message: error?.response?.data?.detail || error.message });
    } finally { setLoading(false); }
  };

  const handleSort = (field) => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('asc'); } setPage(1); };

  const SortIcon = ({ field }) => (
    <span className="ml-1" style={{ color: 'var(--text-tertiary)' }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  const pageNumbers = useMemo(() => {
    const pages = []; const maxVisible = 7;
    if (totalPages <= maxVisible) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); let start = Math.max(2, page - 2), end = Math.min(totalPages - 1, page + 2); if (start > 2) pages.push('...'); for (let i = start; i <= end; i++) pages.push(i); if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
    return pages;
  }, [page, totalPages]);

  /* ── progress bar ───────────────────────────────────────────── */
  const ProgressBar = () => {
    if (!uploadProgress) return null;
    const pct = Math.max(0, Math.min(uploadProgress.percent, 100));
    const isError = pct < 0, isDone = pct >= 100;
    const barColor = isError ? 'var(--status-error)' : isDone ? 'var(--status-success)' : 'var(--brand-primary)';
    const bgToken = isError ? 'error' : isDone ? 'success' : 'info';
    return (
      <div className="p-4 rounded-lg mb-4" style={{ background: `var(--status-${bgToken}-bg)`, border: `1px solid var(--status-${bgToken}-border)` }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold" style={{ color: barColor }}>{uploadProgress.stage}</span>
          <span className="text-sm font-bold" style={{ color: barColor }}>{isDone ? '100%' : isError ? 'Error' : `${pct}%`}</span>
        </div>
        <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <motion.div className="h-full rounded-full" style={{ background: barColor }} animate={{ width: `${Math.max(pct, 0)}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        </div>
        {!isDone && !isError && (
          <div className="flex items-center gap-2 mt-2">
            <div className="animate-spin rounded-full h-3.5 w-3.5" style={{ borderBottom: `2px solid var(--brand-primary)`, borderRight: '2px solid transparent' }} />
            <span className="text-xs" style={{ color: 'var(--brand-primary)' }}>Processing...</span>
          </div>
        )}
        {isDone && (
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-4 h-4" style={{ color: 'var(--status-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs font-medium" style={{ color: 'var(--status-success)' }}>Preprocessing complete — patients loaded!</span>
          </div>
        )}
      </div>
    );
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <motion.div variants={staggerItem} initial="hidden" animate="visible">
      <Card padding="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Patients</h2>
            </div>
            <p className="text-xs mt-1.5 ml-3.5" style={{ color: 'var(--text-tertiary)' }}>
              Showing patients from <span className="font-semibold" style={{ color: 'var(--brand-primary)' }}>{hospitalName}</span>
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowUploadForm(!showUploadForm)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            Upload Data
          </Button>
        </div>

        {trainingMsg && (
          <motion.div
            className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2"
            style={{
              background: trainingMsg.type === 'success' ? 'var(--status-success-bg)' : trainingMsg.type === 'info' ? 'var(--status-info-bg)' : 'var(--status-warning-bg)',
              border: `1px solid ${trainingMsg.type === 'success' ? 'var(--status-success-border)' : trainingMsg.type === 'info' ? 'var(--status-info-border)' : 'var(--status-warning-border)'}`,
              color: trainingMsg.type === 'success' ? 'var(--status-success)' : trainingMsg.type === 'info' ? 'var(--status-info)' : 'var(--status-warning)',
            }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          >
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span>{trainingMsg.message}</span>
          </motion.div>
        )}

        <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', color: 'var(--status-success)' }}>
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span><strong>Full Patient Records:</strong> All personal &amp; medical details are visible because this is your hospital's own data. This information is never shared with other hospitals or external systems.</span>
        </div>

        {/* Upload Form */}
        <AnimatePresence>
          {showUploadForm && (
            <motion.div
              className="mb-6 p-4 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upload Patient Data</h3>
              <div className="space-y-4">
                <label className="w-full flex flex-col items-center justify-center px-4 py-6 rounded-lg cursor-pointer" style={{ background: 'var(--bg-card)', border: '2px dashed var(--brand-primary)', color: 'var(--brand-primary)' }}>
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H4a5 5 0 0 1-1-9.9V7a3 3 0 0 1 6-3h2a3 3 0 0 1 2 .9l5.07 5.07a1 1 0 1 1-1.42 1.42L12.07 7H10" /></svg>
                  <span className="mt-2 text-base">{uploadedFile ? uploadedFile.name : 'Select CSV, JSON, or PDF file'}</span>
                  <input type="file" className="hidden" accept=".csv,.json,.pdf" onChange={handleFileSelect} />
                </label>
                <ProgressBar />
                {uploadStatus && (
                  <div className="p-4 rounded-lg" style={{
                    background: uploadStatus.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
                    border: `1px solid ${uploadStatus.type === 'success' ? 'var(--status-success-border)' : 'var(--status-error-border)'}`,
                    color: uploadStatus.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
                  }}>{uploadStatus.message}</div>
                )}
                {preprocessInfo && (
                  <div className="p-4 rounded-lg text-sm" style={{ background: 'var(--kpi-purple-bg)', border: '1px solid var(--border-primary)', color: 'var(--kpi-purple-text)' }}>
                    <p className="font-semibold mb-1">Preprocessing Summary</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span>File type: <strong>{preprocessInfo.fileType}</strong></span>
                      <span>New patients: <strong>{preprocessInfo.newPatients}</strong></span>
                      <span>Hospitals: <strong>{preprocessInfo.hospitals.join(', ')}</strong></span>
                      <span>Total in store: <strong>{preprocessInfo.totalPatients}</strong></span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1" onClick={handleUpload} disabled={!uploadedFile || loading} loading={loading}>Upload &amp; Preprocess</Button>
                  <Button variant="secondary" className="flex-1" onClick={() => { setShowUploadForm(false); setUploadProgress(null); }}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div className="mb-4">
          <input type="text" placeholder="Search across all fields..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Patients', value: totalPatients.toLocaleString(), bg: 'var(--kpi-blue-bg)', color: 'var(--kpi-blue-text)' },
            { label: 'Showing', value: patients.length, bg: 'var(--kpi-purple-bg)', color: 'var(--kpi-purple-text)' },
            { label: 'Page', value: `${page} / ${totalPages}`, bg: 'var(--kpi-teal-bg)', color: 'var(--kpi-teal-text)' },
            { label: 'Per Page', value: PAGE_SIZE, bg: 'var(--kpi-orange-bg)', color: 'var(--kpi-orange-text)' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>
              <p className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Column badges */}
        {columns.length > 0 && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Columns:</span>
            {columns.map(col => (
              <span key={col} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>{humanLabel(col)}</span>
            ))}
          </div>
        )}

        {/* Table */}
        {loading && !showUploadForm ? (
          <TableSkeleton cols={columns.length || 6} rows={8} />
        ) : (
          <>
            <div className="overflow-x-auto" style={{ border: '1px solid var(--table-border)', borderRadius: 'var(--radius-md)' }}>
                <table className="w-full text-sm themed-table">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col} onClick={() => handleSort(col)} className="px-4 py-3 text-left cursor-pointer select-none whitespace-nowrap" style={{ background: 'var(--table-header-bg)' }}>
                          {humanLabel(col)}<SortIcon field={col} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length === 0 ? (
                      <tr><td colSpan={columns.length || 1} className="px-6 py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>{debouncedSearch ? 'No patients match your search.' : 'No patients found. Upload a file to get started.'}</td></tr>
                    ) : patients.map((patient, idx) => (
                      <tr key={patient.patient_id || idx}>
                        {columns.map(col => (
                          <td key={col} className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                            {col === 'patient_id' ? <span className="font-medium">{patient[col]}</span> : renderCell(patient[col], col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Previous</Button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((p, i) =>
                    p === '...' ? <span key={`dots-${i}`} className="px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>...</span> : (
                      <button key={p} onClick={() => setPage(p)} className="btn text-sm" style={{
                        background: p === page ? 'var(--brand-primary)' : 'var(--bg-card)',
                        color: p === page ? '#fff' : 'var(--text-primary)',
                        border: `1px solid ${p === page ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
                        padding: '0.35rem 0.75rem',
                      }}>{p}</button>
                    )
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</Button>
              </div>
            )}

            <div className="text-center py-2 text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalPatients)} of {totalPatients.toLocaleString()} patients
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
}
