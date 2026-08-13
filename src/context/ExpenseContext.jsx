import React, { createContext, useContext, useState, useEffect } from 'react';

const ExpenseContext = createContext();

const initialTransactions = [];

const initialUsers = [
  {
    id: 'vraj',
    name: 'Vraj',
    password: 'vraj123',
    role: 'Partner',
    status: 'Active',
    createdAt: '2025-01-10'
  },
  {
    id: 'raj',
    name: 'Raj',
    password: 'raj123',
    role: 'Partner',
    status: 'Active',
    createdAt: '2025-03-14'
  },
  {
    id: 'teerth',
    name: 'Teerth',
    password: 'teerth123',
    role: 'Partner',
    status: 'Active',
    createdAt: '2025-06-20'
  },
  {
    id: 'mayank',
    name: 'Mayank',
    password: 'mayank123',
    role: 'Partner',
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
    notes: ''
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

const initialTasks = [
  {
    id: 'TSK-1001',
    title: 'Raw Material Corrugated Sheet Inspection',
    description: 'Inspect quality of newly delivered corrugated sheet batch at Factory Gate 2.',
    assignedTo: 'Raj',
    priority: 'High',
    category: 'Purchase',
    status: 'In Progress',
    dueDate: '2026-07-30',
    createdAt: '2026-07-28'
  },
  {
    id: 'TSK-1002',
    title: 'Client Dispatch & Transport Vehicle Audit',
    description: 'Verify shipping manifest and load security for major client order delivery.',
    assignedTo: 'Teerth',
    priority: 'Urgent',
    category: 'Delivery',
    status: 'Pending',
    dueDate: '2026-07-29',
    createdAt: '2026-07-29'
  },
  {
    id: 'TSK-1003',
    title: 'Weekly Factory Machine Maintenance',
    description: 'Perform scheduled lubrication and roller checks for packaging assembly line.',
    assignedTo: 'Mayank',
    priority: 'Medium',
    category: 'Maintenance',
    status: 'Completed',
    dueDate: '2026-07-27',
    createdAt: '2026-07-25'
  }
];

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
    const saved = localStorage.getItem('shukan_expense_users_v6');
    if (saved) {
      return JSON.parse(saved);
    }
    const olderSaved = localStorage.getItem('shukan_expense_users_v5');
    if (olderSaved) {
      const parsed = JSON.parse(olderSaved);
      return parsed.map(u => ({ ...u, role: 'Partner' }));
    }
    return initialUsers;
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('shukan_expense_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('shukan_tasks_v1');
    return saved ? JSON.parse(saved) : initialTasks;
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
    localStorage.setItem('shukan_expense_users_v6', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('shukan_expense_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('shukan_tasks_v1', JSON.stringify(tasks));
  }, [tasks]);

  // Helper function to check if a deposit is Due (or linked to a Due credit transaction)
  const isDepositDue = (d) => {
    if (!d) return false;
    if (d.status === 'Due') return true;

    if (d.txnId) {
      const linkedTxn = transactions.find(t => t.id === d.txnId);
      if (linkedTxn) return linkedTxn.status === 'Due';
    }

    if (d.notes && d.notes.includes('Company Wallet Credit')) {
      const cleanNote = d.notes.replace('Company Wallet Credit:', '').trim().toLowerCase();

      // Find matching Credit transactions for this user & Company Wallet
      const matchingCreditTxns = transactions.filter(t =>
        t.userName === d.userName &&
        (t.type === 'Cash In' || t.type === 'Credit') &&
        (t.depositTo === 'Company Wallet' || !t.depositTo)
      );

      const exactMatch = matchingCreditTxns.find(t =>
        (t.description && cleanNote && t.description.trim().toLowerCase() === cleanNote) ||
        (cleanNote && (t.description || '').trim().toLowerCase().includes(cleanNote)) ||
        parseFloat(t.amount) === parseFloat(d.amount)
      );

      if (exactMatch) {
        return exactMatch.status === 'Due';
      }
    }
    return false;
  };

  // Calculate Admin Vault Balance dynamically (excluding Due deposits)
  const activeVaultDeposits = vaultDeposits.filter(d => !isDepositDue(d));
  const totalVaultDeposited = activeVaultDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalAllocatedToTeam = Object.values(userAllocations).reduce((sum, val) => sum + val, 0);
  
  const totalCompanyDirectExpenses = transactions
    .filter(t => (t.userName === 'Shukan Company' || t.userName === 'Shukan Packaging (Company)' || t.userName === 'Company Vault') && t.type === 'Cash Out' && t.status !== 'Due')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const adminVaultBalance = totalVaultDeposited - totalAllocatedToTeam - totalCompanyDirectExpenses;

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
      notes: depositData.notes || ''
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
        message: `Cannot give ${settings.currency}${numAmount}. Admin Vault has only ${settings.currency}${adminVaultBalance.toLocaleString()} available. Please click "Deposit" to add vault funds first!`
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
      notes: notes || ''
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
    if (userName === 'Shukan Company' || userName === 'Shukan Packaging (Company)' || userName === 'Company Vault') {
      return {
        allocated: totalVaultDeposited,
        spent: totalCompanyDirectExpenses,
        dueSpent: 0,
        cashInReceived: 0,
        totalCashAvailable: totalVaultDeposited,
        remaining: adminVaultBalance,
        needFromCompany: 0
      };
    }

    const allocated = userAllocations[userName] || 0;
    
    // User Completed Expenses (Cash Out / Debit submitted by user - Done status)
    const spent = transactions
      .filter(t => t.userName === userName && t.type !== 'Cash In' && t.type !== 'Credit' && (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // User Due Expenses (Unpaid bills)
    const dueSpent = transactions
      .filter(t => t.userName === userName && t.type !== 'Cash In' && t.type !== 'Credit' && (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Additional Credit / Cash In received directly by user in My Hand (Done status)
    const cashInReceived = transactions
      .filter(t => t.userName === userName && (t.type === 'Cash In' || t.type === 'Credit') && t.depositTo !== 'Company Wallet' && (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalCashAvailable = allocated + cashInReceived;
    const remainingNet = totalCashAvailable - spent;
    const remaining = Math.max(0, remainingNet);
    const needFromCompany = dueSpent + (remainingNet < 0 ? Math.abs(remainingNet) : 0);

    return {
      allocated,
      spent,
      dueSpent,
      cashInReceived,
      totalCashAvailable,
      remaining,
      needFromCompany
    };
  };

  // Transaction CRUD
  const addTransaction = (txnData) => {
    const numAmount = parseFloat(txnData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }

    if (!txnData.description || !txnData.description.trim()) {
      return { success: false, message: 'Description is required for expense entries' };
    }

    const isCompanyTxn = txnData.userName === 'Shukan Company' || txnData.userName === 'Shukan Packaging (Company)' || txnData.userName === 'Company Vault';

    if (isCompanyTxn && txnData.status !== 'Due') {
      if (adminVaultBalance <= 0) {
        return {
          success: false,
          message: `Cannot record company expense. Company Vault balance is ${settings.currency}0.00. Please click "Deposit Vault" to add funds first!`
        };
      }
      if (adminVaultBalance < numAmount) {
        return {
          success: false,
          message: `Cannot record expense of ${settings.currency}${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Company Vault has only ${settings.currency}${adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} available. Please deposit vault funds first!`
        };
      }
    }

    const newTxn = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      status: txnData.status || 'Done',
      ...txnData,
      amount: numAmount
    };
    setTransactions(prev => [newTxn, ...prev]);
    return { success: true, txn: newTxn };
  };

  const updateTransaction = (id, updatedData) => {
    const oldTxn = transactions.find(t => t.id === id);
    if (!oldTxn) return { success: false, message: 'Transaction record not found' };

    const newAmount = parseFloat(updatedData.amount !== undefined ? updatedData.amount : oldTxn.amount);
    const newUserName = updatedData.userName || oldTxn.userName;
    const newStatus = updatedData.status !== undefined ? updatedData.status : oldTxn.status;

    const isCompanyTxn = newUserName === 'Shukan Company' || newUserName === 'Shukan Packaging (Company)' || newUserName === 'Company Vault';

    if (isCompanyTxn && newStatus !== 'Due') {
      const wasCompanyTxn = oldTxn.userName === 'Shukan Company' || oldTxn.userName === 'Shukan Packaging (Company)' || oldTxn.userName === 'Company Vault';
      const oldAmount = (wasCompanyTxn && oldTxn.status !== 'Due') ? oldTxn.amount : 0;
      const diff = newAmount - oldAmount;

      if (diff > 0 && adminVaultBalance < diff) {
        return {
          success: false,
          message: `Cannot update expense. Insufficient Company Vault balance (${settings.currency}${adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} available).`
        };
      }
    }

    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, ...updatedData, amount: newAmount, status: newStatus } : t)));

    // Synchronize linked vault deposit status if this is a Company Wallet credit entry
    const finalType = updatedData.type || oldTxn.type;
    const finalDepositTo = updatedData.depositTo || oldTxn.depositTo;
    if ((finalType === 'Cash In' || finalType === 'Credit') && finalDepositTo === 'Company Wallet') {
      setVaultDeposits(prev => {
        const linkedDepIndex = prev.findIndex(d =>
          d.txnId === id ||
          (d.userName === oldTxn.userName && parseFloat(d.amount) === parseFloat(oldTxn.amount))
        );
        if (linkedDepIndex >= 0) {
          return prev.map((d, index) => index === linkedDepIndex ? {
            ...d,
            amount: newAmount,
            userName: newUserName,
            status: newStatus
          } : d);
        } else if (newStatus === 'Done') {
          const newDep = {
            id: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
            date: updatedData.date || oldTxn.date || new Date().toISOString().split('T')[0],
            userName: newUserName,
            amount: newAmount,
            notes: `Company Wallet Credit: ${updatedData.description || oldTxn.description || 'Deposit to Vault'}`,
            txnId: id,
            status: 'Done'
          };
          return [newDep, ...prev];
        }
        return prev;
      });
    }

    return { success: true };
  };

  const deleteTransaction = (id) => {
    const oldTxn = transactions.find(t => t.id === id);
    if (oldTxn && (oldTxn.type === 'Cash In' || oldTxn.type === 'Credit') && oldTxn.depositTo === 'Company Wallet') {
      setVaultDeposits(prev => prev.filter(d => d.txnId !== id && !(d.userName === oldTxn.userName && parseFloat(d.amount) === parseFloat(oldTxn.amount))));
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
    return { success: true };
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
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, message: 'User not found' };

    const userName = targetUser.name;
    const hasAllocations = (userAllocations[userName] || 0) > 0;
    const hasTransactions = transactions.some(t => t.userName === userName);

    if (hasAllocations || hasTransactions) {
      // Soft-delete / archive to preserve historical accounting & audit trail
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: 'Inactive', isDeleted: true } : u)));
    } else {
      // Permanently remove if user has no financial activity
      setUsers(prev => prev.filter(u => u.id !== id));
    }
    return { success: true };
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

  // Task Management CRUD
  const addTask = (taskData) => {
    const newTask = {
      id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'General',
      assignedTo: taskData.assignedTo || 'Raj',
      ...taskData
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateTask = (id, updatedData) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updatedData } : t)));
  };

  const updateTaskStatus = (id, newStatus) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const resetToDefaultData = () => {
    setVaultDeposits(initialVaultDeposits);
    setUserAllocations({});
    setAllocationsHistory([]);
    setTransactions([]);
    setUsers(initialUsers);
    setSettings(initialSettings);
    setTasks(initialTasks);
    localStorage.removeItem('shukan_vault_deposits_v1');
    localStorage.removeItem('shukan_user_allocations_v1');
    localStorage.removeItem('shukan_allocations_history_v1');
    localStorage.removeItem('shukan_expense_transactions_v3');
    localStorage.removeItem('shukan_expense_users_v2');
    localStorage.removeItem('shukan_expense_settings');
    localStorage.removeItem('shukan_tasks_v1');
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
        isDepositDue,
        userAllocations,
        allocationsHistory,
        transactions,
        users,
        settings,
        tasks,
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
        resetToDefaultData,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask
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
