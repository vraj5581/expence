import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const UserPortal = () => {
  const { user } = useAuth();
  const {
    transactions,
    allocationsHistory,
    settings,
    getUserStats,
    addTransaction,
    updateTransaction
  } = useExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllocationsModalOpen, setIsAllocationsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = Boolean(startDate || endDate);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const stats = getUserStats(user?.name || '');

  // Filter transactions created by this specific logged in user
  const myTransactions = transactions.filter(t => t.userName === user?.name);

  // Filter allocations/money given by admin to this user
  const myAllocations = allocationsHistory.filter(a => a.userName === user?.name);

  const handleOpenAddModal = () => {
    reset({
      type: 'Cash Out',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    addTransaction({
      ...data,
      type: 'Cash Out',
      status: data.status || 'Done',
      userName: user.name,
      createdBy: user.name
    });
    toast.success(`Expense entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });
    setIsModalOpen(false);
    reset();
  };

  const handleStatusChange = (txn, newStatus) => {
    updateTransaction(txn.id, { ...txn, status: newStatus });
    if (newStatus === 'Done') {
      toast.success(`Transaction ${txn.id} marked as Done (Deducted from balance)`, { theme: 'light' });
    } else {
      toast.info(`Transaction ${txn.id} marked as Due (No deduction)`, { theme: 'light' });
    }
  };

  const filteredMyTransactions = myTransactions.filter((t) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      t.id.toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      t.date.includes(query);

    let matchesDate = true;
    if (startDate && t.date < startDate) matchesDate = false;
    if (endDate && t.date > endDate) matchesDate = false;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Welcome, {user?.name}!</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">View your petty cash balance and record expense receipts.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer shrink-0 whitespace-nowrap"
        >
          <svg className="w-4 h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          + Expense
        </button>
      </div>

      {/* 1-Line Search Bar & Filter Drawer */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search my expense records (description, date, amount)..."
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
                  onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                  className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition"
                >
                  Reset Date Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* My Expenses Table / Mobile Cards */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        <h2 className="text-base sm:text-lg font-extrabold text-[#002B49] mb-3 sm:mb-4">My Submitted Expense Receipts</h2>

        {/* Mobile View Card List (No Scrollbar - Native App Style) */}
        <div className="block md:hidden space-y-3">
          {filteredMyTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              You have not submitted any expense receipts yet. Click "+ Record My Expense" to submit an entry.
            </div>
          ) : (
            filteredMyTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                  <span className="text-[11px] text-slate-500 font-semibold">{t.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Status</span>
                    <select
                      value={t.status || 'Done'}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold focus:outline-none cursor-pointer border ${
                        (t.status || 'Done') === 'Due'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      <option value="Done">Done</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Amount</span>
                    <span className="text-sm font-extrabold text-[#002B49]">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {t.description && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl font-medium">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Description / Purpose</span>
                    {t.description}
                  </div>
                )}
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
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Description / Purpose</th>
                <th className="py-3 px-4 font-bold">Status</th>
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
                filteredMyTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{t.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={t.status || 'Done'}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-extrabold focus:outline-none cursor-pointer transition shadow-xs border ${
                          (t.status || 'Done') === 'Due'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        }`}
                      >
                        <option value="Done">Done</option>
                        <option value="Due">Due</option>
                      </select>
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
              <span className="font-[#002B49] font-extrabold">{settings.currency}{stats.remaining.toLocaleString()}</span>
            </div>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
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

              {/* Status (Done / Due) */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                <select
                  {...register('status')}
                  defaultValue="Done"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Done">Done (Paid / Completed)</option>
                  <option value="Due">Due (Pending - No Deduction)</option>
                </select>
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

      {/* Money Received / Allocations Modal */}
      {isAllocationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsAllocationsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">Money Received from Admin</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">List of all cash transfers assigned to you by the Admin.</p>

            {/* Mobile View Card List */}
            <div className="block md:hidden space-y-3 max-h-80 overflow-y-auto pr-1">
              {myAllocations.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No money allocations received from Company yet.
                </div>
              ) : (
                myAllocations.map((a, index) => (
                  <div key={a.id || index} className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <span className="text-[11px] text-slate-500 font-semibold">{a.date}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs text-slate-600 font-medium">{a.notes || 'Company Money Allocation'}</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        +{settings.currency}{a.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-slate-100 text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4 font-bold">Sr. No.</th>
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Amount Received</th>
                    <th className="py-3 px-4 font-bold">Notes / Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {myAllocations.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-500 text-xs font-medium">
                        No money allocations received from Admin yet.
                      </td>
                    </tr>
                  ) : (
                    myAllocations.map((a, index) => (
                      <tr key={a.id || index} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">{a.date}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          +{settings.currency}{a.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                          {a.notes || 'Admin Money Allocation'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 mt-2">
              <button
                type="button"
                onClick={() => setIsAllocationsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPortal;
