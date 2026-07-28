import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExpense } from '../../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { adminVaultBalance, settings, addMoneyToAdminVault, getUserStats } = useExpense();

  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator';
  const userStats = getUserStats(user?.name || '');

  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onAddMoneySubmit = (data) => {
    const res = addMoneyToAdminVault(data.amount, data.notes);
    if (res.success) {
      toast.success(`Added ${settings.currency}${parseFloat(data.amount).toLocaleString()} to Admin Vault!`, { theme: 'light' });
      setIsAddMoneyOpen(false);
      reset();
    } else {
      toast.error(res.message, { theme: 'light' });
    }
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 border-b border-slate-200/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left section: Toggle & Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden md:block">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portal Mode: </span>
          <span className="text-xs font-extrabold text-[#002B49] uppercase tracking-wider">{user?.role || 'Staff'} View</span>
        </div>
      </div>

      {/* Right section: Vault / Balance Badge & User Profile */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        {/* Admin Vault vs Staff User Balance Badge */}
        {isAdmin ? (
          <div className="flex items-center bg-[#002B49] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs space-x-2 border border-[#c69255]/40">
            <span className="text-[#e6b875]">Vault:</span>
            <span>{settings.currency}{adminVaultBalance.toLocaleString()}</span>
            <button
              onClick={() => setIsAddMoneyOpen(true)}
              className="ml-1 px-2 py-0.5 rounded bg-[#c69255] hover:bg-[#d4a359] text-white text-[11px] font-extrabold transition flex items-center space-x-1"
            >
              <span>+ Deposit Capital</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-[#002B49] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs space-x-2 border border-[#c69255]/40">
            <span className="text-[#e6b875]">My Remaining Bal:</span>
            <span className="text-emerald-400">{settings.currency}{userStats.remaining.toLocaleString()}</span>
          </div>
        )}

        {/* User Profile Info */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-white p-0.5 ring-2 ring-[#c69255]/40 overflow-hidden shadow-xs">
            <img
              src="/logo.jpg"
              alt="User Avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-[#002B49]">{user?.name || 'Staff User'}</div>
            <div className="text-[11px] text-[#c69255] font-semibold">{user?.role || 'Staff Member'}</div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 ml-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Top Navbar Add Money Modal (Admin Only) */}
      {isAdmin && isAddMoneyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white text-slate-900 w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsAddMoneyOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[#b88548] flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#002B49]">Deposit Vault Capital</h3>
                <p className="text-xs text-slate-500 font-medium">Top up Admin Master Reserve to give funds to team members.</p>
              </div>
            </div>

            <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Current Vault Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{adminVaultBalance.toLocaleString()}</span>
            </div>

            <form onSubmit={handleSubmit(onAddMoneySubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount to Add ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2000"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Notes / Deposit Source</label>
                <input
                  type="text"
                  placeholder="e.g. Owner capital deposit"
                  {...register('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddMoneyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
