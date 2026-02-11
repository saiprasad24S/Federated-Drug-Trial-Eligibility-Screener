import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export default function PatientsManager() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPatients();
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a file' });
      return;
    }

    try {
      setLoading(true);
      if (uploadedFile.name.endsWith('.json')) {
        const response = await apiService.uploadJson(uploadedFile);
        setUploadStatus({ type: 'success', message: response.message });
      } else if (uploadedFile.name.endsWith('.pdf')) {
        const response = await apiService.uploadPdf(uploadedFile);
        setUploadStatus({ type: 'success', message: response.message });
      } else if (uploadedFile.name.endsWith('.csv')) {
        const response = await apiService.uploadCsv(uploadedFile);
        setUploadStatus({ type: 'success', message: response.message });
      } else {
        setUploadStatus({ type: 'error', message: 'Unsupported file format. Please use JSON, CSV, or PDF.' });
      }

      setUploadedFile(null);
      await loadPatients();
      setTimeout(() => setShowUploadForm(false), 2000);
    } catch (error) {
      setUploadStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Upload Data
        </button>
      </div>

      {showUploadForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Upload Patient Data</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="w-full flex flex-col items-center justify-center px-4 py-6 bg-white text-blue-600 rounded-lg shadow-lg tracking-wide border border-blue-300 cursor-pointer hover:bg-blue-50">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.88 9.1A4 4 0 0 1 16 17H4a5 5 0 0 1-1-9.9V7a3 3 0 0 1 6-3h2a3 3 0 0 1 2 .9l5.07 5.07a1 1 0 1 1-1.42 1.42L12.07 7H10m5.018 9.08H9.982a1 1 0 0 0-.707.293l-5 5a1 1 0 1 0 1.414 1.414L9 16.586V19a1 1 0 1 0 2 0v-2.414l3.293 3.293a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-.707-.293Z" />
                </svg>
                <span className="mt-2 text-base">
                  {uploadedFile ? uploadedFile.name : 'Select a JSON, CSV or PDF file'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".json,.csv,.pdf"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {uploadStatus && (
              <div
                className={`p-4 rounded-lg ${
                  uploadStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {uploadStatus.message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={!uploadedFile || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => setShowUploadForm(false)}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !showUploadForm ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Patient ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Age</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Disease</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Drug Trial</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Hospital</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Eligible</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No patients found. Upload a JSON, CSV or PDF file to get started.
                    </td>
                  </tr>
                ) : (
                  patients.map((patient, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900">{patient.patient_id}</td>
                      <td className="px-6 py-3 text-gray-900">{patient.age}</td>
                      <td className="px-6 py-3 text-gray-900">{patient.disease}</td>
                      <td className="px-6 py-3 text-gray-900">{patient.drug}</td>
                      <td className="px-6 py-3 text-gray-900">{patient.hospital}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            patient.eligible
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {patient.eligible ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-center py-4 text-gray-600 bg-gray-50 border-t border-gray-200">
            Total: {patients.length} patients
          </div>
        </div>
      )}
    </div>
  );
}
