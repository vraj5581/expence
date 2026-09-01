import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { getTodayYMD, formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const Settings = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    settings,
    updateSettings,
    deleteTransaction,
    deleteVaultDeposit,
    deleteAllocation,
    transactions,
    vaultDeposits,
    allocationsHistory,
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    recordEditLog
  } = useExpense();
  const { user, changePassword } = useAuth();

  const currentUserInDb = users?.find(u => u.id === user?.id || u.name?.toLowerCase() === user?.name?.toLowerCase());
  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator' || currentUserInDb?.role === 'Administrator';

  const [activeTab, setActiveTab] = useState(() => {
    if (!isAdmin) return 'password';
    return searchParams.get('tab') || location.state?.tab || 'general';
  });

  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('password');
      return;
    }
    const targetTab = searchParams.get('tab') || location.state?.tab;
    if (targetTab) {
      setActiveTab(targetTab);
    }
  }, [location.state, searchParams, isAdmin]);

  // Team & User Accounts Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserPasswordMap, setShowUserPasswordMap] = useState({});

  const {
    register: regUser,
    handleSubmit: subUser,
    reset: resetUserForm,
    formState: { errors: errUser, isSubmitting: isUserSubmitting }
  } = useForm();

  const handleOpenAddUserModal = () => {
    setEditingUser(null);
    resetUserForm({
      name: '',
      id: '',
      role: 'Partner',
      password: '',
      status: 'Active'
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (targetUser) => {
    setEditingUser(targetUser);
    resetUserForm({
      name: targetUser.name,
      id: targetUser.id,
      role: targetUser.role || 'Partner',
      password: targetUser.password,
      status: targetUser.status || 'Active'
    });
    setIsUserModalOpen(true);
  };

  const onSubmitUser = async (data) => {
    if (editingUser) {
      const res = await updateUser(editingUser.id, data);
      if (res && res.success) {
        toast.success(`User ${data.name} updated!`, { theme: 'light' });
        setIsUserModalOpen(false);
        resetUserForm();
      } else {
        toast.error(res?.message || 'Failed to update user in PHP database', { theme: 'light' });
      }
    } else {
      const res = await addUser(data);
      if (res && res.success) {
        toast.success(`New user ${data.name} created!`, { theme: 'light' });
        setIsUserModalOpen(false);
        resetUserForm();
      } else {
        toast.error(res?.message || 'Failed to create user in PHP database', { theme: 'light' });
      }
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    const res = await toggleUserStatus(targetUser.id);
    if (res && res.success) {
      toast.info(`Status updated for ${targetUser.name}`, { theme: 'light' });
    } else {
      toast.error(res?.message || 'Failed to update user status in PHP database', { theme: 'light' });
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (window.confirm(`Remove user account "${targetUser.name}"?`)) {
      const res = await deleteUser(targetUser.id);
      if (res && res.success) {
        toast.warning(`User ${targetUser.name} removed.`, { theme: 'light' });
      } else {
        toast.error(res?.message || 'Failed to remove user from PHP database', { theme: 'light' });
      }
    }
  };

  const toggleUserPasswordVisibility = (userId) => {
    setShowUserPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Change Password State
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState(false);

  // Filter-wise Backup State
  const [backupCategory, setBackupCategory] = useState('All');
  const [backupUser, setBackupUser] = useState('All');
  const [backupStartDate, setBackupStartDate] = useState('');
  const [backupEndDate, setBackupEndDate] = useState('');
  const [backupFormat, setBackupFormat] = useState('JSON');

  // Security Delete Password Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dynamic Bank Accounts List State
  const [bankList, setBankList] = useState(() => {
    const raw = settings.banks || 'IOB Bank, BOB Bank';
    return raw.split(',').map(b => b.trim()).filter(Boolean);
  });
  const [newBankInput, setNewBankInput] = useState('');

  useEffect(() => {
    if (settings.banks) {
      const parsed = settings.banks.split(',').map(b => b.trim()).filter(Boolean);
      setBankList(parsed);
    }
  }, [settings.banks]);

  const handleAddBank = (e) => {
    if (e) e.preventDefault();
    const trimmed = newBankInput.trim();
    if (!trimmed) return;
    if (bankList.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already in the bank list`, { theme: 'light' });
      return;
    }
    setBankList([...bankList, trimmed]);
    setNewBankInput('');
    toast.success(`Added "${trimmed}" to bank accounts`, { theme: 'light' });
  };

  const handleRemoveBank = (bankToRemove) => {
    setBankList(bankList.filter(b => b !== bankToRemove));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      toast.error('All password fields are required', { theme: 'light' });
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('New passwords do not match', { theme: 'light' });
      return;
    }
    setPwdLoading(true);
    const res = await changePassword(pwdCurrent, pwdNew, users);
    setPwdLoading(false);
    if (res.success) {
      toast.success('Your password was updated successfully!', { theme: 'light' });
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } else {
      toast.error(res.message || 'Failed to update password', { theme: 'light' });
    }
  };

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      companyName: settings.companyName || 'Shukan Packaging',
      currency: settings.currency || '₹',
      fiscalYearStart: settings.fiscalYearStart || 'April',
      lowBalanceThreshold: settings.lowBalanceThreshold || 10000,
      requireApprovalOver: settings.requireApprovalOver || 5000,
      banks: settings.banks || 'IOB Bank, BOB Bank'
    }
  });

  const onSaveGeneral = async (data) => {
    const res = await updateSettings({
      ...data,
      currency: '₹',
      currencyCode: 'INR',
      banks: bankList.join(', ')
    });

    if (res && res.success) {
      toast.success('System settings updated successfully!', { theme: 'light' });
    } else {
      toast.error(res?.message || 'Failed to update settings in PHP database', { theme: 'light' });
    }
  };

  // Dynamic filter matching calculation
  const getFilteredData = () => {
    const txns = (transactions || []).filter(t => {
      if (backupUser !== 'All' && t.userName !== backupUser) return false;
      if (backupStartDate && t.date < backupStartDate) return false;
      if (backupEndDate && t.date > backupEndDate) return false;
      return true;
    });

    const deposits = (vaultDeposits || []).filter(d => {
      if (backupUser !== 'All' && d.userName !== backupUser) return false;
      if (backupStartDate && d.date < backupStartDate) return false;
      if (backupEndDate && d.date > backupEndDate) return false;
      return true;
    });

    const allocs = (allocationsHistory || []).filter(a => {
      if (backupUser !== 'All' && a.userName !== backupUser) return false;
      if (backupStartDate && a.date < backupStartDate) return false;
      if (backupEndDate && a.date > backupEndDate) return false;
      return true;
    });

    if (backupCategory === 'Expenses') return { total: txns.length, txns, deposits: [], allocs: [] };
    if (backupCategory === 'Deposits') return { total: deposits.length, txns: [], deposits, allocs: [] };
    if (backupCategory === 'Allocations') return { total: allocs.length, txns: [], deposits: [], allocs };
    return { total: txns.length + deposits.length + allocs.length, txns, deposits, allocs };
  };

  const handleExportData = () => {
    const { total, txns, deposits, allocs } = getFilteredData();

    if (total === 0) {
      toast.warning('No matching records found for the selected filter criteria.', { theme: 'light' });
      return;
    }

    const todayStr = getTodayYMD();
    const catSlug = backupCategory.toLowerCase();

    if (backupFormat === 'CSV') {
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      const now = new Date();
      const generatedAt = `${formatDate(now)} ${now.toLocaleTimeString()}`;
      const company = settings.companyName || 'Shukan Packaging';
      const currencySymbol = settings.currency || '₹';

      let totalAmountSum = 0;
      if (backupCategory === 'All' || backupCategory === 'Expenses') {
        txns.forEach(t => { totalAmountSum += Number(t.amount) || 0; });
      }
      if (backupCategory === 'All' || backupCategory === 'Deposits') {
        deposits.forEach(d => { totalAmountSum += Number(d.amount) || 0; });
      }
      if (backupCategory === 'All' || backupCategory === 'Allocations') {
        allocs.forEach(a => { totalAmountSum += Number(a.amount) || 0; });
      }

      let csvLines = [];

      // 1. Executive Summary & Filter Metadata Block
      csvLines.push(`${escapeCSV(company)} - DATA BACKUP & TRANSACTION AUDIT LOG`);
      csvLines.push(`Exported On,${escapeCSV(generatedAt)}`);
      csvLines.push(`Category Filter,${escapeCSV(backupCategory)}`);
      csvLines.push(`User / Partner Filter,${escapeCSV(backupUser)}`);
      csvLines.push(`Date Range,${escapeCSV((backupStartDate ? formatDate(backupStartDate) : 'All Start') + ' to ' + (backupEndDate ? formatDate(backupEndDate) : 'All End'))}`);
      csvLines.push(`Total Matching Records,${total}`);
      csvLines.push(`Total Amount (${currencySymbol}),${totalAmountSum.toFixed(2)}`);
      csvLines.push(''); // Blank separator line before data table

      let recordIndex = 1;

      if (backupCategory === 'Expenses') {
        csvLines.push([
          'Sr No',
          'Transaction ID',
          'Date',
          'User / Partner',
          'Category',
          'Paid From / Bank Account',
          'Description / Item Details',
          `Amount (${currencySymbol})`,
          'Status'
        ].map(escapeCSV).join(','));

        txns.forEach(t => {
          csvLines.push([
            recordIndex++,
            t.id || '-',
            formatDate(t.date),
            t.userName || '-',
            t.category || 'Expense',
            t.depositTo || t.account || 'My Hand',
            t.description || t.notes || '-',
            Number(t.amount || 0).toFixed(2),
            t.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        csvLines.push([
          'TOTAL',
          '',
          '',
          '',
          '',
          '',
          `${total} Record(s)`,
          totalAmountSum.toFixed(2),
          ''
        ].map(escapeCSV).join(','));

      } else if (backupCategory === 'Deposits') {
        csvLines.push([
          'Sr No',
          'Deposit ID',
          'Date',
          'Deposited By',
          'Deposit Destination / Bank',
          'Notes / Reference Details',
          `Amount (${currencySymbol})`,
          'Status'
        ].map(escapeCSV).join(','));

        deposits.forEach(d => {
          csvLines.push([
            recordIndex++,
            d.id || '-',
            formatDate(d.date),
            d.userName || 'Admin',
            d.depositTo || 'Company Wallet',
            d.notes || '-',
            Number(d.amount || 0).toFixed(2),
            d.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        csvLines.push([
          'TOTAL',
          '',
          '',
          '',
          '',
          `${total} Record(s)`,
          totalAmountSum.toFixed(2),
          ''
        ].map(escapeCSV).join(','));

      } else if (backupCategory === 'Allocations') {
        csvLines.push([
          'Sr No',
          'Transfer ID',
          'Date',
          'Given To Partner / Staff',
          'Transferred From / Bank',
          'Notes / Purpose Details',
          `Amount (${currencySymbol})`,
          'Status'
        ].map(escapeCSV).join(','));

        allocs.forEach(a => {
          csvLines.push([
            recordIndex++,
            a.id || '-',
            formatDate(a.date),
            a.userName || '-',
            a.account || a.allocatedFrom || 'Company Wallet',
            a.notes || '-',
            Number(a.amount || 0).toFixed(2),
            a.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        csvLines.push([
          'TOTAL',
          '',
          '',
          '',
          '',
          `${total} Record(s)`,
          totalAmountSum.toFixed(2),
          ''
        ].map(escapeCSV).join(','));

      } else {
        // ALL Categories Combined in clear, consistent tabular format
        csvLines.push([
          'Sr No',
          'Record Type',
          'Transaction / Ref ID',
          'Date',
          'User / Partner',
          'Category',
          'Bank / Account',
          'Description / Notes Details',
          `Amount (${currencySymbol})`,
          'Status'
        ].map(escapeCSV).join(','));

        txns.forEach(t => {
          csvLines.push([
            recordIndex++,
            'Expense',
            t.id || '-',
            formatDate(t.date),
            t.userName || '-',
            t.category || 'Expense',
            t.depositTo || t.account || 'My Hand',
            t.description || t.notes || '-',
            Number(t.amount || 0).toFixed(2),
            t.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        deposits.forEach(d => {
          csvLines.push([
            recordIndex++,
            'Vault Deposit',
            d.id || '-',
            formatDate(d.date),
            d.userName || 'Admin',
            'Vault / Deposit',
            d.depositTo || 'Company Wallet',
            d.notes || '-',
            Number(d.amount || 0).toFixed(2),
            d.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        allocs.forEach(a => {
          csvLines.push([
            recordIndex++,
            'Money Transfer',
            a.id || '-',
            formatDate(a.date),
            a.userName || '-',
            'Transfer Allocation',
            a.account || a.allocatedFrom || 'Company Wallet',
            a.notes || '-',
            Number(a.amount || 0).toFixed(2),
            a.status || 'Done'
          ].map(escapeCSV).join(','));
        });

        csvLines.push([
          'TOTAL',
          '',
          '',
          '',
          '',
          '',
          '',
          `${total} Total Record(s)`,
          totalAmountSum.toFixed(2),
          ''
        ].map(escapeCSV).join(','));
      }

      // Add UTF-8 BOM (\uFEFF) for seamless Microsoft Excel & Google Sheets compatibility
      const csvString = '\uFEFF' + csvLines.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `shukan_backup_${catSlug}_${todayStr}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`Filter-wise CSV Backup exported! (${total} records)`, { theme: 'light' });
    } else {
      let payload = {
        exportedAt: new Date().toISOString(),
        filtersApplied: {
          category: backupCategory,
          user: backupUser,
          startDate: backupStartDate || 'All Time',
          endDate: backupEndDate || 'All Time'
        },
        recordsCount: total
      };

      if (backupCategory === 'All') {
        payload.transactions = txns;
        payload.vaultDeposits = deposits;
        payload.allocationsHistory = allocs;
        payload.settings = settings;
      } else if (backupCategory === 'Expenses') {
        payload.transactions = txns;
      } else if (backupCategory === 'Deposits') {
        payload.vaultDeposits = deposits;
      } else if (backupCategory === 'Allocations') {
        payload.allocationsHistory = allocs;
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `shukan_backup_${catSlug}_${todayStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(`Filter-wise JSON Backup exported! (${total} records)`, { theme: 'light' });
    }
  };

  const handleOpenDeleteModal = () => {
    const { total } = getFilteredData();
    if (total === 0) {
      toast.warning('No matching records found to delete for the selected filter criteria.', { theme: 'light' });
      return;
    }
    setDeletePassword('');
    setShowDeletePwd(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteWithPassword = async (e) => {
    e.preventDefault();
    if (deletePassword !== 'Shukan@2026') {
      toast.error('Incorrect security password! Deletion request denied.', { theme: 'light' });
      return;
    }

    const { total, txns, deposits, allocs } = getFilteredData();
    if (total === 0) {
      toast.warning('No matching records found to delete.', { theme: 'light' });
      setIsDeleteModalOpen(false);
      return;
    }

    setDeleteLoading(true);
    let count = 0;
    for (const t of txns) {
      await deleteTransaction(t.id);
      count++;
    }
    for (const d of deposits) {
      await deleteVaultDeposit(d.id);
      count++;
    }
    for (const a of allocs) {
      await deleteAllocation(a.id);
      count++;
    }

    // Record Bulk Deletion event in Entry Edit Audit Log
    const editor = user?.name || 'Admin';
    const dateRangeStr = (backupStartDate || backupEndDate)
      ? `${backupStartDate || 'Start'} to ${backupEndDate || 'End'}`
      : 'All Time';

    const breakdownItems = [];
    if (txns.length > 0) breakdownItems.push(`${txns.length} Expense(s)`);
    if (deposits.length > 0) breakdownItems.push(`${deposits.length} Vault Deposit(s)`);
    if (allocs.length > 0) breakdownItems.push(`${allocs.length} Allocation(s)`);

    const summaryText = `Bulk Delete: ${count} Filtered Records (Category: ${backupCategory}, User: ${backupUser})`;
    const detailsText = `Deleted ${count} record(s) [${breakdownItems.join(', ')}] | Date Range: ${dateRangeStr}`;

    await recordEditLog(
      editor,
      'N/A',
      'Bulk Delete',
      summaryText,
      detailsText,
      {
        action: 'Bulk Filtered Deletion',
        category: backupCategory,
        user: backupUser,
        startDate: backupStartDate || 'All',
        endDate: backupEndDate || 'All',
        deletedCount: count,
        breakdown: { expenses: txns.length, deposits: deposits.length, allocations: allocs.length }
      }
    );

    setDeleteLoading(false);
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    toast.success(`Successfully deleted ${count} matching record(s) and logged in Audit Log!`, { theme: 'light' });
  };

  const filteredStats = getFilteredData();
  const activeFiltersCount = (backupStartDate ? 1 : 0) + (backupEndDate ? 1 : 0) + (backupUser !== 'All' ? 1 : 0) + (backupCategory !== 'All' ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-12 px-1 sm:px-0">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#002B49] to-[#00487a] flex items-center justify-center text-white shadow-md shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-[#002B49] tracking-tight leading-tight">System Settings</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Configure company preferences, payment accounts & backups</p>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
            <span>{isAdmin ? 'Administrator Portal' : 'User Account'}</span>
          </span>
        </div>
      </div>

      {/* Modern Responsive Navigation Tabs */}
      {isAdmin && (
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-[#002B49] shadow-xs font-extrabold border border-slate-200/60'
                : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
            }`}
          >
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'general' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="truncate text-center">
              <span className="sm:hidden">General</span>
              <span className="hidden sm:inline">General Preferences</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-white text-[#002B49] shadow-xs font-extrabold border border-slate-200/60'
                : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
            }`}
          >
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'team' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="truncate text-center">
              <span className="sm:hidden">Team</span>
              <span className="hidden sm:inline">Team Accounts</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-white text-[#002B49] shadow-xs font-extrabold border border-slate-200/60'
                : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
            }`}
          >
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'password' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="truncate text-center">
              <span className="sm:hidden">Password</span>
              <span className="hidden sm:inline">Change Password</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'data'
                ? 'bg-white text-[#002B49] shadow-xs font-extrabold border border-slate-200/60'
                : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
            }`}
          >
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === 'data' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span className="truncate text-center">
              <span className="sm:hidden">Backup</span>
              <span className="hidden sm:inline">Backup & Data</span>
            </span>
          </button>
        </div>
      )}

      {/* TAB 1: General Settings Tab */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit(onSaveGeneral)} className="space-y-4 sm:space-y-6">
          {/* Card 1: Company Profile Configuration */}
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#c69255] shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-extrabold text-[#002B49] leading-tight">Company & Fiscal Configuration</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Enterprise identification and fiscal parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              {/* Enterprise Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Company / Enterprise Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    {...register('companyName', { required: 'Company name is required' })}
                    placeholder="e.g. Shukan Packaging"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                  />
                </div>
                {errors.companyName && (
                  <p className="text-xs font-semibold text-rose-500 mt-1">{errors.companyName.message}</p>
                )}
              </div>

              {/* Fiscal Year Start */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Fiscal Year Start Month
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <select
                    {...register('fiscalYearStart')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-slate-900 bg-white font-bold focus:outline-none text-xs sm:text-sm cursor-pointer"
                  >
                    <option value="April">April (Financial Year: Apr - Mar)</option>
                    <option value="January">January (Calendar Year: Jan - Dec)</option>
                    <option value="July">July (Mid-Year: Jul - Jun)</option>
                    <option value="October">October (Q4 Period: Oct - Sep)</option>
                  </select>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">Defines annual reporting cycle boundaries</p>
              </div>

              {/* Primary Currency */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Primary Currency
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                    ₹
                  </div>
                  <input
                    type="text"
                    disabled
                    value="INR - Indian Rupee (₹)"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input bg-slate-50 text-slate-600 font-bold text-xs sm:text-sm border-slate-200 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">Standard currency for all ledger records</p>
              </div>

              {/* Low Balance Threshold */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Low Balance Alert Threshold (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    {...register('lowBalanceThreshold')}
                    placeholder="10000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-slate-900 font-bold focus:outline-none text-xs sm:text-sm"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">Triggers low vault balance warning indicators</p>
              </div>

              {/* Approval Threshold */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Approval Threshold (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    {...register('requireApprovalOver')}
                    placeholder="5000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-slate-900 font-bold focus:outline-none text-xs sm:text-sm"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-1">Transactions over limit trigger review notice</p>
              </div>
            </div>
          </div>

          {/* Card 2: Dynamic Bank Accounts Management */}
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-extrabold text-[#002B49] leading-tight">Bank Accounts & Destinations</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Manage bank options available for deposits & payouts</p>
                </div>
              </div>

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
                {bankList.length} {bankList.length === 1 ? 'Bank' : 'Banks'}
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Add Bank Input Bar */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Add New Bank Account
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <span className="text-sm">🏦</span>
                    </div>
                    <input
                      type="text"
                      value={newBankInput}
                      onChange={(e) => setNewBankInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBank();
                        }
                      }}
                      placeholder="e.g. SBI Bank, HDFC Bank, Axis Bank..."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none font-bold text-xs sm:text-sm border border-slate-300"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBank}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Bank</span>
                  </button>
                </div>
              </div>

              {/* Badges List */}
              <div className="p-3 sm:p-4 bg-slate-50/90 rounded-2xl border border-slate-200/70">
                <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Configured Bank Options
                </div>

                {bankList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {bankList.map((bank) => (
                      <div
                        key={bank}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs transition-all hover:border-slate-300"
                      >
                        <span className="text-[11px]">🏦</span>
                        <span className="text-slate-800">{bank}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBank(bank)}
                          className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1 transition-all cursor-pointer ml-0.5"
                          title={`Remove ${bank}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    <p className="text-xs font-semibold">No bank accounts registered yet.</p>
                    <p className="text-[11px]">Add your primary company accounts above.</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-2.5 sm:p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 font-medium">
                <svg className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>These bank accounts populate under 'Deposit To', 'Paid From', and ledger account filters.</span>
              </div>
            </div>
          </div>

          {/* Form Save Button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>{isSubmitting ? 'Saving Changes...' : 'Save System Preferences'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: Team Accounts Management Tab */}
      {activeTab === 'team' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#c69255] shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-extrabold text-[#002B49] leading-tight">Team & User Accounts</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Manage user logins, access roles, passwords & permissions</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddUserModal}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#c69255] hover:bg-[#d4a359] active:scale-[0.99] text-white text-xs font-bold shadow-md transition whitespace-nowrap cursor-pointer gap-1.5"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Create New User</span>
                </button>
              </div>
            </div>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-3">
              {users.map((u, index) => (
                <div key={u.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className="text-sm font-extrabold text-[#002B49] truncate">{u.name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs shrink-0 ${
                        (u.role || 'Partner') === 'Partner'
                          ? 'bg-slate-100 text-slate-900 border border-slate-300'
                          : (u.role || 'Partner') === 'Administrator'
                          ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                          : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                      }`}>
                        {u.role || 'Partner'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(u)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold transition shrink-0 ${
                        u.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-500/15 text-rose-800 border border-rose-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${u.status === 'Active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                      {u.status}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Password</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs text-slate-700 font-bold">
                          {showUserPasswordMap[u.id] ? (u.password || '(Not Set)') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleUserPasswordVisibility(u.id)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          {showUserPasswordMap[u.id] ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.38c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">User ID</span>
                      <span className="text-xs text-slate-600 font-mono font-bold">{u.id}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditUserModal(u)}
                      className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#002B49] hover:text-white text-xs font-bold transition flex items-center cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    {u.id !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-extrabold">Sr. No.</th>
                    <th className="py-3 px-4 font-extrabold">User Name</th>
                    <th className="py-3 px-4 font-extrabold">User ID</th>
                    <th className="py-3 px-4 font-extrabold">Role</th>
                    <th className="py-3 px-4 font-extrabold">Password</th>
                    <th className="py-3 px-4 font-extrabold">Account Status</th>
                    <th className="py-3 px-4 text-right font-extrabold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u, index) => (
                    <tr key={u.id || index} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-500 text-xs">{index + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black bg-[#002B49] text-white shadow-2xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-[#002B49]">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-600">{u.id}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-2xs ${
                          (u.role || 'Partner') === 'Partner'
                            ? 'bg-slate-100 text-slate-900 border border-slate-300'
                            : (u.role || 'Partner') === 'Administrator'
                            ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                            : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                        }`}>
                          {u.role || 'Partner'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs text-slate-700 font-bold select-all bg-slate-100 px-2 py-0.5 rounded-md">
                            {showUserPasswordMap[u.id] ? (u.password || '(Not Set)') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleUserPasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            title="Toggle Password View"
                          >
                            {showUserPasswordMap[u.id] ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.38c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition cursor-pointer ${
                            u.status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-500/15 text-rose-800 border border-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.status === 'Active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          {u.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUserModal(u)}
                          title="Edit User"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {u.id !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Change Password Tab */}
      {activeTab === 'password' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Account Profile Card */}
          <div className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4 h-fit">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#002B49] text-amber-400 flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-[#002B49] truncate">{user?.name || 'User'}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">User ID: <span className="font-mono text-[#002B49] font-bold">{user?.id || 'N/A'}</span></p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Assigned Role</span>
                <span className="font-extrabold px-2.5 py-0.5 rounded-lg bg-amber-50 text-[#c69255] border border-amber-200/60">
                  {user?.role || 'Staff User'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Security Level</span>
                <span className="font-bold text-slate-700">{isAdmin ? 'Administrator' : 'Standard Partner'}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500 font-semibold">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1">
                <span>🛡️</span> Password Safety
              </div>
              <p>Use a combination of letters, numbers, and symbols for better security.</p>
            </div>
          </div>

          {/* Password Form Card */}
          <div className="lg:col-span-2 glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#c69255] shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-extrabold text-[#002B49] leading-tight">Update Login Password</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Keep your account secure with updated credentials</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <input
                    type={showPwdCurrent ? "text" : "password"}
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdCurrent(!showPwdCurrent)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPwdCurrent ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPwdNew ? "text" : "password"}
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdNew(!showPwdNew)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPwdNew ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      type={showPwdConfirm ? "text" : "password"}
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwdConfirm(!showPwdConfirm)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPwdConfirm ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#002B49] hover:bg-[#003c66] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pwdLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Backup & Data Management Tab */}
      {activeTab === 'data' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Card 1: Filter-Wise Backup Export */}
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-extrabold text-[#002B49] leading-tight">Filter-Wise Backup & Export</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Export custom scoped datasets into JSON or Excel CSV</p>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBackupCategory('All');
                    setBackupUser('All');
                    setBackupStartDate('');
                    setBackupEndDate('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50/90 rounded-2xl border border-slate-200/70">
              {/* 1. Category Filter */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Data Category
                </label>
                <select
                  value={backupCategory}
                  onChange={(e) => setBackupCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All">All Data Records</option>
                  <option value="Expenses">Expenses Only</option>
                  <option value="Deposits">Vault Deposits Only</option>
                  <option value="Allocations">Allocations Only</option>
                </select>
              </div>

              {/* 2. User Filter */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  Partner / User
                </label>
                <select
                  value={backupUser}
                  onChange={(e) => setBackupUser(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="All">All Partners & Users</option>
                  {(users || []).map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* 3. Start Date */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  From Date
                </label>
                <DateInput
                  value={backupStartDate}
                  max={backupEndDate || undefined}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBackupStartDate(val);
                    if (backupEndDate && val > backupEndDate) setBackupEndDate('');
                  }}
                  className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl glass-input text-slate-900 font-bold focus:outline-none cursor-pointer bg-white"
                />
              </div>

              {/* 4. End Date */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] mb-1 uppercase tracking-wide">
                  To Date
                </label>
                <DateInput
                  value={backupEndDate}
                  min={backupStartDate || undefined}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBackupEndDate(val);
                    if (backupStartDate && val < backupStartDate) setBackupStartDate('');
                  }}
                  className="w-full pl-3 pr-9 py-2.5 text-xs rounded-xl glass-input text-slate-900 font-bold focus:outline-none cursor-pointer bg-white"
                />
              </div>
            </div>

            {/* Live Filter Matching Statistics Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 to-blue-50/80 border border-amber-200/60">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-xs font-extrabold text-[#002B49]">Matching:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 text-[#002B49] font-black text-xs shadow-2xs">
                    {filteredStats.total} records
                  </span>
                </div>

                {backupCategory === 'All' && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-600 pt-1 sm:pt-0">
                    <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                      🏷️ {filteredStats.txns.length} Exp
                    </span>
                    <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                      🏦 {filteredStats.deposits.length} Dep
                    </span>
                    <span className="bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                      🤝 {filteredStats.allocs.length} Alloc
                    </span>
                  </div>
                )}
              </div>

              {/* Format Toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/40">
                <span className="text-xs font-extrabold text-[#002B49]">Format:</span>
                <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setBackupFormat('JSON')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      backupFormat === 'JSON' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupFormat('CSV')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      backupFormat === 'CSV' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    CSV (Excel)
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Exports all fields, audit headers, notes, and user tags for selected filters.
              </p>

              <button
                type="button"
                onClick={handleExportData}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Backup ({backupFormat})</span>
              </button>
            </div>
          </div>

          {/* Card 2: Bulk Data Clean-Up / Danger Zone */}
          <div className="glass-card p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 border border-rose-200/90 bg-rose-50/20 shadow-xs">
            <div className="flex items-center space-x-3 border-b border-rose-100 pb-3 sm:pb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm sm:text-lg font-extrabold text-rose-900 leading-tight">Filtered Records Clean-Up</h2>
                <p className="text-[11px] sm:text-xs text-rose-700/80 font-medium">Permanently remove records scoped under current active filters</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-rose-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-900">Target Records for Deletion:</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-xs">
                    {filteredStats.total} {filteredStats.total === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Protected by Master Password (<code className="font-mono text-rose-700 font-bold">Shukan@2026</code>). Logged to Audit Trail.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenDeleteModal}
                disabled={filteredStats.total === 0}
                className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
                  filteredStats.total === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white cursor-pointer'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Filtered Records ({filteredStats.total})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Password Verification Modal for Filtered Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200 text-rose-600 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#002B49] leading-tight">Confirm Deletion</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Permanently purge {filteredStats.total} matching record(s)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteWithPassword} className="space-y-3.5 sm:space-y-4">
              {/* Alert Callout */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1 text-rose-800">
                  <span>⚠️</span> Irreversible Action
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                  Permanently deletes <strong>{filteredStats.total} record(s)</strong> for category <strong className="underline">{backupCategory}</strong> and user <strong className="underline">{backupUser}</strong>.
                </p>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wider mb-1">
                  Master Security Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePwd ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter security password"
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm rounded-xl glass-input text-slate-900 font-bold focus:outline-none border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePwd(!showDeletePwd)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDeletePwd ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deleteLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Deleting Records...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Confirm & Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200 text-[#c69255] shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#002B49] leading-tight">
                    {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    {editingUser ? 'Update role, credentials, and account status' : 'Add partner or staff login credentials'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={subUser(onSubmitUser)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wide mb-1">
                  User Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Patel"
                  {...regUser('name', { required: 'User Name is required' })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm border border-slate-300"
                />
                {errUser.name && <p className="text-xs font-semibold text-rose-500 mt-1">{errUser.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wide mb-1">
                  User ID / Login Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul"
                  disabled={!!editingUser}
                  {...regUser('id', { required: 'User ID is required' })}
                  className={`w-full px-3.5 py-2.5 rounded-xl glass-input font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm border border-slate-300 ${
                    editingUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'text-slate-900'
                  }`}
                />
                {errUser.id && <p className="text-xs font-semibold text-rose-500 mt-1">{errUser.id.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wide mb-1">
                  Role / Access Level
                </label>
                <select
                  {...regUser('role')}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-bold text-xs sm:text-sm border border-slate-300 cursor-pointer"
                >
                  <option value="Partner">Partner</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wide mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter login password"
                  {...regUser('password', { required: 'Password is required' })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 font-bold placeholder-slate-400 focus:outline-none text-xs sm:text-sm border border-slate-300"
                />
                {errUser.password && <p className="text-xs font-semibold text-rose-500 mt-1">{errUser.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wide mb-1">
                  Account Status
                </label>
                <select
                  {...regUser('status')}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-bold text-xs sm:text-sm border border-slate-300 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUserSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] active:scale-[0.99] text-white text-xs font-extrabold shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isUserSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving User...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Save User Changes' : 'Create User Account'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

