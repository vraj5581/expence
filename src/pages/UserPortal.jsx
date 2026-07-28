import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const UserPortal = () => {
  const { user } = useAuth();
  const {
    transactions,
    settings,
    getUserStats,
    addTransaction
  } = useExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const stats = getUserStats(user?.name || '');

  // Filter transactions created by this specific logged in user
  const myTransactions = transactions.filter(t => t.userName === user?.name);

  const handleOpenAddModal = () => {
    reset({
      type: 'Cash Out',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    addTransaction({
      ...data,
      userName: user.name,
      createdBy: user.name
    });
    toast.success(`Expense entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });
    setIsModalOpen(false);
    reset();
  };

  const filteredMyTransactions = myTransactions.filter((t) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      t.id.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-sm text-slate-500 font-medium">View your petty cash balance and record expense receipts.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          + Record My Expense
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* 1. Money Given by Admin */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255]">
          <p className="text-xs uppercase font-bold text-slate-500">Money Given by Admin</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{stats.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-[#b88548] mt-1 font-semibold">Your Total Petty Cash Allowance</p>
        </div>

        {/* 2. My Spent Expenses */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49]">
          <p className="text-xs uppercase font-bold text-slate-500">My Spent Expenses</p>
          <p className="text-2xl font-extrabold text-[#002B49] mt-2">
            {settings.currency}{stats.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{myTransactions.length} Expense Logs Submitted</p>
        </div>

        {/* 3. My Remaining Balance */}
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#d4a359]">
          <p className="text-xs uppercase font-bold text-slate-500">My Remaining Balance</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{stats.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Available Cash In Hand</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search my expense records..."
          className="px-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none w-full max-w-md"
        />
        <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
          Showing {filteredMyTransactions.length} entries
        </span>
      </div>

      {/* My Expenses Table */}
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-lg font-extrabold text-[#002B49] mb-4">My Submitted Expense Receipts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Txn ID</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Description / Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMyTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium">
                    You have not submitted any expense receipts yet. Click "+ Record My Expense" to submit an entry.
                  </td>
                </tr>
              ) : (
                filteredMyTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#002B49]">{t.id}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{t.date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.type === 'Cash In'
                            ? 'bg-amber-500/15 text-[#9e6e34]'
                            : 'bg-slate-900/10 text-[#002B49]'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 font-bold ${t.type === 'Cash In' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {t.type === 'Cash In' ? '+' : '-'}{settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record My Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">Record New Expense</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">Submit an expense receipt for Shukan Packaging.</p>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Your Current Remaining Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{stats.remaining.toLocaleString()}</span>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Movement Type</label>
                <select
                  {...register('type', { required: true })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none"
                >
                  <option value="Cash Out">Cash Out (Expense)</option>
                  <option value="Cash In">Cash In (Refund / Inflow)</option>
                </select>
              </div>

              {/* User Name (Disabled / Locked to current user) */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Submitted By</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold focus:outline-none cursor-not-allowed"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Date</label>
                <input
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date.message}</p>}
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe expense details..."
                  {...register('description')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md"
                >
                  Submit Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPortal;
