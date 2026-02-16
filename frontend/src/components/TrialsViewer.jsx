import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import { Card, Button, StatusBadge, TableSkeleton, CardSkeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem, fadeIn, slideUp } from '../utils/motionVariants';

/* helper: snake_case → Title Case */
const humanLabel = (key) => {
  const specials = { bmi: 'BMI', id: 'ID', dob: 'DOB' };
  return key.split('_').map((w) => specials[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};
const renderCell = (value, key) => {
  if (value == null || value === '') return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span style={{ color: 'var(--text-tertiary)' }}>None</span>;
  if (key === 'blood_group') return <span className="badge" style={{ background: 'var(--kpi-purple-bg)', color: 'var(--kpi-purple-text)' }}>{value}</span>;
  if (key === 'stage') return <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{value}</span>;
  if (key === 'patient_id' && String(value).startsWith('ANON-')) return <span className="badge font-mono" style={{ background: 'var(--kpi-orange-bg)', color: 'var(--kpi-orange-text)' }}>{value}</span>;
  return String(value);
};

const PAGE_SIZE = 50;

export default function TrialsViewer({ user }) {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);

  const [eligData, setEligData] = useState(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('eligible');
  const [eligPage, setEligPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const hospitalName = user?.hospital_name || '';
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => { loadTrials(); }, []);

  const loadTrials = async () => {
    try { setLoading(true); const response = await apiService.getTrials(); setTrials(response.trials || []); }
    catch (error) { console.error('Error loading trials:', error); }
    finally { setLoading(false); }
  };

  const loadEligibility = async (drugName, tab, page) => {
    try { setEligLoading(true); const data = await apiService.getEligibleForDrug(drugName, hospitalName, { page, pageSize: PAGE_SIZE, tab }); setEligData(data); }
    catch (error) { console.error('Error fetching eligibility:', error); }
    finally { setEligLoading(false); }
  };

  const handleSelectTrial = (trial) => { setSelectedTrial(trial); setEligData(null); setActiveTab('eligible'); setEligPage(1); loadEligibility(trial.drugName, 'eligible', 1); };
  useEffect(() => { if (selectedTrial) loadEligibility(selectedTrial.drugName, activeTab, eligPage); }, [activeTab, eligPage]);
  const handleTabChange = (tab) => { setActiveTab(tab); setEligPage(1); };

  const filtered = trials.filter(t => {
    const term = searchTerm.toLowerCase();
    return !term || t.drugName.toLowerCase().includes(term) || t.indication.toLowerCase().includes(term);
  });

  const handleBack = () => { setSelectedTrial(null); setEligData(null); };

  const pageNumbers = useMemo(() => {
    if (!eligData) return [];
    const tp = eligData.total_pages || 1, cp = eligData.page || 1, pages = [], maxVisible = 7;
    if (tp <= maxVisible) { for (let i = 1; i <= tp; i++) pages.push(i); }
    else { pages.push(1); let start = Math.max(2, cp - 2), end = Math.min(tp - 1, cp + 2); if (start > 2) pages.push('...'); for (let i = start; i <= end; i++) pages.push(i); if (end < tp - 1) pages.push('...'); pages.push(tp); }
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

    const isElig = activeTab === 'eligible';
    const tabAccent = isElig ? 'var(--status-success)' : 'var(--status-error)';
    const tabAccentBg = isElig ? 'var(--status-success-bg)' : 'var(--status-error-bg)';
    const tabAccentBorder = isElig ? 'var(--status-success-border)' : 'var(--status-error-border)';

    return (
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        <button onClick={handleBack} className="inline-flex items-center gap-2 font-medium transition hover:opacity-80" style={{ color: 'var(--brand-primary)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to All Trials
        </button>

        <Card className="border-t-4" style={{ borderTopColor: 'var(--brand-primary)' }}>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedTrial.drugName}</h2>
            </div>
            <p className="text-xs mt-1.5 ml-3.5" style={{ color: 'var(--text-tertiary)' }}>Eligibility check across all current patients</p>
          </div>

          {/* Privacy banner */}
          <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', color: 'var(--status-warning)' }}>
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <div><strong>Privacy-Preserving Mode:</strong> Personal details (name, phone, email, address) are <strong>hidden</strong> in trial screening. Only anonymized IDs and medical/demographic data are shown to protect patient privacy across federated hospitals.</div>
          </div>

          {/* Trial summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Disease', value: selectedTrial.indication, bg: 'var(--bg-tertiary)' },
              { label: 'Phase / Status', value: `${selectedTrial.phase} / ${selectedTrial.status}`, bg: 'var(--bg-tertiary)' },
              { label: 'Global Success Rate', value: `${selectedTrial.successRate}%`, color: 'var(--status-success)' },
              { label: 'Enrolled', value: selectedTrial.patientsEnrolled, color: 'var(--brand-primary)' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg p-3" style={{ background: kpi.bg || 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
                <p className="text-sm font-semibold" style={{ color: kpi.color || 'var(--text-primary)' }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)' }}>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-success)' }}>{eligibleCount.toLocaleString()}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-success)' }}>Eligible Patients</p>
            </div>
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)' }}>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-error)' }}>{notEligibleCount.toLocaleString()}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-error)' }}>Not Eligible</p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleTabChange('eligible')} className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition" style={{
              background: activeTab === 'eligible' ? 'var(--status-success)' : 'var(--bg-tertiary)',
              color: activeTab === 'eligible' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'eligible' ? 'var(--status-success)' : 'var(--border-primary)'}`,
            }}>Eligible ({eligibleCount.toLocaleString()})</button>
            <button onClick={() => handleTabChange('not_eligible')} className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition" style={{
              background: activeTab === 'not_eligible' ? 'var(--status-error)' : 'var(--bg-tertiary)',
              color: activeTab === 'not_eligible' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === 'not_eligible' ? 'var(--status-error)' : 'var(--border-primary)'}`,
            }}>Not Eligible ({notEligibleCount.toLocaleString()})</button>
          </div>

          {/* Paginated table */}
          {eligLoading ? (
            <TableSkeleton cols={columns.length || 6} rows={6} />
          ) : patients.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${tabAccentBorder}` }}>
                  <table className="w-full text-sm themed-table">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold" style={{ background: tabAccentBg, color: tabAccent }}>#</th>
                        {columns.map(col => <th key={col} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap" style={{ background: tabAccentBg, color: tabAccent }}>{humanLabel(col)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((p, i) => (
                        <tr key={p.patient_id || i}>
                          <td className="px-3 py-2" style={{ color: 'var(--text-tertiary)' }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                          {columns.map(col => <td key={col} className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{col === 'patient_id' ? <span className="font-medium">{p[col]}</span> : renderCell(p[col], col)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button variant="secondary" size="sm" onClick={() => setEligPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>← Previous</Button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map((p, i) =>
                      p === '...' ? <span key={`d${i}`} className="px-2 py-1" style={{ color: 'var(--text-tertiary)' }}>...</span> : (
                        <button key={p} onClick={() => setEligPage(p)} className="btn text-sm" style={{
                          background: p === currentPage ? 'var(--brand-primary)' : 'var(--bg-card)',
                          color: p === currentPage ? '#fff' : 'var(--text-primary)',
                          border: `1px solid ${p === currentPage ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
                          padding: '0.35rem 0.75rem',
                        }}>{p}</button>
                      )
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setEligPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next →</Button>
                </div>
              )}
              <div className="text-center py-2 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, isElig ? eligibleCount : notEligibleCount)} of {(isElig ? eligibleCount : notEligibleCount).toLocaleString()} patients
              </div>
            </>
          ) : (
            <div className="text-center py-6" style={{ color: 'var(--text-tertiary)' }}>No {isElig ? 'eligible' : 'ineligible'} patients found.</div>
          )}
        </Card>

        {/* Privacy footer */}
        <div className="p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}>
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Federated Privacy:</strong> Patient identities are anonymized (ANON-XXXXX). Only age, gender, blood group, disease, stage, BMI, and comorbidities are shared for eligibility screening. No personal information leaves your hospital.</span>
        </div>
      </motion.div>
    );
  }

  /* === LIST VIEW === */
  return (
    <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Clinical Trials</h2>
            </div>
            <p className="text-xs ml-3.5" style={{ color: 'var(--text-tertiary)' }}>Click a trial to see how many current patients are eligible</p>
          </div>
          <Button variant="primary" onClick={loadTrials}>Refresh</Button>
        </div>

        <div className="p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}>
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Federated Privacy:</strong> Only drug names and eligibility parameters are shared. No patient IDs or private records leave your hospital.</span>
        </div>
      </Card>

      <div>
        <input type="text" placeholder="Search by drug name or disease..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} lines={5} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>No trials found. Upload patient data first.</div></Card>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr" variants={staggerContainer} initial="hidden" animate="visible">
          {filtered.map((trial) => (
            <motion.div key={trial.id} variants={staggerItem} className="h-full">
              <Card hover onClick={() => handleSelectTrial(trial)} className="cursor-pointer h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{trial.drugName}</h3>
                  <StatusBadge status={trial.status} />
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Treats: {trial.indication}</p>

                {trial.eligibleFromCurrent != null && (
                  <div className="mb-3 p-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)' }}>
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--status-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm" style={{ color: 'var(--status-success)' }}><strong>{trial.eligibleFromCurrent}</strong> patient{trial.eligibleFromCurrent !== 1 ? 's' : ''} eligible from your data</span>
                  </div>
                )}

                <div className="flex-1">
                  {trial.eligibilityParams && (
                    <div className="space-y-1.5 mb-3">
                      {trial.eligibilityParams.ageRange && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Age:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trial.eligibilityParams.ageRange[0]} – {trial.eligibilityParams.ageRange[1]} yrs</span></div>
                      )}
                      {trial.eligibilityParams.genders?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Gender:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trial.eligibilityParams.genders.join(', ')}</span></div>
                      )}
                      {trial.eligibilityParams.bloodGroups?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Blood:</span><div className="flex gap-1 flex-wrap">{trial.eligibilityParams.bloodGroups.map(bg => <span key={bg} className="badge" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)' }}>{bg}</span>)}</div></div>
                      )}
                      {trial.eligibilityParams.bmiRange && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>BMI:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trial.eligibilityParams.bmiRange[0]} – {trial.eligibilityParams.bmiRange[1]}</span></div>
                      )}
                      {trial.eligibilityParams.stages?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Stages:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trial.eligibilityParams.stages.join(', ')}</span></div>
                      )}
                      {trial.eligibilityParams.commonComorbidities?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Comorbid.:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{trial.eligibilityParams.commonComorbidities.join(', ')}</span></div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 text-xs pt-2 mt-auto" style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                  <span>Enrolled: <strong style={{ color: 'var(--text-primary)' }}>{trial.patientsEnrolled}</strong></span>
                  <span>Success: <strong style={{ color: 'var(--status-success)' }}>{trial.successRate}%</strong></span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
