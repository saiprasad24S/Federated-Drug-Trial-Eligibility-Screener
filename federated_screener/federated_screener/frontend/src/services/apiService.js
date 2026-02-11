import axios from 'axios';

const API_BASE_URL = 'http://localhost:8002';

export const apiService = {
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

  // Get all patients
  getPatients: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/patients`);
      return response.data;
    } catch (error) {
      console.error('Error getting patients:', error);
      throw error;
    }
  },

  // Get all trials
  getTrials: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/trials`);
      return response.data;
    } catch (error) {
      console.error('Error getting trials:', error);
      throw error;
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
