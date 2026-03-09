import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import Button from './ui/Button';

export function PatientEnrollmentModal({ trial, hospital, isOpen, onClose, onEnrollmentComplete }) {
  const [availablePatients, setAvailablePatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && trial) {
      loadAvailablePatients();
    }
  }, [isOpen, trial, hospital]);

  const loadAvailablePatients = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAvailablePatientsForTrial(trial.drugName, hospital);
      setAvailablePatients(response.patients || []);
    } catch (error) {
      console.error('Failed to load available patients:', error);
      setMessage({ type: 'error', text: 'Failed to load available patients' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPatients.size === filteredPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredPatients.map(p => p._oid)));
    }
  };

  const handleTogglePatient = (patientId) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const handleEnroll = async () => {
    if (selectedPatients.size === 0) {
      setMessage({ type: 'warning', text: 'Please select at least one patient' });
      return;
    }

    setEnrolling(true);
    try {
      const patientIds = Array.from(selectedPatients);
      const response = await apiService.addPatientsToTrial(trial.drugName, patientIds);
      
      setMessage({ 
        type: 'success', 
        text: `Successfully enrolled ${response.added_count || patientIds.length} patient(s)` 
      });
      
      setSelectedPatients(new Set());
      
      // Refresh available patients
      await loadAvailablePatients();
      
      // Notify parent component
      if (onEnrollmentComplete) {
        onEnrollmentComplete();
      }
    } catch (error) {
      console.error('Failed to enroll patients:', error);
      setMessage({ type: 'error', text: 'Failed to enroll patients' });
    } finally {
      setEnrolling(false);
    }
  };

  const filteredPatients = availablePatients.filter(patient => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      patient.patient_id?.toLowerCase().includes(search) ||
      patient.patient_name?.toLowerCase().includes(search) ||
      patient.disease?.toLowerCase().includes(search) ||
      patient.stage?.toLowerCase().includes(search) ||
      patient.hospital_name?.toLowerCase().includes(search)
    );
  });

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-2xl m-4"
          >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Enroll Patients
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {trial?.drugName} - {trial?.disease}
                  {hospital && ` (${hospital})`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sticky toolbar: Search + Select All + Enroll button */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by patient ID, name, disease, stage, hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Select All + Stats + Enroll in one row */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Select All ({filteredPatients.length})
                </span>
              </label>

              <div className="flex-1 text-sm text-gray-500 dark:text-gray-400 text-center">
                {filteredPatients.length} available{hospital && ' in this hospital'}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {selectedPatients.size} selected
                </span>
                <Button
                  onClick={handleEnroll}
                  disabled={selectedPatients.size === 0 || enrolling}
                  size="sm"
                  className="gap-1"
                >
                  {enrolling ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Enroll {selectedPatients.size > 0 ? `${selectedPatients.size} ` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700' :
                message.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700' :
                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span>{message.text}</span>
                  <button onClick={() => setMessage(null)} className="ml-2 text-current opacity-70 hover:opacity-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Patient List */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'No patients match your search criteria' 
                  : 'No available patients found for enrollment'}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Patient Checkboxes */}
                {filteredPatients.map((patient) => (
                  <label
                    key={patient._oid}
                    className="flex items-center gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPatients.has(patient._oid)}
                      onChange={() => handleTogglePatient(patient._oid)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {patient.patient_id}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {patient.patient_name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Age / Gender</div>
                        <div className="text-gray-900 dark:text-white">
                          {patient.age} / {patient.gender}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Disease / Stage</div>
                        <div className="text-gray-900 dark:text-white">
                          {patient.disease} {patient.stage && `(${patient.stage})`}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 dark:text-gray-400">Hospital</div>
                        <div className="text-gray-900 dark:text-white truncate">
                          {patient.hospital_name}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
