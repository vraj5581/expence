import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const shukanPartners = ['Vraj', 'Raj', 'Teerth', 'Mayank'];

const DepositAllocate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    adminVaultBalance,
    totalVaultDeposited,
    vaultDeposits,
    isDepositDue,
    allocationsHistory,
    transactions,
    users,
    settings,
    addVaultDeposit,
    updateVaultDeposit,
    deleteVaultDeposit,
    deleteTransaction,
    allocateMoneyToUser,
    updateAllocation,
    deleteAllocation,
    getUserStats
  } = useExpense();

  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(location.state?.selectedUser || 'All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedTxnForAction, setSelectedTxnForAction] = useState(null);
  const [selectedDepositType, setSelectedDepositType] = useState('All');

  const availableBanks = (settings?.banks || 'IOB Bank, BOB Bank')
    .split(',')
    .map(b => b.trim())
    .filter(Boolean);

  useEffect(() => {
    if (location.state?.selectedUser) {
      setSelectedUser(location.state.selectedUser);
    }
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();

  const handleOpenGiveMoneyModal = (targetUser = '', targetAmount = '') => {
    setEditingAllocation(null);
    const resolvedUser = typeof targetUser === 'string' && targetUser ? targetUser : (users[0]?.name || 'Raj');
    const resolvedAmount = targetAmount ? targetAmount.toString() : '';
    resetGive({
      userName: resolvedUser,
      amount: resolvedAmount,
      notes: ''
    });
    setIsGiveMoneyOpen(true);
  };

  const handleOpenEditAllocationModal = (alloc) => {
    setEditingAllocation(alloc);
    resetGive({
      userName: alloc.userName,
      amount: alloc.amount,
      notes: alloc.notes || alloc.purpose || ''
    });
    setIsGiveMoneyOpen(true);
  };

  const onGiveMoneySubmit = async (data) => {
    if (editingAllocation) {
      const res = await updateAllocation(editingAllocation.id, data);
      if (res && res.success) {
        toast.success(`Updated allocation for ${data.userName}!`, { theme: 'light' });
        setIsGiveMoneyOpen(false);
        resetGive();
      } else {
        toast.error(res?.message || 'Failed to update allocation in PHP database', { theme: 'light' });
      }
    } else {
      const res = await allocateMoneyToUser(data.userName, data.amount, data.notes);
      if (res && res.success) {
        toast.success(`Allocated ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
        setIsGiveMoneyOpen(false);
        resetGive();
      } else {
        toast.error(res?.message || 'Failed to save allocation in PHP database', { theme: 'light' });
      }
    }
  };

  const handleDeleteAllocation = async (alloc) => {
    if (window.confirm(`Are you sure you want to remove allocation of ${settings.currency}${alloc.amount} to ${alloc.userName}?`)) {
      const res = await deleteAllocation(alloc.id);
      if (res && res.success) {
        toast.info(`Allocation record removed.`, { theme: 'light' });
      } else {
        toast.error(res?.message || 'Failed to delete allocation from PHP database', { theme: 'light' });
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingDeposit(null);
    reset({
      date: new Date().toISOString().split('T')[0],
      userName: shukanPartners[0],
      depositTo: 'Company Wallet',
      amount: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deposit) => {
    setEditingDeposit(deposit);
    reset({
      date: deposit.date,
      userName: deposit.userName || shukanPartners[0],
      depositTo: deposit.depositTo || 'Company Wallet',
      amount: deposit.amount,
      notes: deposit.notes || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = async (data) => {
    const depositData = {
      ...data,
      userName: data.userName || editingDeposit?.userName || shukanPartners[0],
      depositTo: data.depositTo || 'Company Wallet'
    };
    if (editingDeposit) {
      const res = await updateVaultDeposit(editingDeposit.id, depositData);
      if (res && res.success) {
        toast.success(`Deposit entry for ${depositData.userName} updated!`, { theme: 'light' });
        setIsModalOpen(false);
        reset();
      } else {
        toast.error(res?.message || 'Failed to update deposit in PHP database', { theme: 'light' });
      }
    } else {
      const res = await addVaultDeposit(depositData);
      if (res && res.success) {
        toast.success(`Added ${settings.currency}${parseFloat(data.amount).toLocaleString()} from ${depositData.userName} to Vault!`, { theme: 'light' });
        setIsModalOpen(false);
        reset();
      } else {
        toast.error(res?.message || 'Failed to save deposit in PHP database', { theme: 'light' });
      }
    }
  };

  const handleDelete = async (deposit) => {
    if (window.confirm(`Are you sure you want to remove deposit record for ${deposit.userName || 'Partner'} (${settings.currency}${deposit.amount})?`)) {
      let res;
      if (deposit.isCreditTxn && deposit.txnId) {
        res = await deleteTransaction(deposit.txnId);
      } else {
        res = await deleteVaultDeposit(deposit.id);
      }
      if (res && res.success) {
        toast.info(`Deposit entry deleted`, { theme: 'light' });
      } else {
        toast.error(res?.message || 'Failed to delete deposit from PHP database', { theme: 'light' });
      }
    }
  };

  const getDynamicPdfTitle = () => {
    let userNamePart = '';
    if (selectedUser && selectedUser !== 'All') {
      const cleanUser = selectedUser.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      userNamePart = `_${cleanUser}`;
    }

    let datePart = '_ALL';
    if (startDate || endDate) {
      const s = startDate ? formatDate(startDate).replace(/\//g, '-') : 'START';
      const e = endDate ? formatDate(endDate).replace(/\//g, '-') : 'END';
      datePart = `_${s}_TO_${e}`;
    }

    return `Shukan${userNamePart}_Vault_Deposit_Report${datePart}`;
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = getDynamicPdfTitle();
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 250);
  };

  // Combine Vault Deposits (+ Add Money) and Allocations (Give Money to User)
  const activeVaultDepositsList = (vaultDeposits || []).filter(d => isDepositDue ? !isDepositDue(d) : d.status !== 'Due');

  const vaultBreakdown = useMemo(() => {
    let cashDeposited = 0;
    let bankDeposited = 0;

    activeVaultDepositsList.forEach(d => {
      const amt = parseFloat(d.amount) || 0;
      const dep = d.depositTo || 'Company Wallet';
      if (dep === 'Company Wallet' || dep === 'My Hand') {
        cashDeposited += amt;
      } else {
        bankDeposited += amt;
      }
    });

    return { cashDeposited, bankDeposited };
  }, [activeVaultDepositsList]);

  const totalUserRemaining = useMemo(() => {
    return (users || []).reduce((sum, u) => {
      const stats = getUserStats ? getUserStats(u.name) : null;
      const rem = stats?.remaining || 0;
      const need = stats?.needFromCompany || 0;
      return sum + (rem - need);
    }, 0);
  }, [users, getUserStats]);

  const getBankStats = (bankName) => {
    const cleanBank = (bankName || '').toLowerCase().trim();

    // 1. Total Credit (Vault deposits + Cash In/Credit transactions for this bank)
    const vaultCredits = (vaultDeposits || [])
      .filter(d => (isDepositDue ? !isDepositDue(d) : d.status !== 'Due'))
      .filter(d => (d.depositTo || '').toLowerCase().trim() === cleanBank)
      .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const directCredits = (transactions || [])
      .filter(t => (t.type === 'Cash In' || t.type === 'Credit') && (t.status || 'Done') === 'Done')
      .filter(t => (t.depositTo || t.account || '').toLowerCase().trim() === cleanBank)
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalCredit = vaultCredits + directCredits;

    // 2. Total Debit (Cash Out/Debit transactions paid from or linked to this bank)
    const totalDebit = (transactions || [])
      .filter(t => (t.type !== 'Cash In' && t.type !== 'Credit') && (t.status || 'Done') === 'Done')
      .filter(t => {
        const dep = (t.depositTo || t.account || t.paymentMethod || t.bankName || '').toLowerCase().trim();
        return dep === cleanBank || (dep.includes('bank') && cleanBank.includes(dep));
      })
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // 3. Available Reserve
    const availableReserve = Math.max(0, totalCredit - totalDebit);

    return { totalCredit, totalDebit, availableReserve };
  };

  const bankDepositsBreakdown = useMemo(() => {
    const map = {};
    availableBanks.forEach(b => {
      map[b] = 0;
    });

    activeVaultDepositsList.forEach(d => {
      const amt = parseFloat(d.amount) || 0;
      const dep = d.depositTo || 'Company Wallet';
      if (dep !== 'Company Wallet' && dep !== 'My Hand') {
        map[dep] = (map[dep] || 0) + amt;
      }
    });

    return map;
  }, [activeVaultDepositsList, availableBanks]);
  const formattedVaultDeposits = activeVaultDepositsList.map((d) => ({
    id: d.id || `DEP-${Math.random()}`,
    date: d.date || new Date().toISOString().split('T')[0],
    userName: (d.userName && d.userName !== 'Shukan Admin') ? d.userName : 'Vraj',
    depositTo: d.depositTo || 'Company Wallet',
    amount: parseFloat(d.amount) || 0,
    notes: d.notes ? d.notes.replace(/Admin Capital/g, 'Company Capital') : 'Company Capital Deposit',
    txnCategory: 'Add Money',
    rawItem: d
  }));

  const formattedAllocations = (allocationsHistory || []).map((a) => ({
    id: a.id || `ALC-${Math.random()}`,
    date: a.date || new Date().toISOString().split('T')[0],
    userName: a.userName || 'Staff',
    amount: parseFloat(a.amount) || 0,
    notes: a.notes ? a.notes.replace(/Admin allocated/g, 'Company allocated') : (a.purpose || 'Petty Cash Allowance'),
    txnCategory: 'Give Money',
    rawItem: a
  }));

  const combinedList = [...formattedVaultDeposits, ...formattedAllocations].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  const hasActiveFilters = Boolean(selectedUser !== 'All' || selectedDepositType !== 'All' || startDate || endDate);

  const filteredTransactions = combinedList.filter((t) => {
    if (!t) return false;
    if (activeTab === 'Add Money' && t.txnCategory !== 'Add Money') return false;
    if (activeTab === 'Give Money' && t.txnCategory !== 'Give Money') return false;
    if (selectedUser !== 'All' && t.userName !== selectedUser) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    if (selectedDepositType === 'Cash') {
      if (t.txnCategory !== 'Add Money') return false;
      const dep = t.depositTo || 'Company Wallet';
      if (dep !== 'Company Wallet' && dep !== 'My Hand') return false;
    } else if (selectedDepositType === 'Bank') {
      if (t.txnCategory !== 'Add Money') return false;
      const dep = t.depositTo || 'Company Wallet';
      if (dep === 'Company Wallet' || dep === 'My Hand') return false;
    }

    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      (t.userName || '').toLowerCase().includes(query) ||
      (t.notes || '').toLowerCase().includes(query) ||
      (t.depositTo || '').toLowerCase().includes(query) ||
      (t.txnCategory || '').toLowerCase().includes(query) ||
      (t.date || '').includes(query) ||
      formatDate(t.date).includes(query)
    );
  });

  const totalFilteredDeposits = useMemo(() => {
    return filteredTransactions
      .filter(t => t.txnCategory === 'Add Money')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredAllocations = useMemo(() => {
    return filteredTransactions
      .filter(t => t.txnCategory === 'Give Money')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const printFilterSummaryText = useMemo(() => {
    const parts = [];
    if (selectedUser !== 'All') parts.push(`USER: ${selectedUser}`);
    if (selectedDepositType !== 'All') parts.push(`ACCOUNT: ${selectedDepositType === 'Cash' ? 'CASH (COMPANY WALLET)' : 'BANK ACCOUNTS'}`);
    if (activeTab !== 'All') parts.push(`TYPE: ${activeTab === 'Add Money' ? 'DEPOSIT' : 'ALLOCATION'}`);
    if (startDate || endDate) {
      const s = startDate ? formatDate(startDate) : 'START';
      const e = endDate ? formatDate(endDate) : 'TODAY';
      parts.push(`DATE: ${s} TO ${e}`);
    }
    if (searchTerm.trim()) parts.push(`SEARCH: "${searchTerm.trim()}"`);
    return parts.length > 0 ? parts.join(' | ') : 'ALL RECORDED TRANSACTIONS';
  }, [selectedUser, selectedDepositType, activeTab, startDate, endDate, searchTerm]);

  return (
    <div className="space-y-6">

      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            Deposit & Allocate 
          </h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Deposit
          </button>

          <button
            onClick={handleOpenGiveMoneyModal}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-[#e6b875] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Allocate
          </button>

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-[#002B49] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Active Filter Indicator Banner */}
      {hasActiveFilters && (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-[#c69255]/30 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2 text-slate-800">
            <span className="font-extrabold text-[#002B49] flex items-center">
              <svg className="w-4 h-4 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Active Filter:
            </span>
            {selectedUser !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#002B49] text-white font-bold">
                User: {selectedUser}
              </span>
            )}
            {selectedDepositType !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-bold">
                Deposit Account: {selectedDepositType === 'Cash' ? '💵 Cash Deposits' : '🏦 Bank Deposits'}
              </span>
            )}
            {activeTab !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#c69255] text-white font-bold">
                Type: {activeTab === 'Add Money' ? 'Deposit' : 'Allocate'}
              </span>
            )}
            {(startDate || endDate) && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                Date: {startDate || 'Beginning'} to {endDate || 'Today'}
              </span>
            )}
            {searchTerm && (
              <span className="px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                Search: "{searchTerm}"
              </span>
            )}
          </div>
          <button
            onClick={() => { setSelectedUser('All'); setActiveTab('All'); setSelectedDepositType('All'); setStartDate(''); setEndDate(''); setSearchTerm(''); }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:gap-4 print:hidden">
        {/* CARD 1: TOTAL CASH REMAINING (Master Reserve + User Remaining Balance) */}
        {(() => {
          const totalNetCash = (adminVaultBalance || 0) + totalUserRemaining;
          const isNetPositive = totalNetCash >= 0;
          const isUserPositive = totalUserRemaining >= 0;

          return (
            <div className={`glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-l-3 sm:border-l-4 shadow-xs flex flex-col justify-between transition-all ${
              isNetPositive
                ? 'border-l-emerald-500 bg-emerald-50/40 border border-emerald-200/80'
                : 'border-l-rose-500 bg-rose-50/40 border border-rose-200/80'
            }`}>
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2 mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isNetPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    💵
                  </div>
                  <p className="text-[11px] sm:text-xs uppercase font-black tracking-wider text-slate-800 truncate">
                    Total Cash Remaining
                  </p>
                </div>
                <span className={`text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg border shadow-2xs whitespace-nowrap shrink-0 ${
                  isNetPositive
                    ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                    : 'bg-rose-100/90 text-rose-800 border-rose-300'
                }`}>
                  {totalNetCash < 0 ? '-' : ''}{settings?.currency || '₹'}{Math.abs(totalNetCash).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-bold">
                {/* Master Reserve Row */}
                <div className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-blue-50/80 border border-blue-200/80 transition">
                  <span className="text-blue-900 font-bold text-[10.5px] sm:text-xs">🏛️ Master Vault Reserve:</span>
                  <span className="text-[#002B49] font-extrabold text-xs sm:text-sm">
                    {settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* User Remaining (Balance - Need) Row with Dynamic Light Green (Plus) / Light Red (Minus) Background */}
                <div className={`flex items-center justify-between p-1.5 px-2 rounded-lg border transition ${
                  isUserPositive
                    ? 'bg-emerald-100/90 border-emerald-200/90 text-emerald-900'
                    : 'bg-rose-100/90 border-rose-200/90 text-rose-900'
                }`}>
                  <span className="font-extrabold text-[10.5px] sm:text-xs">
                    ✋ User Remaining:
                  </span>
                  <span className={`font-black text-xs sm:text-sm ${
                    isUserPositive ? 'text-emerald-800' : 'text-rose-700'
                  }`}>
                    {totalUserRemaining < 0 ? '-' : ''}{settings?.currency || '₹'}{Math.abs(totalUserRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* CARD 2: DEPOSIT BREAKDOWN (CASH, BANK & TOTAL DEPOSITED) */}
        <div className="glass-card p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#c69255] print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-1.5">
            <p className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-700 truncate print:text-[10px] print:text-slate-800">Deposit Breakdown</p>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">{activeVaultDepositsList.length} Entries</span>
          </div>
          <div className="space-y-1 text-xs font-bold text-slate-800">
            <div
              onClick={() => { setSelectedDepositType('Cash'); setActiveTab('Add Money'); }}
              className={`flex items-center justify-between p-1 px-1.5 rounded-lg transition cursor-pointer hover:bg-emerald-100/70 ${selectedDepositType === 'Cash' ? 'bg-emerald-100/90 ring-1 ring-emerald-500/50 font-black' : ''}`}
              title="Click to view Cash Deposits"
            >
              <span className="text-slate-700 font-semibold text-[11px] sm:text-xs">💵 Total Cash Deposit:</span>
              <span className="text-emerald-700 font-extrabold">{settings?.currency || '₹'}{vaultBreakdown.cashDeposited.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div
              onClick={() => { setSelectedDepositType('Bank'); setActiveTab('Add Money'); }}
              className={`flex items-center justify-between p-1 px-1.5 rounded-lg transition cursor-pointer hover:bg-indigo-100/70 ${selectedDepositType === 'Bank' ? 'bg-indigo-100/90 ring-1 ring-indigo-500/50 font-black' : ''}`}
              title="Click to view Bank Deposits"
            >
              <span className="text-slate-700 font-semibold text-[11px] sm:text-xs">🏦 Total Bank Deposit:</span>
              <span className="text-indigo-700 font-extrabold">{settings?.currency || '₹'}{vaultBreakdown.bankDeposited.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div
              onClick={() => { setSelectedDepositType('All'); setActiveTab('Add Money'); }}
              className={`flex items-center justify-between p-1 px-1.5 rounded-lg transition cursor-pointer hover:bg-amber-100/70 pt-1 border-t border-slate-200/80 ${selectedDepositType === 'All' && activeTab === 'Add Money' ? 'bg-amber-100/90 ring-1 ring-amber-500/50 font-black' : ''}`}
              title="Click to view All Deposits"
            >
              <span className="text-[#002B49] font-black text-xs sm:text-sm">📥 Total Deposited:</span>
              <span className="text-[#9e6e34] font-black text-xs sm:text-sm">{settings?.currency || '₹'}{(totalVaultDeposited || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARATE BANK CARDS SECTION (COMPACT TABLE-STYLE MATCHING CREDIT/DEBIT CARDS) */}
      <div className="space-y-2.5 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
              <svg className="w-3.5 h-3.5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10zm3 0v11m4-11v11m4-11v11" />
              </svg>
            </div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#002B49]">
              Bank Accounts ({availableBanks.length})
            </h2>
          </div>
          <span className="text-[11px] font-extrabold text-slate-500">
            Total Bank Reserve: {settings?.currency || '₹'}{vaultBreakdown.bankDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-4">
          {availableBanks.map((bName) => {
            const bStats = getBankStats(bName);
            const isSelected = searchTerm.toLowerCase() === bName.toLowerCase();

            return (
              <div
                key={bName}
                className={`h-full bg-indigo-50/70 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-200/90 border-t-3 sm:border-t-4 border-t-indigo-600 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2 ${
                  isSelected ? 'ring-2 ring-indigo-500 bg-indigo-100/90' : ''
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-indigo-200/60 pb-1 sm:pb-1.5">
                  <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 print:hidden">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10zm3 0v11m4-11v11m4-11v11" />
                      </svg>
                    </div>
                    <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-indigo-900 truncate">{bName}</h3>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-800 uppercase shrink-0 print:hidden">Bank</span>
                </div>

                {/* Table-Style Content Rows */}
                <div className="divide-y divide-indigo-200/50 text-[9.5px] sm:text-xs">
                  {/* Row 1: Total Credit */}
                  <div
                    onClick={() => {
                      navigate('/admin/credit-debit', {
                        state: {
                          selectedUser: 'All',
                          typeFilter: 'Credit',
                          depositToFilter: bName,
                          statusFilter: 'Done'
                        }
                      });
                    }}
                    className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-indigo-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                    title={`Click to view Credit entries for ${bName}`}
                  >
                    <span className="text-indigo-900 font-semibold truncate mr-1">Total Credit</span>
                    <span className="font-extrabold text-emerald-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">
                      {settings?.currency || '₹'}{bStats.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Row 2: Total Debit */}
                  <div
                    onClick={() => {
                      navigate('/admin/credit-debit', {
                        state: {
                          selectedUser: 'All',
                          typeFilter: 'Debit',
                          depositToFilter: bName,
                          statusFilter: 'Done'
                        }
                      });
                    }}
                    className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-indigo-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                    title={`Click to view Debit entries for ${bName}`}
                  >
                    <span className="text-indigo-900 font-semibold truncate mr-1">Total Debit</span>
                    <span className="font-extrabold text-rose-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">
                      {settings?.currency || '₹'}{bStats.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Row 3: Available Reserve */}
                  <div
                    onClick={() => {
                      navigate('/admin/credit-debit', {
                        state: {
                          selectedUser: 'All',
                          typeFilter: 'Credit',
                          depositToFilter: bName,
                          statusFilter: 'All'
                        }
                      });
                    }}
                    className="pt-1 flex items-center justify-between font-black text-indigo-950 cursor-pointer hover:bg-indigo-100/70 px-0.5 sm:px-1 rounded-md transition min-w-0"
                    title={`Click to open all entries for ${bName}`}
                  >
                    <span className="truncate mr-1">Available</span>
                    <span className="text-[10.5px] sm:text-sm whitespace-nowrap shrink-0">
                      {settings?.currency || '₹'}{bStats.availableReserve.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Balances & Status Bar (Shows All Users!) */}
      {(() => {
        const teamUsers = (users || []).filter(u => u && u.id !== 'admin');
        if (teamUsers.length === 0) return null;
        
        const totalNeeded = teamUsers.reduce((sum, u) => sum + (getUserStats(u.name)?.needFromCompany || 0), 0);
        const totalInHand = teamUsers.reduce((sum, u) => sum + Math.max(0, getUserStats(u.name)?.remaining || 0), 0);

        return (
          <div className="glass-card p-3 sm:p-4 rounded-2xl print:hidden shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-[#002B49]/10 flex items-center justify-center text-[#002B49] shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#002B49]">
                  Team Balances
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-extrabold flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 border border-emerald-300 shadow-2xs">
                  Team In Hand: {(settings?.currency || '₹')}{(totalInHand || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {totalNeeded > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-800 border border-rose-300 shadow-2xs">
                    Due: {(settings?.currency || '₹')}{(totalNeeded || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
              {teamUsers.map(u => {
                const s = getUserStats(u.name) || {};
                const isNeed = (s.needFromCompany || 0) > 0;
                const hasBal = (s.remaining || 0) > 0;

                return (
                  <button
                    key={u.id}
                    onClick={() => handleOpenGiveMoneyModal(u.name, isNeed ? s.needFromCompany : '')}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer whitespace-nowrap shrink-0 ${
                      isNeed
                        ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-600 hover:text-white'
                        : hasBal
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-[#002B49] hover:text-white'
                    }`}
                    title={`Click to allocate money to ${u.name}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      isNeed
                        ? 'bg-rose-200 text-rose-800'
                        : hasBal
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {(u.name || 'U').charAt(0)}
                    </span>
                    <span>{u.name}</span>
                    <span className="font-extrabold">
                      {isNeed
                        ? `Need: +${settings?.currency || '₹'}${s.needFromCompany?.toLocaleString('en-IN') || 0}`
                        : `Bal: ${settings?.currency || '₹'}${s.remaining?.toLocaleString('en-IN') || 0}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          {[
            { id: 'All', label: 'All Transactions' },
            { id: 'Add Money', label: 'Deposit' },
            { id: 'Give Money', label: 'Allocate' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none px-2.5 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#c69255] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Name or Description..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
              hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 mr-1.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">●</span>}
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30">
                  <svg className="w-5 h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Transactions</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine deposits & allocations by criteria</p>
                </div>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Category Type</label>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Transactions (Deposits & Allocations)</option>
                  <option value="Add Money">Deposit (Vault Capital)</option>
                  <option value="Give Money">Allocate (User Transfer)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Select User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      if (endDate && val > endDate) setEndDate('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndDate(val);
                      if (startDate && val < startDate) setStartDate('');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { setSelectedUser('All'); setStartDate(''); setEndDate(''); setActiveTab('All'); setSearchTerm(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-3.5 sm:p-6 rounded-xl sm:rounded-2xl print:hidden">
        {/* Mobile Compact Line-by-Line Table View */}
        <div className="block md:hidden print:hidden">
          {filteredTransactions.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs font-medium bg-white/80 rounded-xl border border-slate-200">
              No transaction entries match your criteria.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  <thead className="text-[10px] uppercase bg-slate-100 text-[#002B49] sticky top-0 z-10 border-b border-slate-200 shadow-2xs font-extrabold">
                    <tr>
                      <th className="py-2 px-1 font-black w-6 text-center">#</th>
                      <th className="py-2 px-1 font-black">Type, User, Date & Notes</th>
                      <th className="py-2 px-1 font-black text-right w-24">Amount</th>
                      <th className="py-2 px-1 font-black text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {filteredTransactions.map((t, index) => (
                      <tr
                        key={t.id || index}
                        onClick={() => setSelectedTxnForAction(t)}
                        className="hover:bg-slate-100/80 active:bg-slate-200 transition odd:bg-white even:bg-slate-50/30 cursor-pointer"
                        title="Click entry to view details & options"
                      >
                        <td className="py-2.5 px-1 font-bold text-slate-400 text-center align-middle text-[10px] truncate">{index + 1}</td>
                        <td className="py-2.5 px-1 align-middle min-w-0">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center space-x-1 min-w-0">
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold uppercase shrink-0 ${
                                t.txnCategory === 'Add Money'
                                  ? 'bg-amber-100 text-[#9e6e34] border border-amber-300'
                                  : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                              }`}>
                                {t.txnCategory === 'Add Money' ? 'Deposit' : 'Allocate'}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#002B49] truncate">{t.userName}</span>
                              <span className="text-[9.5px] font-bold text-slate-400 shrink-0">• {formatDate(t.date)}</span>
                            </div>
                            <span className="text-[10.5px] font-semibold text-slate-600 truncate leading-tight mt-0.5">{t.notes || '-'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 font-black text-right whitespace-nowrap align-middle text-[11px]">
                          <span className={t.txnCategory === 'Add Money' ? 'text-[#9e6e34]' : 'text-[#002B49]'}>
                            {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 px-1 text-center align-middle">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-[#002B49] text-slate-600 hover:text-white font-extrabold text-[10px] border border-slate-200 transition inline-block">
                            Options
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filteredTransactions.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold text-xs text-[#002B49] border-t-2 border-slate-300 sticky bottom-0 z-10 shadow-xs">
                      {(activeTab === 'All' || activeTab === 'Add Money') && totalFilteredDeposits > 0 && (
                        <tr>
                          <td colSpan="2" className="py-2 px-3 text-right uppercase tracking-wider font-extrabold text-[11px] text-[#9e6e34]">
                            Total Deposited:
                          </td>
                          <td className="py-2 px-2 text-right font-black text-[#9e6e34] text-xs whitespace-nowrap">
                            {settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-1"></td>
                        </tr>
                      )}
                      {(activeTab === 'All' || activeTab === 'Give Money') && totalFilteredAllocations > 0 && (
                        <tr>
                          <td colSpan="2" className="py-2 px-3 text-right uppercase tracking-wider font-extrabold text-[11px] text-[#002B49]">
                            Total Allocated:
                          </td>
                          <td className="py-2 px-2 text-right font-black text-[#002B49] text-xs whitespace-nowrap">
                            {settings?.currency || '₹'}{totalFilteredAllocations.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-1"></td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Name / User</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Description / Purpose</th>
                <th className="py-3 px-4 text-right font-bold print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No transaction entries found. Click "Deposit" or "Allocate" to record entries.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-semibold">{formatDate(t.date)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          t.txnCategory === 'Add Money'
                            ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                            : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                        }`}
                      >
                        {t.txnCategory === 'Add Money' ? 'Deposit' : 'Allocate'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className={`py-3.5 px-4 font-bold ${t.txnCategory === 'Add Money' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {settings?.currency || '₹'}{(parseFloat(t.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 print:hidden">
                      {t.txnCategory === 'Add Money' ? (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(t.rawItem)}
                            title="Edit Deposit Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.rawItem)}
                            title="Delete Deposit Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEditAllocationModal(t.rawItem)}
                            title="Edit Allocation Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAllocation(t.rawItem)}
                            title="Delete Allocation Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-xs text-[#002B49] border-t-2 border-slate-300 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                {(activeTab === 'All' || activeTab === 'Add Money') && totalFilteredDeposits > 0 && (
                  <tr>
                    <td colSpan="4" className="py-2.5 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black font-extrabold text-[#9e6e34]">
                      Total Deposited:
                    </td>
                    <td className="py-2.5 px-4 font-black text-[#9e6e34] text-sm print:py-2 print:px-2 print:border print:border-black whitespace-nowrap">
                      {settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan="2" className="py-2.5 px-4 print:py-2 print:px-2 print:border print:border-black"></td>
                  </tr>
                )}
                {(activeTab === 'All' || activeTab === 'Give Money') && totalFilteredAllocations > 0 && (
                  <tr>
                    <td colSpan="4" className="py-2.5 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black font-extrabold text-[#002B49]">
                      Total Allocated:
                    </td>
                    <td className="py-2.5 px-4 font-black text-[#002B49] text-sm print:py-2 print:px-2 print:border print:border-black whitespace-nowrap">
                      {settings?.currency || '₹'}{totalFilteredAllocations.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan="2" className="py-2.5 px-4 print:py-2 print:px-2 print:border print:border-black"></td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Money Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-6">
              {editingDeposit ? 'Edit Deposit Entry' : 'Deposit to Vault'}
            </h3>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Date</label>
                <input
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Deposit By</label>
                <select
                  {...register('userName', { required: 'Deposit By is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {shukanPartners.map((partner) => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
                {errors.userName && <p className="text-xs text-rose-500 mt-1">{errors.userName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Deposit To</label>
                <select
                  {...register('depositTo')}
                  defaultValue="Company Wallet"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Company Wallet">🏢 Company Wallet</option>
                  {availableBanks.map((b) => (
                    <option key={b} value={b}>🏦 {b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2000"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe deposit details (e.g. Capital Top-up)..."
                  {...register('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md"
                >
                  {editingDeposit ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIVE MONEY TO USER MODAL */}
      {isGiveMoneyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsGiveMoneyOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">
              {editingAllocation ? 'Edit Allocation' : 'Allocate to User'}
            </h3>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Available Company Vault Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{adminVaultBalance.toLocaleString()}</span>
            </div>

            <form onSubmit={subGive(onGiveMoneySubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Select User</label>
                <select
                  {...regGive('userName', { required: 'Please select a user' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {users.map((u) => {
                    const stats = getUserStats(u.name);
                    return (
                      <option key={u.id} value={u.name}>
                        {u.name} (Current Balance: {settings.currency}{stats.remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
                {errGive.userName && <p className="text-xs text-rose-500 mt-1">{errGive.userName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount to Give ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  {...regGive('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errGive.amount && <p className="text-xs text-rose-500 mt-1">{errGive.amount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Factory petty cash advance"
                  {...regGive('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGiveMoneyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437]"
                >
                  {editingAllocation ? 'Update Allocation' : 'Transfer Money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Entry Action Modal Pop-up (Click Any Row) */}
      {selectedTxnForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-fadeIn">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                selectedTxnForAction.txnCategory === 'Add Money'
                  ? 'bg-amber-100 text-[#9e6e34] border border-amber-300'
                  : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
              }`}>
                {selectedTxnForAction.txnCategory === 'Add Money' ? 'Deposit Entry' : 'Allocation Entry'}
              </span>
              <button
                onClick={() => setSelectedTxnForAction(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Entry Details */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User / Partner</span>
                  <span className="text-base font-extrabold text-[#002B49]">{selectedTxnForAction.userName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                  <span className="text-xs font-bold text-slate-700">{formatDate(selectedTxnForAction.date)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount</span>
                <span className={`text-lg font-black ${selectedTxnForAction.txnCategory === 'Add Money' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                  {settings.currency}{(parseFloat(selectedTxnForAction.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {selectedTxnForAction.notes && (
                <div className="pt-2 border-t border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Description / Purpose</span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">
                    {selectedTxnForAction.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons: Edit & Delete */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const rawItem = selectedTxnForAction.rawItem;
                  const category = selectedTxnForAction.txnCategory;
                  setSelectedTxnForAction(null);
                  if (category === 'Add Money') {
                    handleOpenEditModal(rawItem);
                  } else {
                    handleOpenEditAllocationModal(rawItem);
                  }
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>Edit Record</span>
              </button>

              <button
                onClick={() => {
                  const rawItem = selectedTxnForAction.rawItem;
                  const category = selectedTxnForAction.txnCategory;
                  setSelectedTxnForAction(null);
                  if (category === 'Add Money') {
                    handleDelete(rawItem);
                  } else {
                    handleDeleteAllocation(rawItem);
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedTxnForAction(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🖨️ PURE BLACK & WHITE A4 PRINTABLE REPORT CONTAINER     */}
      {/* ======================================================== */}
      <div className="hidden print:block print-ledger-report">
        {/* 1. Header */}
        <div className="border-b-2 border-black pb-2 mb-3 text-center print-header">
          <h1 className="text-xl font-black uppercase text-black tracking-wider">
            {settings?.companyName || 'SHUKAN PACKAGING'}
          </h1>
          <h2 className="text-xs font-bold text-black uppercase mt-0.5">
            COMPANY VAULT DEPOSIT & ALLOCATION STATEMENT
          </h2>
          <div className="text-[8pt] font-semibold text-black mt-1 flex items-center justify-between border-t border-black pt-1">
            <span>PRINTED: {formatDate(new Date())}</span>
            <span>FILTER: {printFilterSummaryText}</span>
            <span>ENTRIES: {filteredTransactions.length}</span>
          </div>
        </div>

        {/* 2. Print Summary Cards Grid */}
        <div className="credit-summary-print-wrapper mb-3">
          <div className="grid grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4mm' }}>
            {/* CARD 1: COMPANY VAULT */}
            <div className="print-card">
              <div className="card-title">
                COMPANY VAULT
              </div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Available Reserve</span>
                  <span className="card-value">{settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">VAULT CASH BALANCE</span>
                <span className="card-value">{settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* CARD 2: DEPOSIT BREAKDOWN */}
            <div className="print-card">
              <div className="card-title">
                DEPOSIT BREAKDOWN
              </div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Cash Deposit</span>
                  <span className="card-value">{settings?.currency || '₹'}{vaultBreakdown.cashDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card-row">
                  <span className="card-label">Bank Deposit</span>
                  <span className="card-value">{settings?.currency || '₹'}{vaultBreakdown.bankDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">TOTAL DEPOSITED</span>
                <span className="card-value">{settings?.currency || '₹'}{(totalVaultDeposited || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* CARD 3: BANK WISE BREAKDOWN */}
            <div className="print-card">
              <div className="card-title">
                BANK WISE BREAKDOWN
              </div>
              <div className="card-body">
                {Object.entries(bankDepositsBreakdown).map(([bName, bAmt]) => (
                  <div key={bName} className="card-row">
                    <span className="card-label">{bName}</span>
                    <span className="card-value">{settings?.currency || '₹'}{bAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="card-total">
                <span className="card-label">TOTAL BANK</span>
                <span className="card-value">{settings?.currency || '₹'}{vaultBreakdown.bankDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Printable Transactions Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }} className="sr-cell">SR. NO.</th>
              <th style={{ width: '12%' }} className="date-cell">DATE</th>
              <th style={{ width: '12%' }} className="type-cell">TYPE</th>
              <th style={{ width: '16%' }} className="user-cell">NAME / USER</th>
              <th style={{ width: '18%' }} className="account-cell">DEPOSIT TO / ACC</th>
              <th className="description-cell">DESCRIPTION / PURPOSE</th>
              <th style={{ width: '16%' }} className="amount-cell text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 font-semibold text-xs">
                  No deposit or allocation entries match the selected filter criteria.
                </td>
              </tr>
            ) : (
              <>
                {filteredTransactions.map((t, index) => (
                  <tr key={t.id || index}>
                    <td className="sr-cell text-center">{index + 1}</td>
                    <td className="date-cell">{formatDate(t.date)}</td>
                    <td className="type-cell font-bold">{t.txnCategory === 'Add Money' ? 'DEPOSIT' : 'ALLOCATE'}</td>
                    <td className="user-cell font-bold">{t.userName}</td>
                    <td className="account-cell">{t.txnCategory === 'Add Money' ? (t.depositTo || 'Company Wallet') : 'User Hand'}</td>
                    <td className="description-cell">{t.notes || '-'}</td>
                    <td className="amount-cell text-right font-bold">
                      {settings?.currency || '₹'}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Table Total Footer Row */}
                <tr className="print-total-row border-t-2 border-black font-bold">
                  <td colSpan={6} className="text-right py-2 px-2 uppercase font-black">
                    TOTAL FILTERED STATEMENT:
                  </td>
                  <td className="text-right py-2 px-2 font-black">
                    {settings?.currency || '₹'}{(totalFilteredDeposits + totalFilteredAllocations).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepositAllocate;
