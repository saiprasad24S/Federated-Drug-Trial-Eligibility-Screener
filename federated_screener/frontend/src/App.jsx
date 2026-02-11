import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import BlockchainTable from './components/BlockchainTable';
import PatientsManager from './components/PatientsManager';
import TrialsViewer from './components/TrialsViewer';
import Overview from './components/Overview';
import { useBlockchainLogs } from './hooks/useBlockchainLogs';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isAuthenticated', '1');
    } catch (e) {
      // ignore storage errors
    }
  };

  // Blockchain logs - only poll when tab active
  const { logs: blockchainLogs, loading: bcLoading } = useBlockchainLogs(activeTab === 'blockchain');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100">
                <svg className="w-7 h-7 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 7h14" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">MedFed</h1>
                <p className="mt-0.5 text-sm text-gray-500">Drug Trial Eligibility Screener</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.hospital_name}</p>
              </div>
              <button
                onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('isAuthenticated'); setUser(null); setIsAuthenticated(false); setActiveTab('overview'); }}
                className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-1.5 px-3 rounded-md transition"
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
        {activeTab === 'patients' && <PatientsManager user={user} />}
        {activeTab === 'trials' && <TrialsViewer user={user} />}
        {activeTab === 'blockchain' && (
          <BlockchainTable blockchainData={blockchainLogs} loading={bcLoading} />
        )}
      </main>
    </div>
  );
}

export default App;
