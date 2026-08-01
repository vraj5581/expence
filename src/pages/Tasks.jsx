import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';

const Tasks = () => {
  const { tasks, addTask, updateTask, deleteTask, updateTaskStatus, users } = useExpense();
  const { user: currentUser } = useAuth();

  const [activeStatusTab, setActiveStatusTab] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedUser, setSelectedUser] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveFilters = Boolean(
    activeStatusTab !== 'All' ||
    selectedCategory !== 'All' ||
    selectedPriority !== 'All' ||
    selectedUser !== 'All'
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Filter Tasks
  const filteredTasks = (tasks || []).filter(task => {
    if (activeStatusTab !== 'All' && task.status !== activeStatusTab) return false;
    if (selectedCategory !== 'All' && task.category !== selectedCategory) return false;
    if (selectedPriority !== 'All' && task.priority !== selectedPriority) return false;
    if (selectedUser !== 'All' && task.assignedTo !== selectedUser) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(term);
      const matchDesc = (task.description || '').toLowerCase().includes(term);
      const matchUser = (task.assignedTo || '').toLowerCase().includes(term);
      const matchId = (task.id || '').toLowerCase().includes(term);
      if (!matchTitle && !matchDesc && !matchUser && !matchId) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = (tasks || []).length;
  const pendingCount = (tasks || []).filter(t => t.status === 'Pending').length;
  const inProgressCount = (tasks || []).filter(t => t.status === 'In Progress').length;
  const completedCount = (tasks || []).filter(t => t.status === 'Completed').length;

  const handleOpenAddModal = () => {
    setEditingTask(null);
    reset({
      title: '',
      description: '',
      assignedTo: users[1]?.name || 'Raj',
      priority: 'Medium',
      category: 'General',
      status: 'Pending',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || 'Raj',
      priority: task.priority || 'Medium',
      category: task.category || 'General',
      status: task.status || 'Pending',
      dueDate: task.dueDate || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitTask = (data) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      toast.success(`Task "${data.title}" updated successfully!`, { theme: 'light' });
    } else {
      addTask(data);
      toast.success(`New task assigned to ${data.assignedTo}!`, { theme: 'light' });
    }
    setIsModalOpen(false);
  };

  const handleDeleteTask = (id, title) => {
    if (window.confirm(`Delete task "${title}"?`)) {
      deleteTask(id);
      toast.info('Task removed from system', { theme: 'light' });
    }
  };

  const handleStatusChange = (task, newStatus) => {
    updateTaskStatus(task.id, newStatus);
    toast.success(`Task updated to ${newStatus}`, { theme: 'light' });
  };

  const handlePrint = () => {
    window.print();
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold';
      case 'High':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
      case 'Medium':
        return 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold';
      case 'In Progress':
        return 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold';
      case 'On Hold':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold';
      default:
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:space-y-4">
      {/* Header & Main Action */}
      <div className="flex flex-row items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            {currentUser?.role === 'Administrator' || currentUser?.id === 'admin' ? 'Tasks' : 'My Tasks'}
          </h1>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Assign New Task
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Tasks
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 print:grid-cols-4 print:gap-2">
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-[#002B49] print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Total Tasks</p>
          <p className="text-xl sm:text-3xl font-extrabold text-[#002B49] mt-1 print:text-base print:font-black print:text-black print:mt-0">{totalCount}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">All Assigned Duties</p>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-amber-500 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Pending Tasks</p>
          <p className="text-xl sm:text-3xl font-extrabold text-amber-700 mt-1 print:text-base print:font-black print:text-black print:mt-0">{pendingCount}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Awaiting Action</p>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-sky-500 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">In Progress</p>
          <p className="text-xl sm:text-3xl font-extrabold text-sky-700 mt-1 print:text-base print:font-black print:text-black print:mt-0">{inProgressCount}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Active Execution</p>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-emerald-500 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white">
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Completed</p>
          <p className="text-xl sm:text-3xl font-extrabold text-emerald-700 mt-1 print:text-base print:font-black print:text-black print:mt-0">{completedCount}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Finished Duties</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-3.5 sm:p-4 rounded-2xl print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            <div className="relative flex-1 md:max-w-md">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search task title, ID, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                hasActiveFilters
                  ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4 mr-1.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">●</span>}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
            {['All', 'Pending', 'In Progress', 'Completed', 'On Hold'].map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatusTab(status)}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer text-center whitespace-nowrap ${
                  activeStatusTab === status
                    ? 'bg-[#c69255] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Popup Modal */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30">
                  <svg className="w-5 h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Task List</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Filter assigned tasks by user, category & priority</p>
                </div>
              </div>

              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Task Status</label>
                <select
                  value={activeStatusTab}
                  onChange={(e) => setActiveStatusTab(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Assigned User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold focus:outline-none border border-slate-200"
                  >
                    <option value="All">All Categories</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Priority Level</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-semibold focus:outline-none border border-slate-200"
                  >
                    <option value="All">All Priorities</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { setActiveStatusTab('All'); setSelectedUser('All'); setSelectedCategory('All'); setSelectedPriority('All'); setSearchTerm(''); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List Table & Mobile Cards */}
      <div className="glass-card p-4 sm:p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#002B49]">Task Assignments ({filteredTasks.length})</h2>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No tasks found. Click "Assign New Task" to create a task entry.
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div key={t.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#002B49]">{t.id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${getPriorityBadgeClass(t.priority)}`}>
                    {t.priority} Priority
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900">{t.title}</h3>
                  {t.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Assignee</span>
                    <span className="font-extrabold text-[#9e6e34]">{t.assignedTo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Due Date</span>
                    <span className="font-semibold text-slate-700">{formatDate(t.dueDate)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t, e.target.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] focus:outline-none cursor-pointer border ${getStatusBadgeClass(t.status)}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(t)}
                      className="p-1.5 text-slate-500 hover:text-[#002B49] rounded-lg hover:bg-slate-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L20 4.828a2 2 0 010 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id, t.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
                <th className="py-3 px-4 font-bold">Task ID</th>
                <th className="py-3 px-4 font-bold">Task Title & Details</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Assignee</th>
                <th className="py-3 px-4 font-bold">Priority</th>
                <th className="py-3 px-4 font-bold">Due Date</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-extrabold text-[#002B49] text-xs whitespace-nowrap">{t.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{t.title}</div>
                      {t.description && <div className="text-[11px] text-slate-500 font-normal line-clamp-1">{t.description}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 font-semibold text-slate-700">
                        {t.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#9e6e34] text-xs whitespace-nowrap">{t.assignedTo}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${getPriorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">{formatDate(t.dueDate)}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-extrabold focus:outline-none cursor-pointer border ${getStatusBadgeClass(t.status)}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right print:hidden whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 text-slate-500 hover:text-[#002B49] rounded-lg hover:bg-slate-100"
                          title="Edit Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L20 4.828a2 2 0 010 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(t.id, t.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Creation & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl space-y-5">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49]">
              {editingTask ? 'Edit Task Details' : 'Assign New Task'}
            </h3>

            <form onSubmit={handleSubmit(onSubmitTask)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Raw Material Inspection Gate 2"
                  {...register('title', { required: 'Task title is required' })}
                  className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.title && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.title.message}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Assign to Team Member</label>
                  <select
                    {...register('assignedTo', { required: true })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Category</label>
                  <select
                    {...register('category')}
                    className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="Purchase">Purchase</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                  <select
                    {...register('status')}
                    className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Due Date</label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Instructions / Description</label>
                <textarea
                  rows="3"
                  placeholder="Provide detailed instructions for the assignee..."
                  {...register('description')}
                  className="w-full px-4 py-2.5 text-xs rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md transition"
                >
                  {editingTask ? 'Update Task' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
