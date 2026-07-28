import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('expense_admin_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (id, password, usersList = []) => {
    // 1. Check Admin Master Credentials
    if (id === 'admin' && password === 'Vraj@2026') {
      const adminUser = {
        id: 'admin',
        name: 'Shukan Admin',
        email: 'admin@shukanpackaging.com',
        role: 'Administrator',
        avatar: '/logo.jpg'
      };
      setUser(adminUser);
      localStorage.setItem('expense_admin_user', JSON.stringify(adminUser));
      return { success: true, user: adminUser };
    }

    // 2. Check User Management List
    const matchedUser = usersList.find(u => (u.id.toLowerCase() === id.toLowerCase() || u.name.toLowerCase() === id.toLowerCase()) && u.password === password);

    if (matchedUser) {
      if (matchedUser.status === 'Suspended') {
        return { success: false, message: 'Account is Suspended. Please contact Admin.' };
      }

      const loggedInUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: `${matchedUser.id}@shukanpackaging.com`,
        role: matchedUser.id === 'admin' ? 'Administrator' : 'Staff',
        avatar: '/logo.jpg'
      };
      setUser(loggedInUser);
      localStorage.setItem('expense_admin_user', JSON.stringify(loggedInUser));
      return { success: true, user: loggedInUser };
    }

    return { success: false, message: 'Invalid ID or Password. Try admin / Vraj@2026' };
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
