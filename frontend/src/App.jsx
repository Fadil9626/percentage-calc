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
import BranchOverviewPage from './pages/BranchOverviewPage';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { BranchProvider, useBranch } from './context/BranchContext';
import { useAuth } from './context/AuthContext';

// The pages start over whenever the branch changes, so each loads that branch's figures afresh.
// Signed in, they wait for the branches first, so nothing is fetched for the wrong one.
const BranchRoutes = ({ children }) => {
  const { user } = useAuth();
  const { branchId, loaded } = useBranch();
  if (user && !loaded) return null;
  return <Routes key={branchId || 'none'}>{children}</Routes>;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
          <BranchProvider>
            <BranchRoutes>
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

          <Route
            path="/branches"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <BranchOverviewPage />
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Page */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </BranchRoutes>
          </BranchProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
