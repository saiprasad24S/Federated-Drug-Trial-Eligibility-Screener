import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import HospitalProfile from './components/HospitalProfile'
import DrugTrials from './components/DrugTrials'
import Patients from './components/Patients'
import FederatedInsights from './components/FederatedInsights'
import AboutUs from './components/AboutUs'
import './App.css'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function AppContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <HospitalProfile />
          </ProtectedRoute>
        } />
        <Route path="/drug-trials" element={
          <ProtectedRoute>
            <DrugTrials />
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute>
            <Patients />
          </ProtectedRoute>
        } />
        <Route path="/federated-insights" element={
          <ProtectedRoute>
            <FederatedInsights />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App

