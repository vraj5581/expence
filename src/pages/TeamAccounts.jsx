import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

const TeamAccounts = () => {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus, getUserStats, settings, allocateMoneyToUser } = useExpense();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleOpenAddModal = () => {
    setEditingUser(null);
    reset({
      name: '',
      id: '',
      role: 'Staff',
      password: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    reset({
      name: user.name,
      id: user.id,
      role: user.role || 'Staff',
      password: user.password,
      status: user.status
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data) => {
    if (editingUser) {
      updateUser(editingUser.id, data);
      toast.success(`User ${data.name} updated!`, { theme: 'light' });
    } else {
      addUser(data);
      toast.success(`New user ${data.name} created!`, { theme: 'light' });
    }
    setIsModalOpen(false);
    reset();
  };

  const handleToggleStatus = (user) => {
    toggleUserStatus(user.id);
    toast.info(`Status updated for ${user.name}`, { theme: 'light' });
  };

  const handleDelete = (user) => {
    if (window.confirm(`Remove user ${user.name}?`)) {
      deleteUser(user.id);
      toast.warning(`User ${user.name} removed.`, { theme: 'light' });
    }
  };

  const togglePasswordVisibility = (userId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Team Accounts</h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create New User
          </button>
        </div>
      </div>

      {/* User List Table / Mobile Card List */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        {/* Mobile View Card List (No Scrollbar - Native App Style) */}
        <div className="block md:hidden space-y-3">
          {users.map((u, index) => (
            <div key={u.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                  <span className="text-sm font-extrabold text-[#002B49]">{u.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    (u.role || 'Staff') === 'Administrator'
                      ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                      : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                  }`}>
                    {u.role || 'Staff'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleStatus(u)}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                    u.status === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-500/15 text-rose-800 border border-rose-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 ${u.status === 'Active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                  {u.status}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Password</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-xs text-slate-700 font-semibold">
                      {showPasswordMap[u.id] ? u.password : '••••••••'}
                    </span>
                    <button
                      onClick={() => togglePasswordVisibility(u.id)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPasswordMap[u.id] ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.38c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Created Date</span>
                  <span className="text-xs text-slate-500 font-medium">{u.createdAt || '2025-01-10'}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditModal(u)}
                  className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#002B49] hover:text-white text-xs font-bold transition flex items-center"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-xs font-bold transition flex items-center"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">User Name</th>
                <th className="py-3 px-4 font-bold">Role</th>
                <th className="py-3 px-4 font-bold">Password</th>
                <th className="py-3 px-4 font-bold">Account Status</th>
                <th className="py-3 px-4 text-right font-bold no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u, index) => (
                <tr key={u.id || index} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold bg-[#002B49]/10 text-[#002B49]">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-bold text-[#002B49]">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      (u.role || 'Staff') === 'Administrator'
                        ? 'bg-amber-500/15 text-[#9e6e34] border border-[#c69255]/30'
                        : 'bg-[#002B49]/10 text-[#002B49] border border-[#002B49]/20'
                    }`}>
                      {u.role || 'Staff'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs text-slate-600">
                        {showPasswordMap[u.id] ? u.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(u.id)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                        title="Toggle Password View"
                      >
                        {showPasswordMap[u.id] ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 012.122-.38c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition ${
                        u.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-500/15 text-rose-800 border border-rose-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.status === 'Active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                      {u.status}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 no-print">
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      title="Edit User"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#002B49] hover:bg-slate-100 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {u.id !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u)}
                        title="Delete User"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
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

            <h3 className="text-xl font-extrabold text-[#002B49] mb-6">
              {editingUser ? `Edit User (${editingUser.name})` : 'Create New User'}
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">User Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Patel"
                  {...register('name', { required: 'User Name is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">ID/Name</label>
                <input
                  type="text"
                  placeholder="e.g. rahul"
                  {...register('id', { required: 'ID/Name is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.id && <p className="text-xs text-rose-500 mt-1">{errors.id.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Role / Designation</label>
                <input
                  type="text"
                  list="user-role-list"
                  placeholder="e.g. Staff, Partner, Administrator, Manager..."
                  {...register('role')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                <datalist id="user-role-list">
                  <option value="Staff" />
                  <option value="Administrator" />
                  <option value="Partner" />
                  <option value="Manager" />
                  <option value="Accountant" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Password</label>
                <input
                  type="text"
                  placeholder="Enter password"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
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
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAccounts;
