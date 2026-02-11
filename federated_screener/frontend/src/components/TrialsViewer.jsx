import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';

/* helper: snake_case → Title Case */
const humanLabel = (key) => {
  const specials = { bmi: 'BMI', id: 'ID', dob: 'DOB' };
  return key.split('_').map((w) => specials[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};
const renderCell = (value, key) => {
  if (value == null || value === '') return <span className="text-gray-400">-</span>;
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span className="text-gray-400">None</span>;
  if (key === 'blood_group') return <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold">{value}</span>;
  if (key === 'stage') return <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-semibold">{value}</span>;
  return String(value);
};

const PAGE_SIZE = 50;

export default function TrialsViewer({ user }) {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);

  // Paginated eligibility state
  const [eligData, setEligData] = useState(null);  // current page response
  const [eligLoading, setEligLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('eligible'); // 'eligible' | 'not_eligible'
  const [eligPage, setEligPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const hospitalName = user?.hospital_name || '';

  useEffect(() => { loadTrials(); }, []);

  const loadTrials = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTrials();
      setTrials(response.trials || []);
    } catch (error) {
      console.error('Error loading trials:', error);
    } finally { setLoading(false); }
  };

  /* Load a page of eligible/not-eligible patients */
  const loadEligibility = async (drugName, tab, page) => {
    try {
      setEligLoading(true);
      const data = await apiService.getEligibleForDrug(drugName, hospitalName, {
        page,
        pageSize: PAGE_SIZE,
        tab,
      });
      setEligData(data);
    } catch (error) {
      console.error('Error fetching eligibility:', error);
    } finally { setEligLoading(false); }
  };

  const handleSelectTrial = (trial) => {
    setSelectedTrial(trial);
    setEligData(null);
    setActiveTab('eligible');
    setEligPage(1);
    loadEligibility(trial.drugName, 'eligible', 1);
  };

  /* When tab or page changes, reload */
  useEffect(() => {
    if (selectedTrial) loadEligibility(selectedTrial.drugName, activeTab, eligPage);
  }, [activeTab, eligPage]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEligPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filtered = trials.filter(t => {
    const term = searchTerm.toLowerCase();
    return !term || t.drugName.toLowerCase().includes(term) || t.indication.toLowerCase().includes(term);
  });

  const handleBack = () => { setSelectedTrial(null); setEligData(null); };

  /* Pagination helper */
  const pageNumbers = useMemo(() => {
    if (!eligData) return [];
    const tp = eligData.total_pages || 1;
    const cp = eligData.page || 1;
    const pages = [];
    const maxVisible = 7;
    if (tp <= maxVisible) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else {
      pages.push(1);
      let start = Math.max(2, cp - 2), end = Math.min(tp - 1, cp + 2);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < tp - 1) pages.push('...');
      pages.push(tp);
    }
    return pages;
  }, [eligData]);

  /* === DETAIL VIEW === */
  if (selectedTrial) {
    const columns = eligData?.columns || [];
    const patients = eligData?.patients || [];
    const eligibleCount = eligData?.eligible_count ?? 0;
    const notEligibleCount = eligData?.not_eligible_count ?? 0;
    const totalPages = eligData?.total_pages ?? 1;
    const currentPage = eligData?.page ?? 1;

    const tabColor = activeTab === 'eligible'
      ? { bg: 'bg-green-50', border: 'border-green-200', head: 'bg-green-100', headText: 'text-green-900', row: 'border-green-100 hover:bg-green-50 text-gray-800' }
      : { bg: 'bg-red-50', border: 'border-red-200', head: 'bg-red-100', headText: 'text-red-900', row: 'border-red-100 hover:bg-red-50 text-gray-800' };

    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to All Trials
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{selectedTrial.drugName}</h2>
            <p className="text-sm text-gray-500 mt-1">Eligibility check across all current patients</p>
          </div>

          {/* Trial summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Disease</p><p className="text-sm font-semibold text-gray-900">{selectedTrial.indication}</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Phase / Status</p><p className="text-sm font-semibold text-gray-900">{selectedTrial.phase} / {selectedTrial.status}</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Global Success Rate</p><p className="text-sm font-semibold text-green-700">{selectedTrial.successRate}%</p></div>
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Enrolled</p><p className="text-sm font-semibold text-blue-700">{selectedTrial.patientsEnrolled}</p></div>
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{eligibleCount.toLocaleString()}</p>
              <p className="text-sm text-green-600">Eligible Patients</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{notEligibleCount.toLocaleString()}</p>
              <p className="text-sm text-red-600">Not Eligible</p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleTabChange('eligible')} className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition ${activeTab === 'eligible' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Eligible ({eligibleCount.toLocaleString()})
            </button>
            <button onClick={() => handleTabChange('not_eligible')} className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition ${activeTab === 'not_eligible' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Not Eligible ({notEligibleCount.toLocaleString()})
            </button>
          </div>

          {/* Paginated table */}
          {eligLoading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div><p className="mt-3 text-gray-600 text-sm">Loading patients...</p></div>
          ) : patients.length > 0 ? (
            <>
              <div className={`overflow-x-auto border ${tabColor.border} rounded-lg`}>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className={`${tabColor.head} sticky top-0 z-10`}>
                      <tr>
                        <th className={`px-3 py-2 text-left text-xs font-semibold ${tabColor.headText}`}>#</th>
                        {columns.map(col => <th key={col} className={`px-3 py-2 text-left text-xs font-semibold ${tabColor.headText} whitespace-nowrap`}>{humanLabel(col)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((p, i) => (
                        <tr key={p.patient_id || i} className={`border-b ${tabColor.row}`}>
                          <td className="px-3 py-2 text-gray-600">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                          {columns.map(col => <td key={col} className="px-3 py-2 whitespace-nowrap text-gray-900">{col === 'patient_id' ? <span className="font-medium text-gray-900">{p[col]}</span> : renderCell(p[col], col)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button onClick={() => setEligPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">← Previous</button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((p, i) =>
                      p === '...' ? <span key={`d${i}`} className="px-2 py-1 text-gray-400">...</span> : (
                        <button key={p} onClick={() => setEligPage(p)} className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${p === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>{p}</button>
                      )
                    )}
                  </div>
                  <button onClick={() => setEligPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
                </div>
              )}
              <div className="text-center py-2 text-gray-500 text-xs mt-1">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, activeTab === 'eligible' ? eligibleCount : notEligibleCount)} of {(activeTab === 'eligible' ? eligibleCount : notEligibleCount).toLocaleString()} patients
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">No {activeTab === 'eligible' ? 'eligible' : 'ineligible'} patients found.</div>
          )}
        </div>

        {/* Privacy footer */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Federated Privacy:</strong> Only demographic eligibility parameters are shared across hospitals. Patient IDs shown here are visible only to your hospital.</span>
        </div>
      </div>
    );
  }

  /* === LIST VIEW === */
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clinical Trials</h2>
            <p className="text-sm text-gray-500 mt-1">Click a trial to see how many current patients are eligible</p>
          </div>
          <button onClick={loadTrials} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Refresh</button>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Federated Privacy:</strong> Only drug names and eligibility parameters are shared. No patient IDs or private records leave your hospital.</span>
        </div>
      </div>

      <div>
        <input type="text" placeholder="Search by drug name or disease..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white placeholder-gray-400" />
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Loading trials...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-md p-6">No trials found. Upload patient data first.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trial) => (
            <div
              key={trial.id}
              onClick={() => handleSelectTrial(trial)}
              className="bg-white rounded-lg shadow-md p-5 cursor-pointer transition-all border-2 border-transparent hover:border-blue-300 hover:shadow-lg"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-900">{trial.drugName}</h3>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(trial.status)}`}>{trial.status}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Treats: {trial.indication}</p>

              {/* Eligibility count badge */}
              {trial.eligibleFromCurrent != null && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm text-green-800"><strong>{trial.eligibleFromCurrent}</strong> patient{trial.eligibleFromCurrent !== 1 ? 's' : ''} eligible from your data</span>
                </div>
              )}

              {/* Anonymized eligibility params */}
              {trial.eligibilityParams && (
                <div className="space-y-1.5 mb-3">
                  {trial.eligibilityParams.ageRange && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">Age:</span><span className="font-medium text-gray-800">{trial.eligibilityParams.ageRange[0]} – {trial.eligibilityParams.ageRange[1]} yrs</span></div>
                  )}
                  {trial.eligibilityParams.genders?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">Gender:</span><span className="font-medium text-gray-800">{trial.eligibilityParams.genders.join(', ')}</span></div>
                  )}
                  {trial.eligibilityParams.bloodGroups?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">Blood:</span><div className="flex gap-1 flex-wrap">{trial.eligibilityParams.bloodGroups.map(bg => <span key={bg} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-medium">{bg}</span>)}</div></div>
                  )}
                  {trial.eligibilityParams.bmiRange && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">BMI:</span><span className="font-medium text-gray-800">{trial.eligibilityParams.bmiRange[0]} – {trial.eligibilityParams.bmiRange[1]}</span></div>
                  )}
                  {trial.eligibilityParams.stages?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">Stages:</span><span className="font-medium text-gray-800">{trial.eligibilityParams.stages.join(', ')}</span></div>
                  )}
                  {trial.eligibilityParams.commonComorbidities?.length > 0 && (
                    <div className="flex items-center gap-2 text-xs"><span className="text-gray-500 w-20">Comorbid.:</span><span className="font-medium text-gray-800">{trial.eligibilityParams.commonComorbidities.join(', ')}</span></div>
                  )}
                </div>
              )}

              <div className="flex gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
                <span>Enrolled: <strong className="text-gray-700">{trial.patientsEnrolled}</strong></span>
                <span>Success: <strong className="text-green-700">{trial.successRate}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
