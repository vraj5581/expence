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
import MoneyReceived from './pages/MoneyReceived';
import Tasks from './pages/Tasks';

// Component to handle intelligent default redirection based on user role
const DefaultRedirect = () => {
  const { user } = useAuth();
  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator';
  return <Navigate to="/admin/dashboard" replace />;
};

// Route wrapper for Admin-only pages
const AdminOnlyRoute = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator';
  return isAdmin ? children : <Navigate to="/admin/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <ExpenseProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DefaultRedirect />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="credit-debit" element={<AdminOnlyRoute><CreditDebit /></AdminOnlyRoute>} />
                <Route path="deposit-allocate" element={<AdminOnlyRoute><DepositAllocate /></AdminOnlyRoute>} />
                <Route path="team" element={<AdminOnlyRoute><TeamAccounts /></AdminOnlyRoute>} />
                <Route path="tasks" element={<AdminOnlyRoute><Tasks /></AdminOnlyRoute>} />
                <Route path="reports" element={<AdminOnlyRoute><Reports /></AdminOnlyRoute>} />
                <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
                <Route path="my-credit-debit" element={<MyCreditDebit />} />
                <Route path="money-received" element={<MoneyReceived />} />

                {/* Backward Compatible Redirects for Legacy URLs */}
                <Route path="expenses" element={<Navigate to="/admin/credit-debit" replace />} />
                <Route path="my-expenses" element={<Navigate to="/admin/my-credit-debit" replace />} />
                <Route path="vault-deposits" element={<Navigate to="/admin/deposit-allocate" replace />} />
                <Route path="cash-in-out" element={<Navigate to="/admin/credit-debit" replace />} />
                <Route path="add-money" element={<Navigate to="/admin/deposit-allocate" replace />} />
                <Route path="users" element={<Navigate to="/admin/team" replace />} />
              </Route>
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer position="top-right" autoClose={1200} theme="dark" />
      </ExpenseProvider>
    </AuthProvider>
  );
}

export default App;
