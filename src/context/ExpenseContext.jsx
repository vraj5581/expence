import React, { createContext, useContext, useState, useEffect } from 'react';

const ExpenseContext = createContext();

const initialTransactions = [];

const initialUsers = [
  {
    id: 'vraj',
    name: 'Vraj',
    password: 'vraj123',
    role: 'Administrator',
    status: 'Active',
    createdAt: '2025-01-10'
  },
  {
    id: 'raj',
    name: 'Raj',
    password: 'raj123',
    role: 'Staff',
    status: 'Active',
    createdAt: '2025-03-14'
  },
  {
    id: 'teerth',
    name: 'Teerth',
    password: 'teerth123',
    role: 'Staff',
    status: 'Active',
    createdAt: '2025-06-20'
  },
  {
    id: 'mayank',
    name: 'Mayank',
    password: 'mayank123',
    role: 'Staff',
    status: 'Active',
    createdAt: '2025-09-01'
  }
];

const initialVaultDeposits = [
  {
    id: 'DEP-1001',
    date: '2026-07-28',
    userName: 'Shukan Admin',
    amount: 2000,
    notes: 'Initial Admin Capital Deposit'
  }
];

const initialSettings = {
  companyName: 'Shukan Packaging',
  currency: '₹',
  currencyCode: 'INR',
  fiscalYearStart: 'April',
  lowBalanceThreshold: 10000,
  requireApprovalOver: 5000,
  autoEmailReports: true
};

export const ExpenseProvider = ({ children }) => {
  // Vault Deposits List (CRUD)
  const [vaultDeposits, setVaultDeposits] = useState(() => {
    const saved = localStorage.getItem('shukan_vault_deposits_v1');
    return saved ? JSON.parse(saved) : initialVaultDeposits;
  });

  // Per-User Money Allocations (e.g. { 'Raj': 500, 'Alex Mercer': 1000 })
  const [userAllocations, setUserAllocations] = useState(() => {
    const saved = localStorage.getItem('shukan_user_allocations_v1');
    return saved ? JSON.parse(saved) : {};
  });

  // Allocations History (When Admin gives money to users)
  const [allocationsHistory, setAllocationsHistory] = useState(() => {
    const saved = localStorage.getItem('shukan_allocations_history_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('shukan_expense_transactions_v3');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('shukan_expense_users_v5');
    if (saved) {
      return JSON.parse(saved);
    }
    return initialUsers;
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('shukan_expense_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  useEffect(() => {
    localStorage.setItem('shukan_vault_deposits_v1', JSON.stringify(vaultDeposits));
  }, [vaultDeposits]);

  useEffect(() => {
    localStorage.setItem('shukan_user_allocations_v1', JSON.stringify(userAllocations));
  }, [userAllocations]);

  useEffect(() => {
    localStorage.setItem('shukan_allocations_history_v1', JSON.stringify(allocationsHistory));
  }, [allocationsHistory]);

  useEffect(() => {
    localStorage.setItem('shukan_expense_transactions_v3', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('shukan_expense_users_v5', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('shukan_expense_settings', JSON.stringify(settings));
  }, [settings]);

  // Calculate Admin Vault Balance dynamically
  // Vault Balance = (Sum of all Vault Deposits) - (Sum of all Money Given to Users)
  const totalVaultDeposited = vaultDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalAllocatedToTeam = Object.values(userAllocations).reduce((sum, val) => sum + val, 0);
  const adminVaultBalance = totalVaultDeposited - totalAllocatedToTeam;

  // 1. ADD VAULT DEPOSIT
  const addVaultDeposit = (depositData) => {
    const numAmount = parseFloat(depositData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }

    const newDeposit = {
      id: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      date: depositData.date || new Date().toISOString().split('T')[0],
      userName: depositData.userName || 'Shukan Admin',
      amount: numAmount,
      notes: depositData.notes || 'Admin Capital Deposit'
    };

    setVaultDeposits(prev => [newDeposit, ...prev]);
    return { success: true, deposit: newDeposit };
  };

  // 2. UPDATE VAULT DEPOSIT
  const updateVaultDeposit = (id, updatedData) => {
    const numAmount = parseFloat(updatedData.amount);
    setVaultDeposits(prev => prev.map(d => (d.id === id ? {
      ...d,
      ...updatedData,
      amount: !isNaN(numAmount) ? numAmount : d.amount
    } : d)));
    return { success: true };
  };

  // 3. DELETE VAULT DEPOSIT
  const deleteVaultDeposit = (id) => {
    setVaultDeposits(prev => prev.filter(d => d.id !== id));
    return { success: true };
  };

  // Give Money / Allocate Cash to User (Deducts from Admin Vault)
  const allocateMoneyToUser = (userName, amount, notes = '') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }
    if (adminVaultBalance < numAmount) {
      return {
        success: false,
        message: `Cannot give ${settings.currency}${numAmount}. Admin Vault has only ${settings.currency}${adminVaultBalance.toLocaleString()} available. Please click "+ Add Money" to add vault funds first!`
      };
    }

    // Increase User Allocated Pool
    setUserAllocations(prev => ({
      ...prev,
      [userName]: (prev[userName] || 0) + numAmount
    }));

    const allocationLog = {
      id: `ALC-${Math.floor(1000 + Math.random() * 9000)}`,
      userName,
      type: 'User Transfer',
      amount: numAmount,
      date: new Date().toISOString().split('T')[0],
      notes: notes || `Admin allocated ${settings.currency}${numAmount} to ${userName}`
    };

    setAllocationsHistory(prev => [allocationLog, ...prev]);

    return { success: true, allocationLog };
  };

  const updateAllocation = (id, updatedData) => {
    const oldAlloc = allocationsHistory.find(a => a.id === id);
    if (!oldAlloc) return { success: false, message: 'Allocation record not found' };

    const newAmount = parseFloat(updatedData.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }

    const oldAmount = oldAlloc.amount;
    const diff = newAmount - oldAmount;

    if (diff > 0 && adminVaultBalance < diff) {
      return {
        success: false,
        message: `Cannot increase allocation by ${settings.currency}${diff}. Admin Vault has only ${settings.currency}${adminVaultBalance.toLocaleString()} available.`
      };
    }

    setUserAllocations(prev => {
      const next = { ...prev };
      const oldUser = oldAlloc.userName;
      const newUser = updatedData.userName || oldUser;

      if (oldUser === newUser) {
        next[newUser] = Math.max(0, (next[newUser] || 0) + diff);
      } else {
        next[oldUser] = Math.max(0, (next[oldUser] || 0) - oldAmount);
        next[newUser] = (next[newUser] || 0) + newAmount;
      }
      return next;
    });

    setAllocationsHistory(prev => prev.map(a => a.id === id ? {
      ...a,
      ...updatedData,
      amount: newAmount,
      userName: updatedData.userName || a.userName
    } : a));

    return { success: true };
  };

  const deleteAllocation = (id) => {
    const targetAlloc = allocationsHistory.find(a => a.id === id);
    if (!targetAlloc) return { success: false, message: 'Allocation record not found' };

    setUserAllocations(prev => ({
      ...prev,
      [targetAlloc.userName]: Math.max(0, (prev[targetAlloc.userName] || 0) - targetAlloc.amount)
    }));

    setAllocationsHistory(prev => prev.filter(a => a.id !== id));
    return { success: true };
  };

  // Helper to calculate user statistics (Allocated, Spent, Remaining)
  const getUserStats = (userName) => {
    const allocated = userAllocations[userName] || 0;
    
    // User Expenses (Cash Out submitted by user - Due entries do NOT deduct balance)
    const spent = transactions
      .filter(t => t.userName === userName && t.type === 'Cash Out' && t.status !== 'Due')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Additional Cash In received directly by user
    const cashInReceived = transactions
      .filter(t => t.userName === userName && t.type === 'Cash In')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const remaining = (allocated + cashInReceived) - spent;
    const needFromCompany = remaining < 0 ? Math.abs(remaining) : 0;

    return {
      allocated,
      spent,
      cashInReceived,
      remaining,
      needFromCompany
    };
  };

  // Transaction CRUD
  const addTransaction = (txnData) => {
    const newTxn = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      status: txnData.status || 'Done',
      ...txnData,
      amount: parseFloat(txnData.amount)
    };
    setTransactions(prev => [newTxn, ...prev]);
    return newTxn;
  };

  const updateTransaction = (id, updatedData) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updatedData, amount: parseFloat(updatedData.amount) } : t)));
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // User CRUD
  const addUser = (userData) => {
    const newUser = {
      id: userData.id || `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.name,
      password: userData.password,
      status: userData.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
    return newUser;
  };

  const updateUser = (originalId, updatedData) => {
    setUsers(prev => prev.map(u => (u.id === originalId ? { ...u, ...updatedData } : u)));
  };

  const deleteUser = (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const toggleUserStatus = (id) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return u;
    }));
  };

  // Settings
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetToDefaultData = () => {
    setVaultDeposits(initialVaultDeposits);
    setUserAllocations({});
    setAllocationsHistory([]);
    setTransactions([]);
    setUsers(initialUsers);
    setSettings(initialSettings);
    localStorage.removeItem('shukan_vault_deposits_v1');
    localStorage.removeItem('shukan_user_allocations_v1');
    localStorage.removeItem('shukan_allocations_history_v1');
    localStorage.removeItem('shukan_expense_transactions_v3');
    localStorage.removeItem('shukan_expense_users_v2');
    localStorage.removeItem('shukan_expense_settings');
  };

  const totalCashIn = transactions
    .filter(t => t.type === 'Cash In')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCashOut = transactions
    .filter(t => t.type === 'Cash Out' && t.status !== 'Due')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netBalance = totalCashIn - totalCashOut;

  return (
    <ExpenseContext.Provider
      value={{
        adminVaultBalance,
        totalVaultDeposited,
        vaultDeposits,
        userAllocations,
        allocationsHistory,
        transactions,
        users,
        settings,
        totalAllocatedToTeam,
        totalCashIn,
        totalCashOut,
        netBalance,
        addVaultDeposit,
        updateVaultDeposit,
        deleteVaultDeposit,
        allocateMoneyToUser,
        updateAllocation,
        deleteAllocation,
        getUserStats,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        updateSettings,
        resetToDefaultData
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
