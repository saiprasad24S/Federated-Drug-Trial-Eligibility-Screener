import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import { Card, Button, StatusBadge, TableSkeleton, CardSkeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem, fadeIn, slideUp } from '../utils/motionVariants';
import { PatientEnrollmentModal } from './PatientEnrollmentModal';

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
  const [eligScope, setEligScope] = useState('global');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [debouncedHospitalSearch, setDebouncedHospitalSearch] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(null); // 'eligible' | 'not_eligible' | null
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTrial, setNewTrial] = useState({ drugName: '', indication: '', phase: 'Phase III', status: 'Active', successRate: '' });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [enrollIdsText, setEnrollIdsText] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const hospitalName = user?.hospital_name || '';
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => { loadTrials(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHospitalSearch(hospitalSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [hospitalSearch]);

  const loadTrials = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTrials(hospitalName);
      const fresh = response.trials || [];
      setTrials(fresh);
      // Keep selectedTrial in sync with fresh data
      if (selectedTrial) {
        const updated = fresh.find(t => t.drugName === selectedTrial.drugName);
        if (updated) setSelectedTrial(updated);
      }
    }
    catch (error) { console.error('Error loading trials:', error); }
    finally { setLoading(false); }
  };

  const loadEligibility = async (drugName, tab, page, scope, search) => {
    try { setEligLoading(true); const data = await apiService.getEligibleForDrug(drugName, hospitalName, { page, pageSize: PAGE_SIZE, tab, scope, search }); setEligData(data); }
    catch (error) { console.error('Error fetching eligibility:', error); }
    finally { setEligLoading(false); }
  };

  const handleSelectTrial = (trial) => {
    setSelectedTrial(trial);
    setEligData(null);
    setActiveTab('eligible');
    setEligPage(1);
    setEligScope('global');
    setHospitalSearch('');
    setDebouncedHospitalSearch('');
    setShowBreakdown(null);
    setEnrollIdsText('');
    setEnrollMessage('');
    setEnrollError('');
    loadEligibility(trial.drugName, 'eligible', 1, 'global', '');
  };
  useEffect(() => {
    if (!selectedTrial) return;
    const scopedSearch = eligScope === 'hospital' ? debouncedHospitalSearch : '';
    loadEligibility(selectedTrial.drugName, activeTab, eligPage, eligScope, scopedSearch);
  }, [activeTab, eligPage, eligScope, debouncedHospitalSearch]);
  const handleTabChange = (tab) => { setActiveTab(tab); setEligScope('global'); setEligPage(1); setHospitalSearch(''); setDebouncedHospitalSearch(''); };
  const handleHospitalCardClick = (tab) => {
    setActiveTab(tab);
    setEligScope('hospital');
    setEligPage(1);
    setHospitalSearch('');
    setDebouncedHospitalSearch('');
  };

  const filtered = trials.filter(t => {
    const term = searchTerm.toLowerCase();
    return !term || t.drugName.toLowerCase().includes(term) || t.indication.toLowerCase().includes(term);
  });

  const handleBack = () => { setSelectedTrial(null); setEligData(null); };

  const handleEnrollPatients = async () => {
    if (!selectedTrial) return;
    setEnrollError('');
    setEnrollMessage('');
    const patientIds = enrollIdsText
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!patientIds.length) {
      setEnrollError('Enter at least one patient ID');
      return;
    }

    try {
      setEnrollLoading(true);
      const result = await apiService.addPatientsToTrial(selectedTrial.drugName, patientIds);
      setEnrollMessage(`Added ${result.added_count || 0} patient(s). Total enrolled: ${result.enrolled_count || 0}`);
      setEnrollIdsText('');
      await loadTrials();
      await loadEligibility(selectedTrial.drugName, activeTab, 1, eligScope, debouncedHospitalSearch);
      setEligPage(1);
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to add patients to trial';
      setEnrollError(msg);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleRemovePatients = async () => {
    if (!selectedTrial) return;
    setEnrollError('');
    setEnrollMessage('');
    const patientIds = enrollIdsText
      .split(/[\n,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!patientIds.length) {
      setEnrollError('Enter at least one patient ID');
      return;
    }

    try {
      setEnrollLoading(true);
      const result = await apiService.removePatientsFromTrial(selectedTrial.drugName, patientIds);
      setEnrollMessage(`Removed patient(s). Total enrolled: ${result.enrolled_count || 0}`);
      setEnrollIdsText('');
      await loadTrials();
      await loadEligibility(selectedTrial.drugName, activeTab, 1, eligScope, debouncedHospitalSearch);
      setEligPage(1);
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to remove patients from trial';
      setEnrollError(msg);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDeleteTrial = async () => {
    if (!selectedTrial) return;
    if (!window.confirm(`Are you sure you want to delete trial "${selectedTrial.drugName}"? This action cannot be undone.`)) return;
    try {
      await apiService.deleteTrial(selectedTrial.drugName);
      setSelectedTrial(null);
      await loadTrials();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to delete trial';
      setEnrollError(msg);
    }
  };

  const handleAutoEnroll = async () => {
    if (!selectedTrial) return;
    setEnrollError('');
    setEnrollMessage('');
    try {
      setEnrollLoading(true);
      const result = await apiService.autoEnrollPatients(selectedTrial.drugName);
      setEnrollMessage(result.message || `Auto-enrolled ${result.enrolled_count || 0} patients`);
      await loadTrials();
      await loadEligibility(selectedTrial.drugName, activeTab, 1, eligScope, debouncedHospitalSearch);
      setEligPage(1);
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Auto-enrollment failed';
      setEnrollError(msg);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleCreateTrial = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newTrial.drugName.trim() || !newTrial.indication.trim()) {
      setCreateError('Drug name and indication are required');
      return;
    }
    try {
      setCreating(true);
      const payload = {
        drugName: newTrial.drugName.trim(),
        indication: newTrial.indication.trim(),
        phase: newTrial.phase,
        status: newTrial.status,
        successRate: parseFloat(newTrial.successRate) || 0,
      };
      await apiService.createTrial(payload, hospitalName);
      setShowCreateModal(false);
      setNewTrial({ drugName: '', indication: '', phase: 'Phase III', status: 'Active', successRate: '' });
      await loadTrials();
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Failed to create trial';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

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
    const hospitalEligible = eligData?.hospital_eligible_count ?? 0;
    const hospitalNotEligible = eligData?.hospital_not_eligible_count ?? 0;
    const hospitalTotal = eligData?.hospital_total ?? 0;
    const hospitalBreakdown = eligData?.hospital_breakdown ?? {};
    const totalPages = eligData?.total_pages ?? 1;
    const currentPage = eligData?.page ?? 1;
    const isElig = activeTab === 'eligible';
    const activeScope = eligData?.scope || eligScope;
    const scopedTotal = eligData?.scope_total ?? (isElig ? eligibleCount : notEligibleCount);
    const scopeTitle = activeScope === 'hospital' ? `${hospitalName} only` : 'All hospitals (federated)';

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedTrial.drugName}</h2>
              </div>
              <button
                onClick={handleDeleteTrial}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--status-error-bg, #fef2f2)', color: 'var(--status-error, #dc2626)', border: '1px solid var(--status-error-border, #fecaca)' }}
                title="Delete this trial"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Trial
              </button>
            </div>
            <p className="text-xs mt-1.5 ml-3.5" style={{ color: 'var(--text-tertiary)' }}>Eligibility check across all federated hospitals — your hospital's results highlighted below</p>
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

          {/* Summary counts — Hospital-specific + Global */}
          {hospitalTotal > 0 && (
            <>
              <div className="mb-2">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--brand-primary)' }}>Your Hospital ({hospitalName}) — {hospitalTotal.toLocaleString()} patients</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleHospitalCardClick('eligible')}
                    title="Show eligible patients from your hospital"
                    className="rounded-xl p-4 text-center transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: 'var(--status-success-bg)', border: `2px solid ${activeScope === 'hospital' && isElig ? 'var(--status-success)' : 'var(--status-success-border)'}` }}
                  >
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-success)' }}>{hospitalEligible.toLocaleString()}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-success)' }}>Eligible from Your Hospital</p>
                  </button>
                  <button
                    onClick={() => handleHospitalCardClick('not_eligible')}
                    title="Show not eligible patients from your hospital"
                    className="rounded-xl p-4 text-center transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: 'var(--status-error-bg)', border: `2px solid ${activeScope === 'hospital' && !isElig ? 'var(--status-error)' : 'var(--status-error-border)'}` }}
                  >
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-error)' }}>{hospitalNotEligible.toLocaleString()}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-error)' }}>Not Eligible from Your Hospital</p>
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--text-tertiary)' }}>Global Federated Pool — {(eligibleCount + notEligibleCount).toLocaleString()} patients across all hospitals</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowBreakdown(showBreakdown === 'eligible' ? null : 'eligible')} className="rounded-xl p-3 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: showBreakdown === 'eligible' ? 'var(--status-success-bg)' : 'var(--bg-tertiary)', border: `2px solid ${showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-success-border)'}` }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--status-success)' }}>{eligibleCount.toLocaleString()}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-tertiary)' }}>Eligible (All Hospitals)</p>
                  </button>
                  <button onClick={() => setShowBreakdown(showBreakdown === 'not_eligible' ? null : 'not_eligible')} className="rounded-xl p-3 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: showBreakdown === 'not_eligible' ? 'var(--status-error-bg)' : 'var(--bg-tertiary)', border: `2px solid ${showBreakdown === 'not_eligible' ? 'var(--status-error)' : 'var(--status-error-border)'}` }}>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--status-error)' }}>{notEligibleCount.toLocaleString()}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-tertiary)' }}>Not Eligible (All Hospitals)</p>
                  </button>
                </div>
                {showBreakdown && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${showBreakdown === 'eligible' ? 'var(--status-success-border)' : 'var(--status-error-border)'}` }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: showBreakdown === 'eligible' ? 'var(--status-success-bg)' : 'var(--status-error-bg)' }}>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>Hospital</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>{showBreakdown === 'eligible' ? 'Eligible' : 'Not Eligible'} Patients</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(hospitalBreakdown).filter(([, c]) => (showBreakdown === 'eligible' ? c.eligible > 0 : c.not_eligible > 0)).sort((a, b) => (showBreakdown === 'eligible' ? b[1].eligible - a[1].eligible : b[1].not_eligible - a[1].not_eligible)).map(([hName, counts]) => (
                          <tr key={hName} style={{ borderTop: '1px solid var(--border-primary)' }}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{hName}</td>
                            <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>{showBreakdown === 'eligible' ? counts.eligible.toLocaleString() : counts.not_eligible.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </div>
            </>
          )}
          {hospitalTotal === 0 && (
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowBreakdown(showBreakdown === 'eligible' ? null : 'eligible')} className="rounded-xl p-4 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: showBreakdown === 'eligible' ? 'var(--status-success-bg)' : 'var(--status-success-bg)', border: `2px solid ${showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-success-border)'}` }}>
                  <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-success)' }}>{eligibleCount.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-success)' }}>Eligible Patients</p>
                </button>
                <button onClick={() => setShowBreakdown(showBreakdown === 'not_eligible' ? null : 'not_eligible')} className="rounded-xl p-4 text-center cursor-pointer transition-all duration-200 hover:scale-[1.02]" style={{ background: showBreakdown === 'not_eligible' ? 'var(--status-error-bg)' : 'var(--status-error-bg)', border: `2px solid ${showBreakdown === 'not_eligible' ? 'var(--status-error)' : 'var(--status-error-border)'}` }}>
                  <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--status-error)' }}>{notEligibleCount.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--status-error)' }}>Not Eligible</p>
                </button>
              </div>
              {showBreakdown && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${showBreakdown === 'eligible' ? 'var(--status-success-border)' : 'var(--status-error-border)'}` }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: showBreakdown === 'eligible' ? 'var(--status-success-bg)' : 'var(--status-error-bg)' }}>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>Hospital</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>{showBreakdown === 'eligible' ? 'Eligible' : 'Not Eligible'} Patients</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(hospitalBreakdown).filter(([, c]) => (showBreakdown === 'eligible' ? c.eligible > 0 : c.not_eligible > 0)).sort((a, b) => (showBreakdown === 'eligible' ? b[1].eligible - a[1].eligible : b[1].not_eligible - a[1].not_eligible)).map(([hName, counts]) => (
                        <tr key={hName} style={{ borderTop: '1px solid var(--border-primary)' }}>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{hName}</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: showBreakdown === 'eligible' ? 'var(--status-success)' : 'var(--status-error)' }}>{showBreakdown === 'eligible' ? counts.eligible.toLocaleString() : counts.not_eligible.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </div>
          )}

          {/* Tab buttons */}
          <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Manual Trial Enrollment (v2)</p>
            
            {/* Bulk enrollment with checkbox modal */}
            <div className="mb-3 flex gap-2">
              <Button 
                variant="primary" 
                onClick={() => setShowEnrollmentModal(true)}
                className="flex-1"
              >
                📋 Bulk Enroll Patients (Checklist)
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleAutoEnroll}
                disabled={enrollLoading}
                className="flex-1"
              >
                {enrollLoading ? '⏳ Enrolling...' : '🤖 Auto-Enroll All Matching'}
              </Button>
            </div>

            {/* Individual patient IDs input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={enrollIdsText}
                onChange={(e) => setEnrollIdsText(e.target.value)}
                placeholder="Or enter patient IDs (comma/space separated), e.g. TEST001, TEST002"
                className="input flex-1"
              />
              <Button variant="primary" onClick={handleEnrollPatients} disabled={enrollLoading}>
                {enrollLoading ? 'Adding...' : 'Add Patients'}
              </Button>
              <Button variant="secondary" onClick={handleRemovePatients} disabled={enrollLoading}>
                Remove Patients
              </Button>
            </div>
            {enrollMessage && <p className="text-xs mt-2" style={{ color: 'var(--status-success)' }}>{enrollMessage}</p>}
            {enrollError && <p className="text-xs mt-2" style={{ color: 'var(--status-error)' }}>{enrollError}</p>}
          </div>

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
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Viewing {isElig ? 'eligible' : 'not eligible'} patients from: <span style={{ color: 'var(--brand-primary)' }}>{scopeTitle}</span>
              </div>
              {activeScope === 'hospital' && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={hospitalSearch}
                    onChange={(e) => { setHospitalSearch(e.target.value); setEligPage(1); }}
                    placeholder="Search patient by name, ID, disease, stage..."
                    className="input"
                  />
                </div>
              )}
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
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, scopedTotal)} of {scopedTotal.toLocaleString()} patients
              </div>
            </>
          ) : (
            <div className="text-center py-6" style={{ color: 'var(--text-tertiary)' }}>No {isElig ? 'eligible' : 'ineligible'} patients found for {scopeTitle}.</div>
          )}
        </Card>

        {/* Privacy footer */}
        <div className="p-3 rounded-lg text-sm flex items-start gap-2" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}>
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Federated Privacy:</strong> Patient identities are anonymized (ANON-XXXXX). Only age, gender, blood group, disease, stage, BMI, and comorbidities are shared for eligibility screening. No personal information leaves your hospital.</span>
        </div>

        {/* Patient Enrollment Modal (portal renders at document.body) */}
        <PatientEnrollmentModal
          trial={selectedTrial}
          hospital={hospitalName}
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          onEnrollmentComplete={async () => {
            await loadTrials();
            await loadEligibility(selectedTrial.drugName, activeTab, eligPage, eligScope, debouncedHospitalSearch);
            setEnrollMessage('Bulk enrollment completed successfully');
            setTimeout(() => setEnrollMessage(''), 3000);
          }}
        />
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={loadTrials}>Refresh</Button>
            <Button variant="primary" onClick={() => { setShowCreateModal(true); setCreateError(''); }}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create New Trial
              </span>
            </Button>
          </div>
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
          {filtered.map((trial) => {
            const criteria = trial.eligibilityParams || trial.eligibilityCriteria;
            return (
            <motion.div key={trial.trial_id || trial.id || trial.drugName} variants={staggerItem} className="h-full">
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
                  {criteria && (
                    <div className="space-y-1.5 mb-3">
                      {criteria.ageRange && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Age:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{criteria.ageRange[0]} – {criteria.ageRange[1]} yrs</span></div>
                      )}
                      {criteria.genders?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Gender:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{criteria.genders.join(', ')}</span></div>
                      )}
                      {criteria.bloodGroups?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Blood:</span><div className="flex gap-1 flex-wrap">{criteria.bloodGroups.map(bg => <span key={bg} className="badge" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)' }}>{bg}</span>)}</div></div>
                      )}
                      {criteria.bmiRange && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>BMI:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{criteria.bmiRange[0]} – {criteria.bmiRange[1]}</span></div>
                      )}
                      {criteria.stages?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Stages:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{criteria.stages.join(', ')}</span></div>
                      )}
                      {criteria.commonComorbidities?.length > 0 && (
                        <div className="flex items-center gap-2 text-xs"><span className="w-20 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Comorbid.:</span><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{criteria.commonComorbidities.join(', ')}</span></div>
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
          )})}
        </motion.div>
      )}

      {/* Create Trial Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl shadow-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Create New Trial</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleCreateTrial} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Drug Name *</label>
                  <input type="text" required value={newTrial.drugName} onChange={(e) => setNewTrial(p => ({ ...p, drugName: e.target.value }))} placeholder="e.g. Cardiozen-X" className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Indication (Disease) *</label>
                  <input type="text" required value={newTrial.indication} onChange={(e) => setNewTrial(p => ({ ...p, indication: e.target.value }))} placeholder="e.g. Heart Disease" className="input w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Phase</label>
                    <select value={newTrial.phase} onChange={(e) => setNewTrial(p => ({ ...p, phase: e.target.value }))} className="input w-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
                      <option value="Phase I">Phase I</option>
                      <option value="Phase II">Phase II</option>
                      <option value="Phase III">Phase III</option>
                      <option value="Phase IV">Phase IV</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</label>
                    <select value={newTrial.status} onChange={(e) => setNewTrial(p => ({ ...p, status: e.target.value }))} className="input w-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Success Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={newTrial.successRate} onChange={(e) => setNewTrial(p => ({ ...p, successRate: e.target.value }))} placeholder="e.g. 65.0" className="input w-full" />
                </div>

                {createError && (
                  <div className="p-2.5 rounded-lg text-sm" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error-border)' }}>{createError}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" variant="primary" disabled={creating} className="flex-1">
                    {creating ? 'Creating...' : 'Create & Publish'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
