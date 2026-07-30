import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const Expenses = () => {
  const location = useLocation();
  const {
    adminVaultBalance,
    transactions,
    users,
    settings,
    allocateMoneyToUser,
    getUserStats,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useExpense();

  const [selectedStatus, setSelectedStatus] = useState(location.state?.selectedStatus || 'All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(location.state?.selectedUser || 'All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = Boolean(
    selectedStatus !== 'All' ||
    selectedUser !== 'All' ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount ||
    searchTerm
  );

  useEffect(() => {
    if (location.state?.selectedUser !== undefined) {
      setSelectedUser(location.state.selectedUser);
    }
    if (location.state?.selectedStatus !== undefined) {
      setSelectedStatus(location.state.selectedStatus);
    }
  }, [location.state]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();
  const selectedSpender = watch('userName', 'Shukan Company');

  const handleOpenAddModal = (type = 'Cash In') => {
    setEditingTxn(null);
    reset({
      type,
      amount: '',
      userName: 'Shukan Company',
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (txn) => {
    setEditingTxn(txn);
    reset({
      type: txn.type,
      amount: txn.amount,
      userName: txn.userName,
      date: txn.date,
      status: txn.status || 'Done',
      description: txn.description || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    if (editingTxn) {
      const res = updateTransaction(editingTxn.id, data);
      if (res && res.success === false) {
        toast.error(res.message, { theme: 'light' });
        return;
      }
      toast.success(`Transaction ${editingTxn.id} updated successfully!`, { theme: 'light' });
    } else {
      const res = addTransaction({
        ...data,
        createdBy: 'Admin'
      });
      if (res && res.success === false) {
        toast.error(res.message, { theme: 'light' });
        return;
      }
      toast.success(`New ${data.type} entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });
    }
    setIsModalOpen(false);
    reset();
  };

  const onGiveMoneySubmit = (data) => {
    const res = allocateMoneyToUser(data.userName, data.amount, data.notes);
    if (res.success) {
      toast.success(`Successfully transferred ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
      setIsGiveMoneyOpen(false);
      resetGive();
    } else {
      toast.error(res.message, { theme: 'light' });
    }
  };

  const handleStatusChange = (txn, newStatus) => {
    const res = updateTransaction(txn.id, { ...txn, status: newStatus });
    if (res && res.success === false) {
      toast.error(res.message, { theme: 'light' });
      return;
    }
    if (newStatus === 'Done') {
      toast.success(`Transaction ${txn.id} marked as Done`, { theme: 'light' });
    } else {
      toast.info(`Transaction ${txn.id} marked as Due`, { theme: 'light' });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(`Delete transaction record ${id}?`)) {
      deleteTransaction(id);
      toast.info(`Transaction ${id} removed.`, { theme: 'light' });
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedStatus !== 'All' && (t.status || 'Done') !== selectedStatus) return false;
      if (selectedUser !== 'All' && t.userName !== selectedUser) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      const num = parseFloat(t.amount) || 0;
      if (minAmount && parseFloat(minAmount) > 0 && num < parseFloat(minAmount)) return false;
      if (maxAmount && parseFloat(maxAmount) > 0 && num > parseFloat(maxAmount)) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchId = t.id.toLowerCase().includes(query);
        const matchUser = (t.userName || '').toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchDate = (t.date || '').includes(query);
        return matchId || matchUser || matchDesc || matchDate;
      }
      return true;
    });
  }, [transactions, selectedStatus, selectedUser, startDate, endDate, minAmount, maxAmount, searchTerm]);

  // Total Expense Calculations
  const totalFilteredExpenseAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredDoneAmount = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredDueAmount = useMemo(() => {
    return filteredTransactions
      .filter((t) => (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Print-Only Header with Filter & User Details */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-[#002B49] tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-extrabold text-[#c69255] uppercase mt-0.5">
          {selectedUser !== 'All' ? `${selectedUser} - Expense Statement` : 'Company Expense Ledger & Audit Report'}
        </h2>
        <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-center space-x-3">
          <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
          {selectedUser !== 'All' && <span>| User: <strong>{selectedUser}</strong></span>}
          {selectedStatus !== 'All' && <span>| Status: <strong>{selectedStatus}</strong></span>}
          {(startDate || endDate) && <span>| Date Range: <strong>{startDate || 'Start'} to {endDate || 'Today'}</strong></span>}
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            Expenses
          </h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          {/* Add Expense Button */}
          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Expense
          </button>

          {/* Print Report Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Print Current Expense View"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
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
            {selectedStatus !== 'All' && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#c69255] text-white font-bold">
                Status: {selectedStatus}
              </span>
            )}
            {(minAmount || maxAmount) && (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-bold">
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
            onClick={() => { setSelectedUser('All'); setSelectedStatus('All'); setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Prominent KPI Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        {/* Total Paid Expense Card */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-[#002B49] flex items-center justify-between shadow-xs print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold print:text-[10px] print:text-slate-800 print:font-extrabold">Total Expense (Done)</p>
            <p className="text-2xl font-extrabold text-[#002B49] mt-1 print:text-base print:font-black print:text-black print:mt-0">
              {settings.currency}{totalFilteredDoneAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium print:text-[9px] print:text-slate-700 print:mt-0">
              {filteredTransactions.filter(t => (t.status || 'Done') === 'Done').length} Completed Receipts
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#002B49]/10 flex items-center justify-center text-[#002B49] print:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* Total Pending/Due Expense Card */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-amber-500 flex items-center justify-between shadow-xs print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold print:text-[10px] print:text-slate-800 print:font-extrabold">Total Expense (Due)</p>
            <p className="text-2xl font-extrabold text-amber-800 mt-1 print:text-base print:font-black print:text-black print:mt-0">
              {settings.currency}{totalFilteredDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium print:text-[9px] print:text-slate-700 print:mt-0">
              {filteredTransactions.filter(t => (t.status || 'Done') === 'Due').length} Due Entries
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 print:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Overall Total Expense Recorded */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-[#c69255] flex items-center justify-between shadow-xs print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold print:text-[10px] print:text-slate-800 print:font-extrabold">Overall Total Expense</p>
            <p className="text-2xl font-extrabold text-[#9e6e34] mt-1 print:text-base print:font-black print:text-black print:mt-0">
              {settings.currency}{totalFilteredExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium print:text-[9px] print:text-slate-700 print:mt-0">
              {filteredTransactions.length} Total Receipt Logs
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#c69255]/10 flex items-center justify-center text-[#9e6e34] print:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
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
              placeholder="Search transactions (ID, user, description, date)..."
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

      {/* Filter Popup Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30">
                  <svg className="w-5 h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Expenses</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine expense entries by user, status & date</p>
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

            {/* Filter Form Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Select User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Users & Company</option>
                  <option value="Shukan Company">🏢 Shukan Company</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Payment Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Statuses</option>
                  <option value="Done">Done</option>
                  <option value="Due">Due</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>

              {/* Amount Range Filter */}
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
                onClick={() => { setSelectedUser('All'); setSelectedStatus('All'); setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); setIsFilterOpen(false); }}
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

      {/* Transactions Table / Mobile Card List */}
      <div className="glass-card p-3.5 sm:p-6 rounded-xl sm:rounded-2xl">
        {/* Mobile View Card List (No Scrollbar - Native App Style) */}
        <div className="block md:hidden space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No transaction records match your query.
            </div>
          ) : (
            filteredTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-xs font-bold text-[#002B49]">{t.userName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{t.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Status</span>
                    <select
                      value={t.status || 'Done'}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold focus:outline-none cursor-pointer border ${
                        (t.status || 'Done') === 'Due'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      <option value="Done">Done</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Amount</span>
                    <span className="text-sm font-extrabold text-[#002B49]">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {t.description && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl font-medium">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Description / Notes</span>
                    {t.description}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEditModal(t)}
                    className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#002B49] hover:text-white text-xs font-bold transition flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">User Name</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 text-right font-bold no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No transaction records match your query.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{t.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="hidden print:inline-block font-extrabold text-xs text-slate-800">
                        {(t.status || 'Done') === 'Due' ? 'Due' : 'Done'}
                      </span>
                      <select
                        value={t.status || 'Done'}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        className={`no-print px-3 py-1 rounded-full text-xs font-extrabold focus:outline-none cursor-pointer transition shadow-xs border ${
                          (t.status || 'Done') === 'Due'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        }`}
                      >
                        <option value="Done">Done</option>
                        <option value="Due">Due</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 no-print">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        title="Edit Record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Delete Record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <tr>
                  <td colSpan="4" className="py-3 px-4 text-right text-xs uppercase text-slate-600">Total Expense Amount:</td>
                  <td className="py-3 px-4 text-sm text-[#002B49] font-extrabold">
                    {settings.currency}{totalFilteredExpenseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 font-semibold">
                    {filteredTransactions.length} Receipts
                  </td>
                  <td className="py-3 px-4 text-right no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Give Money to User Modal */}
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

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">Allocate Petty Cash to User</h3>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Available Company Vault Balance:</span>
              <span className="font-[#002B49] font-extrabold">{settings.currency}{adminVaultBalance.toLocaleString()}</span>
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
                  Transfer Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record / Edit Expense Modal */}
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
              {editingTxn ? 'Edit Expense Record' : 'Record Expense Entry'}
            </h3>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Spender Account / Name</label>
                <select
                  {...register('userName', { required: 'Spender Account is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Shukan Company">
                    🏢 Shukan Company (Vault Bal: {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </option>
                  {users.map((u) => {
                    const stats = getUserStats(u.name);
                    const isOver = stats.remaining < 0;
                    return (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role || 'Staff'}) — {isOver ? `Company Owes: ${settings.currency}${Math.abs(stats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Cash Bal: ${settings.currency}${stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </option>
                    );
                  })}
                </select>
                {errors.userName && <p className="text-xs text-rose-500 mt-1">{errors.userName.message}</p>}

                {selectedSpender && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Selected Account Balance:</span>
                    {selectedSpender === 'Shukan Company' ? (
                      <span className="font-extrabold text-[#002B49]">
                        {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Company Vault)
                      </span>
                    ) : (
                      (() => {
                        const stats = getUserStats(selectedSpender);
                        return stats.remaining < 0 ? (
                          <span className="font-extrabold text-rose-700">
                            Company Owes {settings.currency}{Math.abs(stats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Overdrawn)
                          </span>
                        ) : (
                          <span className="font-extrabold text-emerald-700">
                            {settings.currency}{stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })} In Hand
                          </span>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Expense Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

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
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe transaction details (e.g. plumbing work, recharge, electricity)..."
                  {...register('description')}
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
                  {editingTxn ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
