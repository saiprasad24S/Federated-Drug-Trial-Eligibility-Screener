import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import Button from './ui/Button';

export function ManualCheckModal({ trial, isOpen, onClose }) {
  const [patientId, setPatientId] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    const id = patientId.trim();
    if (!id) { setError('Enter a patient ID'); return; }
    setError('');
    setResult(null);
    setChecking(true);
    try {
      const data = await apiService.checkPatientEligibility(trial.drugName, id);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => { setPatientId(''); setResult(null); setError(''); onClose(); };

  const patient = result?.patient;
  const criteria = result?.criteria || {};

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={handleClose} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl p-6 m-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full" style={{ background: 'var(--brand-primary)' }} />
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Manual Patient Eligibility Check</h3>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition" style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Trial: <strong>{trial?.drugName}</strong> — {trial?.disease || trial?.indication}</p>

            {/* Input */}
            <div className="flex gap-2 mb-4">
              <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCheck()} placeholder="Enter Patient ID (e.g. PAT001)" className="input flex-1" />
              <Button variant="primary" onClick={handleCheck} disabled={checking}>{checking ? 'Checking...' : 'Check'}</Button>
            </div>

            {error && <div className="p-3 rounded-lg text-sm mb-4" style={{ background: 'var(--status-error-bg)', color: 'var(--status-error)', border: '1px solid var(--status-error-border)' }}>{error}</div>}

            {/* Result */}
            {patient && (
              <div className="space-y-4">
                {/* Eligibility badge */}
                <div className="p-4 rounded-xl text-center" style={{ background: patient.is_eligible ? 'var(--status-success-bg)' : 'var(--status-error-bg)', border: `2px solid ${patient.is_eligible ? 'var(--status-success)' : 'var(--status-error)'}` }}>
                  <p className="text-2xl font-extrabold" style={{ color: patient.is_eligible ? 'var(--status-success)' : 'var(--status-error)' }}>{patient.is_eligible ? '✓ ELIGIBLE' : '✗ NOT ELIGIBLE'}</p>
                </div>

                {/* Patient details */}
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>Patient Details</div>
                  <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {[
                      ['Patient ID', patient.patient_id],
                      ['Name', patient.patient_name],
                      ['Age', patient.age],
                      ['Gender', patient.gender],
                      ['Blood Group', patient.blood_group],
                      ['Disease', patient.disease],
                      ['Stage', patient.stage],
                      ['BMI', patient.bmi],
                      ['Hospital', patient.hospital_name],
                      ['Comorbidities', Array.isArray(patient.comorbidities) ? patient.comorbidities.join(', ') : patient.comorbidities],
                    ].filter(([, v]) => v != null && v !== '').map(([label, value]) => (
                      <div key={label} className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Criteria match breakdown */}
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>Criteria Match</div>
                  <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {criteria.ageRange && (
                      <div className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>Age ({criteria.ageRange[0]}–{criteria.ageRange[1]})</span>
                        <span style={{ color: patient.age >= criteria.ageRange[0] && patient.age <= criteria.ageRange[1] ? 'var(--status-success)' : 'var(--status-error)' }}>{patient.age >= criteria.ageRange[0] && patient.age <= criteria.ageRange[1] ? '✓ Pass' : '✗ Fail'}</span>
                      </div>
                    )}
                    {criteria.genders?.length > 0 && (
                      <div className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>Gender ({criteria.genders.join(', ')})</span>
                        <span style={{ color: criteria.genders.includes(patient.gender) ? 'var(--status-success)' : 'var(--status-error)' }}>{criteria.genders.includes(patient.gender) ? '✓ Pass' : '✗ Fail'}</span>
                      </div>
                    )}
                    {criteria.bloodGroups?.length > 0 && (
                      <div className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>Blood Group ({criteria.bloodGroups.join(', ')})</span>
                        <span style={{ color: criteria.bloodGroups.includes(patient.blood_group) ? 'var(--status-success)' : 'var(--status-error)' }}>{criteria.bloodGroups.includes(patient.blood_group) ? '✓ Pass' : '✗ Fail'}</span>
                      </div>
                    )}
                    {criteria.bmiRange && (
                      <div className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>BMI ({criteria.bmiRange[0]}–{criteria.bmiRange[1]})</span>
                        <span style={{ color: patient.bmi >= criteria.bmiRange[0] && patient.bmi <= criteria.bmiRange[1] ? 'var(--status-success)' : 'var(--status-error)' }}>{patient.bmi >= criteria.bmiRange[0] && patient.bmi <= criteria.bmiRange[1] ? '✓ Pass' : '✗ Fail'}</span>
                      </div>
                    )}
                    {criteria.stages?.length > 0 && (
                      <div className="flex justify-between px-4 py-2 text-sm">
                        <span style={{ color: 'var(--text-tertiary)' }}>Stage ({criteria.stages.join(', ')})</span>
                        <span style={{ color: criteria.stages.includes(patient.stage) ? 'var(--status-success)' : 'var(--status-error)' }}>{criteria.stages.includes(patient.stage) ? '✓ Pass' : '✗ Fail'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
