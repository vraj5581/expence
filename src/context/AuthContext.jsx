import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('expense_admin_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (id, password, usersList = []) => {
    const cleanId = (id || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim().toLowerCase();

    // 1. Check Vraj / Admin Master Credentials (case-insensitive)
    if ((cleanId === 'vraj' || cleanId === 'admin') && (cleanPassword === 'vraj123' || cleanPassword === 'vraj@2026')) {
      const adminUser = {
        id: 'vraj',
        name: 'Vraj',
        email: 'vraj@shukanpackaging.com',
        role: 'Administrator',
        avatar: '/logo.jpg'
      };
      setUser(adminUser);
      localStorage.setItem('expense_admin_user', JSON.stringify(adminUser));
      return { success: true, user: adminUser };
    }

    // 2. Check User List (case-insensitive for ID/Name and Password)
    const matchedUser = usersList.find(u => 
      (u.id.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) && 
      u.password.toLowerCase() === cleanPassword
    );

    if (matchedUser) {
      if (matchedUser.status === 'Suspended') {
        return { success: false, message: 'Account is Suspended. Please contact Admin.' };
      }

      const isAdminUser = matchedUser.id.toLowerCase() === 'vraj' || matchedUser.id.toLowerCase() === 'admin' || matchedUser.role === 'Administrator';
      const loggedInUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: `${matchedUser.id}@shukanpackaging.com`,
        role: matchedUser.role || (isAdminUser ? 'Administrator' : 'Staff'),
        avatar: '/logo.jpg'
      };
      setUser(loggedInUser);
      localStorage.setItem('expense_admin_user', JSON.stringify(loggedInUser));
      return { success: true, user: loggedInUser };
    }

    return { success: false, message: 'Invalid ID or Password. Try Vraj / vraj123' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('expense_admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
