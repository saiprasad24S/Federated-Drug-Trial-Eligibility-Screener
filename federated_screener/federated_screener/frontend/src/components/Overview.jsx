import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export default function Overview() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalTrials: 0,
    successRate: 0,
    eligiblePatients: 0,
  });
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [numRounds, setNumRounds] = useState(10);

  useEffect(() => {
    loadOverviewData();
    // Refresh every 5 seconds if training
    const interval = setInterval(loadOverviewData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOverviewData = async () => {
    try {
      // Load patients
      const patientsRes = await apiService.getPatients();
      const patients = patientsRes.patients || [];

      // Load trials
      const trialsRes = await apiService.getTrials();
      const trials = trialsRes.trials || [];

      // Load training status
      const statusRes = await apiService.getTrainingStatus();

      // Calculate stats
      const totalEligible = patients.filter(p => p.eligible).length;
      const avgSuccess = trials.length > 0
        ? (trials.reduce((sum, t) => sum + t.successRate, 0) / trials.length).toFixed(1)
        : 0;

      setStats({
        totalPatients: patients.length,
        totalTrials: trials.length,
        successRate: avgSuccess,
        eligiblePatients: totalEligible,
      });

      setTrainingStatus(statusRes);
      setIsTraining(statusRes.is_training);
      setLoading(false);
    } catch (error) {
      console.error('Error loading overview data:', error);
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    try {
      setIsTraining(true);
      await apiService.startTraining({ num_rounds: numRounds });
      await loadOverviewData();
    } catch (error) {
      console.error('Error starting training:', error);
      setIsTraining(false);
    }
  };

  const handleStopTraining = async () => {
    try {
      await apiService.stopTraining();
      setIsTraining(false);
      await loadOverviewData();
    } catch (error) {
      console.error('Error stopping training:', error);
    }
  };

  const handleResetTraining = async () => {
    try {
      const response = await fetch('http://localhost:8002/reset-training', {
        method: 'POST',
      });
      await response.json();
      await loadOverviewData();
    } catch (error) {
      console.error('Error resetting training:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPatients}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zM5 20a3 3 0 015.856-1.487M5 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Trials</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTrials}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Eligible Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.eligiblePatients}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Avg Success Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.successRate}%</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Training Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Federated Learning Training</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Training Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Training Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Current Status</p>
                <div className="flex items-center mt-2">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isTraining ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-lg font-semibold text-gray-900">
                    {isTraining ? 'Training Active' : 'Ready'}
                  </span>
                </div>
              </div>

              {trainingStatus && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-600">Progress</p>
                      <span className="text-sm font-semibold text-gray-900">
                        {trainingStatus.rounds_completed}/{trainingStatus.total_rounds} rounds
                      </span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: trainingStatus.total_rounds > 0 
                            ? `${(trainingStatus.rounds_completed / trainingStatus.total_rounds) * 100}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {trainingStatus.latest_metrics && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Latest Accuracy</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(trainingStatus.latest_metrics.accuracy * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Latest Loss</p>
                        <p className="text-xl font-semibold text-orange-600">
                          {trainingStatus.latest_metrics.loss.toFixed(4)}
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Training Controls */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Training Configuration</h3>
            <div className="space-y-4">
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Rounds
                  </label>
                  <span className="text-lg font-bold text-blue-600">{numRounds}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={numRounds}
                  onChange={(e) => setNumRounds(parseInt(e.target.value))}
                  disabled={isTraining}
                  className="w-full h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span>1 Round</span>
                  <span>100 Rounds</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleStartTraining}
                  disabled={isTraining}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  {isTraining ? 'Training...' : 'Start Training'}
                </button>
                <button
                  onClick={handleStopTraining}
                  disabled={!isTraining}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Stop Training
                </button>
                <button
                  onClick={handleResetTraining}
                  disabled={isTraining}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Training Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Federated learning trains a model across multiple hospital clients while preserving data privacy. Each round aggregates local model updates from participating hospitals.
          </p>
        </div>
      </div>
    </div>
  );
}
