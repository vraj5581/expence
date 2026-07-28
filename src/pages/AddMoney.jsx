import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const AddMoney = () => {
  const {
    adminVaultBalance,
    totalVaultDeposited,
    vaultDeposits,
    users,
    settings,
    addVaultDeposit,
    updateVaultDeposit,
    deleteVaultDeposit
  } = useExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleOpenAddModal = () => {
    setEditingDeposit(null);
    reset({
      date: new Date().toISOString().split('T')[0],
      userName: users[0]?.name || 'Shukan Admin',
      amount: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deposit) => {
    setEditingDeposit(deposit);
    reset({
      date: deposit.date,
      userName: deposit.userName,
      amount: deposit.amount,
      notes: deposit.notes || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    if (editingDeposit) {
      updateVaultDeposit(editingDeposit.id, data);
      toast.success(`Deposit entry for ${data.userName} updated!`, { theme: 'light' });
    } else {
      const res = addVaultDeposit(data);
      if (res.success) {
        toast.success(`Added ${settings.currency}${parseFloat(data.amount).toLocaleString()} to Vault!`, { theme: 'light' });
      } else {
        toast.error(res.message, { theme: 'light' });
        return;
      }
    }
    setIsModalOpen(false);
    reset();
  };

  const handleDelete = (deposit) => {
    if (window.confirm(`Are you sure you want to remove deposit record for ${deposit.userName} (${settings.currency}${deposit.amount})?`)) {
      deleteVaultDeposit(deposit.id);
      toast.info(`Deposit record removed.`, { theme: 'light' });
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const filteredDeposits = vaultDeposits.filter((d) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      (d.userName || '').toLowerCase().includes(query) ||
      (d.notes || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* Printable Header for PDF Export */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold uppercase text-[#002B49]">SHUKAN PACKAGING</h1>
        <p className="text-xs font-semibold text-[#c69255]">Admin Vault Deposit Logs & Capital Audit Report</p>
      </div>

      {/* Screen Header & Top Right Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Add Money Log & Vault Deposits</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Manage Admin capital deposits, edit entries, and export PDF reports.</p>
        </div>

        {/* Top Right Corner Buttons */}
        <div className="flex items-center space-x-3">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
          >
            <svg className="w-4 h-4 mr-1.5 text-[#002B49]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF / Print
          </button>

          {/* + Add Money Primary Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            + Add Money
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:grid-cols-2">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255]">
          <p className="text-xs uppercase font-bold text-slate-500">Total Capital Deposited</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{totalVaultDeposited.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{vaultDeposits.length} Deposit Entries</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49]">
          <p className="text-xs uppercase font-bold text-slate-500">Current Admin Vault Available</p>
          <p className="text-2xl font-extrabold text-[#002B49] mt-2">
            {settings.currency}{adminVaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Ready to allocate to team members</p>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex items-center justify-between print:hidden">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Name or Description..."
          className="px-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none w-full max-w-md"
        />
        <div className="text-xs text-slate-500 font-semibold hidden sm:block">
          Showing {filteredDeposits.length} entries
        </div>
      </div>

      {/* Vault Deposits Table without Log ID */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Name</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Description / Purpose</th>
                <th className="py-3 px-4 text-right font-bold print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No deposit entries recorded yet. Click "+ Add Money" to add funds.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-semibold">{d.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{d.userName}</td>
                    <td className="py-3.5 px-4 font-bold text-[#9e6e34]">
                      +{settings.currency}{parseFloat(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {d.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 print:hidden">
                      <button
                        onClick={() => handleOpenEditModal(d)}
                        title="Edit Deposit Entry"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        title="Delete Deposit Entry"
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

      {/* Add / Edit Money Modal */}
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

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">
              {editingDeposit ? 'Edit Deposit Entry' : 'Add Money to Vault'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Record capital funds added into Admin Master Vault.</p>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
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

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Name</label>
                <select
                  {...register('userName', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                {errors.userName && <p className="text-xs text-rose-500 mt-1">{errors.userName.message}</p>}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2000"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe deposit details (e.g. Capital Top-up)..."
                  {...register('notes')}
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
                  {editingDeposit ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMoney;
