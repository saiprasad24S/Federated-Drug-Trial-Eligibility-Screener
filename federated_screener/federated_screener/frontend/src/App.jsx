import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import BlockchainTable from './components/BlockchainTable';
import TrainingControls from './components/TrainingControls';
import PatientsManager from './components/PatientsManager';
import TrialsViewer from './components/TrialsViewer';
import Overview from './components/Overview';
import { apiService } from './services/apiService';
import { blockchainService } from './services/blockchainService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user');
    const isAuth = localStorage.getItem('isAuthenticated');

    if (storedUser && isAuth) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('overview');
  };

  const handleTrainingStart = async (config) => {
    try {
      setIsTraining(true);
      await apiService.startTraining(config);

      // Refresh data periodically during training
      const interval = setInterval(async () => {
        try {
          const logs = await apiService.getTrainingLogs();
          setTrainingLogs(logs);

          const status = await apiService.getTrainingStatus();
          setIsTraining(status.is_training);

          if (!status.is_training) {
            clearInterval(interval);
            // Load blockchain logs after training completes
            const bcLogs = await blockchainService.getAllTrainingRounds();
            setBlockchainLogs(bcLogs);
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      }, 5000);
    } catch (error) {
      console.error('Error starting training:', error);
      setIsTraining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MedFed</h1>
              <p className="mt-1 text-sm text-gray-500">Drug Trial Eligibility Screener</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.hospital_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'patients', label: 'Patients' },
              { id: 'trials', label: 'Clinical Trials' },
              { id: 'blockchain', label: 'Blockchain Logs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'patients' && <PatientsManager />}
        {activeTab === 'trials' && <TrialsViewer />}
        {activeTab === 'blockchain' && (
          <BlockchainTable blockchainData={blockchainLogs} />
        )}
      </main>
    </div>
  );
}

export default App;
