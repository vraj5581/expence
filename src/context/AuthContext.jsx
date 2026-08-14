import React, { createContext, useContext, useState } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Clear legacy localStorage session key so app always requires login on fresh browser sessions
    localStorage.removeItem('expense_admin_user');
    const savedSession = sessionStorage.getItem('expense_admin_user');
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const login = async (id, password) => {
    const cleanId = (id || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanId || !cleanPassword) {
      return { success: false, message: 'Please enter both username/ID and password' };
    }

    try {
      const apiRes = await apiService.login({ username: cleanId, password: cleanPassword });
      if (apiRes && apiRes.success && apiRes.user) {
        const u = apiRes.user;
        const isAdminUser = u.id === 'vraj' || u.id === 'admin' || u.role === 'Administrator' || u.name?.toLowerCase() === 'vraj';
        const loggedInUser = {
          id: u.id,
          name: u.name,
          username: u.username || u.id,
          role: isAdminUser ? 'Administrator' : (u.role || 'Partner'),
          avatar: u.avatar || '/logo.jpg'
        };
        setUser(loggedInUser);
        sessionStorage.setItem('expense_admin_user', JSON.stringify(loggedInUser));
        return { success: true, user: loggedInUser };
      }

      return { success: false, message: apiRes?.message || apiRes?.error || 'Invalid ID or Password.' };
    } catch (e) {
      return { success: false, message: e.message || 'Authentication error: Failed to connect to PHP database' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) return { success: false, message: 'Not authenticated' };

    const cleanCurrent = (currentPassword || '').trim();
    const cleanNew = (newPassword || '').trim();
    const searchName = user.id || user.name || '';

    if (!cleanCurrent || !cleanNew) {
      return { success: false, message: 'Please enter both current and new password' };
    }

    try {
      const res = await apiService.changePassword(searchName, cleanCurrent, cleanNew);
      if (res && res.success) {
        return { success: true, message: 'Password updated successfully in PHP database!' };
      }
      return { success: false, message: res?.message || res?.error || 'Failed to update password in PHP database.' };
    } catch (e) {
      return { success: false, message: e.message || 'Database error: Failed to update password' };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('expense_admin_user');
    localStorage.removeItem('expense_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
