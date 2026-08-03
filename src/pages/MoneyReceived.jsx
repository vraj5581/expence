import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const MoneyReceived = () => {
  const { user } = useAuth();
  const { allocationsHistory, transactions, settings, getUserStats } = useExpense();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilters = Boolean(startDate || endDate);

  const stats = useMemo(() => {
    return getUserStats(user?.name || '');
  }, [getUserStats, user?.name, transactions, allocationsHistory]);

  // Filter money allocations received from Company for this logged in user
  const myAllocations = useMemo(() => {
    return allocationsHistory.filter(a => a.userName === user?.name);
  }, [allocationsHistory, user?.name]);

  const myDebitTxns = useMemo(() => {
    return transactions.filter(t => t.userName === user?.name && t.type !== 'Cash In' && t.type !== 'Credit');
  }, [transactions, user?.name]);

  const totalSpent = useMemo(() => {
    return myDebitTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  const doneSpent = useMemo(() => {
    return myDebitTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  const dueSpent = useMemo(() => {
    return myDebitTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  // Date-wise and search filtering
  const filteredAllocations = useMemo(() => {
    return myAllocations.filter((item) => {
      // Search query match
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        item.id.toLowerCase().includes(query) ||
        (item.notes || '').toLowerCase().includes(query) ||
        item.date.includes(query) ||
        formatDate(item.date).includes(query);

      // Date range filter
      let matchesDate = true;
      if (startDate && item.date < startDate) matchesDate = false;
      if (endDate && item.date > endDate) matchesDate = false;

      return matchesSearch && matchesDate;
    });
  }, [myAllocations, searchTerm, startDate, endDate]);

  // Calculate total filtered received amount
  const totalFilteredReceived = useMemo(() => {
    return filteredAllocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  }, [filteredAllocations]);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Print-Only Header with Filter & User Details */}
      <div className="hidden print:block text-center border-b border-slate-300 pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-[#002B49] tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-extrabold text-[#c69255] uppercase mt-0.5">
          {user?.name ? `${user.name} - Money Received & Allocation Statement` : 'User Money Received Ledger'}
        </h2>
        <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center justify-center space-x-3">
          <span>Printed: {formatDate(new Date())}</span>
          <span>| User: <strong>{user?.name}</strong></span>
          {(startDate || endDate) && <span>| Date Range: <strong>{formatDate(startDate) || 'Start'} to {formatDate(endDate) || 'Today'}</strong></span>}
        </div>
      </div>

      {/* Header & Print Action */}
      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Money Received</h1>
          <p className="text-xs text-slate-500 font-medium">History of cash allocations transferred to you by Company</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 00-2 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Money Log
          </button>
        </div>
      </div>

      {/* Restructured Compact KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 print:grid-cols-4 print:gap-1.5">
        {/* 1. TOTAL MONEY RECEIVED */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200/90 shadow-2xs flex flex-col justify-between space-y-1 print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-900 tracking-wide print:text-[9.5px] print:font-black print:text-black print:tracking-wider">Total Received</span>
            <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center text-xs font-black print:hidden">
              💰
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-amber-900 tracking-tight print:text-base print:font-black print:text-black print:leading-tight print:my-0.5">
              {settings.currency}{stats.totalCashAvailable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-bold text-amber-800 mt-0.5 print:text-[9.5px] print:font-black print:text-black">
              Allocations & My Hand Credits
            </div>
          </div>
        </div>

        {/* 2. TOTAL SPENT EXPENSES */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-1 print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-[#002B49] tracking-wide print:text-[9.5px] print:font-black print:text-black print:tracking-wider">Total Spent</span>
            <div className="w-6 h-6 rounded-lg bg-[#002B49]/10 text-[#002B49] flex items-center justify-center text-xs font-black print:hidden">
              🧾
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-[#002B49] tracking-tight print:text-base print:font-black print:text-black print:leading-tight print:my-0.5">
              {settings.currency}{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-bold text-slate-600 mt-0.5 print:text-[9.5px] print:font-black print:text-black">
              Done: {settings.currency}{doneSpent.toLocaleString('en-IN')}  •  Due: {settings.currency}{dueSpent.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* 3. CASH IN HAND */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200/90 shadow-2xs flex flex-col justify-between space-y-1 print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wide print:text-[9.5px] print:font-black print:text-black print:tracking-wider">Cash In Hand</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center text-xs font-black print:hidden">
              💵
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight print:text-base print:font-black print:text-black print:leading-tight print:my-0.5">
              {settings.currency}{stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-bold text-emerald-700 mt-0.5 print:text-[9.5px] print:font-black print:text-black">
              Available cash balance
            </div>
          </div>
        </div>

        {/* 4. REIMBURSEMENT DUE */}
        <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs flex flex-col justify-between space-y-1 print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none ${
          stats.needFromCompany > 0
            ? 'bg-gradient-to-br from-rose-50 to-rose-100/60 border-rose-200/90'
            : 'bg-gradient-to-br from-slate-50 to-slate-100/80 border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-black uppercase tracking-wide print:text-[9.5px] print:font-black print:text-black print:tracking-wider ${stats.needFromCompany > 0 ? 'text-rose-900' : 'text-slate-700'}`}>Reimbursement Due</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black print:hidden ${stats.needFromCompany > 0 ? 'bg-rose-200/80 text-rose-800' : 'bg-slate-200/80 text-slate-700'}`}>
              ⚠️
            </div>
          </div>
          <div>
            <div className={`text-lg sm:text-xl font-black tracking-tight print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 ${stats.needFromCompany > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {settings.currency}{stats.needFromCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-bold mt-0.5 print:text-[9.5px] print:font-black print:text-black ${stats.needFromCompany > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
              {stats.needFromCompany > 0 ? 'Company payback needed' : 'Settled'}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Line Search Bar & Filter Button */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl print:hidden space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notes, date, amount..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
              hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49] shadow-xs'
                : 'bg-white text-[#002B49] border-slate-300 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 mr-1.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">●</span>}
          </button>
        </div>

        {/* Active Filters Banner */}
        {hasActiveFilters && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-800">
              <span className="font-extrabold text-[#002B49]">Active Filters:</span>
              {(startDate || endDate) && (
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                  Date: {formatDate(startDate) || 'Start'} to {formatDate(endDate) || 'Today'}
                </span>
              )}
            </div>
            <button onClick={handleResetFilters} className="text-[11px] font-bold text-rose-600 hover:underline">
              Reset Filters
            </button>
          </div>
        )}
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
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Received Cash</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Filter allocation records by date range</p>
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

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { handleResetFilters(); setIsFilterOpen(false); }}
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

      {/* Money Received List (Mobile App Cards + Desktop Table) */}
      <div className="glass-card p-3.5 sm:p-5 rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-transparent">
        {/* Mobile View Card List (No Scrollbar - App Style) */}
        <div className="block md:hidden print:hidden space-y-3">
          {filteredAllocations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No money received records found for the selected criteria.
            </div>
          ) : (
            filteredAllocations.map((a, index) => (
              <div key={a.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{formatDate(a.date)}</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    +{settings.currency}{parseFloat(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl font-medium">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Notes / Purpose</span>
                  {a.notes || 'Company Money Allocation'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop & Print Table View */}
        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 print:text-black print:border-collapse print:border print:border-slate-400">
            <thead className="text-xs uppercase bg-amber-50/80 text-amber-900 border-b border-amber-200 print:bg-slate-100 print:text-black print:font-black print:border-b-2 print:border-black">
              <tr>
                <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Sr. No.</th>
                <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Date</th>
                <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Transferred By</th>
                <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Notes / Purpose</th>
                <th className="py-3 px-4 font-bold text-right print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Received Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-y-0">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-slate-300">
                    No money received records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a, index) => (
                  <tr key={a.id || index} className="hover:bg-amber-50/30 transition print:bg-white">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{formatDate(a.date)}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49] print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">Shukan Company</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:max-w-none print:whitespace-normal print:break-words">
                      {a.notes || 'Company Money Allocation'}
                    </td>
                    <td className="py-3.5 px-4 font-black text-right text-emerald-600 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:font-black">
                      +{settings.currency}{parseFloat(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredAllocations.length > 0 && (
              <tfoot className="bg-amber-50/50 font-bold text-xs text-amber-900 border-t-2 border-amber-200 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                <tr>
                  <td colSpan="4" className="py-3 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black print:font-black">
                    {hasActiveFilters ? 'Total Filtered Received Amount:' : 'Total Received Amount:'}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm print:py-2 print:px-2 print:border print:border-black print:text-black print:font-black">
                    +{settings.currency}{totalFilteredReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default MoneyReceived;
