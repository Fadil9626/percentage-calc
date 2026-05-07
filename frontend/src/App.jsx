import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CloseLedgerPage from './pages/CloseLedgerPage';
import DistributionsPage from './pages/DistributionsPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/transactions"
            element={
              <ProtectedRoute allowedRoles={['DATA_ENTRY', 'ADMIN']}>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/close-ledger"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <CloseLedgerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/distributions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DistributionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Page */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
