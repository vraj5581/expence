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
import AddMoney from './pages/AddMoney';
import CashInOut from './pages/CashInOut';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import UserPortal from './pages/UserPortal';
import MoneyReceived from './pages/MoneyReceived';
import AssignTask from './pages/AssignTask';

// Component to handle intelligent default redirection based on user role
const DefaultRedirect = () => {
  const { user } = useAuth();
  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator';
  return <Navigate to={isAdmin ? "/admin/dashboard" : "/admin/dashboard"} replace />;
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
                <Route path="add-money" element={<AdminOnlyRoute><AddMoney /></AdminOnlyRoute>} />
                <Route path="cash-in-out" element={<AdminOnlyRoute><CashInOut /></AdminOnlyRoute>} />
                <Route path="reports" element={<AdminOnlyRoute><Reports /></AdminOnlyRoute>} />
                <Route path="users" element={<AdminOnlyRoute><UserManagement /></AdminOnlyRoute>} />
                <Route path="settings" element={<AdminOnlyRoute><Settings /></AdminOnlyRoute>} />
                <Route path="my-expenses" element={<UserPortal />} />
                <Route path="money-received" element={<MoneyReceived />} />
                <Route path="tasks" element={<AdminOnlyRoute><AssignTask /></AdminOnlyRoute>} />
              </Route>
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      </ExpenseProvider>
    </AuthProvider>
  );
}

export default App;
