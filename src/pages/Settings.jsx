import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const Settings = () => {
  const { settings, updateSettings, resetToDefaultData, transactions } = useExpense();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

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
    let code = 'INR';
    if (data.currency === '$') code = 'USD';
    else if (data.currency === '€') code = 'EUR';
    else if (data.currency === '£') code = 'GBP';

    updateSettings({
      ...data,
      currencyCode: code
    });

    toast.success('System settings updated successfully!', { theme: 'light' });
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `shukan_packaging_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Backup JSON file downloaded!', { theme: 'light' });
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all transactions and user data to Shukan Packaging default demo values?')) {
      resetToDefaultData();
      toast.info('System data reset to Shukan Packaging demo values.', { theme: 'light' });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Shukan Packaging Settings</h1>
        <p className="text-sm text-slate-500 font-medium">Manage business preferences, currencies, security policies, and backup data.</p>
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
          General & Currency
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'profile'
              ? 'bg-[#c69255] text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Admin Profile & Security
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
          <h2 className="text-lg font-extrabold text-[#002B49] mb-1">Company & Currency Configuration</h2>
          <p className="text-xs text-slate-500 font-medium mb-6">Customize display symbols and reporting rules.</p>

          <form onSubmit={handleSubmit(onSaveGeneral)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Company / Enterprise Name</label>
                <input
                  type="text"
                  {...register('companyName', { required: 'Company name is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Primary Currency Symbol</label>
                <select
                  {...register('currency')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none"
                >
                  <option value="₹">₹ INR (Indian Rupee)</option>
                  <option value="$">$ USD (United States Dollar)</option>
                  <option value="€">€ EUR (Euro)</option>
                  <option value="£">£ GBP (British Pound)</option>
                </select>
              </div>
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

      {/* Admin Profile Tab */}
      {activeTab === 'profile' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49] mb-1">Admin Account Information</h2>
            <p className="text-xs text-slate-500 font-medium">Authenticated Shukan Packaging administrator credentials.</p>
          </div>

          <div className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 ring-2 ring-[#c69255]/40 overflow-hidden flex items-center justify-center shadow-xs">
              <img
                src="/logo.jpg"
                alt="Shukan Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#002B49]">{user?.name || 'Shukan Admin'}</h3>
              <p className="text-xs text-[#9e6e34] font-mono font-bold">Admin ID: {user?.id || 'admin'}</p>
              <p className="text-xs text-slate-500 font-medium">{user?.email || 'admin@shukanpackaging.com'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-[#c69255]/30 text-xs text-slate-700 space-y-2">
            <div className="font-bold text-[#002B49]">Login Credentials Reminder</div>
            <p>Admin Login ID: <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-[#002B49]">admin</code></p>
            <p>Admin Password: <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-[#002B49]">Vraj@2026</code></p>
          </div>
        </div>
      )}

      {/* Data Backup Tab */}
      {activeTab === 'data' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49] mb-1">Backup & System Reset</h2>
            <p className="text-xs text-slate-500 font-medium">Export transaction audit logs or reset application state.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Export JSON */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#002B49] mb-1">Export Ledger JSON</h3>
                <p className="text-xs text-slate-500 font-medium">Download complete financial logs for Shukan Packaging as JSON.</p>
              </div>
              <button
                onClick={handleExportData}
                className="mt-4 px-4 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold self-start transition shadow-xs"
              >
                Download Backup JSON
              </button>
            </div>

            {/* Reset Demo Data */}
            <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-rose-800 mb-1">Reset Demo Data</h3>
                <p className="text-xs text-slate-500 font-medium">Wipe current local storage and restore default Shukan Packaging records.</p>
              </div>
              <button
                onClick={handleResetDemoData}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold self-start transition shadow-xs"
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
