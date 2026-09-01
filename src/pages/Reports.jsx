import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { formatDate, getTodayYMD } from '../utils/dateUtils';
import {
  exportTransferLogPDF,
  exportExpenseLogPDF,
  exportCombinedAuditPDF
} from '../utils/reportPdfGenerator';

const Reports = () => {
  const navigate = useNavigate();
  const {
    adminVaultBalance,
    totalVaultDeposited,
    totalDoneCashDeposit,
    allocationsHistory,
    transactions,
    vaultDeposits,
    isDepositDue,
    isBankDestination,
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

  // Active View Tab: 'all', 'transfers', 'expenses', 'deposits', 'edits'
  const [activeTab, setActiveTab] = useState('all');

  // Print Target: 'all', 'transfers', 'expenses', 'deposits', 'edits'
  const [printTarget, setPrintTarget] = useState('all');

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

  const [depositSearchQuery, setDepositSearchQuery] = useState('');

  const hasActiveFilters = Boolean(
    filterPeriod !== 'All' ||
    globalUserFilter !== 'All' ||
    globalSearchQuery.trim() !== '' ||
    transferUserFilter !== 'All' ||
    expenseUserFilter !== 'All' ||
    transferSearchQuery.trim() !== '' ||
    expenseSearchQuery.trim() !== '' ||
    depositSearchQuery.trim() !== '' ||
    customStartDate !== '' ||
    customEndDate !== ''
  );

  // Date Filtering Helper
  const isDateInPeriod = (dateStr) => {
    if (!dateStr || filterPeriod === 'All') return true;

    const logDate = new Date(dateStr);
    const now = new Date();

    if (filterPeriod === 'Today') {
      const todayStr = getTodayYMD(now);
      return dateStr === todayStr;
    }

    if (filterPeriod === 'Yesterday') {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = getTodayYMD(yest);
      return dateStr === yestStr;
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

    if (filterPeriod === 'Last Month') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = lastMonthDate.getMonth();
      const lastMonthYear = lastMonthDate.getFullYear();
      return logDate.getMonth() === lastMonth && logDate.getFullYear() === lastMonthYear;
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
      if (customStartDate && dateStr < customStartDate) return false;
      if (customEndDate && dateStr > customEndDate) return false;
      return true;
    }

    return true;
  };

  // 1. Filtered Company Money Transfer Log (Allocations)
  const filteredAllocations = useMemo(() => {
    return (allocationsHistory || []).filter((log) => {
      if (!isDateInPeriod(log.date)) return false;
      if (globalUserFilter !== 'All' && log.userName !== globalUserFilter) return false;
      if (transferUserFilter !== 'All' && log.userName !== transferUserFilter) return false;

      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const fullStr = `${log.userName || ''} ${log.notes || ''} ${log.amount || ''} ${log.date || ''}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }

      if (transferSearchQuery.trim()) {
        const query = transferSearchQuery.toLowerCase();
        const fullStr = `${log.userName || ''} ${log.notes || ''} ${log.amount || ''} ${log.date || ''}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
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

  // 2. Filtered User Expense Receipts Log (Debit Transactions)
  const filteredTransactions = useMemo(() => {
    return (transactions || [])
      .filter((t) => t.type !== 'Cash In' && t.type !== 'Credit')
      .filter((t) => {
        if (!isDateInPeriod(t.date)) return false;
        if (globalUserFilter !== 'All' && t.userName !== globalUserFilter) return false;
        if (expenseUserFilter !== 'All' && t.userName !== expenseUserFilter) return false;

        if (globalSearchQuery.trim()) {
          const query = globalSearchQuery.toLowerCase();
          const fullStr = `${t.userName || ''} ${t.category || ''} ${t.description || ''} ${t.notes || ''} ${t.depositTo || ''} ${t.amount || ''} ${t.date || ''}`.toLowerCase();
          if (!fullStr.includes(query)) return false;
        }

        if (expenseSearchQuery.trim()) {
          const query = expenseSearchQuery.toLowerCase();
          const fullStr = `${t.userName || ''} ${t.category || ''} ${t.description || ''} ${t.notes || ''} ${t.depositTo || ''} ${t.amount || ''} ${t.date || ''}`.toLowerCase();
          if (!fullStr.includes(query)) return false;
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

  // 3. Filtered Vault Capital & Bank Deposits Log
  const filteredVaultDeposits = useMemo(() => {
    return (vaultDeposits || []).filter((d) => {
      if (isDepositDue && isDepositDue(d)) return false;
      if (!isDateInPeriod(d.date)) return false;
      if (globalUserFilter !== 'All' && d.userName && d.userName !== globalUserFilter) return false;

      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const fullStr = `${d.userName || ''} ${d.depositTo || ''} ${d.notes || ''} ${d.amount || ''} ${d.date || ''}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }

      if (depositSearchQuery.trim()) {
        const query = depositSearchQuery.toLowerCase();
        const fullStr = `${d.userName || ''} ${d.depositTo || ''} ${d.notes || ''} ${d.amount || ''} ${d.date || ''}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }

      return true;
    });
  }, [
    vaultDeposits,
    isDepositDue,
    filterPeriod,
    customStartDate,
    customEndDate,
    globalUserFilter,
    globalSearchQuery,
    depositSearchQuery
  ]);

  // 4. Filtered Entry Edit Audit Log (auto-hides logs for deleted entries)
  const filteredEditLogs = useMemo(() => {
    const validEntryIds = new Set([
      ...(transactions || []).map(t => t.id),
      ...(allocationsHistory || []).map(a => a.id),
      ...(vaultDeposits || []).map(v => v.id)
    ]);

    return (editLogs || []).filter((log) => {
      if (log.txnId && log.txnId !== 'N/A' && !validEntryIds.has(log.txnId)) {
        return false;
      }

      if (!isDateInPeriod(log.date)) return false;
      if (globalUserFilter !== 'All' && log.editorName !== globalUserFilter) return false;

      if (globalSearchQuery.trim()) {
        const query = globalSearchQuery.toLowerCase();
        const fullStr = `${log.editorName || ''} ${log.entrySummary || ''} ${log.changeDetails || ''} ${log.date || ''} ${log.time || ''}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
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

  // Summary totals for filtered views
  const totalFilteredTransfers = useMemo(() => {
    return filteredAllocations.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredAllocations]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredExpensesDone = useMemo(() => {
    return filteredTransactions
      .filter(t => (t.status || 'Done') === 'Done')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredExpensesDue = useMemo(() => {
    return filteredTransactions
      .filter(t => (t.status || 'Done') === 'Due')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalFilteredDeposits = useMemo(() => {
    return filteredVaultDeposits.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredVaultDeposits]);

  const totalFilteredCashDeposits = useMemo(() => {
    return filteredVaultDeposits
      .filter(d => !isBankDestination || !isBankDestination(d.depositTo))
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredVaultDeposits, isBankDestination]);

  const totalFilteredBankDeposits = useMemo(() => {
    return filteredVaultDeposits
      .filter(d => isBankDestination && isBankDestination(d.depositTo))
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }, [filteredVaultDeposits, isBankDestination]);

  // Edit Audit Handlers
  const handleOpenEditAuditModal = (log) => {
    setEditingAuditLog(log);
    setEditAuditForm({
      editorName: log.editorName || '',
      txnType: log.txnType || 'Entry',
      entrySummary: log.entrySummary || '',
      changeDetails: log.changeDetails || '',
      date: log.date || getTodayYMD(),
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

  // Print Handler (Full Audit or Target Section)
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

    const originalTitle = document.title;
    const targetTitles = {
      all: 'Shukan_Full_Financial_Audit_Report',
      transfers: 'Shukan_Money_Transfer_Ledger',
      expenses: 'Shukan_Expense_Receipts_Ledger',
      deposits: 'Shukan_Vault_Deposits_Ledger',
      edits: 'Shukan_Entry_Edit_Audit_Log'
    };
    document.title = targetTitles[target] || 'Shukan_Reports';

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('print-target-transfers', 'print-target-expenses', 'print-target-edits');
      }, 1000);
    }, 250);
  };

  // PDF Export Handlers
  const handleExportTransfersPDF = () => {
    exportTransferLogPDF({
      logs: filteredAllocations,
      currency: settings?.currency || '₹',
      filterUser: transferUserFilter !== 'All' ? transferUserFilter : globalUserFilter,
      filterPeriod
    });
  };

  const handleExportExpensesPDF = () => {
    exportExpenseLogPDF({
      transactions: filteredTransactions,
      currency: settings?.currency || '₹',
      filterUser: expenseUserFilter !== 'All' ? expenseUserFilter : globalUserFilter,
      filterPeriod
    });
  };

  const handleExportCombinedPDF = () => {
    exportCombinedAuditPDF({
      logs: filteredAllocations,
      transactions: filteredTransactions,
      currency: settings?.currency || '₹',
      filterUser: globalUserFilter,
      filterPeriod,
      adminVaultBalance,
      totalAllocated: totalFilteredTransfers,
      totalSpent: totalFilteredExpenses
    });
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `SHUKAN PACKAGING - REPORTS STATEMENT\n`;
    csvContent += `Generated On,${formatDate(new Date())}\n`;
    csvContent += `Filter Period,${filterPeriod}\n`;
    csvContent += `User Filter,${globalUserFilter}\n\n`;

    if (activeTab === 'all' || activeTab === 'transfers') {
      csvContent += `--- COMPANY MONEY TRANSFERS ---\n`;
      csvContent += `Sr No,Date,Given To User,Notes,Amount\n`;
      filteredAllocations.forEach((item, index) => {
        csvContent += `${index + 1},"${formatDate(item.date)}","${item.userName || ''}","${(item.notes || '').replace(/"/g, '""')}",${item.amount || 0}\n`;
      });
      csvContent += `Total Transferred,,,,"${totalFilteredTransfers}"\n\n`;
    }

    if (activeTab === 'all' || activeTab === 'expenses') {
      csvContent += `--- USER EXPENSE RECEIPTS ---\n`;
      csvContent += `Sr No,Date,User Name,Account,Category,Description,Status,Amount\n`;
      filteredTransactions.forEach((t, index) => {
        csvContent += `${index + 1},"${formatDate(t.date)}","${t.userName || ''}","${t.depositTo || 'My Hand'}","${t.category || ''}","${(t.description || '').replace(/"/g, '""')}","${t.status || 'Done'}",${t.amount || 0}\n`;
      });
      csvContent += `Total Expenses,,,,,,,"${totalFilteredExpenses}"\n\n`;
    }

    if (activeTab === 'all' || activeTab === 'deposits') {
      csvContent += `--- VAULT & BANK DEPOSITS ---\n`;
      csvContent += `Sr No,Date,User Name,Deposit To,Notes,Status,Amount\n`;
      filteredVaultDeposits.forEach((d, index) => {
        csvContent += `${index + 1},"${formatDate(d.date)}","${d.userName || 'Vraj'}","${d.depositTo || 'Company Wallet'}","${(d.notes || '').replace(/"/g, '""')}","${d.status || 'Done'}",${d.amount || 0}\n`;
      });
      csvContent += `Total Deposited,,,,,,"${totalFilteredDeposits}"\n\n`;
    }

    if (activeTab === 'all' || activeTab === 'edits') {
      csvContent += `--- ENTRY EDIT AUDIT LOG ---\n`;
      csvContent += `Sr No,Date,Time,Editor Name,Type,Entry Summary,Changes Made\n`;
      filteredEditLogs.forEach((l, index) => {
        csvContent += `${index + 1},"${formatDate(l.date)}","${l.time || ''}","${l.editorName || ''}","${l.txnType || ''}","${(l.entrySummary || '').replace(/"/g, '""')}","${(l.changeDetails || '').replace(/"/g, '""')}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Shukan_Reports_${activeTab}_${getTodayYMD()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setDepositSearchQuery('');
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-5 max-w-7xl mx-auto print:hidden">
        {/* Top Header & Action Toolbar */}
        <div className="bg-white/80 backdrop-blur-md p-3 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#002B49] text-[#c69255] flex items-center justify-center font-bold shadow-xs shrink-0">
                <svg className="w-4 h-4 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-[#002B49] tracking-tight leading-tight">
                  Reports & Statements
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium hidden sm:block">
                  Audit logs, money transfers, expense receipts, vault capital deposits, and statements
                </p>
              </div>
            </div>

            {/* Action Toolbar Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black transition cursor-pointer border shadow-2xs ${
                  hasActiveFilters
                    ? 'bg-[#002B49] text-white border-[#002B49] ring-2 ring-[#c69255]/50'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters {hasActiveFilters && <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-[#c69255] text-white">Active</span>}
              </button>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Download CSV file"
              >
                <svg className="w-3.5 h-3.5 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>

              <button
                onClick={handleExportCombinedPDF}
                className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold shadow-2xs transition cursor-pointer"
                title="Download Full Audit PDF"
              >
                <svg className="w-3.5 h-3.5 mr-1 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>

              <button
                onClick={() => handlePrint(activeTab === 'all' ? 'all' : activeTab)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-[11px] sm:text-xs font-black shadow-md transition cursor-pointer whitespace-nowrap"
                title="Print Current Statement / Ledger View"
              >
                <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Quick Date Presets, Search & Tabs Strip */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5 sm:space-y-3">
          {/* Row 1: Period Presets (All visible at once with flex-wrap) + Search & User Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Period Presets displayed all at once */}
            <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 mr-0.5 shrink-0">Period:</span>
              {['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'YTD', 'Custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                    filterPeriod === period
                      ? 'bg-[#002B49] text-white shadow-xs font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {period === 'All' ? 'All Time' : period}
                </button>
              ))}
            </div>

            {/* Quick Search & User Filters */}
            <div className="flex items-center gap-2 flex-col sm:flex-row w-full lg:w-auto">
              <select
                value={globalUserFilter}
                onChange={(e) => setGlobalUserFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs rounded-xl bg-slate-50 text-slate-800 font-bold border border-slate-200 focus:outline-none shrink-0"
              >
                <option value="All">All Users & Accounts</option>
                <option value="Shukan Company">Shukan Company</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>

              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search in reports..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 text-slate-800 font-medium border border-slate-200 focus:outline-none sm:w-48 lg:w-56"
                />
                <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {globalSearchQuery && (
                  <button
                    onClick={() => setGlobalSearchQuery('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Custom Date Range Selectors (visible when Custom is selected) */}
          {filterPeriod === 'Custom' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-[11px] sm:text-xs font-bold text-slate-600">Range:</span>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="flex-1 sm:flex-none px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-semibold text-slate-700 bg-slate-50"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="flex-1 sm:flex-none px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-semibold text-slate-700 bg-slate-50"
                />
              </div>
            </div>
          )}

          {/* Row 2: Active Filter Chips & View Tabs Strip (All visible at once) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
            {/* Active Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-slate-400">Active:</span>
              {!hasActiveFilters && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  All Records
                </span>
              )}
              {filterPeriod !== 'All' && (
                <span className="text-[11px] font-bold bg-amber-50 text-[#9e6e34] border border-[#c69255]/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  {filterPeriod}
                  <button onClick={() => setFilterPeriod('All')} className="text-slate-400 hover:text-red-500 ml-0.5 font-bold">×</button>
                </span>
              )}
              {globalUserFilter !== 'All' && (
                <span className="text-[11px] font-bold bg-blue-50 text-[#002B49] border border-[#002B49]/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  User: {globalUserFilter}
                  <button onClick={() => setGlobalUserFilter('All')} className="text-slate-400 hover:text-red-500 ml-0.5 font-bold">×</button>
                </span>
              )}
              {globalSearchQuery && (
                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                  Search: "{globalSearchQuery}"
                  <button onClick={() => setGlobalSearchQuery('')} className="text-slate-400 hover:text-red-500 ml-0.5 font-bold">×</button>
                </span>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline ml-1 cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* View Tabs Selector (All displayed at once with flex-wrap) */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none justify-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[#002B49] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span>All Reports</span>
              </button>

              <button
                onClick={() => setActiveTab('transfers')}
                className={`flex-1 sm:flex-none justify-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'transfers'
                    ? 'bg-[#002B49] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span>Transfers</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                  activeTab === 'transfers' ? 'bg-[#c69255] text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {filteredAllocations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 sm:flex-none justify-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'expenses'
                    ? 'bg-[#002B49] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span>Expenses</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                  activeTab === 'expenses' ? 'bg-[#c69255] text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {filteredTransactions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('deposits')}
                className={`flex-1 sm:flex-none justify-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'deposits'
                    ? 'bg-[#002B49] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span>Vault Deposits</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                  activeTab === 'deposits' ? 'bg-[#c69255] text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {filteredVaultDeposits.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('edits')}
                className={`flex-1 sm:flex-none justify-center px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'edits'
                    ? 'bg-[#002B49] text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span>Edited Entries</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black ${
                  activeTab === 'edits' ? 'bg-[#c69255] text-white' : 'bg-slate-200/80 text-slate-700'
                }`}>
                  {filteredEditLogs.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div id="reports-kpi-summary" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Card 1: Vault Cash Balance */}
          <div
            onClick={() => navigate('/admin/deposit-allocate', { state: { activeTab: 'Add Money' } })}
            className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-l-3 sm:border-l-4 border-l-[#002B49] cursor-pointer hover:shadow-md transition-all bg-white"
            title="Click to view Vault Deposits"
          >
            <p className="text-[9.5px] sm:text-xs uppercase font-black text-slate-500 truncate">Admin Vault Reserve</p>
            <p className="text-sm sm:text-xl font-black text-[#002B49] mt-0.5 sm:mt-1 truncate">
              {settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8.5px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">Available Cash in Hand</p>
          </div>

          {/* Card 2: Filtered Money Transferred */}
          <div
            onClick={() => { setActiveTab('transfers'); }}
            className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-l-3 sm:border-l-4 border-l-[#c69255] cursor-pointer hover:shadow-md transition-all bg-white"
            title="Click to view Money Transfers"
          >
            <p className="text-[9.5px] sm:text-xs uppercase font-black text-slate-500 truncate">Money Transferred</p>
            <p className="text-sm sm:text-xl font-black text-[#9e6e34] mt-0.5 sm:mt-1 truncate">
              {settings?.currency || '₹'}{(totalFilteredTransfers || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8.5px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">{filteredAllocations.length} Transfer Logs</p>
          </div>

          {/* Card 3: Filtered Expenses Spent */}
          <div
            onClick={() => { setActiveTab('expenses'); }}
            className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-l-3 sm:border-l-4 border-l-indigo-600 cursor-pointer hover:shadow-md transition-all bg-white"
            title="Click to view Expense Receipts"
          >
            <p className="text-[9.5px] sm:text-xs uppercase font-black text-slate-500 truncate">Expenses Spent</p>
            <p className="text-sm sm:text-xl font-black text-indigo-950 mt-0.5 sm:mt-1 truncate">
              {settings?.currency || '₹'}{(totalFilteredExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8.5px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">{filteredTransactions.length} Expense Receipts</p>
          </div>

          {/* Card 4: Filtered Vault Deposits */}
          <div
            onClick={() => { setActiveTab('deposits'); }}
            className="glass-card p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-l-3 sm:border-l-4 border-l-emerald-600 cursor-pointer hover:shadow-md transition-all bg-white"
            title="Click to view Vault Deposits"
          >
            <p className="text-[9.5px] sm:text-xs uppercase font-black text-slate-500 truncate">Total Deposited</p>
            <p className="text-sm sm:text-xl font-black text-emerald-800 mt-0.5 sm:mt-1 truncate">
              {settings?.currency || '₹'}{(totalFilteredDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8.5px] sm:text-xs text-slate-400 font-bold mt-0.5 truncate">{filteredVaultDeposits.length} Deposit Entries</p>
          </div>
        </div>

        {/* SECTION 1: Company Money Transfer Log */}
        {(activeTab === 'all' || activeTab === 'transfers') && (
          <div id="report-transfers-card" className="glass-card p-3 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 bg-white border border-slate-200/90 shadow-xs">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c69255]"></span>
                  <h2 className="text-sm sm:text-base font-black text-[#002B49]">Company Money Transfer Log</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-[#9e6e34]/10 text-[#9e6e34]">
                    {filteredAllocations.length}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Total Allocated: <span className="font-bold text-[#9e6e34]">{settings?.currency || '₹'}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={handleExportTransfersPDF}
                  className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => handlePrint('transfers')}
                  className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print this specific report"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Log
                </button>
              </div>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-2">
              {filteredAllocations.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No money transfer logs match the selected filter.
                </div>
              ) : (
                filteredAllocations.map((log, index) => (
                  <div key={log.id || index} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] font-black text-slate-400">#{index + 1}</span>
                        <span className="text-xs font-black text-[#002B49] truncate">{log.userName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold shrink-0">{formatDate(log.date)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-600 font-medium truncate max-w-[170px]">
                        {log.notes || 'Company Cash Allocation'}
                      </div>
                      <div className="font-black text-[#9e6e34] shrink-0">
                        +{settings?.currency || '₹'}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-amber-50/70 text-amber-950 border-b border-amber-200/80 font-black">
                  <tr>
                    <th className="py-2.5 px-3.5 font-extrabold text-center w-12">#</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Date</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Given To User</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Notes / Purpose</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-right">Amount Given</th>
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
                      <tr key={log.id || index} className="hover:bg-amber-50/30 transition">
                        <td className="py-2.5 px-3.5 font-bold text-slate-500 text-xs text-center">{index + 1}</td>
                        <td className="py-2.5 px-3.5 text-xs font-semibold text-slate-600">{formatDate(log.date)}</td>
                        <td className="py-2.5 px-3.5 font-extrabold text-[#002B49] text-xs">{log.userName}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs font-medium">{log.notes || '-'}</td>
                        <td className="py-2.5 px-3.5 font-black text-right text-[#9e6e34] text-xs">
                          +{settings?.currency || '₹'}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredAllocations.length > 0 && (
                  <tfoot className="bg-amber-50/60 font-black border-t-2 border-amber-200">
                    <tr>
                      <td colSpan="4" className="py-2.5 px-3.5 text-right text-xs uppercase text-slate-700">Total Money Transferred:</td>
                      <td className="py-2.5 px-3.5 text-right text-xs text-[#9e6e34] font-black">
                        +{settings?.currency || '₹'}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: User Expense Receipts Log */}
        {(activeTab === 'all' || activeTab === 'expenses') && (
          <div id="report-expenses-card" className="glass-card p-3 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 bg-white border border-slate-200/90 shadow-xs">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <h2 className="text-sm sm:text-base font-black text-[#002B49]">User Expense Receipts Log</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-indigo-50 text-indigo-900">
                    {filteredTransactions.length}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Total: <span className="font-bold text-[#002B49]">{settings?.currency || '₹'}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="text-emerald-700 font-bold ml-2">Done: {settings?.currency || '₹'}{totalFilteredExpensesDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  {totalFilteredExpensesDue > 0 && <span className="text-rose-700 font-bold ml-2">Due: {settings?.currency || '₹'}{totalFilteredExpensesDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={handleExportExpensesPDF}
                  className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => handlePrint('expenses')}
                  className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print this specific report"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Log
                </button>
              </div>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-2">
              {filteredTransactions.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No expense receipt logs match the selected filter.
                </div>
              ) : (
                filteredTransactions.map((t, index) => (
                  <div key={t.id || index} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] font-black text-slate-400">#{index + 1}</span>
                        <span className="text-xs font-black text-[#002B49] truncate">{t.userName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          (t.status || 'Done') === 'Done' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.status || 'Done'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold shrink-0">{formatDate(t.date)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-600 font-medium truncate max-w-[170px]">
                        {t.description || 'Expense Entry'}
                      </div>
                      <div className="font-black text-slate-900 shrink-0">
                        {settings?.currency || '₹'}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-slate-100/90 text-slate-700 border-b border-slate-200 font-black">
                  <tr>
                    <th className="py-2.5 px-3.5 font-extrabold text-center w-12">#</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Date</th>
                    <th className="py-2.5 px-3.5 font-extrabold">User Name</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Account</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Description / Notes</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-center">Status</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500 text-xs font-medium">
                        No expense receipt logs match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, index) => (
                      <tr key={t.id || index} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3.5 font-bold text-slate-500 text-xs text-center">{index + 1}</td>
                        <td className="py-2.5 px-3.5 text-xs font-semibold text-slate-600">{formatDate(t.date)}</td>
                        <td className="py-2.5 px-3.5 font-extrabold text-[#002B49] text-xs">{t.userName}</td>
                        <td className="py-2.5 px-3.5 text-xs font-bold text-slate-600">{t.depositTo || 'My Hand'}</td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs font-medium max-w-xs truncate">{t.description || '-'}</td>
                        <td className="py-2.5 px-3.5 text-center text-xs">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            (t.status || 'Done') === 'Done' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.status || 'Done'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-black text-right text-slate-900 text-xs">
                          {settings?.currency || '₹'}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredTransactions.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-black border-t-2 border-slate-200">
                    <tr>
                      <td colSpan="6" className="py-2.5 px-3.5 text-right text-xs uppercase text-slate-700">Total Expenses:</td>
                      <td className="py-2.5 px-3.5 text-right text-xs text-[#002B49] font-black">
                        {settings?.currency || '₹'}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: Vault & Bank Deposits Log */}
        {(activeTab === 'all' || activeTab === 'deposits') && (
          <div id="report-deposits-card" className="glass-card p-3 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 bg-white border border-slate-200/90 shadow-xs">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <h2 className="text-sm sm:text-base font-black text-[#002B49]">Vault & Bank Capital Deposits</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-50 text-emerald-900">
                    {filteredVaultDeposits.length}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Total: <span className="font-bold text-emerald-800">{settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="text-slate-600 font-bold ml-2">Cash: {settings?.currency || '₹'}{totalFilteredCashDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="text-indigo-700 font-bold ml-2">Bank: {settings?.currency || '₹'}{totalFilteredBankDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => handlePrint('deposits')}
                  className="inline-flex items-center px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print this specific report"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Log
                </button>
              </div>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-2">
              {filteredVaultDeposits.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No vault deposits match the selected filter.
                </div>
              ) : (
                filteredVaultDeposits.map((d, index) => (
                  <div key={d.id || index} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] font-black text-slate-400">#{index + 1}</span>
                        <span className="text-xs font-black text-[#002B49] truncate">{(d.userName && d.userName !== 'Shukan Admin') ? d.userName : 'Vraj'}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isBankDestination && isBankDestination(d.depositTo) ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {d.depositTo || 'Company Wallet'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold shrink-0">{formatDate(d.date)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="text-[11px] text-slate-600 font-medium truncate max-w-[170px]">
                        {d.notes || 'Vault Capital Deposit'}
                      </div>
                      <div className="font-black text-emerald-800 shrink-0">
                        +{settings?.currency || '₹'}{(parseFloat(d.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-emerald-50/70 text-emerald-950 border-b border-emerald-200/80 font-black">
                  <tr>
                    <th className="py-2.5 px-3.5 font-extrabold text-center w-12">#</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Date</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Deposited By</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Deposit Destination</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Notes / Description</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVaultDeposits.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500 text-xs font-medium">
                        No vault deposits match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredVaultDeposits.map((d, index) => (
                      <tr key={d.id || index} className="hover:bg-emerald-50/30 transition">
                        <td className="py-2.5 px-3.5 font-bold text-slate-500 text-xs text-center">{index + 1}</td>
                        <td className="py-2.5 px-3.5 text-xs font-semibold text-slate-600">{formatDate(d.date)}</td>
                        <td className="py-2.5 px-3.5 font-extrabold text-[#002B49] text-xs">{(d.userName && d.userName !== 'Shukan Admin') ? d.userName : 'Vraj'}</td>
                        <td className="py-2.5 px-3.5 text-xs font-bold text-indigo-900">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isBankDestination && isBankDestination(d.depositTo) ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {d.depositTo || 'Company Wallet'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-xs font-medium">{d.notes || 'Vault Capital Deposit'}</td>
                        <td className="py-2.5 px-3.5 font-black text-right text-emerald-800 text-xs">
                          +{settings?.currency || '₹'}{(parseFloat(d.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredVaultDeposits.length > 0 && (
                  <tfoot className="bg-emerald-50/60 font-black border-t-2 border-emerald-200">
                    <tr>
                      <td colSpan="5" className="py-2.5 px-3.5 text-right text-xs uppercase text-slate-700">Total Deposited:</td>
                      <td className="py-2.5 px-3.5 text-right text-xs text-emerald-800 font-black">
                        +{settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: Entry Edit Audit Log */}
        {(activeTab === 'all' || activeTab === 'edits') && (
          <div id="report-edits-card" className="glass-card p-3 sm:p-5 rounded-2xl space-y-3 sm:space-y-4 bg-white border border-slate-200/90 shadow-xs">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  <h2 className="text-sm sm:text-base font-black text-[#002B49]">Entry Edit Audit Log</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    {filteredEditLogs.length} Logs
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Audit history of modified entries showing editor name, changes made, and timestamps
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                <button
                  onClick={handleDeleteLastMonthLogs}
                  disabled={isDeletingLastMonth}
                  className="inline-flex items-center justify-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[11px] sm:text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Purge audit logs older than current month"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {isDeletingLastMonth ? 'Deleting...' : 'Delete Last Month'}
                </button>

                <button
                  onClick={() => handlePrint('edits')}
                  className="inline-flex items-center justify-center px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Print Audit Report"
                >
                  <svg className="w-3.5 h-3.5 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-2">
              {filteredEditLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No entry edit logs match the selected filter.
                </div>
              ) : (
                filteredEditLogs.map((log, index) => (
                  <div key={log.id || index} className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] font-black text-slate-400">#{index + 1}</span>
                        <span className="text-xs font-black text-[#002B49] truncate">{log.editorName}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 shrink-0">{log.txnType}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-700 font-bold">{formatDate(log.date)}</div>
                        <div className="text-[9px] text-slate-400 font-medium">{log.time}</div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 space-y-1 text-xs">
                      <div className="text-slate-800 font-bold break-words">{log.entrySummary}</div>
                      <div className="text-[10px] text-amber-900 font-semibold bg-amber-50 p-1.5 rounded-lg border border-amber-200/80 break-words">
                        <span className="font-black uppercase text-[8.5px] text-amber-700 block mb-0.5">Changes:</span>
                        {log.changeDetails}
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-slate-100">
                        {log.txnType !== 'Bulk Delete' && (
                          <button
                            onClick={() => handleRevertAuditLog(log)}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold"
                          >
                            Revert Old
                          </button>
                        )}
                        <div className="flex items-center space-x-1 ml-auto">
                          <button
                            onClick={() => handleOpenEditAuditModal(log)}
                            className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAuditLog(log.id)}
                            className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold"
                          >
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
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-amber-50 text-amber-950 border-b border-amber-200 font-black">
                  <tr>
                    <th className="py-2.5 px-3.5 font-extrabold text-center w-12">#</th>
                    <th className="py-2.5 px-3.5 font-extrabold">User Name</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Edited Entry</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Changes Made</th>
                    <th className="py-2.5 px-3.5 font-extrabold">Date</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-right">Time</th>
                    <th className="py-2.5 px-3.5 font-extrabold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500 text-xs font-medium">
                        No entry edit logs match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEditLogs.map((log, index) => (
                      <tr key={log.id || index} className="hover:bg-amber-50/40 transition">
                        <td className="py-2.5 px-3.5 font-bold text-slate-500 text-xs text-center">{index + 1}</td>
                        <td className="py-2.5 px-3.5 font-black text-[#002B49] text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-[#002B49] text-xs border border-slate-200 font-extrabold">
                            👤 {log.editorName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-800 text-xs max-w-xs truncate">
                          {log.txnType === 'Bulk Delete' && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 mr-1 shrink-0">
                              BULK DELETE
                            </span>
                          )}
                          {log.entrySummary}
                        </td>
                        <td className="py-2.5 px-3.5 text-xs font-semibold text-amber-900">
                          <span className={`px-2 py-0.5 rounded-lg border inline-block font-bold ${
                            log.txnType === 'Bulk Delete' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200'
                          }`}>
                            {log.changeDetails}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-xs font-bold text-slate-600">{formatDate(log.date)}</td>
                        <td className="py-2.5 px-3.5 text-xs font-extrabold text-right text-[#002B49] whitespace-nowrap">{log.time}</td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            {log.txnType !== 'Bulk Delete' && (
                              <button
                                onClick={() => handleRevertAuditLog(log)}
                                className="p-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                                title="Revert Edit & Restore Original Entry"
                              >
                                <svg className="w-3.5 h-3.5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditAuditModal(log)}
                              className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                              title="Edit Audit Log Entry"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteAuditLog(log.id)}
                              className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                              title="Delete Audit Log Entry"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* FILTER POPUP MODAL */}
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
            <div className="bg-white w-full max-w-lg p-4 sm:p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 my-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30 shrink-0">
                    <svg className="w-5 h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#002B49]">Filter Audit Reports</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Customize time periods, users, and search terms</p>
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
              <div className="space-y-3.5">
                {/* 1. Time Period */}
                <div>
                  <label className="block text-xs font-black text-[#002B49] uppercase tracking-wider mb-1">Time Period</label>
                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-bold border border-slate-200"
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="Last Month">Last Month</option>
                    <option value="This Quarter">This Quarter</option>
                    <option value="YTD">Year to Date (YTD)</option>
                    <option value="Custom">Custom Date Range</option>
                  </select>
                </div>

                {/* Custom Date Inputs if Custom selected */}
                {filterPeriod === 'Custom' && (
                  <div className="grid grid-cols-2 gap-2.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        max={customEndDate || undefined}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        min={customStartDate || undefined}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Global User / Account Selection */}
                <div>
                  <label className="block text-xs font-black text-[#002B49] uppercase tracking-wider mb-1">Global User / Account</label>
                  <select
                    value={globalUserFilter}
                    onChange={(e) => setGlobalUserFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-bold border border-slate-200"
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
                  <label className="block text-xs font-black text-[#002B49] uppercase tracking-wider mb-1">Search Keywords</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search notes, description, user, or amount..."
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-medium border border-slate-200"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Footer Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <button
                  onClick={clearAllFilters}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT AUDIT LOG POPUP MODAL */}
        {isEditAuditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
            <div className="bg-white w-full max-w-lg p-4 sm:p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 my-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-200 shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#002B49]">Edit Audit Log Entry</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Modify record details for audit history log</p>
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

              <form onSubmit={handleSaveAuditEdit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
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

                <div className="grid grid-cols-2 gap-2.5">
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

                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRevertAuditLog(editingAuditLog)}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black transition cursor-pointer flex items-center justify-center shrink-0"
                    title="Revert edit and restore entry back to original values"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5 text-amber-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Revert Old Entry
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditAuditModalOpen(false)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer text-center whitespace-nowrap"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 🖨️ DEDICATED PRINT-ONLY LEDGER REPORT (Strict Standard A4 B&W Structure Matching Other Pages) */}
      <div className="hidden print:block print-ledger-report">
        {/* 1. Official Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3 print-header">
          <h1 className="text-xl font-bold uppercase text-black tracking-wider">SHUKAN PACKAGING</h1>
          <h2 className="text-xs font-bold text-black uppercase mt-0.5">
            {printTarget === 'edits'
              ? 'ENTRY EDIT AUDIT LOG'
              : printTarget === 'transfers'
              ? 'COMPANY MONEY TRANSFER STATEMENT'
              : printTarget === 'expenses'
              ? 'USER EXPENSE RECEIPTS & PAYMENT LEDGER'
              : printTarget === 'deposits'
              ? 'VAULT & BANK CAPITAL DEPOSITS STATEMENT'
              : 'COMPREHENSIVE FINANCIAL AUDIT & EXPENSE STATEMENT'}
          </h2>
          <div className="text-[9pt] font-normal text-black mt-1 flex items-center justify-center space-x-2">
            <span>Date Printed: {formatDate(new Date())}</span>
            {globalUserFilter !== 'All' && <span>| User: {globalUserFilter}</span>}
            {filterPeriod !== 'All' && <span>| Period: {filterPeriod}</span>}
          </div>
        </div>

        {/* 2. Print Summary Metrics Grid */}
        <div className="credit-summary-print-wrapper">
          <div className="credit-summary-print-grid">
            {/* Card 1: Vault Cash Balance */}
            <div className="print-card">
              <div className="card-title">VAULT CASH RESERVE</div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Cash in Vault</span>
                  <span className="card-value">{settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card-row">
                  <span className="card-label">Total Spent</span>
                  <span className="card-value">{settings?.currency || '₹'}{(totalCashOut || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">AVAILABLE CASH</span>
                <span className="card-value">{settings?.currency || '₹'}{(adminVaultBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Card 2: Money Transferred */}
            <div className="print-card">
              <div className="card-title">TRANSFERS TO TEAM</div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Total Records</span>
                  <span className="card-value">{filteredAllocations.length} Logs</span>
                </div>
                <div className="card-row">
                  <span className="card-label">Selected Period</span>
                  <span className="card-value">{filterPeriod}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">TOTAL TRANSFERRED</span>
                <span className="card-value">{settings?.currency || '₹'}{(totalFilteredTransfers || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Card 3: Expenses */}
            <div className="print-card">
              <div className="card-title">USER EXPENSES</div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Done Expenses</span>
                  <span className="card-value">{settings?.currency || '₹'}{(totalFilteredExpensesDone || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card-row">
                  <span className="card-label">Due Expenses</span>
                  <span className="card-value">{settings?.currency || '₹'}{(totalFilteredExpensesDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">TOTAL EXPENSES</span>
                <span className="card-value">{settings?.currency || '₹'}{(totalFilteredExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Card 4: Vault Deposits */}
            <div className="print-card">
              <div className="card-title">VAULT DEPOSITS</div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">Cash Deposits</span>
                  <span className="card-value">{settings?.currency || '₹'}{(totalFilteredCashDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="card-row">
                  <span className="card-label">Bank Deposits</span>
                  <span className="card-value">{settings?.currency || '₹'}{(totalFilteredBankDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="card-total">
                <span className="card-label">TOTAL DEPOSITED</span>
                <span className="card-value">{settings?.currency || '₹'}{(totalFilteredDeposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: COMPANY MONEY TRANSFER LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'transfers') && (
          <div className="mb-4 print-section">
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  1. Company Money Transfer Statement (Allocations)
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredAllocations.length} Records | Total: {settings?.currency || '₹'}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '13%' }} className="date-cell">DATE</th>
                  <th style={{ width: '22%' }} className="user-cell">GIVEN TO USER</th>
                  <th className="description-cell">NOTES / PURPOSE</th>
                  <th style={{ width: '18%' }} className="amount-cell text-right">AMOUNT GIVEN</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-3">
                      No money transfer logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredAllocations.map((log, index) => (
                      <tr key={log.id || index}>
                        <td className="sr-cell text-center">{index + 1}</td>
                        <td className="date-cell">{formatDate(log.date)}</td>
                        <td className="user-cell font-bold">{log.userName}</td>
                        <td className="description-cell">{log.notes || '-'}</td>
                        <td className="amount-cell text-right font-bold">
                          +{settings?.currency || '₹'}{(parseFloat(log.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={4} className="total-label text-right uppercase font-black">Total Money Transferred:</td>
                      <td className="total-amount text-right font-black">
                        +{settings?.currency || '₹'}{totalFilteredTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: USER EXPENSE RECEIPTS LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'expenses') && (
          <div className={`mb-4 print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  2. User Expense Receipts & Payment Ledger
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredTransactions.length} Receipts | Total: {settings?.currency || '₹'}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '11%' }} className="date-cell">DATE</th>
                  <th style={{ width: '16%' }} className="user-cell">USER NAME</th>
                  <th style={{ width: '14%' }} className="account-cell">ACCOUNT</th>
                  <th className="description-cell">DESCRIPTION / PURPOSE</th>
                  <th style={{ width: '8%' }} className="status-cell text-center">STATUS</th>
                  <th style={{ width: '15%' }} className="amount-cell text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-3">
                      No expense receipt logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredTransactions.map((t, index) => (
                      <tr key={t.id || index}>
                        <td className="sr-cell text-center">{index + 1}</td>
                        <td className="date-cell">{formatDate(t.date)}</td>
                        <td className="user-cell font-bold">{t.userName}</td>
                        <td className="account-cell">{t.depositTo || 'My Hand'}</td>
                        <td className="description-cell">{t.description || '-'}</td>
                        <td className="status-cell text-center font-bold">{t.status ? t.status.toUpperCase() : 'DONE'}</td>
                        <td className="amount-cell text-right font-bold">
                          {settings?.currency || '₹'}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={6} className="total-label text-right uppercase font-black">Total Expenses Spent:</td>
                      <td className="total-amount text-right font-black">
                        {settings?.currency || '₹'}{totalFilteredExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 3: VAULT CAPITAL DEPOSITS LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'deposits') && (
          <div className={`mb-4 print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  3. Vault & Bank Capital Deposits Ledger
                </h2>
                <span className="text-[8.5pt] font-semibold text-black">
                  {filteredVaultDeposits.length} Entries | Total: {settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '7%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '13%' }} className="date-cell">DATE</th>
                  <th style={{ width: '18%' }} className="user-cell">DEPOSITED BY</th>
                  <th style={{ width: '20%' }} className="account-cell">DEPOSIT DESTINATION</th>
                  <th className="description-cell">NOTES / PURPOSE</th>
                  <th style={{ width: '18%' }} className="amount-cell text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {filteredVaultDeposits.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-3">
                      No vault deposits match the selected filter.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredVaultDeposits.map((d, index) => (
                      <tr key={d.id || index}>
                        <td className="sr-cell text-center">{index + 1}</td>
                        <td className="date-cell">{formatDate(d.date)}</td>
                        <td className="user-cell font-bold">{(d.userName && d.userName !== 'Shukan Admin') ? d.userName : 'Vraj'}</td>
                        <td className="account-cell font-bold">{d.depositTo || 'Company Wallet'}</td>
                        <td className="description-cell">{d.notes || 'Vault Capital Deposit'}</td>
                        <td className="amount-cell text-right font-bold">
                          +{settings?.currency || '₹'}{(parseFloat(d.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="print-total-row">
                      <td colSpan={5} className="total-label text-right uppercase font-black">Total Deposited:</td>
                      <td className="total-amount text-right font-black">
                        +{settings?.currency || '₹'}{totalFilteredDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 4: ENTRY EDIT AUDIT LOG TABLE */}
        {(printTarget === 'all' || printTarget === 'edits') && (
          <div className={`mb-4 print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  4. Entry Edit Audit Log
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
                    <td colSpan="6" className="text-center py-3">
                      No entry edit logs match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredEditLogs.map((log, index) => (
                    <tr key={log.id || index}>
                      <td className="sr-cell text-center">{index + 1}</td>
                      <td className="user-cell font-bold">{log.editorName}</td>
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

        {/* Print Footer */}
        <div className="pt-3 text-center border-t border-black text-[8pt] text-black print-footer mt-4">
          <span>Shukan Packaging - Expense Management Software</span>
        </div>
      </div>
    </>
  );
};

export default Reports;
