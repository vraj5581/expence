import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

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

  // Change Password State
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Filter-wise Backup State
  const [backupCategory, setBackupCategory] = useState('All');
  const [backupUser, setBackupUser] = useState('All');
  const [backupStartDate, setBackupStartDate] = useState('');
  const [backupEndDate, setBackupEndDate] = useState('');
  const [backupFormat, setBackupFormat] = useState('JSON');

  // Security Delete Password Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
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

  const { register, handleSubmit, formState: { errors } } = useForm({
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

    const todayStr = new Date().toISOString().split('T')[0];
    const catSlug = backupCategory.toLowerCase();

    if (backupFormat === 'CSV') {
      let csvRows = [];
      csvRows.push(['SECTION', 'ID', 'DATE', 'USER_NAME', 'DESCRIPTION_OR_NOTES', 'AMOUNT', 'STATUS'].join(','));

      if (backupCategory === 'All' || backupCategory === 'Expenses') {
        txns.forEach(t => {
          csvRows.push([
            'Expense',
            `"${t.id}"`,
            `"${t.date}"`,
            `"${t.userName}"`,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            t.amount,
            `"${t.status || 'Done'}"`
          ].join(','));
        });
      }

      if (backupCategory === 'All' || backupCategory === 'Deposits') {
        deposits.forEach(d => {
          csvRows.push([
            'Deposit',
            `"${d.id}"`,
            `"${d.date}"`,
            `"${d.userName}"`,
            `"${(d.notes || '').replace(/"/g, '""')}"`,
            d.amount,
            '"Completed"'
          ].join(','));
        });
      }

      if (backupCategory === 'All' || backupCategory === 'Allocations') {
        allocs.forEach(a => {
          csvRows.push([
            'Allocation',
            `"${a.id}"`,
            `"${a.date}"`,
            `"${a.userName}"`,
            `"${(a.notes || '').replace(/"/g, '""')}"`,
            a.amount,
            '"Completed"'
          ].join(','));
        });
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `shukan_backup_${catSlug}_${todayStr}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
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

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Settings</h1>
      </div>

      {/* Settings Tab Selector (Admin Only shows full tabs) */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'general'
                ? 'bg-[#c69255] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            General Preferences
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'password'
                ? 'bg-[#c69255] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'data'
                ? 'bg-[#c69255] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Backup & Data Management
          </button>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl">
          <h2 className="text-lg font-extrabold text-[#002B49] mb-6">Company Configuration</h2>

          <form onSubmit={handleSubmit(onSaveGeneral)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#002B49] mb-1">Company / Enterprise Name</label>
              <input
                type="text"
                {...register('companyName', { required: 'Company name is required' })}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Fiscal Year Start Month</label>
                <select
                  {...register('fiscalYearStart')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none"
                >
                  <option value="April">April</option>
                  <option value="January">January</option>
                  <option value="July">July</option>
                  <option value="October">October</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Low Balance Alert ({settings.currency})</label>
                <input
                  type="number"
                  {...register('lowBalanceThreshold')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Approval Threshold ({settings.currency})</label>
                <input
                  type="number"
                  {...register('requireApprovalOver')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200/80">
              <label className="block text-xs font-bold text-[#002B49]">Bank Accounts / Payment Options</label>
              
              {/* Add Bank Input Row with + Button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBankInput}
                  onChange={(e) => setNewBankInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBank(); } }}
                  placeholder="Enter new bank name (e.g. SBI Bank, HDFC Bank)..."
                  className="flex-1 px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none font-semibold text-xs border border-slate-200"
                />
                <button
                  type="button"
                  onClick={handleAddBank}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="text-sm font-black">+</span>
                  <span>Add Bank</span>
                </button>
              </div>

              {/* Displayed Bank Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {bankList.map((bank) => (
                  <div
                    key={bank}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-900 font-bold text-xs shadow-2xs transition hover:bg-blue-100/90"
                  >
                    <span>🏦 {bank}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(bank)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-full p-0.5 transition cursor-pointer"
                      title={`Remove ${bank}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {bankList.length === 0 && (
                  <p className="text-xs text-slate-400 italic font-medium">No bank accounts added yet. Type a bank name above and click "+ Add Bank".</p>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">These bank options will be available under 'Deposit To' / 'Paid From' when adding or filtering transactions.</p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md transition"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl max-w-lg space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49] mb-1">Account Security</h2>
            <p className="text-xs text-slate-500 font-medium">Update your login password for user account: <strong className="text-[#002B49]">{user?.name}</strong></p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#002B49] mb-1">Current Password</label>
              <input
                type="password"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002B49] mb-1">New Password</label>
              <input
                type="password"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002B49] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                {pwdLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Backup Tab */}
      {activeTab === 'data' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49] mb-1">Backup & Data Management</h2>
          </div>

          <div className="space-y-6">
            {/* Filter-wise Backup Export Form Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-[#002B49]">Filter-Wise Backup Export</h3>
              </div>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Category Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Data Category</label>
                  <select
                    value={backupCategory}
                    onChange={(e) => setBackupCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="All">All Data Records</option>
                    <option value="Expenses">Expenses Only</option>
                    <option value="Deposits">Vault Deposits Only</option>
                    <option value="Allocations">Money Allocations Only</option>
                  </select>
                </div>

                {/* 2. User Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Select User</label>
                  <select
                    value={backupUser}
                    onChange={(e) => setBackupUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="All">All Users</option>
                    {(users || []).map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* 3. Start Date */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={backupStartDate}
                    max={backupEndDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBackupStartDate(val);
                      if (backupEndDate && val > backupEndDate) setBackupEndDate('');
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>

                {/* 4. End Date */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">End Date</label>
                  <input
                    type="date"
                    value={backupEndDate}
                    min={backupStartDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBackupEndDate(val);
                      if (backupStartDate && val < backupStartDate) setBackupStartDate('');
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Format Selector & Summary Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-[#002B49]">Format:</span>
                    <button
                      type="button"
                      onClick={() => setBackupFormat('JSON')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        backupFormat === 'JSON' ? 'bg-[#002B49] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackupFormat('CSV')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        backupFormat === 'CSV' ? 'bg-[#002B49] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      CSV (Excel)
                    </button>
                  </div>

                  <span className="text-xs font-bold text-[#9e6e34] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    Matching: <strong>{filteredStats.total}</strong> records
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {(backupStartDate || backupEndDate || backupUser !== 'All' || backupCategory !== 'All') && (
                    <button
                      type="button"
                      onClick={() => { setBackupCategory('All'); setBackupUser('All'); setBackupStartDate(''); setBackupEndDate(''); }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      Reset Filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center shrink-0"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export ({backupFormat})
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenDeleteModal}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center shrink-0"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Filtered Records ({filteredStats.total})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Password Verification Modal for Filtered Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 text-rose-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Confirm Filtered Deletion</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Permanently remove {filteredStats.total} matching record(s)</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteWithPassword} className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
                ⚠️ Warning: This will permanently delete <strong>{filteredStats.total}</strong> record(s) matching your filter criteria from the database.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">
                  Enter Security Password to Confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter security password"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 focus:outline-none border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm & Delete'}
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
