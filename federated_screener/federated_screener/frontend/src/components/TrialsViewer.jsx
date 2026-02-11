import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export default function TrialsViewer() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);

  useEffect(() => {
    loadTrials();
  }, []);

  const loadTrials = async () => {
    try {
      setLoading(true);
      const response = await apiService.getTrials();
      setTrials(response.trials || []);
    } catch (error) {
      console.error('Error loading trials:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'Phase I':
        return 'bg-purple-100 text-purple-800';
      case 'Phase II':
        return 'bg-indigo-100 text-indigo-800';
      case 'Phase III':
        return 'bg-blue-100 text-blue-800';
      case 'Phase IV':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clinical Trials</h2>
        <button
          onClick={loadTrials}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trials...</p>
        </div>
      ) : trials.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No trials found. Upload patient data first.</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {trials.map((trial) => (
              <div
                key={trial.id}
                onClick={() => setSelectedTrial(trial)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTrial?.id === trial.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-400'
                }`}
              >
                <h3 className="font-bold text-lg text-gray-900">{trial.drugName}</h3>
                <p className="text-sm text-gray-600">{trial.indication}</p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getPhaseColor(trial.phase)}`}>
                    {trial.phase}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(trial.status)}`}>
                    {trial.status}
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <p>Enrolled: {trial.patientsEnrolled}</p>
                  <p>Eligible: {trial.eligiblePatients}</p>
                  <p>Success: {trial.successRate}%</p>
                </div>
              </div>
            ))}
          </div>

          {selectedTrial && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{selectedTrial.drugName} - Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Indication</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedTrial.indication}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phase</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedTrial.phase}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedTrial.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-lg font-semibold text-green-600">{selectedTrial.successRate}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Enrolled</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedTrial.patientsEnrolled}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Eligible Patients</p>
                  <p className="text-2xl font-bold text-green-600">{selectedTrial.eligiblePatients}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Positive Response</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedTrial.successCount}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Start Date: {selectedTrial.startDate} | Last Update: {selectedTrial.lastUpdate}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
