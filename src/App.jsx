import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';

import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/Layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Code-split pages for instant bundle load & low-network resilience
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DepositAllocate = lazy(() => import('./pages/DepositAllocate'));
const CreditDebit = lazy(() => import('./pages/CreditDebit'));
const Reports = lazy(() => import('./pages/Reports'));
const TeamAccounts = lazy(() => import('./pages/TeamAccounts'));
const Settings = lazy(() => import('./pages/Settings'));
const MyCreditDebit = lazy(() => import('./pages/MyCreditDebit'));
const Tasks = lazy(() => import('./pages/Tasks'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="flex flex-col items-center space-y-2.5">
      <div className="w-7 h-7 border-3 border-[#002B49]/20 border-t-[#002B49] rounded-full animate-spin"></div>
      <span className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">Loading...</span>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </BrowserRouter>

        <ToastContainer position="top-right" autoClose={1200} theme="dark" />
      </ExpenseProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
