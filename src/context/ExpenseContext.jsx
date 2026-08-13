import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';

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
  currency: '₹',
  currencyCode: 'INR',
  companyName: 'Shukan Packaging',
  lowBalanceAlert: 5000,
  approvalThreshold: 20000
};

const initialTasks = [];

export const ExpenseProvider = ({ children }) => {
  const [vaultDeposits, setVaultDeposits] = useState([]);
  const [userAllocations, setUserAllocations] = useState({});
  const [allocationsHistory, setAllocationsHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [settings, setSettings] = useState(initialSettings);
  const [tasks, setTasks] = useState([]);

  // Fetch state from PHP backend on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [txRes, depRes, alcRes, userRes, setRes, taskRes] = await Promise.all([
          apiService.getTransactions(),
          apiService.getVaultDeposits(),
          apiService.getAllocations(),
          apiService.getUsers(),
          apiService.getSettings(),
          apiService.getTasks()
        ]);

        if (txRes?.success && Array.isArray(txRes.transactions)) {
          setTransactions(txRes.transactions);
        }
        if (depRes?.success && Array.isArray(depRes.vaultDeposits)) {
          setVaultDeposits(depRes.vaultDeposits);
        }
        if (alcRes?.success) {
          if (Array.isArray(alcRes.allocationsHistory)) setAllocationsHistory(alcRes.allocationsHistory);
          if (alcRes.userAllocations && typeof alcRes.userAllocations === 'object') setUserAllocations(alcRes.userAllocations);
        }
        if (userRes?.success && Array.isArray(userRes.users) && userRes.users.length > 0) {
          setUsers(userRes.users);
        }
        if (setRes?.success && setRes.settings) {
          setSettings(setRes.settings);
        }
        if (taskRes?.success && Array.isArray(taskRes.tasks)) {
          setTasks(taskRes.tasks);
        }
      } catch (err) {
        console.warn("Failed to load initial data from PHP backend, using local state:", err);
      }
    }
    loadBackendData();
  }, []);

  // Effective Vault Deposits = Direct Manual Deposits + Completed Company Wallet Credit Transactions (No Duplicates!)
  const effectiveVaultDeposits = useMemo(() => {
    // 1. Direct manual deposits (excluding those auto-generated from Company Wallet credits)
    const directManualDeposits = (vaultDeposits || []).filter(d =>
      !d.txnId &&
      (!d.notes || !d.notes.includes('Company Wallet Credit'))
    );

    // 2. Completed Company Wallet Credit transactions
    const creditWalletDeposits = (transactions || [])
      .filter(t => (t.type === 'Cash In' || t.type === 'Credit') && t.depositTo === 'Company Wallet' && (t.status || 'Done') === 'Done')
      .map(t => ({
        id: `DEP-TXN-${t.id}`,
        txnId: t.id,
        date: t.date,
        userName: t.userName,
        amount: parseFloat(t.amount) || 0,
        notes: `Company Wallet Credit: ${t.description || 'Deposit to Vault'}`,
        status: 'Done',
        isCreditTxn: true
      }));

    return [...creditWalletDeposits, ...directManualDeposits].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [vaultDeposits, transactions]);

  const isDepositDue = (d) => {
    if (!d) return false;
    if (d.status === 'Due') return true;
    if (d.txnId) {
      const linkedTxn = (transactions || []).find(t => t && t.id === d.txnId);
      if (linkedTxn) return linkedTxn.status === 'Due';
    }
    return false;
  };

  // Calculate Admin Vault Balance dynamically (excluding Due deposits)
  const totalVaultDeposited = (effectiveVaultDeposits || []).reduce((sum, d) => sum + (parseFloat(d?.amount) || 0), 0);
  const totalAllocatedToTeam = Object.values(userAllocations || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  
  const totalCompanyDirectExpenses = (transactions || [])
    .filter(t => t && (t.userName === 'Shukan Company' || t.userName === 'Shukan Packaging (Company)' || t.userName === 'Company Vault') && t.type === 'Cash Out' && t.status !== 'Due')
    .reduce((sum, t) => sum + (parseFloat(t?.amount) || 0), 0);

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
    apiService.addVaultDeposit(newDeposit).catch(err => console.warn("PHP Sync warning:", err));
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
    apiService.updateVaultDeposit(id, updatedData).catch(err => console.warn("PHP Sync warning:", err));
    return { success: true };
  };

  // 3. DELETE VAULT DEPOSIT
  const deleteVaultDeposit = (id) => {
    setVaultDeposits(prev => prev.filter(d => d.id !== id));
    apiService.deleteVaultDeposit(id).catch(err => console.warn("PHP Sync warning:", err));
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
    apiService.allocateMoney(allocationLog).catch(err => console.warn("PHP Sync warning:", err));

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

    apiService.updateAllocation(id, updatedData).catch(err => console.warn("PHP Sync warning:", err));
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
    apiService.deleteAllocation(id).catch(err => console.warn("PHP Sync warning:", err));
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

    const targetUser = (userName || '').toLowerCase();
    const allocated = Object.entries(userAllocations).reduce((sum, [u, amt]) => {
      return u.toLowerCase() === targetUser ? sum + amt : sum;
    }, 0);
    
    // User Completed Expenses (Cash Out / Debit submitted by user - Done status)
    const spent = transactions
      .filter(t => (t.userName || '').toLowerCase() === targetUser && t.type !== 'Cash In' && t.type !== 'Credit' && (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // User Due Expenses (Unpaid bills)
    const dueSpent = transactions
      .filter(t => (t.userName || '').toLowerCase() === targetUser && t.type !== 'Cash In' && t.type !== 'Credit' && (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Additional Credit / Cash In received directly by user in My Hand (Done status)
    const cashInReceived = transactions
      .filter(t => (t.userName || '').toLowerCase() === targetUser && (t.type === 'Cash In' || t.type === 'Credit') && t.depositTo !== 'Company Wallet' && (t.status || 'Done') === 'Done')
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
    apiService.addTransaction(newTxn).catch(err => console.warn("PHP Sync warning:", err));

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
    apiService.updateTransaction(id, { ...updatedData, amount: newAmount, status: newStatus }).catch(err => console.warn("PHP Sync warning:", err));

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
    apiService.deleteTransaction(id).catch(err => console.warn("PHP Sync warning:", err));
    return { success: true };
  };

  // User CRUD
  const addUser = (userData) => {
    const newUser = {
      id: userData.id || `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.name,
      username: userData.username || userData.id || userData.name.toLowerCase(),
      password: userData.password || 'partner123',
      role: userData.role || 'Partner',
      status: userData.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
    apiService.addUser(newUser).catch(err => console.warn("PHP Sync warning:", err));
    return newUser;
  };

  const updateUser = (originalId, updatedData) => {
    setUsers(prev => prev.map(u => (u.id === originalId ? { ...u, ...updatedData } : u)));
    apiService.updateUser(originalId, updatedData).catch(err => console.warn("PHP Sync warning:", err));
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
      apiService.updateUser(id, { status: 'Inactive' }).catch(err => console.warn("PHP Sync warning:", err));
    } else {
      // Permanently remove if user has no financial activity
      setUsers(prev => prev.filter(u => u.id !== id));
      apiService.deleteUser(id).catch(err => console.warn("PHP Sync warning:", err));
    }
    return { success: true };
  };

  const toggleUserStatus = (id) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        apiService.updateUser(id, { status: nextStatus }).catch(err => console.warn("PHP Sync warning:", err));
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  // Settings
  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    apiService.updateSettings(newSettings).catch(err => console.warn("PHP Sync warning:", err));
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
    apiService.addTask(newTask).catch(err => console.warn("PHP Sync warning:", err));
    return newTask;
  };

  const updateTask = (id, updatedData) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updatedData } : t)));
    apiService.updateTask(id, updatedData).catch(err => console.warn("PHP Sync warning:", err));
  };

  const updateTaskStatus = (id, newStatus) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
    apiService.updateTask(id, { status: newStatus }).catch(err => console.warn("PHP Sync warning:", err));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    apiService.deleteTask(id).catch(err => console.warn("PHP Sync warning:", err));
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
        vaultDeposits: effectiveVaultDeposits,
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
