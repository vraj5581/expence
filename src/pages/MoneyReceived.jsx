import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

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
      item.date.includes(query) ||
      formatDate(item.date).includes(query);

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
    <div className="space-y-6 print:space-y-4">
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
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Money Log
          </button>
        </div>
      </div>

      {/* KPI Cards Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 print:grid-cols-4 print:gap-1.5">
        {/* 1. Reimbursement Due (PROMINENT METRIC) */}
        <div className={`glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 print:p-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-md print:shadow-none print:bg-white ${stats.needFromCompany > 0 ? 'border-l-rose-500 bg-rose-50/50' : 'border-l-emerald-500'}`}>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[9px] print:text-slate-800 print:font-black print:truncate-none">Reimbursement Due</p>
          <p className={`text-base sm:text-2xl font-extrabold mt-0.5 sm:mt-2 truncate print:text-xs print:font-black print:text-black print:mt-0.5 print:truncate-none ${stats.needFromCompany > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {settings.currency}{stats.needFromCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-bold truncate print:text-[8px] print:text-slate-700 print:mt-0 print:truncate-none ${stats.needFromCompany > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {stats.needFromCompany > 0 ? 'Pending Amount Owed' : 'No Balance Pending'}
          </p>
        </div>

        {/* 2. Cash In Hand */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-emerald-500 print:p-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-md print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[9px] print:text-slate-800 print:font-black print:truncate-none">Cash In Hand</p>
          <p className="text-base sm:text-2xl font-extrabold text-emerald-700 mt-0.5 sm:mt-2 truncate print:text-xs print:font-black print:text-black print:mt-0.5 print:truncate-none">
            {settings.currency}{Math.max(0, stats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5 sm:mt-1 font-bold truncate print:text-[8px] print:text-slate-700 print:mt-0 print:truncate-none">Available Balance</p>
        </div>

        {/* 3. Total Spent Expenses */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#002B49] print:p-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-md print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[9px] print:text-slate-800 print:font-black print:truncate-none">Total Spent Expenses</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#002B49] mt-0.5 sm:mt-2 truncate print:text-xs print:font-black print:text-black print:mt-0.5 print:truncate-none">
            {settings.currency}{stats.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate print:text-[8px] print:text-slate-700 print:mt-0 print:truncate-none">Logged Expenses</p>
        </div>

        {/* 4. Total Money Received */}
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#c69255] print:p-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-md print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[9px] print:text-slate-800 print:font-black print:truncate-none">Total Money Received</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#9e6e34] mt-0.5 sm:mt-2 truncate print:text-xs print:font-black print:text-black print:mt-0.5 print:truncate-none">
            {settings.currency}{stats.allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-[#b88548] mt-0.5 sm:mt-1 font-semibold truncate print:text-[8px] print:text-slate-700 print:mt-0 print:truncate-none">{myAllocations.length} Transfers</p>
        </div>
      </div>

      {/* 1-Line Search Bar & Filter Button */}
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
              placeholder="Search notes, date, amount..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
              hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm'
                : 'bg-white text-[#002B49] border-slate-300 hover:bg-slate-50'
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
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-transparent">
        <div className="flex items-center justify-between mb-3 sm:mb-4 print:hidden">
          <div>
            <p className="text-xs text-slate-500 font-medium">
              Total Filtered Amount: <span className="font-bold text-[#9e6e34]">{settings.currency}{totalFilteredReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        {/* Mobile View Card List (No Scrollbar - App Style) */}
        <div className="block md:hidden print:hidden space-y-3">
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
                    <span className="text-[11px] font-semibold text-slate-500">{formatDate(a.date)}</span>
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

        {/* Desktop & Print Table View */}
        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 print:text-black print:border-collapse print:border print:border-slate-400">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200 print:bg-slate-200 print:text-black print:font-black print:border-b-2 print:border-slate-400">
              <tr>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Sr. No.</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Date</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Transferred By</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Notes / Purpose</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2.5 print:text-[11px] print:font-black print:text-black print:border print:border-slate-300">Received Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black">
                    No money received records found for the selected date range.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a, index) => (
                  <tr key={a.id || index} className="hover:bg-slate-50 transition print:hover:bg-transparent">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-bold print:border print:border-slate-300">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-semibold print:border print:border-slate-300">{formatDate(a.date)}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49] print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-bold print:border print:border-slate-300">Shukan Company</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-medium print:truncate-none print:border print:border-slate-300">
                      {a.notes || 'Company Money Allocation'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600 print:py-1.5 print:px-2.5 print:text-[11px] print:text-black print:font-black print:border print:border-slate-300">
                      +{settings.currency}{parseFloat(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredAllocations.length > 0 && (
              <tfoot className="border-t-2 border-slate-400 font-extrabold text-xs text-slate-900 bg-slate-50 print:bg-slate-100">
                <tr>
                  <td colSpan="4" className="py-2.5 px-4 print:py-1.5 print:px-2.5 text-right font-black uppercase text-slate-700 print:text-black print:border print:border-slate-300">Total Received Amount:</td>
                  <td className="py-2.5 px-4 print:py-1.5 print:px-2.5 font-black text-emerald-700 print:text-black print:border print:border-slate-300">
                    +{settings.currency}{totalFilteredReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
