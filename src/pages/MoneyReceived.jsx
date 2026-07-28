import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';

const MoneyReceived = () => {
  const { user } = useAuth();
  const { allocationsHistory, settings, getUserStats } = useExpense();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = getUserStats(user?.name || '');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilters = Boolean(startDate || endDate);

  // Filter money allocations received from Company for this logged in user
  const myAllocations = allocationsHistory.filter(a => a.userName === user?.name);

  // Date-wise and search filtering
  const filteredAllocations = myAllocations.filter((item) => {
    // Search query match
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      item.id.toLowerCase().includes(query) ||
      (item.notes || '').toLowerCase().includes(query) ||
      item.date.includes(query);

    // Date range filter
    let matchesDate = true;
    if (startDate && item.date < startDate) matchesDate = false;
    if (endDate && item.date > endDate) matchesDate = false;

    return matchesSearch && matchesDate;
  });

  // Calculate total filtered received amount
  const totalFilteredReceived = filteredAllocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Money Received Log</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Date-wise history of petty cash funds received from Shukan Packaging.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer w-full sm:w-auto"
        >
          <svg className="w-4 h-4 mr-1.5 text-[#002B49]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Export PDF / Print Report
        </button>
      </div>

      {/* KPI Cards Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 print:grid-cols-4">
        {/* 1. Total Money Received */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#c69255]">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Total Money Received</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#9e6e34] mt-0.5 sm:mt-2 truncate">
            {settings.currency}{stats.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-[#b88548] mt-0.5 sm:mt-1 font-semibold truncate">{myAllocations.length} Transfers</p>
        </div>

        {/* 2. Total Spent Expenses */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#002B49]">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Total Spent Expenses</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#002B49] mt-0.5 sm:mt-2 truncate">
            {settings.currency}{stats.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">Logged Expenses</p>
        </div>

        {/* 3. Current Remaining Balance */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#d4a359]">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Remaining Balance</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#9e6e34] mt-0.5 sm:mt-2 truncate">
            {settings.currency}{stats.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5 sm:mt-1 font-bold truncate">Cash In Hand</p>
        </div>

        {/* 4. Need From Company (PROMINENT METRIC) */}
        <div className={`glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 ${stats.needFromCompany > 0 ? 'border-l-rose-500 bg-rose-50/50' : 'border-l-emerald-500'}`}>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Need from Company</p>
          <p className={`text-base sm:text-2xl font-extrabold mt-0.5 sm:mt-2 truncate ${stats.needFromCompany > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {settings.currency}{stats.needFromCompany.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-bold truncate ${stats.needFromCompany > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {stats.needFromCompany > 0 ? 'Reimbursement Due' : 'No Balance Pending'}
          </p>
        </div>
      </div>

      {/* 1-Line Search Bar & Filter Drawer */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl space-y-3 print:hidden">
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
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
              isFilterOpen || hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter {hasActiveFilters && <span className="ml-1 text-[#c69255]">●</span>}
          </button>
        </div>

        {isFilterOpen && (
          <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl glass-input text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl glass-input text-slate-800 focus:outline-none"
              />
            </div>

            {hasActiveFilters && (
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition"
                >
                  Reset Date Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Money Received List (Mobile App Cards + Desktop Table) */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#002B49]">Date-Wise Money Received</h2>
            <p className="text-xs text-slate-500 font-medium">
              Total Filtered Amount: <span className="font-bold text-[#9e6e34]">{settings.currency}{totalFilteredReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        {/* Mobile View Card List (No Scrollbar - App Style) */}
        <div className="block md:hidden space-y-3">
          {filteredAllocations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No money received records found for the selected date range.
            </div>
          ) : (
            filteredAllocations.map((a, index) => (
              <div key={a.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{a.date}</span>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    +{settings.currency}{parseFloat(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Received Amount</th>
                <th className="py-3 px-4 font-bold">Notes / Purpose</th>
                <th className="py-3 px-4 font-bold">Transferred By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No money received records found for the selected date range.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a, index) => (
                  <tr key={a.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{a.date}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                      +{settings.currency}{parseFloat(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {a.notes || 'Company Money Allocation'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">Shukan Company Vault</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MoneyReceived;
