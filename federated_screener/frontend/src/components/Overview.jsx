import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export default function Overview() {
  const [stats, setStats] = useState({ totalPatients: 0, totalTrials: 0, totalHospitals: 0, successRate: 0, uniqueDiseases: 0, drugTrials: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [trainingStatus, setTrainingStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadOverviewData = async () => {
      try {
        setLoadingStats(true);
        // Use the fast /stats endpoint instead of loading all patients
        const data = await apiService.getStats();
        if (!mounted) return;
        setStats({
          totalPatients: data.total_patients || 0,
          totalTrials: data.total_trials || 0,
          totalHospitals: data.total_hospitals || 0,
          successRate: data.avg_success_rate || 0,
          uniqueDiseases: data.unique_diseases || 0,
          drugTrials: data.drug_trials || 0,
        });
        setTrainingStatus({
          is_training: data.is_training,
          rounds_completed: data.rounds_completed || 0,
          latest_metrics: data.latest_accuracy ? { accuracy: data.latest_accuracy / 100 } : null,
        });
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };

    loadOverviewData();
    return () => { mounted = false; };
  }, []);

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
            <div><p className="text-sm text-gray-500">Total Patients</p><p className="text-2xl font-semibold text-gray-900">{stats.totalPatients}</p></div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div><p className="text-sm text-gray-500">Active Trials</p><p className="text-2xl font-semibold text-gray-900">{stats.totalTrials}</p></div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
            <div><p className="text-sm text-gray-500">Avg Success Rate</p><p className="text-2xl font-semibold text-gray-900">{stats.successRate}%</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
            <div><p className="text-sm text-gray-500">Hospitals</p><p className="text-2xl font-semibold text-gray-900">{stats.totalHospitals}</p></div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
            <div><p className="text-sm text-gray-500">Unique Diseases</p><p className="text-2xl font-semibold text-gray-900">{stats.uniqueDiseases}</p></div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg></div>
            <div><p className="text-sm text-gray-500">Drug Trials</p><p className="text-2xl font-semibold text-gray-900">{stats.drugTrials}</p></div>
          </div>
        </div>
      </div>

      {/* Model training status */}
      {trainingStatus && trainingStatus.rounds_completed > 0 && (
        <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-teal-50 rounded-lg p-3 text-center">
              <p className="text-xs text-teal-600">Rounds Completed</p>
              <p className="text-xl font-bold text-teal-800">{trainingStatus.rounds_completed}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">Latest Accuracy</p>
              <p className="text-xl font-bold text-green-800">{trainingStatus.latest_metrics ? `${(trainingStatus.latest_metrics.accuracy * 100).toFixed(1)}%` : '—'}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600">Status</p>
              <p className="text-xl font-bold text-blue-800">{trainingStatus.is_training ? 'Training...' : 'Ready'}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">The model is automatically trained when new patient data is uploaded.</p>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-blue-700 font-bold text-sm">1</span></div>
            <div><p className="font-medium text-gray-800">Upload Data</p><p className="text-sm text-gray-500">Upload patient records in the Patients tab. Training starts automatically.</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-green-700 font-bold text-sm">2</span></div>
            <div><p className="font-medium text-gray-800">Browse Trials</p><p className="text-sm text-gray-500">View drug trials with anonymized eligibility parameters from all hospitals.</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-teal-700 font-bold text-sm">3</span></div>
            <div><p className="font-medium text-gray-800">Check Eligibility</p><p className="text-sm text-gray-500">Click any trial to see which of your patients are eligible — data stays private.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
