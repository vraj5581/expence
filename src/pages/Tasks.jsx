import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate, getTodayYMD } from '../utils/dateUtils';

const Tasks = () => {
  const { tasks, addTask, updateTask, deleteTask, updateTaskStatus, users } = useExpense();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.id === 'admin' || currentUser?.role === 'Administrator' || currentUser?.name?.toLowerCase() === 'vraj';

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
      const matchCat = (task.category || '').toLowerCase().includes(term);
      if (!matchTitle && !matchDesc && !matchUser && !matchId && !matchCat) return false;
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
      assignedTo: !isAdmin ? (currentUser?.name || 'Raj') : (users[1]?.name || users[0]?.name || 'Raj'),
      priority: 'Medium',
      category: 'General',
      status: 'Pending',
      dueDate: getTodayYMD(new Date(Date.now() + 86400000 * 2))
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || currentUser?.name || 'Raj',
      priority: task.priority || 'Medium',
      category: task.category || 'General',
      status: task.status || 'Pending',
      dueDate: task.dueDate || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitTask = async (data) => {
    const taskPayload = {
      ...data,
      assignedTo: !isAdmin ? (editingTask ? editingTask.assignedTo : (currentUser?.name || 'Raj')) : data.assignedTo
    };

    if (editingTask) {
      const res = await updateTask(editingTask.id, taskPayload);
      if (res && res.success) {
        toast.success(`Task "${taskPayload.title}" updated successfully!`, { theme: 'light' });
        setIsModalOpen(false);
      } else {
        toast.error(res?.message || 'Failed to update task in PHP database', { theme: 'light' });
      }
    } else {
      const res = await addTask(taskPayload);
      if (res && res.success) {
        toast.success(`New task assigned to ${taskPayload.assignedTo}!`, { theme: 'light' });
        setIsModalOpen(false);
      } else {
        toast.error(res?.message || 'Failed to save task in PHP database', { theme: 'light' });
      }
    }
  };

  const handleDeleteTask = async (id, title) => {
    if (window.confirm(`Delete task "${title}"?`)) {
      const res = await deleteTask(id);
      if (res && res.success) {
        toast.info('Task removed from system', { theme: 'light' });
      } else {
        toast.error(res?.message || 'Failed to delete task from PHP database', { theme: 'light' });
      }
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    const res = await updateTaskStatus(task.id, newStatus);
    if (res && res.success) {
      toast.success(`Task updated to ${newStatus}`, { theme: 'light' });
    } else {
      toast.error(res?.message || 'Failed to update task status in PHP database', { theme: 'light' });
    }
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

  const getStatusLeftBarClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500';
      case 'In Progress':
        return 'bg-sky-500';
      case 'On Hold':
        return 'bg-purple-500';
      default:
        return 'bg-amber-500';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto print:space-y-4">
      {/* Printable Document Header (B&W Report) */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-black uppercase tracking-wide">
              {isAdmin ? 'Task Assignments Report' : `Task Report - ${currentUser?.name || 'User'}`}
            </h1>
            <p className="text-xs text-black font-medium mt-0.5">
              Generated on: {formatDate(new Date())} • Total Tasks: {filteredTasks.length}
            </p>
          </div>
          <div className="text-right text-xs text-black font-bold">
            {hasActiveFilters && (
              <span className="block text-[10px] text-black italic">
                Filtered: {activeStatusTab !== 'All' ? `Status: ${activeStatusTab} ` : ''}{selectedUser !== 'All' ? `User: ${selectedUser} ` : ''}{selectedCategory !== 'All' ? `Cat: ${selectedCategory}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header & Main Action */}
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 print:hidden">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            {isAdmin ? 'Tasks' : 'My Tasks'}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#002B49]/10 text-[#002B49]">
            {filteredTasks.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Assign New Task</span>
            <span className="sm:hidden">New Task</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Print Tasks</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: 2x2 Grid on Mobile, 4-col on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 print:grid-cols-4 print:gap-2">
        <div
          onClick={() => setActiveStatusTab('All')}
          className={`glass-card p-3 sm:p-5 rounded-2xl border-l-4 border-l-[#002B49] cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white ${
            activeStatusTab === 'All' ? 'ring-2 ring-[#002B49] bg-[#002B49]/5 shadow-sm' : ''
          }`}
          title="Click to view All Tasks"
        >
          <p className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Total Tasks</p>
          <p className="text-xl sm:text-3xl font-extrabold text-[#002B49] mt-0.5 sm:mt-1 print:text-base print:font-black print:text-black print:mt-0">{totalCount}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">All Assigned Duties</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('Pending')}
          className={`glass-card p-3 sm:p-5 rounded-2xl border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white ${
            activeStatusTab === 'Pending' ? 'ring-2 ring-amber-500 bg-amber-50/70 shadow-sm' : ''
          }`}
          title="Click to filter Pending Tasks"
        >
          <p className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Pending</p>
          <p className="text-xl sm:text-3xl font-extrabold text-amber-700 mt-0.5 sm:mt-1 print:text-base print:font-black print:text-black print:mt-0">{pendingCount}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Awaiting Action</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('In Progress')}
          className={`glass-card p-3 sm:p-5 rounded-2xl border-l-4 border-l-sky-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white ${
            activeStatusTab === 'In Progress' ? 'ring-2 ring-sky-500 bg-sky-50/70 shadow-sm' : ''
          }`}
          title="Click to filter In Progress Tasks"
        >
          <p className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">In Progress</p>
          <p className="text-xl sm:text-3xl font-extrabold text-sky-700 mt-0.5 sm:mt-1 print:text-base print:font-black print:text-black print:mt-0">{inProgressCount}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Active Execution</p>
        </div>

        <div
          onClick={() => setActiveStatusTab('Completed')}
          className={`glass-card p-3 sm:p-5 rounded-2xl border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 print:p-2.5 print:py-2 print:border print:border-slate-400 print:border-l-4 print:border-l-slate-800 print:rounded-lg print:shadow-none print:bg-white ${
            activeStatusTab === 'Completed' ? 'ring-2 ring-emerald-500 bg-emerald-50/70 shadow-sm' : ''
          }`}
          title="Click to filter Completed Tasks"
        >
          <p className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-500 truncate print:text-[10px] print:text-slate-800 print:font-extrabold">Completed</p>
          <p className="text-xl sm:text-3xl font-extrabold text-emerald-700 mt-0.5 sm:mt-1 print:text-base print:font-black print:text-black print:mt-0">{completedCount}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 font-medium mt-0.5 print:text-[9px] print:text-slate-700 print:mt-0">Finished Duties</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl space-y-2.5 sm:space-y-0 print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 md:max-w-md">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search title, ID, user, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                hasActiveFilters
                  ? 'bg-[#002B49] text-white border-[#002B49] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4 mr-1 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter</span>
              {hasActiveFilters && <span className="ml-1 text-[#c69255] font-extrabold">•</span>}
            </button>
          </div>

          {/* Horizontally scrollable status tab bar on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200 scrollbar-none">
            {['All', 'Pending', 'In Progress', 'Completed', 'On Hold'].map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatusTab(status)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition cursor-pointer text-center whitespace-nowrap ${
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

      {/* Filter Popup Modal / Mobile Sheet */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Mobile Bottom Sheet Handle Indicator */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-[#c69255]/30">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#002B49]">Filter Tasks</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Filter by status, assignee, category & priority</p>
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

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#002B49] uppercase tracking-wider mb-1">Task Status</label>
                <select
                  value={activeStatusTab}
                  onChange={(e) => setActiveStatusTab(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#002B49] uppercase tracking-wider mb-1">Assigned User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-800 bg-white focus:outline-none font-semibold border border-slate-200"
                >
                  <option value="All">All Users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#002B49] uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-800 bg-white font-semibold focus:outline-none border border-slate-200"
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
                  <label className="block text-[11px] font-bold text-[#002B49] uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-800 bg-white font-semibold focus:outline-none border border-slate-200"
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

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3 pb-2 sm:pb-0">
              <button
                onClick={() => { setActiveStatusTab('All'); setSelectedUser('All'); setSelectedCategory('All'); setSelectedPriority('All'); setSearchTerm(''); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List Table & Mobile Cards */}
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl space-y-3.5 print:p-0 print:border-none print:shadow-none print:bg-transparent">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-sm sm:text-base font-extrabold text-[#002B49]">Task Assignments ({filteredTasks.length})</h2>
        </div>

        {/* Mobile View Card List (Hidden in Print) */}
        <div className="block md:hidden space-y-3 print:hidden">
          {filteredTasks.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <svg className="w-8 h-8 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-semibold text-slate-700">No tasks match your criteria</p>
              <p className="text-[11px] text-slate-400">Try adjusting your filters or click "+ New Task" to assign a task.</p>
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 relative overflow-hidden transition-all hover:shadow-md"
              >
                {/* Status Indicator Bar on Left Edge */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusLeftBarClass(t.status)}`} />

                {/* Top Row: Task ID, Category, Priority */}
                <div className="flex items-center justify-between pl-1 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-[#002B49] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px]">{t.id}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                      {t.category || 'General'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadgeClass(t.priority)}`}>
                    {t.priority}
                  </span>
                </div>

                {/* Task Title & Description */}
                <div className="pl-1">
                  <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">{t.title}</h3>
                  {t.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Single Compact Footer Line: Assignee, Due Date, Status, Actions */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 pl-1 text-[10px]">
                  <div className="flex items-center space-x-1.5 text-slate-500 font-medium truncate min-w-0 pr-1">
                    <span className="font-extrabold text-[#9e6e34] flex items-center space-x-1 shrink-0">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#002B49] text-white inline-flex items-center justify-center text-[8px] font-bold shrink-0">
                        {t.assignedTo ? t.assignedTo.charAt(0).toUpperCase() : 'U'}
                      </span>
                      <span className="truncate max-w-[80px]">{t.assignedTo}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-600 shrink-0">{formatDate(t.dueDate)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-[10px] focus:outline-none cursor-pointer border font-extrabold transition-colors ${getStatusBadgeClass(t.status)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        className="w-6.5 h-6.5 rounded-lg bg-slate-100/90 text-slate-700 hover:bg-[#002B49] hover:text-white border border-slate-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-2xs"
                        title="Edit Task"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L20 4.828a2 2 0 010 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id, t.title)}
                        className="w-6.5 h-6.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-2xs"
                        title="Delete Task"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View & Printable High-Contrast B&W Table */}
        <div className="hidden md:block overflow-x-auto print:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs print:border-none print:shadow-none print:rounded-none print:overflow-visible">
          <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
              <tr>
                <th className="py-3 px-4 font-bold text-center print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[6%]">#</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[10%]">Task ID</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-auto">Task Title & Details</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[12%]">Category</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[14%]">Assignee</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[10%]">Priority</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[12%]">Due Date</th>
                <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[12%]">Status</th>
                <th className="py-3 px-4 font-bold text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-y-0">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-black">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, index) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition print:bg-white">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs text-center print:py-1.5 print:px-2 print:border print:border-black print:text-black">{index + 1}</td>
                    <td className="py-3.5 px-4 font-extrabold text-[#002B49] text-xs whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-bold">{t.id}</td>
                    <td className="py-3.5 px-4 print:py-1.5 print:px-2 print:border print:border-black print:text-black">
                      <div className="font-bold text-slate-900 text-xs print:text-black">{t.title}</div>
                      {t.description && <div className="text-[11px] text-slate-500 font-normal line-clamp-1 print:text-black print:text-[10px] print:line-clamp-none print:font-normal">{t.description}</div>}
                    </td>
                    <td className="py-3.5 px-4 print:py-1.5 print:px-2 print:border print:border-black">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] bg-slate-100 font-semibold text-slate-700 border border-slate-200/60 print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs">
                        {t.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#9e6e34] text-xs whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-bold">{t.assignedTo}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${getPriorityBadgeClass(t.priority)} print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black">{formatDate(t.dueDate)}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black">
                      <span className="hidden print:inline-block text-black font-bold text-xs uppercase print:border-none print:p-0">
                        {t.status}
                      </span>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t, e.target.value)}
                        className={`print:hidden px-2.5 py-1 rounded-full text-xs font-extrabold focus:outline-none cursor-pointer border ${getStatusBadgeClass(t.status)}`}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-lg p-5 sm:p-7 rounded-t-3xl sm:rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Mobile Bottom Sheet Handle */}
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg sm:text-xl font-extrabold text-[#002B49]">
              {editingTask ? 'Edit Task Details' : 'Assign New Task'}
            </h3>

            <form onSubmit={handleSubmit(onSubmitTask)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Raw Material Inspection Gate 2"
                  {...register('title', { required: 'Task title is required' })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.title && <span className="text-[11px] text-rose-600 mt-0.5 block">{errors.title.message}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Assign to Team Member</label>
                  <select
                    {...register('assignedTo')}
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-900 font-semibold focus:outline-none ${
                      !isAdmin ? 'bg-slate-100/90 text-slate-500 cursor-not-allowed border-slate-300' : 'bg-white'
                    }`}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  {!isAdmin && (
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Only Administrators can re-assign tasks to other team members.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Category</label>
                  <select
                    {...register('category')}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="Purchase">Purchase</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
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
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-900 bg-white font-semibold focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Due Date</label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Instructions / Description</label>
                <textarea
                  rows="3"
                  placeholder="Provide detailed instructions for the assignee..."
                  {...register('description')}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2 pb-2 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-md transition"
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
