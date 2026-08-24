import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { formatDate } from '../utils/dateUtils';
import {
  exportTransferLogPDF,
  exportExpenseLogPDF,
  exportCombinedAuditPDF
} from '../utils/reportPdfGenerator';

const Reports = () => {
  const navigate = useNavigate();
  const {
    adminVaultBalance,
    allocationsHistory,
    transactions,
    vaultDeposits,
    users,
    settings,
    totalAllocatedToTeam,
    totalCashOut,
    editLogs,
    updateAuditLog,
    deleteAuditLog,
    revertAuditLog,
    deleteLastMonthAuditLogs
  } = useExpense();

  // Active View Tab: 'all', 'transfers', 'expenses', 'edits'
  const [activeTab, setActiveTab] = useState('all');

  // Filter Popup Modal Toggle
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Edit Audit Log Modal State
  const [editingAuditLog, setEditingAuditLog] = useState(null);
  const [isEditAuditModalOpen, setIsEditAuditModalOpen] = useState(false);
  const [editAuditForm, setEditAuditForm] = useState({
    editorName: '',
    txnType: 'Entry',
    entrySummary: '',
    changeDetails: '',
    date: '',
    time: ''
  });
  const [isDeletingLastMonth, setIsDeletingLastMonth] = useState(false);

  const handleOpenEditAuditModal = (log) => {
    setEditingAuditLog(log);
    setEditAuditForm({
      editorName: log.editorName || '',
      txnType: log.txnType || 'Entry',
      entrySummary: log.entrySummary || '',
      changeDetails: log.changeDetails || '',
      date: log.date || new Date().toISOString().split('T')[0],
      time: log.time || ''
    });
    setIsEditAuditModalOpen(true);
  };

  const handleSaveAuditEdit = async (e) => {
    e.preventDefault();
    if (!editingAuditLog) return;
    const res = await updateAuditLog(editingAuditLog.id, editAuditForm);
    if (res.success) {
      setIsEditAuditModalOpen(false);
      setEditingAuditLog(null);
    } else {
      alert(res.message || 'Failed to update audit log');
    }
  };

  const handleDeleteAuditLog = async (id) => {
    if (window.confirm('Are you sure you want to delete this audit log entry?')) {
      const res = await deleteAuditLog(id);
      if (!res.success) {
        alert(res.message || 'Failed to delete audit log entry');
      }
    }
  };

  const handleDeleteLastMonthLogs = async () => {
    if (window.confirm('Are you sure you want to delete all audit logs from previous months?')) {
      setIsDeletingLastMonth(true);
      const res = await deleteLastMonthAuditLogs();
      setIsDeletingLastMonth(false);
      if (!res.success) {
        alert(res.message || 'Failed to delete last month audit logs');
      }
    }
  };

  const handleRevertAuditLog = async (log) => {
    if (window.confirm('Are you sure you want to revert this edit and restore the original entry values in the database?')) {
      const res = await revertAuditLog(log);
      if (res.success) {
        setIsEditAuditModalOpen(false);
        setEditingAuditLog(null);
        alert(res.message);
      } else {
        alert(res.message || 'Failed to revert entry');
      }
    }
  };

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

  // Filtered Entry Edit Audit Log (auto-hides logs for deleted entries)
  const filteredEditLogs = useMemo(() => {
    const validEntryIds = new Set([
      ...(transactions || []).map(t => t.id),
      ...(allocationsHistory || []).map(a => a.id),
      ...(vaultDeposits || []).map(v => v.id)
    ]);

    return (editLogs || []).filter((log) => {
      // If this audit log belongs to a specific entry (txnId), omit if the entry was deleted
      if (log.txnId && log.txnId !== 'N/A' && !validEntryIds.has(log.txnId)) {
        return false;
      }

      // Date filter
      if (!isDateInPeriod(log.date)) return false;

      // Global User Filter
      if (globalUserFilter !== 'All' && log.editorName !== globalUserFilter) return false;

      // Global Search Query
      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const editorMatch = (log.editorName || '').toLowerCase().includes(query);
        const summaryMatch = (log.entrySummary || '').toLowerCase().includes(query);
        const detailsMatch = (log.changeDetails || '').toLowerCase().includes(query);
        const dateMatch = (log.date || '').toLowerCase().includes(query);
        if (!editorMatch && !summaryMatch && !detailsMatch && !dateMatch) return false;
      }

      return true;
    });
  }, [
    editLogs,
    transactions,
    allocationsHistory,
    vaultDeposits,
    filterPeriod,
    customStartDate,
    customEndDate,
    globalUserFilter,
    globalSearchQuery
  ]);

  // Summary totals for filtered view
  const totalFilteredTransfers = useMemo(() => {
    return filteredAllocations.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredAllocations]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredTransactions]);

  const [printTarget, setPrintTarget] = useState('all');

  // Print Handlers
  const handlePrint = (target = 'all') => {
    setPrintTarget(target);
    document.body.classList.remove('print-target-transfers', 'print-target-expenses', 'print-target-edits');

    if (target === 'transfers') {
      document.body.classList.add('print-target-transfers');
    } else if (target === 'expenses') {
      document.body.classList.add('print-target-expenses');
    } else if (target === 'edits') {
      document.body.classList.add('print-target-edits');
    }

    window.print();

    setTimeout(() => {
      document.body.classList.remove('print-target-transfers', 'print-target-expenses', 'print-target-edits');
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
    <>
      <div className="space-y-8 print:hidden">
      {/* Header & Primary Actions */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            Reports
          </h1>
        </div>

        {/* Global Action Toolbar with Filter Button */}
        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap shrink-0 ${
              hasActiveFilters
                ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm hover:bg-[#001D33]'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 text-[#c69255] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Reports {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">●</span>}
          </button>

          <button
            onClick={() => handlePrint('all')}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
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
            All ({filteredAllocations.length + filteredTransactions.length + filteredEditLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('edits')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'edits'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/80'
            }`}
          >
            Edited Entries ({filteredEditLogs.length})
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
        <div
          onClick={() => navigate('/admin/deposit-allocate', { state: { activeTab: 'Add Money' } })}
          className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
          title="Click to view Vault Deposits"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Admin Vault Reserve</p>
          <p className="text-2xl font-extrabold text-[#002B49] mt-2">
            {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Available in Master Vault</p>
        </div>

        <div
          onClick={() => navigate('/admin/deposit-allocate', { state: { activeTab: 'Give Money' } })}
          className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
          title="Click to view Money Allocations"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Filtered Money Transferred</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{filteredAllocations.length} Transfer Logs</p>
        </div>

        <div
          onClick={() => navigate('/admin/credit-debit')}
          className="glass-card p-5 rounded-2xl border-l-4 border-l-[#d4a359] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
          title="Click to view Expense Logs"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Filtered Expenses Spent</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">
            {settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{filteredTransactions.length} Expense Receipt Logs</p>
        </div>
      </div>

      {/* REPORT 1 (TOP): Entry Edit Audit Log */}
      {(activeTab === 'all' || activeTab === 'edits') && (
        <div id="report-edits-card" className="glass-card p-3.5 sm:p-6 rounded-2xl space-y-4">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[#002B49]">Entry Edit Audit Log</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {filteredEditLogs.length} Edit History Logs
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit history of modified entries showing user name, edited entry details, date, and time
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleDeleteLastMonthLogs}
                disabled={isDeletingLastMonth}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Auto-delete or manually purge logs older than current month"
              >
                <svg className="w-3.5 h-3.5 mr-1.5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeletingLastMonth ? 'Deleting...' : 'Delete Last Month Logs'}
              </button>

              <button
                onClick={() => handlePrint('edits')}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
                title="Print Audit Report"
              >
                <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Report
              </button>
            </div>
          </div>

          {/* Mobile View Card List */}
          <div className="block md:hidden space-y-3">
            {filteredEditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                No entry edit logs match the selected filter.
              </div>
            ) : (
              filteredEditLogs.map((log, index) => (
                <div key={log.id || index} className="p-3.5 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">#{index + 1}</span>
                      <span className="text-sm font-extrabold text-[#002B49] truncate">{log.editorName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">{log.txnType}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-700 font-extrabold">{formatDate(log.date)}</div>
                      <div className="text-[10px] text-slate-500 font-bold">{log.time}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-xs text-slate-800 font-bold break-words">
                      {log.entrySummary}
                    </div>
                    <div className="text-[11px] text-amber-900 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200/80 break-words">
                      <span className="font-extrabold uppercase text-[10px] text-amber-700 block mb-0.5">Changes:</span>
                      {log.changeDetails}
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      {log.txnType !== 'Bulk Delete' && (
                        <button
                          onClick={() => handleRevertAuditLog(log)}
                          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 text-xs font-bold transition cursor-pointer shrink-0"
                          title="Revert edit and restore original entry values"
                        >
                          <svg className="w-3.5 h-3.5 mr-1 text-amber-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Revert Old
                        </button>
                      )}

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleOpenEditAuditModal(log)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAuditLog(log.id)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-amber-50 text-amber-950 border-b border-amber-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Sr. No.</th>
                  <th className="py-3 px-4 font-bold">User Name</th>
                  <th className="py-3 px-4 font-bold">Edited Entry</th>
                  <th className="py-3 px-4 font-bold">Changes Made</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold text-right">Time</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                      No entry edit logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredEditLogs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-amber-50/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-[#002B49]">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-[#002B49] text-xs border border-slate-200">
                          👤 {log.editorName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 text-xs max-w-xs truncate">
                        {log.txnType === 'Bulk Delete' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 mr-1.5 shrink-0">
                            🗑️ BULK DELETE
                          </span>
                        ) : null}
                        {log.entrySummary}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-amber-900">
                        <span className={`px-2.5 py-1 rounded-lg border inline-block font-bold ${
                          log.txnType === 'Bulk Delete' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200'
                        }`}>
                          {log.changeDetails}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-slate-600">{formatDate(log.date)}</td>
                      <td className="py-3.5 px-4 text-xs font-extrabold text-right text-[#002B49] whitespace-nowrap">{log.time}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {log.txnType !== 'Bulk Delete' && (
                            <button
                              onClick={() => handleRevertAuditLog(log)}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                              title="Revert Edit & Restore Original Entry"
                            >
                              <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditAuditModal(log)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition cursor-pointer"
                            title="Edit Audit Log Entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAuditLog(log.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 transition cursor-pointer"
                            title="Delete Audit Log Entry"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: Company Money Transfer Log */}
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
                    <span className="text-[11px] text-slate-500 font-semibold">{formatDate(log.date)}</span>
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
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{formatDate(log.date)}</td>
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

      {/* REPORT 3: User Expense Receipts Log */}
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
                    <span className="text-[11px] text-slate-500 font-semibold">{formatDate(t.date)}</span>
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
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{formatDate(t.date)}</td>
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
                      max={customEndDate || undefined}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomStartDate(val);
                        if (customEndDate && val > customEndDate) setCustomEndDate('');
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      min={customStartDate || undefined}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomEndDate(val);
                        if (customStartDate && val < customStartDate) setCustomStartDate('');
                      }}
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

      {/* EDIT AUDIT LOG POPUP MODAL */}
      {isEditAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-lg p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Edit Audit Log Entry</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Modify record details for audit history log</p>
                </div>
              </div>

              <button
                onClick={() => setIsEditAuditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveAuditEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">User Name</label>
                  <input
                    type="text"
                    required
                    value={editAuditForm.editorName}
                    onChange={(e) => setEditAuditForm({ ...editAuditForm, editorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={editAuditForm.txnType}
                    onChange={(e) => setEditAuditForm({ ...editAuditForm, txnType: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                  >
                    <option value="Entry">Entry</option>
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                    <option value="Money Transfer">Money Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">Edited Entry Summary</label>
                <input
                  type="text"
                  required
                  value={editAuditForm.entrySummary}
                  onChange={(e) => setEditAuditForm({ ...editAuditForm, entrySummary: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-medium border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">Changes Made</label>
                <textarea
                  rows="2"
                  value={editAuditForm.changeDetails}
                  onChange={(e) => setEditAuditForm({ ...editAuditForm, changeDetails: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-medium border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editAuditForm.date}
                    onChange={(e) => setEditAuditForm({ ...editAuditForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1">Time</label>
                  <input
                    type="text"
                    value={editAuditForm.time}
                    placeholder="e.g. 11:58:49 am"
                    onChange={(e) => setEditAuditForm({ ...editAuditForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleRevertAuditLog(editingAuditLog)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold transition cursor-pointer flex items-center justify-center shrink-0"
                  title="Revert edit and restore entry back to original values"
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 text-amber-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Revert Edit & Restore Old Entry
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditAuditModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer text-center whitespace-nowrap"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* 🖨️ DEDICATED PRINT-ONLY LEDGER REPORT (Strict B&W Table Format) */}
      <div className="hidden print:block print-ledger-report">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3 print-header">
          <h1 className="text-xl font-bold uppercase text-black tracking-wider">SHUKAN PACKAGING</h1>
          <h2 className="text-xs font-bold text-black uppercase mt-0.5">
            {printTarget === 'edits'
              ? 'Entry Edit Audit Log'
              : printTarget === 'transfers'
              ? 'Company Money Transfer Log'
              : printTarget === 'expenses'
              ? 'User Expense Receipts Log'
              : 'Full Reports & Audit Ledger'}
          </h2>
          <div className="text-[9pt] font-normal text-black mt-1 flex items-center justify-center space-x-2">
            <span>Date Printed: {formatDate(new Date())}</span>
            {globalUserFilter !== 'All' && <span>| User: {globalUserFilter}</span>}
            {filterPeriod !== 'All' && <span>| Period: {filterPeriod}</span>}
          </div>
        </div>

        {/* SECTION 1: ENTRY EDIT AUDIT LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'edits') && (
          <div className="mb-4 print-section">
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  Entry Edit Audit Log
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredEditLogs.length} Edit History Logs
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '15%' }} className="user-cell">USER NAME</th>
                  <th style={{ width: '30%' }} className="description-cell">EDITED ENTRY</th>
                  <th style={{ width: '28%' }} className="description-cell">CHANGES MADE</th>
                  <th style={{ width: '10%' }} className="date-cell">DATE</th>
                  <th style={{ width: '10%' }} className="date-cell">TIME</th>
                </tr>
              </thead>
              <tbody>
                {filteredEditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      No entry edit logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredEditLogs.map((log, index) => (
                    <tr key={log.id || index}>
                      <td className="sr-cell">{index + 1}</td>
                      <td className="user-cell">{log.editorName}</td>
                      <td className="description-cell">{log.entrySummary}</td>
                      <td className="description-cell">{log.changeDetails}</td>
                      <td className="date-cell">{formatDate(log.date)}</td>
                      <td className="date-cell">{log.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: COMPANY MONEY TRANSFER LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'transfers') && (
          <div className={`mb-4 print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  Company Money Transfer Log
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredAllocations.length} Records | Total: {settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '14%' }} className="date-cell">DATE</th>
                  <th style={{ width: '22%' }} className="user-cell">GIVEN TO USER</th>
                  <th style={{ width: '36%' }} className="description-cell">NOTES / PURPOSE</th>
                  <th style={{ width: '20%' }} className="amount-cell">AMOUNT GIVEN</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No money transfer logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredAllocations.map((log, index) => (
                      <tr key={log.id || index}>
                        <td className="sr-cell">{index + 1}</td>
                        <td className="date-cell">{formatDate(log.date)}</td>
                        <td className="user-cell">{log.userName}</td>
                        <td className="description-cell">{log.notes || '-'}</td>
                        <td className="amount-cell">
                          +{settings.currency}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={4} className="total-label">Total Money Transferred:</td>
                      <td className="total-amount">
                        +{settings.currency}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 3: USER EXPENSE RECEIPTS LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'expenses') && (
          <div className={`mb-4 print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  User Expense Receipts Log
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredTransactions.length} Receipts | Total: {settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '14%' }} className="date-cell">DATE</th>
                  <th style={{ width: '22%' }} className="user-cell">USER NAME</th>
                  <th style={{ width: '36%' }} className="description-cell">DESCRIPTION / NOTES</th>
                  <th style={{ width: '20%' }} className="amount-cell">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      No expense receipt logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredTransactions.map((t, index) => (
                      <tr key={t.id || index}>
                        <td className="sr-cell">{index + 1}</td>
                        <td className="date-cell">{formatDate(t.date)}</td>
                        <td className="user-cell">{t.userName}</td>
                        <td className="description-cell">{t.description || '-'}</td>
                        <td className="amount-cell">
                          {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={4} className="total-label">Total Expenses Spent:</td>
                      <td className="total-amount">
                        {settings.currency}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 text-center border-t border-black text-[8pt] text-black print-footer mt-4">
          <span>Shukan Packaging - Expense Management Software</span>
        </div>
      </div>
    </>
  );
};

export default Reports;
