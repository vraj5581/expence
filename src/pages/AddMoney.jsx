import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const shukanPartners = ['Vraj', 'Raj', 'Teerth', 'Mayank'];

const AddMoney = () => {
  const {
    adminVaultBalance,
    totalVaultDeposited,
    vaultDeposits,
    allocationsHistory,
    users,
    settings,
    addVaultDeposit,
    updateVaultDeposit,
    deleteVaultDeposit,
    allocateMoneyToUser,
    updateAllocation,
    deleteAllocation,
    getUserStats
  } = useExpense();

  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGiveMoneyOpen, setIsGiveMoneyOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();

  const handleOpenGiveMoneyModal = () => {
    setEditingAllocation(null);
    resetGive({
      userName: users[0]?.name || 'Raj',
      amount: '',
      notes: ''
    });
    setIsGiveMoneyOpen(true);
  };

  const handleOpenEditAllocationModal = (alloc) => {
    setEditingAllocation(alloc);
    resetGive({
      userName: alloc.userName,
      amount: alloc.amount,
      notes: alloc.notes || alloc.purpose || ''
    });
    setIsGiveMoneyOpen(true);
  };

  const onGiveMoneySubmit = (data) => {
    if (editingAllocation) {
      const res = updateAllocation(editingAllocation.id, data);
      if (res.success) {
        toast.success(`Updated allocation for ${data.userName}!`, { theme: 'light' });
        setIsGiveMoneyOpen(false);
        resetGive();
      } else {
        toast.error(res.message, { theme: 'light' });
      }
    } else {
      const res = allocateMoneyToUser(data.userName, data.amount, data.notes);
      if (res.success) {
        toast.success(`Allocated ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
        setIsGiveMoneyOpen(false);
        resetGive();
      } else {
        toast.error(res.message, { theme: 'light' });
      }
    }
  };

  const handleDeleteAllocation = (alloc) => {
    if (window.confirm(`Are you sure you want to remove allocation of ${settings.currency}${alloc.amount} to ${alloc.userName}?`)) {
      deleteAllocation(alloc.id);
      toast.info(`Allocation record removed.`, { theme: 'light' });
    }
  };

  const handleOpenAddModal = () => {
    setEditingDeposit(null);
    reset({
      date: new Date().toISOString().split('T')[0],
      userName: shukanPartners[0],
      amount: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deposit) => {
    setEditingDeposit(deposit);
    reset({
      date: deposit.date,
      userName: deposit.userName || shukanPartners[0],
      amount: deposit.amount,
      notes: deposit.notes || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    const depositData = {
      ...data,
      userName: data.userName || editingDeposit?.userName || shukanPartners[0]
    };
    if (editingDeposit) {
      updateVaultDeposit(editingDeposit.id, depositData);
      toast.success(`Deposit entry for ${depositData.userName} updated!`, { theme: 'light' });
    } else {
      const res = addVaultDeposit(depositData);
      if (res.success) {
        toast.success(`Added ${settings.currency}${parseFloat(data.amount).toLocaleString()} from ${depositData.userName} to Vault!`, { theme: 'light' });
      } else {
        toast.error(res.message, { theme: 'light' });
        return;
      }
    }
    setIsModalOpen(false);
    reset();
  };

  const handleDelete = (deposit) => {
    if (window.confirm(`Are you sure you want to remove deposit record for ${deposit.userName || 'Partner'} (${settings.currency}${deposit.amount})?`)) {
      deleteVaultDeposit(deposit.id);
      toast.info(`Deposit entry deleted`, { theme: 'light' });
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Combine Vault Deposits (+ Add Money) and Allocations (Give Money to User)
  const formattedVaultDeposits = (vaultDeposits || []).map((d) => ({
    id: d.id,
    date: d.date,
    userName: (d.userName && d.userName !== 'Shukan Admin') ? d.userName : 'Vraj',
    amount: d.amount,
    notes: d.notes ? d.notes.replace(/Admin Capital/g, 'Company Capital') : 'Company Capital Deposit',
    txnCategory: 'Add Money',
    rawItem: d
  }));

  const formattedAllocations = (allocationsHistory || []).map((a) => ({
    id: a.id,
    date: a.date,
    userName: a.userName,
    amount: a.amount,
    notes: a.notes ? a.notes.replace(/Admin allocated/g, 'Company allocated') : (a.purpose || 'Petty Cash Allowance'),
    txnCategory: 'Give Money',
    rawItem: a
  }));

  const combinedList = [...formattedVaultDeposits, ...formattedAllocations].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const filteredTransactions = combinedList.filter((t) => {
    if (activeTab === 'Add Money' && t.txnCategory !== 'Add Money') return false;
    if (activeTab === 'Give Money' && t.txnCategory !== 'Give Money') return false;

    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      (t.userName || '').toLowerCase().includes(query) ||
      (t.notes || '').toLowerCase().includes(query) ||
      (t.txnCategory || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* Printable Header for PDF Export */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold uppercase text-[#002B49]">SHUKAN PACKAGING</h1>
        <p className="text-xs font-semibold text-[#c69255]">Company Vault Deposit Logs & Capital Audit Report</p>
      </div>

      {/* Screen Header & Top Right Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Add Money Log & Vault Deposits</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Manage Company capital deposits, edit entries, and export PDF reports.</p>
        </div>

        {/* Top Right Corner Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Add Money Primary Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            + Add Money
          </button>

          {/* Give Money to User Button */}
          <button
            onClick={handleOpenGiveMoneyModal}
            className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-1.5 text-[#e6b875] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Give Money
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="col-span-2 sm:col-span-1 flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-1 sm:mr-1.5 text-[#002B49] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF / Print
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-5 print:grid-cols-2">
        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#c69255]">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Total Deposited</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#9e6e34] mt-0.5 sm:mt-2 truncate">
            {settings.currency}{totalVaultDeposited.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{vaultDeposits.length} Entries</p>
        </div>

        <div className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#002B49]">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate">Company Vault</p>
          <p className="text-base sm:text-2xl font-extrabold text-[#002B49] mt-0.5 sm:mt-2 truncate">
            {settings.currency}{adminVaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">Available Reserve</p>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 print:hidden">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          {[
            { id: 'All', label: 'All Transactions' },
            { id: 'Add Money', label: '+ Add Money' },
            { id: 'Give Money', label: 'Give Money to User' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none px-2.5 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-center whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#c69255] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name or Description..."
            className="px-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none w-full md:w-64"
          />
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline whitespace-nowrap">
            Showing {filteredTransactions.length} entries
          </span>
        </div>
      </div>

      {/* Vault Deposits & Allocations Table / Mobile Card List */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        {/* Mobile View Card List (No Scrollbar - App Style) */}
        <div className="block md:hidden space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No transaction entries found. Click "+ Add Money" or "Give Money to User" to record funds.
            </div>
          ) : (
            filteredTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        t.txnCategory === 'Add Money'
                          ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                          : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                      }`}
                    >
                      {t.txnCategory === 'Add Money' ? '+ Add Money' : 'Give Money'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{t.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Name / User</span>
                    <span className="text-sm font-extrabold text-[#002B49]">{t.userName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Amount</span>
                    <span className={`text-sm font-extrabold ${t.txnCategory === 'Add Money' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {settings.currency}{parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {t.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl font-medium">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Description / Purpose</span>
                    {t.notes}
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  {t.txnCategory === 'Add Money' ? (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(t.rawItem)}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#002B49] hover:text-white text-xs font-bold transition flex items-center"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.rawItem)}
                        className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenEditAllocationModal(t.rawItem)}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#002B49] hover:text-white text-xs font-bold transition flex items-center"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAllocation(t.rawItem)}
                        className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </>
                  )}
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
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Name / User</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Description / Purpose</th>
                <th className="py-3 px-4 text-right font-bold print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No transaction entries found. Click "+ Add Money" or "Give Money to User" to record funds.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-semibold">{t.date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          t.txnCategory === 'Add Money'
                            ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                            : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                        }`}
                      >
                        {t.txnCategory === 'Add Money' ? '+ Add Money' : 'Give Money'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className={`py-3.5 px-4 font-bold ${t.txnCategory === 'Add Money' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {settings.currency}{parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 print:hidden">
                      {t.txnCategory === 'Add Money' ? (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(t.rawItem)}
                            title="Edit Deposit Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.rawItem)}
                            title="Delete Deposit Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEditAllocationModal(t.rawItem)}
                            title="Edit Allocation Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAllocation(t.rawItem)}
                            title="Delete Allocation Entry"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
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
            <p className="text-xs text-slate-500 font-medium mb-6">Record capital funds added into Company Master Vault.</p>

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

              {/* Partner Name */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Partner Name</label>
                <select
                  {...register('userName', { required: 'Partner Name is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {shukanPartners.map((partner) => (
                    <option key={partner} value={partner}>{partner}</option>
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

      {/* GIVE MONEY TO USER MODAL */}
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

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">
              {editingAllocation ? 'Edit Money Allocation' : 'Give Money to User'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              {editingAllocation ? 'Modify allocated petty cash amount or user details.' : 'Transfer petty cash funds from Company Vault to team member allowance.'}
            </p>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Available Company Vault Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{adminVaultBalance.toLocaleString()}</span>
            </div>

            <form onSubmit={subGive(onGiveMoneySubmit)} className="space-y-4">
              {/* Select Target User */}
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
                {errGive.userName && <p className="text-xs text-rose-500 mt-1">{errGive.userName.message}</p>}
              </div>

              {/* Amount */}
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

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Factory petty cash advance"
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
                  {editingAllocation ? 'Update Allocation' : 'Transfer Money'}
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
