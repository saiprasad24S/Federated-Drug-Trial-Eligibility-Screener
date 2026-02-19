import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginPage from './components/LoginPage';
import BlockchainTable from './components/BlockchainTable';
import PatientsManager from './components/PatientsManager';
import TrialsViewer from './components/TrialsViewer';
import Overview from './components/Overview';
import { ThemeToggle, ToastProvider, Button } from './components/ui';
import { useBlockchainLogs } from './hooks/useBlockchainLogs';
import { useThemeStore } from './stores/themeStore';
import { pageTransition } from './utils/motionVariants';
import { apiService } from './services/apiService';

const TABS = [
  { id: 'overview', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'patients', label: 'Patients', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'trials', label: 'Clinical Trials', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'blockchain', label: 'Blockchain Logs', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('activeTab') || 'overview'; } catch { return 'overview'; }
  });
  const [tabHistory, setTabHistory] = useState([]);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const navigateTab = (tabId) => {
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab]);
      setActiveTab(tabId);
      try { localStorage.setItem('activeTab', tabId); } catch { /* ignore */ }
      const tabLabel = TABS.find(t => t.id === tabId)?.label || tabId;
      apiService.logActivity('TAB_NAVIGATION', `Navigated to ${tabLabel}`, user?.username || 'System');
    }
  };

  const goBack = () => {
    setTabHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const prevTab = newHistory.pop();
      setActiveTab(prevTab);
      try { localStorage.setItem('activeTab', prevTab); } catch { /* ignore */ }
      return newHistory;
    });
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    try { localStorage.setItem('user', JSON.stringify(userData)); localStorage.setItem('isAuthenticated', '1'); } catch { /* ignore */ }
  };

  const { logs: blockchainLogs, loading: bcLoading } = useBlockchainLogs(activeTab === 'blockchain');

  const handleLogout = () => {
    apiService.logActivity('USER_LOGOUT', `User '${user?.username}' logged out`, user?.username || 'System');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('activeTab');
    setUser(null);
    setIsAuthenticated(false);
    setActiveTab('overview');
    setTabHistory([]);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const isAuth = localStorage.getItem('isAuthenticated');
    if (storedUser && isAuth) { setUser(JSON.parse(storedUser)); setIsAuthenticated(true); }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto" style={{ borderBottom: '2px solid var(--brand-accent)', borderRight: '2px solid transparent' }} />
          <p className="mt-4" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <LoginPage onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        {/* ── Header ── */}
        <header className="app-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Back button + Logo */}
              <div className="flex items-center gap-3.5">
                {/* Back button */}
                {tabHistory.length > 0 && (
                  <motion.button
                    onClick={goBack}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{
                      background: isDark ? 'rgba(32,227,178,0.08)' : 'rgba(99,102,241,0.06)',
                      border: `1px solid ${isDark ? 'rgba(32,227,178,0.15)' : 'rgba(99,102,241,0.1)'}`,
                      color: 'var(--brand-accent)',
                    }}
                    whileHover={{ scale: 1.08, x: -2 }}
                    whileTap={{ scale: 0.92 }}
                    title="Go back"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </motion.button>
                )}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isDark ? 'linear-gradient(135deg, rgba(32,227,178,0.14), rgba(77,171,247,0.1))' : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.08))', border: `1px solid ${isDark ? 'rgba(32,227,178,0.2)' : 'rgba(99,102,241,0.15)'}` }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--brand-accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2v20" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 7h14" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M7 12h10" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    FDT<span style={{ color: 'var(--brand-accent)' }}>ES</span>
                  </h1>
                  <p className="text-[10px] font-medium tracking-wide uppercase" style={{ color: 'var(--text-tertiary)' }}>Drug Trial Eligibility Screener</p>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <div className="hidden sm:flex items-center gap-3 pl-3" style={{ borderLeft: '1px solid var(--border-primary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: isDark ? 'rgba(77,171,247,0.12)' : 'rgba(99,102,241,0.08)', color: 'var(--brand-primary)' }}>
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{user?.username}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{user?.hospital_name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Tab Navigation ── */}
        <nav style={{ background: 'var(--bg-header-solid)', borderBottom: '1px solid var(--border-primary)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1.5 overflow-x-auto py-2.5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigateTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} /></svg>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-content">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...pageTransition}>
              {activeTab === 'overview' && <Overview onNavigate={navigateTab} user={user} />}
              {activeTab === 'patients' && <PatientsManager user={user} />}
              {activeTab === 'trials' && <TrialsViewer user={user} />}
              {activeTab === 'blockchain' && <BlockchainTable blockchainData={blockchainLogs} loading={bcLoading} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
