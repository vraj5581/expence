import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';

const ExpenseContext = createContext();

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

const initialSettings = {
  currency: '₹',
  currencyCode: 'INR',
  companyName: 'Shukan Packaging',
  lowBalanceAlert: 5000,
  approvalThreshold: 20000
};

export const ExpenseProvider = ({ children }) => {
  const [vaultDeposits, setVaultDeposits] = useState([]);
  const [userAllocations, setUserAllocations] = useState({});
  const [allocationsHistory, setAllocationsHistory] = useState([]);
  const [debitTransactions, setDebitTransactions] = useState([]);
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [settings, setSettings] = useState(initialSettings);
  const [tasks, setTasks] = useState([]);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Edit Audit Logs State (Database Backed)
  const [editLogs, setEditLogs] = useState([]);

  // Auto-clear legacy localStorage on mount to ensure clean blank storage
  useEffect(() => {
    try {
      localStorage.clear();
    } catch (e) {}
  }, []);

  const recordEditLog = async (editorName, txnId, txnType, entrySummary, changeDetails, oldData = null) => {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const newLog = {
      id: `EDT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      editorName: editorName || 'Admin',
      txnId: txnId || 'N/A',
      txnType: txnType || 'Entry',
      entrySummary: entrySummary || 'Edited Entry',
      changeDetails: changeDetails || 'Updated entry details',
      date: formattedDate,
      time: formattedTime,
      createdAt: now.toISOString(),
      oldData: oldData ? (typeof oldData === 'string' ? oldData : JSON.stringify(oldData)) : null
    };

    setEditLogs(prev => [newLog, ...prev]);

    // Persist to MySQL database via API
    try {
      const res = await apiService.addAuditLog(newLog);
      if (!res || res.success === false) {
        console.error("Failed to save audit log to database:", res?.error || res?.message);
      }
    } catch (err) {
      console.error("Failed to save audit log to database:", err);
    }
  };

  const parseOldValuesFromLog = (log) => {
    if (!log) return null;
    if (log.oldData) {
      try {
        return typeof log.oldData === 'string' ? JSON.parse(log.oldData) : log.oldData;
      } catch (e) {}
    }

    const details = log.changeDetails || '';
    const parsed = {};

    const amountMatch = details.match(/Amount:\s*[^0-9]*([0-9,.]+)\s*➔/i);
    if (amountMatch) {
      parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    const statusMatch = details.match(/Status:\s*([A-Za-z]+)\s*➔/i);
    if (statusMatch) {
      parsed.status = statusMatch[1].trim();
    }

    const notesMatch = details.match(/Notes:\s*"([^"]*)"\s*➔/i);
    if (notesMatch) {
      parsed.description = notesMatch[1] === '-' ? '' : notesMatch[1];
      parsed.notes = parsed.description;
    }

    const userMatch = details.match(/User:\s*([^➔|]+)\s*➔/i);
    if (userMatch) {
      parsed.userName = userMatch[1].trim();
    }

    return parsed;
  };

  const revertAuditLog = async (log) => {
    if (!log) return { success: false, message: 'Invalid log record' };

    const oldValues = parseOldValuesFromLog(log);
    if (!oldValues || Object.keys(oldValues).length === 0) {
      return { success: false, message: 'Could not parse original values to revert' };
    }

    const targetTxnId = log.txnId;
    let res = null;

    if (log.txnType === 'Money Transfer') {
      res = await updateAllocation(targetTxnId, oldValues);
    } else {
      res = await updateTransaction(targetTxnId, oldValues);
    }

    if (res && res.success) {
      await deleteAuditLog(log.id);
      return { success: true, message: 'Successfully reverted edit and restored original entry values!' };
    }

    return { success: false, message: res?.message || 'Failed to revert entry in database' };
  };

  const updateAuditLog = async (id, updatedData) => {
    const res = await apiService.updateAuditLog(id, updatedData);
    if (!res || res.success === false) {
      return { success: false, message: res?.error || res?.message || 'Database error: Failed to update audit log' };
    }
    setEditLogs(prev => prev.map(log => log.id === id ? { ...log, ...updatedData } : log));
    return { success: true };
  };

  const deleteAuditLog = async (id) => {
    const res = await apiService.deleteAuditLog(id);
    if (!res || res.success === false) {
      return { success: false, message: res?.error || res?.message || 'Database error: Failed to delete audit log' };
    }
    setEditLogs(prev => prev.filter(log => log.id !== id));
    return { success: true };
  };

  const deleteLastMonthAuditLogs = async () => {
    const res = await apiService.deleteLastMonthAuditLogs();
    if (!res || res.success === false) {
      return { success: false, message: res?.error || res?.message || 'Database error: Failed to clear previous month audit logs' };
    }
    const currentMonthStart = new Date().toISOString().slice(0, 7) + '-01';
    setEditLogs(prev => prev.filter(log => log.date >= currentMonthStart));
    return { success: true };
  };

  // Fetch state from PHP backend database (Ultra-fast single request)
  const loadBackendData = async () => {
    setIsSyncing(true);
    try {
      // 1. Try single-request bulk bootstrap API (1 HTTP request instead of 8)
      const bootRes = await apiService.getBootstrapData();
      if (bootRes && bootRes.success) {
        if (Array.isArray(bootRes.debits)) setDebitTransactions(bootRes.debits);
        if (Array.isArray(bootRes.credits)) setCreditTransactions(bootRes.credits);
        if (Array.isArray(bootRes.vaultDeposits)) setVaultDeposits(bootRes.vaultDeposits);
        if (Array.isArray(bootRes.allocationsHistory)) setAllocationsHistory(bootRes.allocationsHistory);
        if (bootRes.userAllocations && typeof bootRes.userAllocations === 'object') setUserAllocations(bootRes.userAllocations);
        if (Array.isArray(bootRes.users) && bootRes.users.length > 0) setUsers(bootRes.users);
        if (bootRes.settings) setSettings(bootRes.settings);
        if (Array.isArray(bootRes.tasks)) setTasks(bootRes.tasks);
        if (Array.isArray(bootRes.auditLogs)) setEditLogs(bootRes.auditLogs);

        setIsDbConnected(true);
        setDbError(null);
        setLastSyncedAt(new Date());
      } else {
        // Fallback to parallel requests if bootstrap endpoint is unavailable
        const [debitRes, creditRes, depRes, alcRes, userRes, setRes, taskRes, auditRes] = await Promise.all([
          apiService.getDebits(),
          apiService.getCredits(),
          apiService.getVaultDeposits(),
          apiService.getAllocations(),
          apiService.getUsers(),
          apiService.getSettings(),
          apiService.getTasks(),
          apiService.getAuditLogs()
        ]);

        let backendErr = null;
        if (debitRes?.success && Array.isArray(debitRes.debits)) setDebitTransactions(debitRes.debits);
        else if (debitRes?.error) backendErr = debitRes.error;

        if (creditRes?.success && Array.isArray(creditRes.credits)) setCreditTransactions(creditRes.credits);
        if (depRes?.success && Array.isArray(depRes.vaultDeposits)) setVaultDeposits(depRes.vaultDeposits);
        if (alcRes?.success) {
          if (Array.isArray(alcRes.allocationsHistory)) setAllocationsHistory(alcRes.allocationsHistory);
          if (alcRes.userAllocations && typeof alcRes.userAllocations === 'object') setUserAllocations(alcRes.userAllocations);
        }
        if (userRes?.success && Array.isArray(userRes.users) && userRes.users.length > 0) setUsers(userRes.users);
        if (setRes?.success && setRes.settings) setSettings(setRes.settings);
        if (taskRes?.success && Array.isArray(taskRes.tasks)) setTasks(taskRes.tasks);
        if (auditRes?.success && Array.isArray(auditRes.auditLogs)) setEditLogs(auditRes.auditLogs);

        if (backendErr) {
          setIsDbConnected(false);
          setDbError(backendErr);
        } else {
          setIsDbConnected(true);
          setDbError(null);
        }
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.warn("Failed to load backend data:", err);
      setIsDbConnected(false);
      setDbError(err.message || "Cannot connect to PHP Database");
    } finally {
      setIsSyncing(false);
    }
  };

  // Merged view of all transactions for backward-compatible calculations
  const transactions = useMemo(() => {
    const debits = (debitTransactions || []).map(t => ({ ...t, type: 'Cash Out' }));
    const credits = (creditTransactions || []).map(t => ({ ...t, type: 'Cash In' }));
    return [...debits, ...credits].sort((a, b) => {
      const d = new Date(b.date) - new Date(a.date);
      return d !== 0 ? d : new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [debitTransactions, creditTransactions]);

  useEffect(() => {
    // Initial fetch
    loadBackendData();

    // Auto update background polling every 5 seconds
    const interval = setInterval(() => {
      loadBackendData();
    }, 5000);

    // Instant update on tab focus or window visibility
    const handleFocus = () => {
      loadBackendData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBackendData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

  // Calculate Admin Vault Balance dynamically: [ Total Done Cash Deposit - Total Allocated to Team - Total Company Direct Expenses ]
  const totalVaultDeposited = (effectiveVaultDeposits || []).reduce((sum, d) => sum + (parseFloat(d?.amount) || 0), 0);
  const totalDoneCashDeposit = (effectiveVaultDeposits || [])
    .filter(d => (!d?.depositTo || d?.depositTo === 'Company Wallet' || d?.depositTo === 'My Hand') && d?.status !== 'Due')
    .reduce((sum, d) => sum + (parseFloat(d?.amount) || 0), 0);

  const totalDoneDebit = (debitTransactions || [])
    .filter(t => t && t.status !== 'Due')
    .reduce((sum, t) => sum + (parseFloat(t?.amount) || 0), 0);

  const totalAllocatedToTeam = Object.values(userAllocations || {}).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  const totalCompanyDirectExpenses = (transactions || [])
    .filter(t => {
      if (!t || t.status === 'Due' || t.type === 'Cash In' || t.type === 'Credit') return false;
      const isCompany = t.userName === 'Shukan Company' || t.userName === 'Shukan Packaging (Company)' || t.userName === 'Company Vault';
      if (!isCompany) return false;
      const dep = (t.depositTo || 'Company Wallet').toLowerCase().trim();
      // Exclude Bank Debits from Company Vault cash reserve calculation
      return !dep.includes('bank');
    })
    .reduce((sum, t) => sum + (parseFloat(t?.amount) || 0), 0);

  const adminVaultBalance = totalDoneCashDeposit - totalAllocatedToTeam - totalCompanyDirectExpenses;

  // 1. ADD VAULT DEPOSIT (INSTANT OPTIMISTIC UPDATE)
  const addVaultDeposit = async (depositData) => {
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

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setVaultDeposits(prev => [newDeposit, ...prev]);

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.addVaultDeposit(newDeposit);
      if (!res || res.success === false) {
        setVaultDeposits(prev => prev.filter(d => d.id !== newDeposit.id));
        console.error("Failed to save deposit to database:", res?.error || res?.message);
      } else if (res.deposit && res.deposit.id && res.deposit.id !== newDeposit.id) {
        setVaultDeposits(prev => prev.map(d => d.id === newDeposit.id ? res.deposit : d));
      }
    })();

    return { success: true, deposit: newDeposit };
  };

  // 2. UPDATE VAULT DEPOSIT (INSTANT OPTIMISTIC UPDATE)
  const updateVaultDeposit = async (id, updatedData) => {
    const oldDep = vaultDeposits.find(d => d.id === id);
    const numAmount = parseFloat(updatedData.amount);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setVaultDeposits(prev => prev.map(d => (d.id === id ? {
      ...d,
      ...updatedData,
      amount: !isNaN(numAmount) ? numAmount : d.amount
    } : d)));

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.updateVaultDeposit(id, updatedData);
      if (!res || res.success === false) {
        if (oldDep) setVaultDeposits(prev => prev.map(d => d.id === id ? oldDep : d));
        console.error("Failed to update deposit in database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // 3. DELETE VAULT DEPOSIT (INSTANT OPTIMISTIC UPDATE)
  const deleteVaultDeposit = async (id) => {
    const oldDep = vaultDeposits.find(d => d.id === id);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setVaultDeposits(prev => prev.filter(d => d.id !== id));
    setEditLogs(prev => prev.filter(log => log.txnId !== id));

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.deleteVaultDeposit(id);
      if (!res || res.success === false) {
        if (oldDep) setVaultDeposits(prev => [oldDep, ...prev]);
        console.error("Failed to delete deposit from database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // Give Money / Allocate Cash to User (INSTANT OPTIMISTIC UPDATE)
  const allocateMoneyToUser = async (userName, amount, notes = '') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }
    if (adminVaultBalance < numAmount) {
      return {
        success: false,
        message: `Cannot give ${settings?.currency || '₹'}${numAmount}. Admin Vault has only ${settings?.currency || '₹'}${adminVaultBalance.toLocaleString()} available. Please click "Deposit" to add vault funds first!`
      };
    }

    const allocationLog = {
      id: `ALC-${Math.floor(1000 + Math.random() * 9000)}`,
      userName,
      type: 'User Transfer',
      amount: numAmount,
      date: new Date().toISOString().split('T')[0],
      notes: notes || ''
    };

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setUserAllocations(prev => ({
      ...prev,
      [userName]: (prev[userName] || 0) + numAmount
    }));
    setAllocationsHistory(prev => [allocationLog, ...prev]);

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.allocateMoney(allocationLog);
      if (!res || res.success === false) {
        setUserAllocations(prev => ({
          ...prev,
          [userName]: Math.max(0, (prev[userName] || 0) - numAmount)
        }));
        setAllocationsHistory(prev => prev.filter(a => a.id !== allocationLog.id));
        console.error("Failed to save allocation to database:", res?.error || res?.message);
      }
    })();

    return { success: true, allocationLog };
  };

  // UPDATE ALLOCATION (INSTANT OPTIMISTIC UPDATE)
  const updateAllocation = async (id, updatedData, editorName = null) => {
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
        message: `Cannot increase allocation by ${settings?.currency || '₹'}${diff}. Admin Vault has only ${settings?.currency || '₹'}${adminVaultBalance.toLocaleString()} available.`
      };
    }

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
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

    const finalEditor = editorName || updatedData.editorName || 'Admin';
    const oldAllocSnapshot = {
      amount: oldAlloc.amount,
      userName: oldAlloc.userName,
      notes: oldAlloc.notes || '',
      date: oldAlloc.date
    };

    // Non-blocking edit log persistence
    recordEditLog(
      finalEditor,
      id,
      'Money Transfer',
      `Transfer to ${updatedData.userName || oldAlloc.userName}: ${updatedData.notes || oldAlloc.notes || 'Petty Cash'} (${settings?.currency || '₹'}${newAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`,
      `Updated transfer amount: ${settings?.currency || '₹'}${oldAmount} ➔ ${settings?.currency || '₹'}${newAmount}`,
      oldAllocSnapshot
    );

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.updateAllocation(id, updatedData);
      if (!res || res.success === false) {
        setAllocationsHistory(prev => prev.map(a => a.id === id ? oldAlloc : a));
        console.error("Failed to update allocation in database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // DELETE ALLOCATION (INSTANT OPTIMISTIC UPDATE)
  const deleteAllocation = async (id) => {
    const targetAlloc = allocationsHistory.find(a => a.id === id);
    if (!targetAlloc) return { success: false, message: 'Allocation record not found' };

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setUserAllocations(prev => ({
      ...prev,
      [targetAlloc.userName]: Math.max(0, (prev[targetAlloc.userName] || 0) - targetAlloc.amount)
    }));
    setAllocationsHistory(prev => prev.filter(a => a.id !== id));
    setEditLogs(prev => prev.filter(log => log.txnId !== id));

    // Background HTTP Persistence
    (async () => {
      const res = await apiService.deleteAllocation(id);
      if (!res || res.success === false) {
        setUserAllocations(prev => ({
          ...prev,
          [targetAlloc.userName]: (prev[targetAlloc.userName] || 0) + targetAlloc.amount
        }));
        setAllocationsHistory(prev => [targetAlloc, ...prev]);
        console.error("Failed to delete allocation from database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // Helper to calculate user statistics (Allocated, Spent, Remaining)
  const getUserStats = (userName) => {
    if (userName === 'Shukan Company' || userName === 'Shukan Packaging (Company)' || userName === 'Company Vault') {
      return {
        allocated: totalDoneCashDeposit,
        spent: totalCompanyDirectExpenses,
        dueSpent: 0,
        cashInReceived: 0,
        totalCashAvailable: totalDoneCashDeposit,
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
    const needFromCompany = spent > totalCashAvailable ? (spent - totalCashAvailable) : 0;

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

  // Transaction CRUD — routes to debit or credit table based on type (INSTANT OPTIMISTIC UPDATE)
  const addTransaction = async (txnData) => {
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
          message: `Cannot record company expense. Company Vault balance is ${settings?.currency || '₹'}0.00. Please click "Deposit Vault" to add funds first!`
        };
      }
      if (adminVaultBalance < numAmount) {
        return {
          success: false,
          message: `Cannot record expense of ${settings?.currency || '₹'}${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Company Vault has only ${settings?.currency || '₹'}${adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} available. Please deposit vault funds first!`
        };
      }
    }

    const newTxn = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      status: txnData.status || 'Done',
      ...txnData,
      amount: numAmount
    };

    const isCredit = newTxn.type === 'Cash In' || newTxn.type === 'Credit';

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    if (isCredit) {
      setCreditTransactions(prev => [newTxn, ...prev]);
    } else {
      setDebitTransactions(prev => [newTxn, ...prev]);
    }

    // Background HTTP Persistence
    (async () => {
      const res = isCredit
        ? await apiService.addCredit(newTxn)
        : await apiService.addDebit(newTxn);

      if (!res || res.success === false) {
        if (isCredit) {
          setCreditTransactions(prev => prev.filter(t => t.id !== newTxn.id));
        } else {
          setDebitTransactions(prev => prev.filter(t => t.id !== newTxn.id));
        }
        console.error("Failed to save transaction to database:", res?.error || res?.message);
      } else if (res.credit || res.debit) {
        const savedTxn = res.credit || res.debit;
        if (savedTxn.id && savedTxn.id !== newTxn.id) {
          if (isCredit) {
            setCreditTransactions(prev => prev.map(t => t.id === newTxn.id ? savedTxn : t));
          } else {
            setDebitTransactions(prev => prev.map(t => t.id === newTxn.id ? savedTxn : t));
          }
        }
      }
    })();

    return { success: true, txn: newTxn };
  };

  // UPDATE TRANSACTION (INSTANT OPTIMISTIC UPDATE)
  const updateTransaction = async (id, updatedData, editorName = null) => {
    const oldTxn = transactions.find(t => t.id === id);
    if (!oldTxn) return { success: false, message: 'Transaction record not found' };

    const newAmount = parseFloat(updatedData.amount !== undefined ? updatedData.amount : oldTxn.amount);
    const newUserName = updatedData.userName || oldTxn.userName;
    const newStatus = updatedData.status !== undefined ? updatedData.status : oldTxn.status;
    const newDescription = updatedData.description !== undefined ? updatedData.description : oldTxn.description;

    const isCompanyTxn = newUserName === 'Shukan Company' || newUserName === 'Shukan Packaging (Company)' || newUserName === 'Company Vault';

    if (isCompanyTxn && newStatus !== 'Due') {
      const wasCompanyTxn = oldTxn.userName === 'Shukan Company' || oldTxn.userName === 'Shukan Packaging (Company)' || oldTxn.userName === 'Company Vault';
      const oldAmount = (wasCompanyTxn && oldTxn.status !== 'Due') ? oldTxn.amount : 0;
      const diff = newAmount - oldAmount;

      if (diff > 0 && adminVaultBalance < diff) {
        return {
          success: false,
          message: `Cannot update expense. Insufficient Company Vault balance (${settings?.currency || '₹'}${adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} available).`
        };
      }
    }

    const isCredit = (updatedData.type || oldTxn.type) === 'Cash In' || (updatedData.type || oldTxn.type) === 'Credit';
    const nextTxn = { ...oldTxn, ...updatedData, amount: newAmount, status: newStatus };

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    if (isCredit) {
      setCreditTransactions(prev => prev.map(t => t.id === id ? nextTxn : t));
    } else {
      setDebitTransactions(prev => prev.map(t => t.id === id ? nextTxn : t));
    }

    // Record Edit Audit Log (non-blocking)
    const changes = [];
    if (parseFloat(oldTxn.amount) !== parseFloat(newAmount)) changes.push(`Amount: ${settings?.currency || '₹'}${oldTxn.amount} ➔ ${settings?.currency || '₹'}${newAmount}`);
    if ((oldTxn.status || 'Done') !== newStatus) changes.push(`Status: ${oldTxn.status || 'Done'} ➔ ${newStatus}`);
    if ((oldTxn.description || '') !== newDescription) changes.push(`Notes: "${oldTxn.description || '-'}" ➔ "${newDescription || '-'}"`);
    if (oldTxn.userName !== newUserName) changes.push(`User: ${oldTxn.userName} ➔ ${newUserName}`);

    const activeUser = editorName || updatedData.editorName || oldTxn.userName || 'Admin';
    const oldTxnSnapshot = {
      amount: oldTxn.amount,
      status: oldTxn.status || 'Done',
      description: oldTxn.description || '',
      userName: oldTxn.userName,
      type: oldTxn.type,
      date: oldTxn.date
    };

    recordEditLog(
      activeUser,
      id,
      isCredit ? 'Credit' : 'Debit',
      `${newUserName}: ${newDescription || oldTxn.description || 'Entry'} (${settings?.currency || '₹'}${(parseFloat(newAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})`,
      changes.length > 0 ? changes.join(' | ') : 'Updated entry details',
      oldTxnSnapshot
    );

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

    // Background HTTP Persistence
    (async () => {
      const res = isCredit
        ? await apiService.updateCredit(id, { ...updatedData, amount: newAmount, status: newStatus })
        : await apiService.updateDebit(id, { ...updatedData, amount: newAmount, status: newStatus });

      if (!res || res.success === false) {
        if (isCredit) {
          setCreditTransactions(prev => prev.map(t => t.id === id ? oldTxn : t));
        } else {
          setDebitTransactions(prev => prev.map(t => t.id === id ? oldTxn : t));
        }
        console.error("Failed to update transaction in database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // DELETE TRANSACTION (INSTANT OPTIMISTIC UPDATE)
  const deleteTransaction = async (id) => {
    const oldTxn = transactions.find(t => t.id === id);
    if (!oldTxn) return { success: false, message: 'Transaction record not found' };

    const isCredit = oldTxn && (oldTxn.type === 'Cash In' || oldTxn.type === 'Credit');

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    if (isCredit && oldTxn.depositTo === 'Company Wallet') {
      setVaultDeposits(prev => prev.filter(d => d.txnId !== id && !(d.userName === oldTxn.userName && parseFloat(d.amount) === parseFloat(oldTxn.amount))));
    }
    if (isCredit) {
      setCreditTransactions(prev => prev.filter(t => t.id !== id));
    } else {
      setDebitTransactions(prev => prev.filter(t => t.id !== id));
    }
    setEditLogs(prev => prev.filter(log => log.txnId !== id));

    // Background HTTP Persistence
    (async () => {
      const res = isCredit
        ? await apiService.deleteCredit(id)
        : await apiService.deleteDebit(id);

      if (!res || res.success === false) {
        if (isCredit) {
          setCreditTransactions(prev => [oldTxn, ...prev]);
        } else {
          setDebitTransactions(prev => [oldTxn, ...prev]);
        }
        console.error("Failed to delete transaction from database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  // User CRUD (INSTANT OPTIMISTIC UPDATE)
  const addUser = async (userData) => {
    const newUser = {
      id: userData.id || `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.name,
      username: userData.username || userData.id || userData.name.toLowerCase(),
      password: userData.password || 'partner123',
      role: userData.role || 'Partner',
      status: userData.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setUsers(prev => [newUser, ...prev]);

    (async () => {
      const res = await apiService.addUser(newUser);
      if (!res || res.success === false) {
        setUsers(prev => prev.filter(u => u.id !== newUser.id));
        console.error("Failed to add user to database:", res?.error || res?.message);
      } else if (res.user && res.user.id && res.user.id !== newUser.id) {
        setUsers(prev => prev.map(u => u.id === newUser.id ? res.user : u));
      }
    })();

    return { success: true, user: newUser };
  };

  const updateUser = async (originalId, updatedData) => {
    const oldUser = users.find(u => u.id === originalId);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setUsers(prev => prev.map(u => (u.id === originalId ? { ...u, ...updatedData } : u)));

    (async () => {
      const res = await apiService.updateUser(originalId, updatedData);
      if (!res || res.success === false) {
        if (oldUser) setUsers(prev => prev.map(u => u.id === originalId ? oldUser : u));
        console.error("Failed to update user in database:", res?.error || res?.message);
      }
    })();

    return { success: true };
  };

  const deleteUser = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, message: 'User not found' };

    const userName = targetUser.name;
    const hasAllocations = (userAllocations[userName] || 0) > 0;
    const hasTransactions = transactions.some(t => t.userName === userName);

    if (hasAllocations || hasTransactions) {
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: 'Inactive', isDeleted: true } : u)));
      (async () => {
        await apiService.updateUser(id, { status: 'Inactive' });
      })();
    } else {
      setUsers(prev => prev.filter(u => u.id !== id));
      (async () => {
        const res = await apiService.deleteUser(id);
        if (!res || res.success === false) {
          setUsers(prev => [targetUser, ...prev]);
        }
      })();
    }
    return { success: true };
  };

  const toggleUserStatus = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return { success: false, message: 'User not found' };
    const nextStatus = targetUser.status === 'Active' ? 'Suspended' : 'Active';

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: nextStatus } : u)));

    (async () => {
      const res = await apiService.updateUser(id, { status: nextStatus });
      if (!res || res.success === false) {
        setUsers(prev => prev.map(u => u.id === id ? targetUser : u));
      }
    })();

    return { success: true };
  };

  // Settings (INSTANT OPTIMISTIC UPDATE)
  const updateSettings = async (newSettings) => {
    const oldSettings = settings;

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setSettings(prev => ({ ...prev, ...newSettings }));

    (async () => {
      const res = await apiService.updateSettings(newSettings);
      if (!res || res.success === false) {
        setSettings(oldSettings);
      }
    })();

    return { success: true };
  };

  // Task Management CRUD (INSTANT OPTIMISTIC UPDATE)
  const addTask = async (taskData) => {
    const newTask = {
      id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'General',
      assignedTo: taskData.assignedTo || 'Raj',
      ...taskData
    };

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setTasks(prev => [newTask, ...prev]);

    (async () => {
      const res = await apiService.addTask(newTask);
      if (!res || res.success === false) {
        setTasks(prev => prev.filter(t => t.id !== newTask.id));
      } else if (res.task && res.task.id && res.task.id !== newTask.id) {
        setTasks(prev => prev.map(t => t.id === newTask.id ? res.task : t));
      }
    })();

    return { success: true, task: newTask };
  };

  const updateTask = async (id, updatedData) => {
    const oldTask = tasks.find(t => t.id === id);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updatedData } : t)));

    (async () => {
      const res = await apiService.updateTask(id, updatedData);
      if (!res || res.success === false) {
        if (oldTask) setTasks(prev => prev.map(t => t.id === id ? oldTask : t));
      }
    })();

    return { success: true };
  };

  const updateTaskStatus = async (id, newStatus) => {
    const oldTask = tasks.find(t => t.id === id);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));

    (async () => {
      const res = await apiService.updateTask(id, { status: newStatus });
      if (!res || res.success === false) {
        if (oldTask) setTasks(prev => prev.map(t => t.id === id ? oldTask : t));
      }
    })();

    return { success: true };
  };

  const deleteTask = async (id) => {
    const oldTask = tasks.find(t => t.id === id);

    // ⚡ INSTANT OPTIMISTIC UI UPDATE
    setTasks(prev => prev.filter(t => t.id !== id));

    (async () => {
      const res = await apiService.deleteTask(id);
      if (!res || res.success === false) {
        if (oldTask) setTasks(prev => [oldTask, ...prev]);
      }
    })();

    return { success: true };
  };

  const totalCashIn = (creditTransactions || [])
    .filter(t => (t.status || 'Done') === 'Done')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalCashOut = (debitTransactions || [])
    .filter(t => (t.status || 'Done') === 'Done')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const netBalance = totalCashIn - totalCashOut;

  return (
    <ExpenseContext.Provider
      value={{
        adminVaultBalance,
        totalVaultDeposited,
        totalDoneCashDeposit,
        totalDoneDebit,
        vaultDeposits: effectiveVaultDeposits,
        isDepositDue,
        userAllocations,
        allocationsHistory,
        transactions,
        debitTransactions,
        creditTransactions,
        users,
        settings,
        tasks,
        totalAllocatedToTeam,
        totalCashIn,
        totalCashOut,
        netBalance,
        isDbConnected,
        dbError,
        isSyncing,
        lastSyncedAt,
        editLogs,
        recordEditLog,
        updateAuditLog,
        deleteAuditLog,
        revertAuditLog,
        deleteLastMonthAuditLogs,
        refetchData: loadBackendData,
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
