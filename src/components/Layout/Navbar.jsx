import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExpense } from '../../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const Navbar = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const { adminVaultBalance, settings, addMoneyToAdminVault, getUserStats, users, isSyncing, refetchData } = useExpense();

  const currentUserInDb = users?.find(u => u.id === user?.id || u.name?.toLowerCase() === user?.name?.toLowerCase());
  const effectiveRole = currentUserInDb?.role || user?.role || 'Staff';

  const isAdmin = user?.id === 'admin' || user?.role === 'Administrator' || currentUserInDb?.role === 'Administrator';
  const userStats = getUserStats(user?.name || '');

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleChangePasswordSubmit = async (e) => {
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
    const res = await changePassword(pwdCurrent, pwdNew);
    setPwdLoading(false);
    if (res.success) {
      toast.success('Your password was updated successfully!', { theme: 'light' });
      setIsChangePasswordOpen(false);
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } else {
      toast.error(res.message || 'Failed to update password', { theme: 'light' });
    }
  };

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/90 border-b border-slate-200/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between shadow-xs print:hidden">
      {/* Left section: Live Sync Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          {/* Live Sync Badge */}
          <div
            onClick={() => refetchData && refetchData()}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-extrabold shadow-2xs cursor-pointer hover:bg-emerald-100 transition shrink-0"
            title="Click to manually refresh database state"
          >
            <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : 'animate-pulse'}`}></span>
            <span>{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
          </div>
        </div>
      </div>

      {/* Right section: User Profile Dropdown Pop-Up */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          className="flex items-center space-x-3 p-1.5 pl-3 rounded-2xl hover:bg-slate-100/80 transition-all border border-slate-200/60 cursor-pointer shadow-xs"
        >
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 ring-2 ring-[#c69255]/40 overflow-hidden shadow-xs shrink-0">
            <img
              src="/logo.jpg"
              alt="User Avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-left max-w-[85px] sm:max-w-none min-w-0">
            <div className="text-xs font-extrabold text-[#002B49] leading-tight truncate">{user?.name || 'User'}</div>
            <div className="text-[9.5px] sm:text-[10px] text-[#c69255] font-bold uppercase tracking-wider truncate">{effectiveRole}</div>
          </div>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180 text-[#002B49]' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Profile Pop-Up Menu */}
        {isProfileDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 py-2.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header User Card */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 ring-2 ring-[#c69255]/30 shadow-xs shrink-0">
                <img src="/logo.jpg" alt="Avatar" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-[#002B49] truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] font-semibold text-[#c69255] truncate">@{user?.username || user?.id || 'user'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9.5px] font-extrabold bg-[#002B49]/10 text-[#002B49] rounded-md">
                  {effectiveRole}
                </span>
              </div>
            </div>

            {/* Pop-Up Options List */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  navigate('/admin/settings', { state: { tab: 'password' } });
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#002B49] flex items-center space-x-2.5 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>Account Settings</span>
              </button>
            </div>

            <div className="border-t border-slate-100 my-1 pt-1">
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
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
