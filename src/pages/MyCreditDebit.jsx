import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const MyCreditDebit = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    transactions,
    allocationsHistory,
    settings,
    getUserStats,
    addTransaction,
    updateTransaction,
    addVaultDeposit
  } = useExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    location.state?.statusFilter || location.state?.selectedStatus || 'All'
  );
  const [typeFilter, setTypeFilter] = useState(
    location.state?.typeFilter || location.state?.selectedType || 'All'
  );
  const [depositToFilter, setDepositToFilter] = useState(
    location.state?.depositToFilter || location.state?.selectedDepositTo || 'All'
  );
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const filterFromState = location.state?.statusFilter || location.state?.selectedStatus;
    if (filterFromState !== undefined) {
      setStatusFilter(filterFromState);
    }
    const typeFromState = location.state?.typeFilter || location.state?.selectedType;
    if (typeFromState !== undefined) {
      setTypeFilter(typeFromState);
    }
    const depositToFromState = location.state?.depositToFilter || location.state?.selectedDepositTo;
    if (depositToFromState !== undefined) {
      setDepositToFilter(depositToFromState);
    }
  }, [location.state, location.key]);

  const hasActiveFilters = Boolean(startDate || endDate || statusFilter !== 'All' || typeFilter !== 'All' || depositToFilter !== 'All' || minAmount || maxAmount || searchTerm);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  const stats = getUserStats(user?.name || '');

  // Filter transactions created by this specific logged in user
  const myTransactions = useMemo(() => {
    return transactions.filter(t => t.userName === user?.name);
  }, [transactions, user?.name]);

  const [modalTxnType, setModalTxnType] = useState('Cash Out');

  const handleOpenAddModal = (defaultType = 'Cash Out') => {
    setModalTxnType(defaultType);
    reset({
      type: defaultType,
      amount: '',
      depositTo: defaultType === 'Cash In' ? 'My Hand' : 'My Hand',
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    const finalType = data.type || modalTxnType || 'Cash Out';
    const finalDepositTo = finalType === 'Cash In' ? (data.depositTo || 'My Hand') : 'My Hand';

    const newTxn = {
      ...data,
      type: finalType,
      depositTo: finalDepositTo,
      status: data.status || 'Done',
      userName: user?.name || 'Partner',
      createdBy: user?.name || 'Partner'
    };

    const res = addTransaction(newTxn);
    if (res && res.success === false) {
      toast.error(res.message, { theme: 'light' });
      return;
    }

    if (finalType === 'Cash In' && finalDepositTo === 'Company Wallet') {
      addVaultDeposit({
        amount: data.amount,
        date: data.date,
        userName: user?.name || 'Partner',
        notes: `Company Wallet Credit: ${data.description || 'Deposit to Vault'}`
      });
    }

    toast.success(`${finalType === 'Cash In' ? 'Credit' : 'Debit'} entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });

    // Auto clear active filters if any so newly added entry is guaranteed to display
    if (hasActiveFilters) {
      setTypeFilter('All');
      setDepositToFilter('All');
      setStatusFilter('All');
      setStartDate('');
      setEndDate('');
      setMinAmount('');
      setMaxAmount('');
      setSearchTerm('');
    }

    setIsModalOpen(false);
    reset();
  };

  const handleStatusChange = (txn, newStatus) => {
    updateTransaction(txn.id, { ...txn, status: newStatus });
    if (newStatus === 'Done') {
      toast.success(`Transaction ${txn.id} marked as Done`, { theme: 'light' });
    } else {
      toast.info(`Transaction ${txn.id} marked as Due`, { theme: 'light' });
    }
  };

  const filteredMyTransactions = useMemo(() => {
    return myTransactions.filter((t) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        t.id.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        t.date.includes(query) ||
        formatDate(t.date).includes(query);

      let matchesDate = true;
      if (startDate && t.date < startDate) matchesDate = false;
      if (endDate && t.date > endDate) matchesDate = false;

      let matchesType = true;
      if (typeFilter !== 'All') {
        const isCredit = t.type === 'Cash In' || t.type === 'Credit';
        if (typeFilter === 'Credit' && !isCredit) matchesType = false;
        if (typeFilter === 'Debit' && isCredit) matchesType = false;
      }

      let matchesDepositTo = true;
      if (typeFilter === 'Credit' && depositToFilter !== 'All') {
        const target = t.depositTo || 'My Hand';
        if (target !== depositToFilter) matchesDepositTo = false;
      }

      let matchesStatus = true;
      if (statusFilter !== 'All' && (t.status || 'Done') !== statusFilter) matchesStatus = false;

      let matchesAmount = true;
      const num = parseFloat(t.amount) || 0;
      if (minAmount && parseFloat(minAmount) > 0 && num < parseFloat(minAmount)) matchesAmount = false;
      if (maxAmount && parseFloat(maxAmount) > 0 && num > parseFloat(maxAmount)) matchesAmount = false;

      return matchesSearch && matchesDate && matchesType && matchesDepositTo && matchesStatus && matchesAmount;
    });
  }, [myTransactions, searchTerm, startDate, endDate, typeFilter, depositToFilter, statusFilter, minAmount, maxAmount]);

  const filteredSummary = useMemo(() => {
    let creditTotal = 0;
    let myHandCreditTotal = 0;
    let myHandCreditDone = 0;
    let myHandCreditDue = 0;

    let companyWalletCreditTotal = 0;
    let companyWalletCreditDone = 0;
    let companyWalletCreditDue = 0;

    let debitTotal = 0;
    let debitDoneTotal = 0;
    let debitDueTotal = 0;

    filteredMyTransactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const isCredit = t.type === 'Cash In' || t.type === 'Credit';
      const isDone = (t.status || 'Done') === 'Done';

      if (isCredit) {
        creditTotal += amt;
        if (t.depositTo === 'Company Wallet') {
          companyWalletCreditTotal += amt;
          if (isDone) companyWalletCreditDone += amt;
          else companyWalletCreditDue += amt;
        } else {
          myHandCreditTotal += amt;
          if (isDone) myHandCreditDone += amt;
          else myHandCreditDue += amt;
        }
      } else {
        debitTotal += amt;
        if (isDone) {
          debitDoneTotal += amt;
        } else {
          debitDueTotal += amt;
        }
      }
    });

    return {
      creditTotal,
      myHandCreditTotal,
      myHandCreditDone,
      myHandCreditDue,
      companyWalletCreditTotal,
      companyWalletCreditDone,
      companyWalletCreditDue,
      debitTotal,
      debitDoneTotal,
      debitDueTotal
    };
  }, [filteredMyTransactions]);

  return (
    <div className="space-y-6">
      {/* Print-Only Header with Filter & User Details */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-[#002B49] tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-extrabold text-[#c69255] uppercase mt-0.5">
          {user?.name ? `${user.name} - My Credit & Debit Statement` : 'User Credit & Debit Ledger'}
        </h2>
        <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-center space-x-3">
          <span>Printed: {formatDate(new Date())}</span>
          <span>| User: <strong>{user?.name}</strong></span>
          {statusFilter !== 'All' && <span>| Status: <strong>{statusFilter}</strong></span>}
          {(startDate || endDate) && <span>| Date Range: <strong>{formatDate(startDate) || 'Start'} to {formatDate(endDate) || 'Today'}</strong></span>}
        </div>
      </div>

      {/* Header & Quick Actions */}
      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">My Credit & Debit</h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          {/* Add Credit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash In')}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Credit
          </button>

          {/* Add Debit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Debit
          </button>

          {/* Print Report Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Print Current Statement"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      {/* 1-Line Search Bar & Filter Button (Hidden in Print) */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl print:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search my credit & debit entries (description, date, amount)..."
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

      {/* Active Filter Indicator Banner */}
      {hasActiveFilters && (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-[#c69255]/30 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2 text-slate-800">
            <span className="font-extrabold text-[#002B49] flex items-center">
              <svg className="w-4 h-4 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Active Filters:
            </span>
            {typeFilter !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-bold">
                Type: {typeFilter}
              </span>
            )}
            {typeFilter === 'Credit' && depositToFilter !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-purple-700 text-white font-bold">
                Deposit To: {depositToFilter}
              </span>
            )}
            {statusFilter !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#002B49] text-white font-bold">
                Status: {statusFilter}
              </span>
            )}
            {(minAmount || maxAmount) && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#c69255] text-white font-bold">
                Amount: {minAmount ? `${settings.currency}${minAmount}` : 'Min'} - {maxAmount ? `${settings.currency}${maxAmount}` : 'Max'}
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
            onClick={() => { setStartDate(''); setEndDate(''); setTypeFilter('All'); setDepositToFilter('All'); setStatusFilter('All'); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Dynamic Filtered Summary Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 print:hidden">
        {/* 1. CREDIT (MY HAND) */}
        {(typeFilter !== 'Debit' && (depositToFilter === 'All' || depositToFilter === 'My Hand')) && (
          <div className="glass-card p-3.5 sm:p-4 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-600">
                  {hasActiveFilters ? 'Filtered Credit (Hand)' : 'Credit (My Hand)'}
                </span>
                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">✋</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                {settings.currency}{filteredSummary.myHandCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold">
              {statusFilter !== 'Due' && (
                <span className="text-emerald-700">Done: {settings.currency}{filteredSummary.myHandCreditDone.toLocaleString('en-IN')}</span>
              )}
              {statusFilter !== 'Done' && (
                <span className="text-amber-700">Due: {settings.currency}{filteredSummary.myHandCreditDue.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        )}

        {/* 2. CREDIT (COMPANY WALLET) */}
        {(typeFilter !== 'Debit' && (depositToFilter === 'All' || depositToFilter === 'Company Wallet')) && (
          <div className="glass-card p-3.5 sm:p-4 rounded-2xl border-l-4 border-l-purple-600 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-600">
                  {hasActiveFilters ? 'Filtered Credit (Co. Wallet)' : 'Credit (Co. Wallet)'}
                </span>
                <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[10px]">🏢</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-800 mt-1">
                {settings.currency}{filteredSummary.companyWalletCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold">
              {statusFilter !== 'Due' && (
                <span className="text-purple-700">Done: {settings.currency}{filteredSummary.companyWalletCreditDone.toLocaleString('en-IN')}</span>
              )}
              {statusFilter !== 'Done' && (
                <span className="text-amber-700">Due: {settings.currency}{filteredSummary.companyWalletCreditDue.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        )}

        {/* 3. TOTAL DEBIT (COMBINED DONE & DUE) */}
        {(typeFilter !== 'Credit') && (
          <div className="glass-card p-3.5 sm:p-4 rounded-2xl border-l-4 border-l-[#002B49] flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-600">
                  {hasActiveFilters ? 'Filtered Debit' : 'Total Debit'}
                </span>
                <span className="w-5 h-5 rounded-md bg-[#002B49]/10 text-[#002B49] flex items-center justify-center text-[10px]">🧾</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-[#002B49] mt-1">
                {settings.currency}{filteredSummary.debitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold">
              {statusFilter !== 'Due' && (
                <span className="text-[#002B49]">Done: {settings.currency}{filteredSummary.debitDoneTotal.toLocaleString('en-IN')}</span>
              )}
              {statusFilter !== 'Done' && (
                <span className="text-amber-700">Due: {settings.currency}{filteredSummary.debitDueTotal.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Popup Modal */}
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
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter My Credit & Debit</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine entries by type, status, amount & date</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTypeFilter(val);
                      if (val !== 'Credit') setDepositToFilter('All');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Types</option>
                    <option value="Debit">Debit (Cash Out)</option>
                    <option value="Credit">Credit (Cash In)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Done">Done</option>
                    <option value="Due">Due</option>
                  </select>
                </div>
              </div>

              {typeFilter === 'Credit' && (
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Account / Deposit To</label>
                  <select
                    value={depositToFilter}
                    onChange={(e) => setDepositToFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Accounts</option>
                    <option value="My Hand">✋ My Hand</option>
                    <option value="Company Wallet">🏢 Company Wallet</option>
                  </select>
                </div>
              )}

              {/* Date Filter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <DateInput
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      if (endDate && val > endDate) setEndDate('');
                    }}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <DateInput
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndDate(val);
                      if (startDate && val < startDate) setStartDate('');
                    }}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>

              {/* Amount Filter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Min Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Max Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setTypeFilter('All'); setStatusFilter('All'); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); setIsFilterOpen(false); }}
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

      {/* Main Table / Mobile Cards */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-transparent">
        {/* Mobile View Card List */}
        <div className="block md:hidden space-y-3 print:hidden">
          {filteredMyTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No entries match the selected filters.
            </div>
          ) : (
            filteredMyTransactions.map((t, index) => {
              const isDone = (t.status || 'Done') === 'Done';
              const isCredit = t.type === 'Cash In' || t.type === 'Credit';
              return (
                <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isCredit ? 'Credit' : 'Debit'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${t.depositTo === 'Company Wallet' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-800'}`}>
                        {isCredit ? (t.depositTo === 'Company Wallet' ? '🏢 Company Wallet' : '✋ My Hand') : '💸 Expense'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold">{formatDate(t.date)}</span>
                  </div>

                  <div className="text-xs text-slate-600 font-medium line-clamp-2">
                    {t.description || '-'}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-sm font-extrabold text-[#002B49]">
                      {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>

                    <select
                      value={t.status || 'Done'}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer focus:outline-none transition ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <option value="Done">Done</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto print:block">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Account / Deposit To</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 font-bold text-right">Amount</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMyTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No entries found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredMyTransactions.map((t, index) => {
                  const isDone = (t.status || 'Done') === 'Done';
                  const isCredit = t.type === 'Cash In' || t.type === 'Credit';
                  const accountLabel = isCredit
                    ? (t.depositTo === 'Company Wallet' ? '🏢 Company Wallet' : '✋ My Hand')
                    : '💸 Expense';
                  return (
                    <tr key={t.id || index} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${isCredit ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-800 border border-slate-300'}`}>
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isCredit && t.depositTo === 'Company Wallet'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : isCredit
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {accountLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">{t.description || '-'}</td>
                      <td className="py-3.5 px-4 font-bold text-right text-[#002B49] whitespace-nowrap">
                        {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <select
                          value={t.status || 'Done'}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          className={`text-xs font-bold px-3 py-1 rounded-xl cursor-pointer focus:outline-none transition print:appearance-none ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <option value="Done">Done</option>
                          <option value="Due">Due</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">
              {watch('type') === 'Cash In' ? 'Add Credit Entry' : 'Add Debit Entry'}
            </h3>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              {/* Fixed Entry Type Badge (Set via Credit/Debit Button) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entry Type</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase ${
                  watch('type') === 'Cash In' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {watch('type') === 'Cash In' ? 'Credit (Deposit / Cash In)' : 'Debit (Expense / Cash Out)'}
                </span>
                <input type="hidden" {...register('type')} />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              {watch('type') === 'Cash In' && (
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Deposit To</label>
                  <select
                    {...register('depositTo')}
                    defaultValue="My Hand"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                  >
                    <option value="My Hand">My Hand</option>
                    <option value="Company Wallet">Company Wallet</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Date</label>
                <DateInput
                  value={watch('date')}
                  {...register('date', { required: 'Date is required' })}
                  className="w-full pl-4 pr-9 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                <select
                  {...register('status')}
                  defaultValue="Done"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Done">Done</option>
                  <option value="Due">Due</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes <span className="text-rose-500">*</span></label>
                <textarea
                  rows="3"
                  placeholder="Describe details..."
                  {...register('description', { required: 'Description is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
                {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>}
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
                  Submit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCreditDebit;
