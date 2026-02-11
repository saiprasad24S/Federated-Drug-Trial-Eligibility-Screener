import React, { useState } from 'react';

// Hospital credentials database
const HOSPITAL_CREDENTIALS = [
  {
    username: 'SaiPrasad24S',
    password: '2724',
    hospital_name: 'Sai Prasad Medical Center',
    email: 'admin@saiprasad.com'
  },
  {
    username: 'apollo',
    password: 'apollo@123',
    hospital_name: 'Apollo Hospitals',
    email: 'admin@apollo.com'
  },
  {
    username: 'fortis',
    password: 'fortis@123',
    hospital_name: 'Fortis Healthcare',
    email: 'admin@fortis.com'
  },
  {
    username: 'max',
    password: 'max@123',
    hospital_name: 'Max Super Specialty Hospital',
    email: 'admin@maxhealthcare.com'
  }
];

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simple validation
    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    // Authenticate against hospital credentials
    try {
      const hospital = HOSPITAL_CREDENTIALS.find(
        h => h.username === username && h.password === password
      );

      if (!hospital) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      const user = {
        username: hospital.username,
        hospital_name: hospital.hospital_name,
        role: 'admin',
        email: hospital.email,
      };
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Call parent handler
      onLogin(user);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 rounded-full p-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">MedFed</h1>
            <p className="text-gray-600 mt-2">Drug Trial Eligibility Screener</p>
            <p className="text-sm text-gray-500 mt-1">Privacy-preserving federated learning platform</p>
          </div>

          {/* Demo Credentials Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-blue-800">
              <div><span className="font-medium">SaiPrasad24S</span> / 2724</div>
              <div><span className="font-medium">apollo</span> / apollo@123</div>
              <div><span className="font-medium">fortis</span> / fortis@123</div>
              <div><span className="font-medium">max</span> / max@123</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., sai_prasad"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-gray-900 bg-white placeholder-gray-500"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center mb-3">Demo Credentials:</p>
            <div className="bg-gray-50 rounded p-3 text-xs text-gray-700 space-y-1">
              <p><strong>Username:</strong> SaiPrasad24S</p>
              <p><strong>Password:</strong> 2724</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>© 2026 MedFed. All rights reserved.</p>
            <p className="mt-2">Secure • Federated • Privacy-First</p>
          </div>
        </div>
      </div>
    </div>
  );
}
