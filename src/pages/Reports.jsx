import React, { useState, useMemo } from 'react';
import { useExpense } from '../context/ExpenseContext';
import {
  exportTransferLogPDF,
  exportExpenseLogPDF,
  exportCombinedAuditPDF
} from '../utils/reportPdfGenerator';

const Reports = () => {
  const {
    adminVaultBalance,
    allocationsHistory,
    transactions,
    users,
    settings,
    totalAllocatedToTeam,
    totalCashOut
  } = useExpense();

  // Active View Tab: 'all', 'transfers', 'expenses'
  const [activeTab, setActiveTab] = useState('all');

  // Filter Popup Modal Toggle
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Global Filter States
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [globalUserFilter, setGlobalUserFilter] = useState('All');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Particular Report Independent Filters
  const [transferUserFilter, setTransferUserFilter] = useState('All');
  const [transferSearchQuery, setTransferSearchQuery] = useState('');

  const [expenseUserFilter, setExpenseUserFilter] = useState('All');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  const hasActiveFilters = Boolean(
    filterPeriod !== 'All' ||
    globalUserFilter !== 'All' ||
    globalSearchQuery.trim() !== '' ||
    transferUserFilter !== 'All' ||
    expenseUserFilter !== 'All' ||
    transferSearchQuery.trim() !== '' ||
    expenseSearchQuery.trim() !== '' ||
    customStartDate !== '' ||
    customEndDate !== ''
  );

  // Date Filtering Helper
  const isDateInPeriod = (dateStr) => {
    if (!dateStr || filterPeriod === 'All') return true;

    const logDate = new Date(dateStr);
    const now = new Date();

    if (filterPeriod === 'Today') {
      const todayStr = now.toISOString().split('T')[0];
      return dateStr === todayStr;
    }

    if (filterPeriod === 'This Week') {
      const firstDayOfWeek = new Date(now);
      const day = now.getDay() || 7;
      firstDayOfWeek.setDate(now.getDate() - day + 1);
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);

      return logDate >= firstDayOfWeek && logDate <= lastDayOfWeek;
    }

    if (filterPeriod === 'This Month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    }

    if (filterPeriod === 'This Quarter') {
      const month = now.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const currentYear = now.getFullYear();

      const quarterStart = new Date(currentYear, quarterStartMonth, 1);
      const quarterEnd = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59);

      return logDate >= quarterStart && logDate <= quarterEnd;
    }

    if (filterPeriod === 'YTD') {
      return logDate.getFullYear() === now.getFullYear();
    }

    if (filterPeriod === 'Custom') {
      if (customStartDate && logDate < new Date(customStartDate)) return false;
      if (customEndDate && logDate > new Date(customEndDate + 'T23:59:59')) return false;
      return true;
    }

    return true;
  };

  // Filtered Company Money Transfer Log
  const filteredAllocations = useMemo(() => {
    return allocationsHistory.filter((log) => {
      // Date filter
      if (!isDateInPeriod(log.date)) return false;

      // Global User Filter
      if (globalUserFilter !== 'All' && log.userName !== globalUserFilter) return false;

      // Particular User Filter
      if (transferUserFilter !== 'All' && log.userName !== transferUserFilter) return false;

      // Global Search Query
      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const userNameMatch = (log.userName || '').toLowerCase().includes(query);
        const notesMatch = (log.notes || '').toLowerCase().includes(query);
        const amountMatch = (log.amount || '').toString().includes(query);
        if (!userNameMatch && !notesMatch && !amountMatch) return false;
      }

      // Particular Search Query
      if (transferSearchQuery.trim()) {
        const query = transferSearchQuery.toLowerCase();
        const userNameMatch = (log.userName || '').toLowerCase().includes(query);
        const notesMatch = (log.notes || '').toLowerCase().includes(query);
        const amountMatch = (log.amount || '').toString().includes(query);
        if (!userNameMatch && !notesMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [
    allocationsHistory,
    filterPeriod,
    customStartDate,
    customEndDate,
    globalUserFilter,
    transferUserFilter,
    globalSearchQuery,
    transferSearchQuery
  ]);

  // Filtered User Expense Receipts Log
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Date filter
      if (!isDateInPeriod(t.date)) return false;

      // Global User Filter
      if (globalUserFilter !== 'All' && t.userName !== globalUserFilter) return false;

      // Particular User Filter
      if (expenseUserFilter !== 'All' && t.userName !== expenseUserFilter) return false;

      // Global Search Query
      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const userNameMatch = (t.userName || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const amountMatch = (t.amount || '').toString().includes(query);
        if (!userNameMatch && !descMatch && !amountMatch) return false;
      }

      // Particular Search Query
      if (expenseSearchQuery.trim()) {
        const query = expenseSearchQuery.toLowerCase();
        const userNameMatch = (t.userName || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const amountMatch = (t.amount || '').toString().includes(query);
        if (!userNameMatch && !descMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [
    transactions,
    filterPeriod,
    customStartDate,
    customEndDate,
    globalUserFilter,
    expenseUserFilter,
    globalSearchQuery,
    expenseSearchQuery
  ]);

  // Summary totals for filtered view
  const totalFilteredTransfers = useMemo(() => {
    return filteredAllocations.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredAllocations]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredTransactions]);

  // Print Handlers
  const handlePrint = (target = 'all') => {
    document.body.classList.remove('print-target-transfers', 'print-target-expenses');

    if (target === 'transfers') {
      document.body.classList.add('print-target-transfers');
    } else if (target === 'expenses') {
      document.body.classList.add('print-target-expenses');
    }

    window.print();

    setTimeout(() => {
      document.body.classList.remove('print-target-transfers', 'print-target-expenses');
    }, 1000);
  };

  // PDF Export Handlers
  const handleExportTransfersPDF = () => {
    exportTransferLogPDF({
      logs: filteredAllocations,
      currency: settings.currency,
      filterUser: transferUserFilter !== 'All' ? transferUserFilter : globalUserFilter,
      filterPeriod
    });
  };

  const handleExportExpensesPDF = () => {
    exportExpenseLogPDF({
      transactions: filteredTransactions,
      currency: settings.currency,
      filterUser: expenseUserFilter !== 'All' ? expenseUserFilter : globalUserFilter,
      filterPeriod
    });
  };

  const handleExportCombinedPDF = () => {
    exportCombinedAuditPDF({
      logs: filteredAllocations,
      transactions: filteredTransactions,
      currency: settings.currency,
      filterUser: globalUserFilter,
      filterPeriod,
      adminVaultBalance,
      totalAllocated: totalFilteredTransfers,
      totalSpent: totalFilteredExpenses
    });
  };

  const clearAllFilters = () => {
    setFilterPeriod('All');
    setCustomStartDate('');
    setCustomEndDate('');
    setGlobalUserFilter('All');
    setGlobalSearchQuery('');
    setTransferUserFilter('All');
    setTransferSearchQuery('');
    setExpenseUserFilter('All');
    setExpenseSearchQuery('');
  };

  return (
    <div className="space-y-8">
      {/* Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">
            Shukan Packaging Audit Reports
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Comprehensive money transfer logs, expense receipt records, and report-wise exports
          </p>
        </div>

        {/* Global Action Toolbar with Filter Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm hover:bg-[#001D33]'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <svg className="w-4 h-4 mr-1.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Reports {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">●</span>}
          </button>

          <button
            onClick={() => handlePrint('all')}
            className="flex items-center justify-center px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Full Audit
          </button>
        </div>
      </div>

      {/* Active Filter Chips & View Tabs Strip */}
      <div id="reports-global-filter-bar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Active Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase text-slate-400">Active Filters:</span>
          {!hasActiveFilters && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
              Showing All Records
            </span>
          )}

          {filterPeriod !== 'All' && (
            <span className="text-xs font-bold bg-amber-50 text-[#9e6e34] border border-[#c69255]/30 px-2.5 py-0.5 rounded-lg">
              Period: {filterPeriod}
            </span>
          )}

          {globalUserFilter !== 'All' && (
            <span className="text-xs font-bold bg-blue-50 text-[#002B49] border border-[#002B49]/20 px-2.5 py-0.5 rounded-lg">
              User: {globalUserFilter}
            </span>
          )}

          {globalSearchQuery && (
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
              Search: "{globalSearchQuery}"
            </span>
          )}

          {transferUserFilter !== 'All' && (
            <span className="text-xs font-bold bg-amber-50 text-[#9e6e34] px-2.5 py-0.5 rounded-lg">
              Transfers User: {transferUserFilter}
            </span>
          )}

          {expenseUserFilter !== 'All' && (
            <span className="text-xs font-bold bg-blue-50 text-[#002B49] px-2.5 py-0.5 rounded-lg">
              Expenses User: {expenseUserFilter}
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-red-600 hover:text-red-800 transition ml-1 underline cursor-pointer"
            >
              Reset All
            </button>
          )}
        </div>

        {/* View Report Tab Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({filteredAllocations.length + filteredTransactions.length})
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-[#9e6e34] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Transfers ({filteredAllocations.length})
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Expenses ({filteredTransactions.length})
          </button>
        </div>
      </div>

      {/* KPI Highlights Header */}
      <div id="reports-kpi-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Admin Vault Reserve</p>
          <p className="text-2xl font-extrabold text-[#002B49] mt-2">
            {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Available in Master Vault</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Filtered Money Transferred</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{filteredAllocations.length} Transfer Logs</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#d4a359]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Filtered Expenses Spent</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">
            {settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{filteredTransactions.length} Expense Receipt Logs</p>
        </div>
      </div>

      {/* REPORT 1: Company Money Transfer Log */}
      {(activeTab === 'all' || activeTab === 'transfers') && (
        <div id="report-transfers-card" className="glass-card p-3.5 sm:p-6 rounded-2xl space-y-4">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-[#002B49]">Company Money Transfer Log</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9e6e34]/10 text-[#9e6e34]">
                  {filteredAllocations.length} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total Allocated: <span className="font-bold text-[#9e6e34]">{settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrint('transfers')}
                className="flex items-center px-3.5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                title="Print this specific report"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>

          {/* Mobile View Card List */}
          <div className="block md:hidden space-y-3">
            {filteredAllocations.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                No money transfer logs match the selected filter.
              </div>
            ) : (
              filteredAllocations.map((log, index) => (
                <div key={log.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className="text-sm font-extrabold text-[#002B49]">{log.userName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold">{log.date}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                      {log.notes || 'Petty Cash Allowance'}
                    </div>
                    <div className="text-sm font-extrabold text-[#9e6e34]">
                      +{settings.currency}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
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
                  <th className="py-3 px-4 font-bold">Given To User</th>
                  <th className="py-3 px-4 font-bold">Notes / Purpose</th>
                  <th className="py-3 px-4 font-bold text-right">Amount Given</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500 text-xs font-medium">
                      No money transfer logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{log.date}</td>
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">{log.userName}</td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">{log.notes || '-'}</td>
                      <td className="py-3.5 px-4 font-bold text-right text-[#9e6e34]">
                        +{settings.currency}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAllocations.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td colSpan="4" className="py-3 px-4 text-right text-xs uppercase text-slate-600">Total Money Transferred:</td>
                    <td className="py-3 px-4 text-right text-sm text-[#9e6e34]">
                      +{settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: User Expense Receipts Log */}
      {(activeTab === 'all' || activeTab === 'expenses') && (
        <div id="report-expenses-card" className="glass-card p-3.5 sm:p-6 rounded-2xl space-y-4">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-[#002B49]">User Expense Receipts Log</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#002B49]/10 text-[#002B49]">
                  {filteredTransactions.length} Receipts
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total Expenses: <span className="font-bold text-[#002B49]">{settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrint('expenses')}
                className="flex items-center px-3.5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                title="Print this specific report"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>

          {/* Mobile View Card List */}
          <div className="block md:hidden space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                No expense receipt logs match the selected filter.
              </div>
            ) : (
              filteredTransactions.map((t, index) => (
                <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className="text-sm font-extrabold text-[#002B49]">{t.userName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold">{t.date}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                      {t.description || 'Expense Entry'}
                    </div>
                    <div className="text-sm font-extrabold text-[#002B49]">
                      {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
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
                  <th className="py-3 px-4 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium">
                      No expense receipt logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t, index) => (
                    <tr key={t.id || index} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{t.date}</td>
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">{t.description || '-'}</td>
                      <td className="py-3.5 px-4 font-bold text-right text-[#002B49]">
                        {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <tr>
                    <td colSpan="4" className="py-3 px-4 text-right text-xs uppercase text-slate-600">Total Expenses Spent:</td>
                    <td className="py-3 px-4 text-right text-sm text-[#002B49]">
                      {settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* FILTER POPUP MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-lg p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30">
                  <svg className="w-5 h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Audit Reports</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Customize time periods, users, search terms, and report targets</p>
                </div>
              </div>

              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Form Controls */}
            <div className="space-y-4">
              {/* 1. Time Period */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Time Period</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="This Quarter">This Quarter</option>
                  <option value="YTD">Year to Date (YTD)</option>
                  <option value="Custom">Custom Date Range</option>
                </select>
              </div>

              {/* Custom Date Inputs if Custom selected */}
              {filterPeriod === 'Custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* 2. Global User / Account Selection */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Global User / Account</label>
                <select
                  value={globalUserFilter}
                  onChange={(e) => setGlobalUserFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Users & Accounts</option>
                  <option value="Shukan Company">Shukan Company</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* 3. Search Query Input */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Search Keywords</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notes, description, user, or amount..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-medium border border-slate-200"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* 4. Report Target Specific Filters (Expandable Options) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-extrabold text-[#002B49] uppercase tracking-wider">Report-Wise Particular Filters</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Money Transfer User</label>
                    <select
                      value={transferUserFilter}
                      onChange={(e) => setTransferUserFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                    >
                      <option value="All">All Transfers Users</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Expense Receipt User</label>
                    <select
                      value={expenseUserFilter}
                      onChange={(e) => setExpenseUserFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                    >
                      <option value="All">All Expense Users</option>
                      <option value="Shukan Company">Shukan Company</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
