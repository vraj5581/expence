import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const Settings = () => {
  const {
    settings,
    updateSettings,
    resetToDefaultData,
    transactions,
    vaultDeposits,
    allocationsHistory,
    users
  } = useExpense();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // Filter-wise Backup State
  const [backupCategory, setBackupCategory] = useState('All');
  const [backupUser, setBackupUser] = useState('All');
  const [backupStartDate, setBackupStartDate] = useState('');
  const [backupEndDate, setBackupEndDate] = useState('');
  const [backupFormat, setBackupFormat] = useState('JSON');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      companyName: settings.companyName || 'Shukan Packaging',
      currency: settings.currency || '₹',
      fiscalYearStart: settings.fiscalYearStart || 'April',
      lowBalanceThreshold: settings.lowBalanceThreshold || 10000,
      requireApprovalOver: settings.requireApprovalOver || 5000
    }
  });

  const onSaveGeneral = (data) => {
    updateSettings({
      ...data,
      currency: '₹',
      currencyCode: 'INR'
    });

    toast.success('System settings updated successfully!', { theme: 'light' });
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

  const handleResetDemoData = () => {
    if (window.confirm('Reset all transactions and user data to Shukan Packaging default demo values?')) {
      resetToDefaultData();
      toast.info('System data reset to Shukan Packaging demo values.', { theme: 'light' });
    }
  };

  const filteredStats = getFilteredData();

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Settings</h1>
      </div>

      {/* Settings Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'general'
              ? 'bg-[#c69255] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          General Preferences
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'data'
              ? 'bg-[#c69255] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Backup & Data Management
        </button>
      </div>

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
                    onChange={(e) => setBackupStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>

                {/* 4. End Date */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">End Date</label>
                  <input
                    type="date"
                    value={backupEndDate}
                    onChange={(e) => setBackupEndDate(e.target.value)}
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

                <div className="flex items-center space-x-2.5">
                  {(backupStartDate || backupEndDate || backupUser !== 'All' || backupCategory !== 'All') && (
                    <button
                      type="button"
                      onClick={() => { setBackupCategory('All'); setBackupUser('All'); setBackupStartDate(''); setBackupEndDate(''); }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      Reset Filters
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportData}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center shrink-0"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Backup ({backupFormat})
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Demo Data Card */}
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-rose-800">Reset System Demo Data</h3>
              </div>
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition shadow-xs"
              >
                Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
