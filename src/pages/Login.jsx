import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';

const Login = () => {
  const { login, isAuthenticated, user } = useAuth();
  const { users } = useExpense();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const isAdmin = user?.id === 'admin' || user?.role === 'Administrator' || user?.name?.toLowerCase() === 'vraj';
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      adminId: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    const res = await login(data.adminId, data.password, users);
    if (res.success) {
      toast.success(`Welcome to Shukan Packaging Portal (${res.user.name})!`, {
        position: 'top-right',
        theme: 'light'
      });
      const isAdmin = res.user?.id === 'admin' || res.user?.role === 'Administrator' || res.user?.name?.toLowerCase() === 'vraj';
      navigate(isAdmin ? '/admin/dashboard' : '/user/dashboard');
    } else {
      toast.error(res.message, {
        position: 'top-right',
        theme: 'light'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Soft Ambient Light Glow Background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#002B49]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#c69255]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl shadow-slate-300/50">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-36 h-28 bg-white rounded-2xl p-2 flex items-center justify-center mx-auto shadow-md border border-slate-200 mb-4">
              <img
                src="/logo.jpg"
                alt="Shukan Packaging Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-extrabold text-[#002B49] tracking-wide uppercase">Shukan Packaging</h1>
            <p className="text-xs text-[#c69255] font-bold mt-1 uppercase tracking-wider">Expense & Fund Allocation Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* User ID / Name field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#002B49] mb-2">
                User ID / Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter User ID or Name"
                  {...register('adminId', { required: 'User ID is required' })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c69255] focus:ring-2 focus:ring-[#c69255]/20 transition"
                />
                <span className="absolute right-3 top-3.5 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
              {errors.adminId && (
                <p className="text-xs text-rose-500 mt-1">{errors.adminId.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#002B49] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#c69255] focus:ring-2 focus:ring-[#c69255]/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.38c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
              )}
            </div>



            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#c69255] via-[#b88548] to-[#99682e] text-white font-bold text-sm shadow-md shadow-amber-900/20 hover:from-[#d4a359] hover:to-[#a67437] transition-all duration-200 uppercase tracking-wider"
            >
              Sign In to Portal
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          Shukan Packaging &copy; {new Date().getFullYear()} - All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default Login;
