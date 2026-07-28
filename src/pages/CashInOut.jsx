import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const CashInOut = () => {
  const {
    adminVaultBalance,
    transactions,
    users,
    settings,
    allocateMoneyToUser,
    getUserStats,
    addTransaction,
    updateTransaction,
    deleteTransaction
  } = useExpense();

  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();

  const handleOpenAddModal = (type = 'Cash In') => {
    setEditingTxn(null);
    reset({
      type,
      amount: '',
      userName: users[0]?.name || 'Shukan Admin',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (txn) => {
    setEditingTxn(txn);
    reset({
      type: txn.type,
      amount: txn.amount,
      userName: txn.userName,
      date: txn.date,
      description: txn.description || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    if (editingTxn) {
      updateTransaction(editingTxn.id, data);
      toast.success(`Transaction ${editingTxn.id} updated!`, { theme: 'light' });
    } else {
      const newTxn = addTransaction({
        ...data,
        createdBy: data.userName
      });
      toast.success(`New ${data.type} recorded (${newTxn.id})!`, { theme: 'light' });
    }
    setIsModalOpen(false);
    reset();
  };

  const onGiveMoneySubmit = (data) => {
    const res = allocateMoneyToUser(data.userName, data.amount, data.notes);
    if (res.success) {
      toast.success(`Allocated ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
      setIsGiveMoneyOpen(false);
      resetGive();
    } else {
      toast.error(res.message, { theme: 'light' });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(`Delete transaction record ${id}?`)) {
      deleteTransaction(id);
      toast.info(`Transaction ${id} removed.`, { theme: 'light' });
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab !== 'All' && t.type !== activeTab) return false;
    if (selectedUser !== 'All' && t.userName !== selectedUser) return false;
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchId = t.id.toLowerCase().includes(query);
      const matchUser = (t.userName || '').toLowerCase().includes(query);
      const matchDesc = (t.description || '').toLowerCase().includes(query);
      return matchId || matchUser || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Shukan Packaging Ledger</h1>
          <p className="text-sm text-slate-500 font-medium">Record and audit Cash In and Cash Out entries by team members.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsGiveMoneyOpen(true)}
            className="flex items-center px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md transition"
          >
            <svg className="w-4 h-4 mr-1.5 text-[#e6b875]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Give Money to User
          </button>

          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Expense
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Movement Type Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          {['All', 'Cash In', 'Cash Out'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === tab
                  ? 'bg-[#c69255] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & User Name Select Filter */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search txn ID, user, notes..."
            className="px-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none w-full md:w-64"
          />

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold"
          >
            <option value="All">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Txn ID</th>
                <th className="py-3 px-4 font-bold">Movement Type</th>
                <th className="py-3 px-4 font-bold">User Name</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No transaction records match your query.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#002B49]">{t.id}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.type === 'Cash In'
                            ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                            : 'bg-slate-900/10 text-[#002B49] border border-[#002B49]/20'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                    <td className={`py-3.5 px-4 font-bold ${t.type === 'Cash In' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {t.type === 'Cash In' ? '+' : '-'}{settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs font-medium">{t.date}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        title="Edit Record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Delete Record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Give Money to User Modal */}
      {isGiveMoneyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsGiveMoneyOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">Give Money to User</h3>
            <p className="text-xs text-slate-500 font-medium mb-4">Transfer petty cash funds from Admin Vault to team member allowance.</p>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Available Admin Vault Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{adminVaultBalance.toLocaleString()}</span>
            </div>

            <form onSubmit={subGive(onGiveMoneySubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Select User</label>
                <select
                  {...regGive('userName', { required: 'Please select a user' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {users.map((u) => {
                    const stats = getUserStats(u.name);
                    return (
                      <option key={u.id} value={u.name}>
                        {u.name} (Current Remaining: {settings.currency}{stats.remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount to Give ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  {...regGive('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errGive.amount && <p className="text-xs text-rose-500 mt-1">{errGive.amount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Petty cash advance"
                  {...regGive('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGiveMoneyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437]"
                >
                  Transfer Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">
              {editingTxn ? `Edit Transaction (${editingTxn.id})` : 'New Cash Entry'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Fill in details for Shukan Packaging ledger.</p>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Movement Type</label>
                <select
                  {...register('type', { required: true })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none"
                >
                  <option value="Cash In">Cash In</option>
                  <option value="Cash Out">Cash Out</option>
                </select>
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">User Name</label>
                  <select
                    {...register('userName', { required: 'User Name is required' })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                  >
                    {users.map((u) => {
                      const stats = getUserStats(u.name);
                      return (
                        <option key={u.id} value={u.name}>
                          {u.name} (Bal: {settings.currency}{stats.remaining.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Date</label>
                  <input
                    type="date"
                    {...register('date', { required: 'Date is required' })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe transaction details..."
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
                  {editingTxn ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashInOut;
