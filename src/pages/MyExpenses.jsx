import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const MyExpenses = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    transactions,
    allocationsHistory,
    settings,
    getUserStats,
    addTransaction,
    updateTransaction
  } = useExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllocationsModalOpen, setIsAllocationsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    location.state?.statusFilter || location.state?.selectedStatus || 'All'
  );
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const filterFromState = location.state?.statusFilter || location.state?.selectedStatus;
    if (filterFromState !== undefined) {
      setStatusFilter(filterFromState);
    }
  }, [location.state, location.key]);

  const hasActiveFilters = Boolean(startDate || endDate || statusFilter !== 'All' || minAmount || maxAmount || searchTerm);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const stats = getUserStats(user?.name || '');

  // Filter transactions created by this specific logged in user
  const myTransactions = transactions.filter(t => t.userName === user?.name);

  // Filter allocations/money given by admin to this user
  const myAllocations = allocationsHistory.filter(a => a.userName === user?.name);

  const handleOpenAddModal = () => {
    reset({
      type: 'Cash Out',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    addTransaction({
      ...data,
      type: 'Cash Out',
      status: data.status || 'Done',
      userName: user.name,
      createdBy: user.name
    });
    toast.success(`Expense entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });
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

  const filteredMyTransactions = myTransactions.filter((t) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      t.id.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      t.date.includes(query);

    let matchesDate = true;
    if (startDate && t.date < startDate) matchesDate = false;
    if (endDate && t.date > endDate) matchesDate = false;

    let matchesStatus = true;
    if (statusFilter !== 'All' && (t.status || 'Done') !== statusFilter) matchesStatus = false;

    let matchesAmount = true;
    const num = parseFloat(t.amount) || 0;
    if (minAmount && parseFloat(minAmount) > 0 && num < parseFloat(minAmount)) matchesAmount = false;
    if (maxAmount && parseFloat(maxAmount) > 0 && num > parseFloat(maxAmount)) matchesAmount = false;

    return matchesSearch && matchesDate && matchesStatus && matchesAmount;
  });

  return (
    <div className="space-y-6">
      {/* Print-Only Header with Filter & User Details */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-[#002B49] tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-extrabold text-[#c69255] uppercase mt-0.5">
          {user?.name ? `${user.name} - My Expense Receipts & Statement` : 'User Expense Ledger'}
        </h2>
        <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-center space-x-3">
          <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
          <span>| User: <strong>{user?.name}</strong></span>
          {statusFilter !== 'All' && <span>| Status: <strong>{statusFilter}</strong></span>}
          {(startDate || endDate) && <span>| Date Range: <strong>{startDate || 'Start'} to {endDate || 'Today'}</strong></span>}
        </div>
      </div>

      {/* Header & Quick Actions */}
      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Expense</h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          {/* Add Expense Button */}
          <button
            onClick={handleOpenAddModal}
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
            title="Print Current Expense Receipts View"
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
              placeholder="Search my expense records (description, date, amount)..."
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
            onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('All'); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); }}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

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
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter My Expenses</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine expense entries by date, amount & status</p>
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

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Expense Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Done">Done / Settled</option>
                  <option value="Due">Due / Pending</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('All'); setMinAmount(''); setMaxAmount(''); setSearchTerm(''); setIsFilterOpen(false); }}
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

      {/* My Expenses Table / Mobile Cards */}
      <div className="glass-card p-3.5 sm:p-6 rounded-xl sm:rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-white">
        <h2 className="text-base sm:text-lg font-extrabold text-[#002B49] mb-3 sm:mb-4 print:hidden">My Submitted Expense Receipts</h2>

        <div className="block md:hidden space-y-2.5">
          {filteredMyTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              You have not submitted any expense receipts yet. Click "Record My Expense" to submit an entry.
            </div>
          ) : (
            filteredMyTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
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
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Description / Purpose</span>
                    {t.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 print:text-black print:border-collapse print:border print:border-slate-400">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200 print:bg-slate-200 print:text-black print:font-black print:border-b-2 print:border-slate-400">
              <tr>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Sr. No.</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Date</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Description / Purpose</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Amount</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {filteredMyTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black">
                    You have not submitted any expense receipts yet. Click "Record My Expense" to submit an entry.
                  </td>
                </tr>
              ) : (
                filteredMyTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition print:hover:bg-transparent">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-bold print:border print:border-slate-300">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-semibold print:border print:border-slate-300">{t.date}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-medium print:truncate-none print:border print:border-slate-300">
                      {t.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49] print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-black print:border print:border-slate-300">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 print:py-1.5 print:px-2.5 print:border print:border-slate-300">
                      <span className="hidden print:inline font-extrabold text-xs text-slate-800 print:text-black">
                        {t.status || 'Done'}
                      </span>
                      <select
                        value={t.status || 'Done'}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        className={`print:hidden px-3 py-1 rounded-full text-xs font-extrabold focus:outline-none cursor-pointer transition shadow-xs border ${
                          (t.status || 'Done') === 'Due'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        }`}
                      >
                        <option value="Done">Done</option>
                        <option value="Due">Due</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredMyTransactions.length > 0 && (
              <tfoot className="border-t-2 border-slate-400 font-extrabold text-xs text-slate-900 bg-slate-50 print:bg-slate-100">
                <tr>
                  <td colSpan="3" className="py-2.5 px-4 print:py-1.5 print:px-2.5 text-right font-black uppercase text-slate-700 print:text-black print:border print:border-slate-300">Total Filtered Expense Amount:</td>
                  <td className="py-2.5 px-4 print:py-1.5 print:px-2.5 font-black text-[#002B49] print:text-black print:border print:border-slate-300">
                    {settings.currency}{filteredMyTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="print:border print:border-slate-300"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Record My Expense Modal */}
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

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">Record New Expense</h3>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Your Current Remaining Balance:</span>
              <span className="font-[#002B49] font-extrabold">{settings.currency}{stats.remaining.toLocaleString()}</span>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Submitted By</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold focus:outline-none cursor-not-allowed"
                />
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
                  placeholder="Describe expense details..."
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
                  Submit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyExpenses;
