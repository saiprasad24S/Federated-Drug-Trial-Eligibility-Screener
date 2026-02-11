import axios from 'axios';

const API_BASE_URL = 'http://localhost:8002';

export const apiService = {
  // Get fast overview stats (no heavy data transfer)
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  },

  // Start federated training
  startTraining: async (config) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/start-training`, config);
      return response.data;
    } catch (error) {
      console.error('Error starting training:', error);
      throw error;
    }
  },

  // Get training status
  getTrainingStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training-status`);
      return response.data;
    } catch (error) {
      console.error('Error getting training status:', error);
      throw error;
    }
  },

  // Get training logs
  getTrainingLogs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training-logs`);
      return response.data;
    } catch (error) {
      console.error('Error getting training logs:', error);
      throw error;
    }
  },

  // Stop training
  stopTraining: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/stop-training`);
      return response.data;
    } catch (error) {
      console.error('Error stopping training:', error);
      throw error;
    }
  },

  // Get patients (paginated, with server-side search & sort)
  getPatients: async (hospital, { page = 1, pageSize = 50, search = '', sortBy = '', sortDir = 'asc' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (hospital) params.set('hospital', hospital);
      params.set('page', page);
      params.set('page_size', pageSize);
      if (search) params.set('search', search);
      if (sortBy) { params.set('sort_by', sortBy); params.set('sort_dir', sortDir); }
      const response = await axios.get(`${API_BASE_URL}/patients?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting patients:', error);
      throw error;
    }
  },

  // Get all trials (drug names + anonymized eligibility parameters)
  getTrials: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/trials`);
      return response.data;
    } catch (error) {
      console.error('Error getting trials:', error);
      throw error;
    }
  },

  // Get eligible patients for a specific drug (paginated)
  getEligibleForDrug: async (drugName, hospital, { page = 1, pageSize = 50, tab = 'eligible' } = {}) => {
    try {
      const params = new URLSearchParams();
      if (hospital) params.set('hospital', hospital);
      params.set('page', page);
      params.set('page_size', pageSize);
      params.set('tab', tab);
      const response = await axios.get(`${API_BASE_URL}/trials/${encodeURIComponent(drugName)}/eligible?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting eligible patients:', error);
      throw error;
    }
  },

  // Unified upload (CSV, JSON, PDF) — preprocessed on backend
  // Returns { data, uploadId } so caller can poll progress
  uploadFile: async (file, hospital, onUploadProgress) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (hospital) formData.append('hospital', hospital);
      const params = hospital ? `?hospital=${encodeURIComponent(hospital)}` : '';
      const response = await axios.post(`${API_BASE_URL}/upload${params}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onUploadProgress || undefined,
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Poll preprocessing progress by upload_id
  getUploadProgress: async (uploadId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/upload-progress/${uploadId}`);
      return response.data;
    } catch (error) {
      return { percent: 0, stage: 'waiting' };
    }
  },

  // Upload JSON file
  uploadJson: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/upload-json`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading JSON:', error);
      throw error;
    }
  },

  // Upload PDF file
  uploadPdf: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }
  },

  // Upload CSV file
  uploadCsv: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API_BASE_URL}/upload-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading CSV:', error);
      throw error;
    }
  },

  // Get blockchain logs from backend
  getBlockchainLogs: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/blockchain-logs`);
      // New dedicated endpoint returns { logs: [...], total: N }
      return response.data.logs || [];
    } catch (error) {
      console.error('Error getting blockchain logs:', error);
      // Fallback to model-metrics if /blockchain-logs not available
      try {
        const fallback = await axios.get(`${API_BASE_URL}/model-metrics`);
        return fallback.data.blockchain_logs || [];
      } catch {
        return [];
      }
    }
  },

  // Predict patient eligibility
  predictEligibility: async (patientData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, patientData);
      return response.data;
    } catch (error) {
      console.error('Error predicting eligibility:', error);
      throw error;
    }
  },
};
