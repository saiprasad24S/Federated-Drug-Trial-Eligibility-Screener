import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiService } from '../services/apiService';

/* ── helpers ─────────────────────────────────────────────────── */
const humanLabel = (key) => {
  const specials = { bmi: 'BMI', id: 'ID', dob: 'DOB' };
  return key.split('_').map((w) => specials[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const renderCell = (value, key) => {
  if (value == null || value === '') return <span className="text-gray-400">-</span>;
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span className="text-gray-400">None</span>;
  if (key === 'blood_group') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">{value}</span>;
  if (key === 'stage') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-700">{value}</span>;
  if (key === 'gender') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">{value}</span>;
  if (key === 'phone') return <span className="text-blue-700 font-mono text-xs">{value}</span>;
  if (key === 'email') return <span className="text-blue-600 underline text-xs truncate max-w-[180px] inline-block">{value}</span>;
  if (key === 'address') return <span className="text-gray-600 text-xs truncate max-w-[200px] inline-block" title={value}>{value}</span>;
  if (key === 'emergency_contact') return <span className="text-orange-700 text-xs">{value}</span>;
  if (key === 'patient_name') return <span className="font-semibold text-gray-900">{value}</span>;
  if (key === 'hospital') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800">{value}</span>;
  if (key === 'admission_date' || key === 'diagnosis_date') return <span className="text-gray-600 text-xs font-mono">{value}</span>;
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

  // Server-side pagination / search / sort state
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

  /* debounce search input — wait 400ms after typing stops */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  /* fetch patients whenever page/sort/search changes */
  useEffect(() => {
    loadPatients();
  }, [hospitalName, page, debouncedSearch, sortField, sortDir]);

  useEffect(() => () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPatients(hospitalName, {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        sortBy: sortField,
        sortDir,
      });
      setPatients(response.patients || []);
      setTotalPatients(response.total ?? 0);
      setTotalPages(response.total_pages ?? 1);
      if (response.columns?.length) setColumns(response.columns);
      else if (response.patients?.length) {
        setColumns(Object.keys(response.patients[0]).filter(k => !['hospital','eligible','drug_worked'].includes(k)));
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setUploadedFile(file); setUploadStatus(null); setPreprocessInfo(null); }
  };

  const startProgressPolling = useCallback((uploadId) => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setUploadProgress({ percent: 5, stage: 'Starting upload...' });
    progressTimerRef.current = setInterval(async () => {
      try {
        const prog = await apiService.getUploadProgress(uploadId);
        setUploadProgress(prog);
        if (prog.percent >= 100 || prog.percent < 0) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      } catch { /* ignore */ }
    }, 400);
  }, []);

  const handleUpload = async () => {
    if (!uploadedFile) { setUploadStatus({ type: 'error', message: 'Please select a file' }); return; }
    try {
      setLoading(true);
      setPreprocessInfo(null);
      setUploadProgress({ percent: 2, stage: 'Sending file to server...' });

      const onUploadProgress = (evt) => {
        if (evt.total) {
          const pct = Math.min(Math.round((evt.loaded / evt.total) * 10), 10);
          setUploadProgress({ percent: pct, stage: 'Uploading file...' });
        }
      };

      const resultPromise = apiService.uploadFile(uploadedFile, hospitalName, onUploadProgress);

      let simPercent = 10;
      const stages = ['Parsing file...','Detecting columns...','Normalising data...','Generating patient IDs...','Saving standard CSV...','Merging into store...','Persisting JSON...','Generating training CSV...','Logging to blockchain...'];
      const simTimer = setInterval(() => {
        if (simPercent < 90) {
          simPercent += Math.random() * 12 + 3;
          if (simPercent > 90) simPercent = 90;
          const stageIdx = Math.min(Math.floor((simPercent - 10) / 10), stages.length - 1);
          setUploadProgress({ percent: Math.round(simPercent), stage: stages[stageIdx] });
        }
      }, 600);

      const result = await resultPromise;
      clearInterval(simTimer);
      setUploadProgress({ percent: 100, stage: 'Complete!' });

      setUploadStatus({ type: 'success', message: result.message });
      setPreprocessInfo({
        fileType: (result.file_type || '').toUpperCase(),
        newPatients: result.new_patients || 0,
        hospitals: result.hospitals_in_file || [],
        totalPatients: result.total_patients || 0,
      });

      if (result.columns?.length) setColumns(result.columns);
      setUploadedFile(null);
      // Force re-fetch page 1 even if already on page 1
      setPage(0);  // briefly set to 0
      setTimeout(() => { setPage(1); }, 50);  // then back to 1 to trigger useEffect

      try {
        setTrainingMsg({ type: 'info', message: 'Preprocessing complete. Starting federated model training...' });
        await apiService.startTraining({ num_rounds: 10 });
        setTrainingMsg({ type: 'success', message: 'Model training started automatically.' });
        setTimeout(() => setTrainingMsg(null), 6000);
      } catch (trainErr) {
        const msg = trainErr?.response?.data?.detail || 'Training could not be started';
        setTrainingMsg({ type: 'warning', message: msg });
        setTimeout(() => setTrainingMsg(null), 4000);
      }

      setTimeout(() => { setShowUploadForm(false); setPreprocessInfo(null); setUploadProgress(null); }, 5000);
    } catch (error) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setUploadProgress(null);
      const detail = error?.response?.data?.detail || error.message;
      setUploadStatus({ type: 'error', message: detail });
    } finally { setLoading(false); }
  };

  /* ── sorting (server-side) ─────────────────────────────────── */
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-gray-400">{sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

  /* ── pagination helpers ─────────────────────────────────────── */
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  /* ── progress bar widget ────────────────────────────────────── */
  const ProgressBar = () => {
    if (!uploadProgress) return null;
    const pct = Math.max(0, Math.min(uploadProgress.percent, 100));
    const isError = pct < 0;
    const isDone = pct >= 100;
    const barColor = isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-blue-600';
    const bgColor = isError ? 'bg-red-50 border-red-200' : isDone ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
    const textColor = isError ? 'text-red-700' : isDone ? 'text-green-700' : 'text-blue-700';
    return (
      <div className={`p-4 rounded-lg border ${bgColor} mb-4`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${textColor}`}>{uploadProgress.stage}</span>
          <span className={`text-sm font-bold ${textColor}`}>{isDone ? '100%' : isError ? 'Error' : `${pct}%`}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`} style={{ width: `${Math.max(pct, 0)}%` }} />
        </div>
        {!isDone && !isError && (
          <div className="flex items-center gap-2 mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            <span className="text-xs text-blue-600">Processing...</span>
          </div>
        )}
        {isDone && (
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs text-green-600 font-medium">Preprocessing complete — patients loaded!</span>
          </div>
        )}
      </div>
    );
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Patients</h2>
          <p className="text-sm text-gray-500 mt-1">Showing patients from <span className="font-semibold text-blue-700">{hospitalName}</span> only</p>
        </div>
        <button onClick={() => setShowUploadForm(!showUploadForm)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Upload Data
        </button>
      </div>

      {trainingMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
          trainingMsg.type === 'success' ? 'bg-teal-50 border border-teal-200 text-teal-800' :
          trainingMsg.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
          'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span>{trainingMsg.message}</span>
        </div>
      )}

      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        <span><strong>Full Patient Records:</strong> All personal &amp; medical details are visible because this is your hospital's own data. This information is never shared with other hospitals or external systems.</span>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Upload Patient Data</h3>
          <div className="space-y-4">
            <label className="w-full flex flex-col items-center justify-center px-4 py-6 bg-white text-blue-600 rounded-lg shadow-lg border border-blue-300 cursor-pointer hover:bg-blue-50">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H4a5 5 0 0 1-1-9.9V7a3 3 0 0 1 6-3h2a3 3 0 0 1 2 .9l5.07 5.07a1 1 0 1 1-1.42 1.42L12.07 7H10" /></svg>
              <span className="mt-2 text-base">{uploadedFile ? uploadedFile.name : 'Select CSV, JSON, or PDF file'}</span>
              <input type="file" className="hidden" accept=".csv,.json,.pdf" onChange={handleFileSelect} />
            </label>
            <ProgressBar />
            {uploadStatus && <div className={`p-4 rounded-lg ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{uploadStatus.message}</div>}
            {preprocessInfo && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
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
              <button onClick={handleUpload} disabled={!uploadedFile || loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg">{loading ? 'Processing...' : 'Upload & Preprocess'}</button>
              <button onClick={() => { setShowUploadForm(false); setUploadProgress(null); }} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input type="text" placeholder="Search across all fields..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white placeholder-gray-400" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center"><p className="text-xs text-blue-600">Total Patients</p><p className="text-xl font-bold text-blue-800">{totalPatients.toLocaleString()}</p></div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center"><p className="text-xs text-purple-600">Showing</p><p className="text-xl font-bold text-purple-800">{patients.length}</p></div>
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-center"><p className="text-xs text-teal-600">Page</p><p className="text-xl font-bold text-teal-800">{page} / {totalPages}</p></div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center"><p className="text-xs text-orange-600">Per Page</p><p className="text-xl font-bold text-orange-800">{PAGE_SIZE}</p></div>
      </div>

      {/* Dynamic columns badge */}
      {columns.length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Columns:</span>
          {columns.map(col => (
            <span key={col} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">{humanLabel(col)}</span>
          ))}
        </div>
      )}

      {/* Table */}
      {loading && !showUploadForm ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Loading patients...</p></div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-200 sticky top-0 z-10">
                  <tr>
                    {columns.map(col => (
                      <th key={col} onClick={() => handleSort(col)} className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer select-none whitespace-nowrap hover:bg-gray-200">
                        {humanLabel(col)}<SortIcon field={col} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr><td colSpan={columns.length || 1} className="px-6 py-8 text-center text-gray-500">{debouncedSearch ? 'No patients match your search.' : 'No patients found. Upload a file to get started.'}</td></tr>
                  ) : patients.map((patient, idx) => (
                    <tr key={patient.patient_id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                      {columns.map(col => (
                        <td key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {col === 'patient_id' ? <span className="font-medium text-gray-900">{patient[col]}</span> : renderCell(patient[col], col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="px-2 py-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${
                        p === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}

          <div className="text-center py-2 text-gray-500 text-xs mt-2">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalPatients)} of {totalPatients.toLocaleString()} patients
          </div>
        </>
      )}
    </div>
  );
}
