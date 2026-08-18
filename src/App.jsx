import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';

import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/Layout/AdminLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DepositAllocate from './pages/DepositAllocate';
import CreditDebit from './pages/CreditDebit';
import Reports from './pages/Reports';
import TeamAccounts from './pages/TeamAccounts';
import Settings from './pages/Settings';
import MyCreditDebit from './pages/MyCreditDebit';
import Tasks from './pages/Tasks';

import ErrorBoundary from './components/ErrorBoundary';

// Component to handle default redirection based on authentication state and user role
const DefaultRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    const isAdmin = user?.id === 'admin' || user?.role === 'Administrator' || user?.name?.toLowerCase() === 'vraj';
    return <Navigate to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} replace />;
  }
  return <Navigate to="/login" replace />;
};

// Route wrapper for Admin-only pages
const AdminOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator' || user?.name?.toLowerCase() === 'vraj';
  return isAdmin ? children : <Navigate to="/user/dashboard" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ExpenseProvider>
          <BrowserRouter>
          <Routes>
            {/* Root & Public Login Routes */}
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Admin Portal Routes (/admin/...) */}
              <Route path="/admin" element={<AdminOnlyRoute><AdminLayout /></AdminOnlyRoute>}>
                <Route index element={<DefaultRedirect />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="credit-debit" element={<CreditDebit />} />
                <Route path="deposit-allocate" element={<DepositAllocate />} />
                <Route path="team" element={<TeamAccounts />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="my-credit-debit" element={<MyCreditDebit />} />

                {/* Backward Compatible Redirects for Legacy URLs */}
                <Route path="money-received" element={<Navigate to="/admin/my-credit-debit" replace />} />
                <Route path="expenses" element={<Navigate to="/admin/credit-debit" replace />} />
                <Route path="my-expenses" element={<Navigate to="/admin/my-credit-debit" replace />} />
                <Route path="vault-deposits" element={<Navigate to="/admin/deposit-allocate" replace />} />
                <Route path="cash-in-out" element={<Navigate to="/admin/credit-debit" replace />} />
                <Route path="add-money" element={<Navigate to="/admin/deposit-allocate" replace />} />
                <Route path="users" element={<Navigate to="/admin/team" replace />} />
              </Route>

              {/* User / Staff Portal Routes (/user/...) */}
              <Route path="/user" element={<AdminLayout />}>
                <Route index element={<DefaultRedirect />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="my-credit-debit" element={<MyCreditDebit />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="settings" element={<Settings />} />

                {/* Backward Compatible Redirects for User URLs */}
                <Route path="credit-debit" element={<Navigate to="/user/my-credit-debit" replace />} />
                <Route path="money-received" element={<Navigate to="/user/my-credit-debit" replace />} />
                <Route path="expenses" element={<Navigate to="/user/my-credit-debit" replace />} />
                <Route path="my-expenses" element={<Navigate to="/user/my-credit-debit" replace />} />
              </Route>
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer position="top-right" autoClose={1200} theme="dark" />
      </ExpenseProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
