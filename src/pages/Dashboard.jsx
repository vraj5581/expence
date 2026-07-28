import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const {
    adminVaultBalance,
    userAllocations,
    allocationsHistory,
    transactions,
    totalAllocatedToTeam,
    totalCashIn,
    totalCashOut,
    users,
    settings,
    allocateMoneyToUser,
    topUpAdminVault,
    getUserStats,
    addTransaction
  } = useExpense();

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.id === 'admin' || currentUser?.role === 'Administrator';

  // Modals state
  const [isGiveMoneyModalOpen, setIsGiveMoneyModalOpen] = useState(false);
  const [isTopUpVaultModalOpen, setIsTopUpVaultModalOpen] = useState(false);
  const [isAddTxnModalOpen, setIsAddTxnModalOpen] = useState(false);
  const [modalTxnType, setModalTxnType] = useState('Cash In');

  // React Hook Forms
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();
  const { register: regTopUp, handleSubmit: subTopUp, reset: resetTopUp, formState: { errors: errTopUp } } = useForm();
  const { register: regTxn, handleSubmit: subTxn, reset: resetTxn, formState: { errors: errTxn } } = useForm();

  // Give Money Submission
  const onGiveMoneySubmit = (data) => {
    const res = allocateMoneyToUser(data.userName, data.amount, data.notes);
    if (res.success) {
      toast.success(`Successfully allocated ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
      setIsGiveMoneyModalOpen(false);
      resetGive();
    } else {
      toast.error(res.message, { theme: 'light' });
    }
  };

  // Top Up Vault Submission
  const onTopUpVaultSubmit = (data) => {
    const ok = topUpAdminVault(data.amount);
    if (ok) {
      toast.success(`Admin Vault topped up by ${settings.currency}${parseFloat(data.amount).toLocaleString()}!`, { theme: 'light' });
      setIsTopUpVaultModalOpen(false);
      resetTopUp();
    } else {
      toast.error('Invalid amount entered.', { theme: 'light' });
    }
  };

  // Add Transaction Submission
  const openAddTxnModal = (type) => {
    setModalTxnType(type);
    resetTxn({
      type,
      amount: '',
      userName: currentUser?.name || users[0]?.name || 'Shukan Admin',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsAddTxnModalOpen(true);
  };

  const onAddTxnSubmit = (data) => {
    addTransaction({
      ...data,
      createdBy: data.userName
    });
    toast.success(`${data.type} transaction recorded for ${data.userName}!`, { theme: 'light' });
    setIsAddTxnModalOpen(false);
    resetTxn();
  };

  const matchedUser = users.find(u => u.name.toLowerCase() === currentUser?.name?.toLowerCase() || u.id.toLowerCase() === currentUser?.id?.toLowerCase());
  const displayedUsers = isAdmin
    ? users
    : (matchedUser ? [matchedUser] : [{ id: currentUser?.id || 'staff', name: currentUser?.name || 'Staff User' }]);

  const userTransactions = isAdmin
    ? transactions
    : transactions.filter(t => t.userName === currentUser?.name);

  const recentTransactions = userTransactions.slice(0, 5);

  const myStats = getUserStats(currentUser?.name || '');

  // Total Remaining Across All Team Members
  const totalTeamRemaining = users.reduce((sum, u) => {
    const stats = getUserStats(u.name);
    return sum + stats.remaining;
  }, 0);

  // Line Chart Data
  const lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Allocated Funds',
        data: [0, 0, 0, 0, 0, 0, isAdmin ? totalAllocatedToTeam : myStats.allocated],
        borderColor: '#c69255',
        backgroundColor: 'rgba(198, 146, 85, 0.15)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Spent Expenses',
        data: [0, 0, 0, 0, 0, 0, isAdmin ? totalCashOut : myStats.spent],
        borderColor: '#002B49',
        backgroundColor: 'rgba(0, 43, 73, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#334155', font: { family: 'Inter', weight: '600' } }
      }
    },
    scales: {
      x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
      y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } }
    }
  };

  // Calculations for Staff Financial Overview Chart
  const doneTotal = userTransactions
    .filter(t => (t.status || 'Done') === 'Done')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const dueTotal = userTransactions
    .filter(t => (t.status || 'Done') === 'Due')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const moneyGiven = myStats.allocated;
  const totalExpensesRequired = doneTotal + dueTotal;
  const neededFromAdmin = Math.max(0, totalExpensesRequired - moneyGiven);

  const staffBarChartData = {
    labels: ['Money Given', 'Expenses Done', 'Expenses Due', 'Need from Admin'],
    datasets: [
      {
        label: 'Amount',
        data: [moneyGiven, doneTotal, dueTotal, neededFromAdmin],
        backgroundColor: ['#c69255', '#10b981', '#f59e0b', '#ef4444'],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: ['#b88548', '#059669', '#d97706', '#dc2626']
      }
    ]
  };

  const staffBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` ${settings.currency}${context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#475569', font: { family: 'Inter', weight: '700', size: 11 } }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#64748b', callback: (value) => `${settings.currency}${value}` }
      }
    }
  };

  // Doughnut Chart Data Logic
  const userTotalsMap = {};
  if (isAdmin) {
    users.forEach(u => {
      const stats = getUserStats(u.name);
      if (stats.allocated > 0 || stats.spent > 0) {
        userTotalsMap[u.name] = stats.spent;
      }
    });
  } else {
    // For staff user, break down by Done vs Due status
    const doneTotal = userTransactions
      .filter(t => (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const dueTotal = userTransactions
      .filter(t => (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    if (doneTotal > 0) userTotalsMap['Done (Paid)'] = doneTotal;
    if (dueTotal > 0) userTotalsMap['Due (Pending)'] = dueTotal;
  }

  const doughnutData = {
    labels: Object.keys(userTotalsMap).length ? Object.keys(userTotalsMap) : ['No Expense Logs'],
    datasets: [
      {
        data: Object.values(userTotalsMap).length ? Object.values(userTotalsMap) : [1],
        backgroundColor: Object.keys(userTotalsMap).length ? [
          '#10b981',
          '#f59e0b',
          '#c69255',
          '#002B49',
          '#0284c7'
        ] : ['#cbd5e1'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#334155', font: { size: 11, family: 'Inter', weight: '500' } }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">
            {isAdmin ? 'Shukan Packaging Control Center' : `Welcome, ${currentUser?.name}!`}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isAdmin ? 'Petty cash vault, team allocations, and real-time user balances.' : 'View your petty cash balance and recent transactions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Action: Give Money to User (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => setIsGiveMoneyModalOpen(true)}
              className="flex items-center px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-sm font-bold shadow-md shadow-slate-900/20 transition-all border border-[#c69255]/40"
            >
              <svg className="w-5 h-5 mr-1.5 text-[#e6b875]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Give Money to User
            </button>
          )}

          <button
            onClick={() => openAddTxnModal('Cash Out')}
            className="flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-sm font-bold shadow-md shadow-amber-900/20 transition-all"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Expense
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Admin Vault Balance */}
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden border-t-4 border-t-[#002B49]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Vault Reserve</span>
              <button
                onClick={() => setIsTopUpVaultModalOpen(true)}
                className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-[#9e6e34] hover:bg-amber-500/25 font-bold transition"
              >
                + Top Up
              </button>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-[#002B49]">
                {settings.currency}{adminVaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-500 font-semibold flex items-center mt-1">
                Available to Transfer to Team
              </span>
            </div>
          </div>

          {/* 2. Total Allocated to Team */}
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden border-t-4 border-t-[#c69255]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Given to Team</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-[#b88548] flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-[#9e6e34]">
                {settings.currency}{totalAllocatedToTeam.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-[#b88548] font-semibold flex items-center mt-1">
                Allocated Petty Cash Pools
              </span>
            </div>
          </div>

          {/* 3. Total Expenses Spent */}
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden border-t-4 border-t-[#002B49]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Spent by Team</span>
              <div className="w-9 h-9 rounded-xl bg-slate-900/10 text-[#002B49] flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-[#002B49]">
                {settings.currency}{totalCashOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-600 font-semibold flex items-center mt-1">
                Logged User Expenses
              </span>
            </div>
          </div>

          {/* 4. Total Team Remaining Balance */}
          <div className="glass-card p-5 rounded-2xl relative overflow-hidden border-t-4 border-t-[#d4a359]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Team Remaining Balance</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-[#9e6e34] flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-[#9e6e34]">
                {settings.currency}{totalTeamRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-500 font-semibold flex items-center mt-1">
                Unspent In-Hand Balance
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* 1. My Money Given by Admin */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255]">
            <p className="text-xs uppercase font-bold text-slate-500">My Money Given by Admin</p>
            <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
              {settings.currency}{myStats.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-[#b88548] mt-1 font-semibold">Your Total Petty Cash Allowance</p>
          </div>

          {/* 2. My Spent Expenses */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49]">
            <p className="text-xs uppercase font-bold text-slate-500">My Spent Expenses</p>
            <p className="text-2xl font-extrabold text-[#002B49] mt-2">
              {settings.currency}{myStats.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{userTransactions.length} Expense Logs Submitted</p>
          </div>

          {/* 3. My Remaining Balance Right Now */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#d4a359]">
            <p className="text-xs uppercase font-bold text-slate-500">My Remaining Balance Right Now</p>
            <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
              {settings.currency}{myStats.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-700 mt-1 font-bold">Available Cash In Hand</p>
          </div>
        </div>
      )}

      {/* User Allowance & Balance Summary Table (Admin Only) */}
      {isAdmin && (
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#002B49]">User Balance & Allowance Summary</h2>
              <p className="text-xs text-slate-500 font-medium">Real-time breakdown of funds given by Admin, spent amount, and remaining balance.</p>
            </div>

            <button
              onClick={() => setIsGiveMoneyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-xs"
            >
              + Give Money to User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">User Name</th>
                  <th className="py-3 px-4 font-bold">ID/Name</th>
                  <th className="py-3 px-4 font-bold">Money Given (Allocated)</th>
                  <th className="py-3 px-4 font-bold">Spent Expenses</th>
                  <th className="py-3 px-4 font-bold">Remaining Balance</th>
                  <th className="py-3 px-4 font-bold">Allowance Progress</th>
                  <th className="py-3 px-4 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const stats = getUserStats(u.name);
                  const spentPercent = stats.allocated > 0 ? Math.min(100, Math.round((stats.spent / stats.allocated) * 100)) : 0;
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{u.id}</td>
                      <td className="py-3.5 px-4 font-bold text-[#9e6e34]">
                        {settings.currency}{stats.allocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">
                        {settings.currency}{stats.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ${stats.remaining > 0 ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                          {settings.currency}{stats.remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 w-40">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${spentPercent > 85 ? 'bg-rose-500' : spentPercent > 50 ? 'bg-[#c69255]' : 'bg-emerald-500'}`}
                            style={{ width: `${spentPercent}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-semibold">{spentPercent}% spent</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            resetGive({ userName: u.name, amount: '', notes: '' });
                            setIsGiveMoneyModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-[#002B49] hover:text-white text-slate-700 text-xs font-bold border border-slate-300 transition"
                        >
                          + Give Money
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Line Chart or Staff Personal Overview Chart */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#002B49]">
                {isAdmin ? 'Allocated vs Spent Financial Trends' : 'My Financial Overview (Given, Done, Due & Need)'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isAdmin
                  ? 'Comparison of money given by Admin vs team expenditures'
                  : 'Breakdown of money given by Admin, total done expenses, due expenses, and extra money needed'}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-[#c69255]/30 text-[#9e6e34] font-bold">
              2026 Financial Year
            </span>
          </div>

          <div className="h-64">
            {isAdmin ? (
              <Line data={lineChartData} options={lineChartOptions} />
            ) : (
              <Bar data={staffBarChartData} options={staffBarChartOptions} />
            )}
          </div>

          {!isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Money Given</span>
                <span className="text-xs sm:text-sm font-extrabold text-[#9e6e34]">
                  {settings.currency}{moneyGiven.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Expenses Done</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-800">
                  {settings.currency}{doneTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Expenses Due</span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-800">
                  {settings.currency}{dueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Need From Admin</span>
                <span className="text-xs sm:text-sm font-extrabold text-rose-700">
                  {settings.currency}{neededFromAdmin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Volume Doughnut Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-[#002B49]">
              {isAdmin ? 'User Expenditure Breakdown' : 'My Expense Status Breakdown'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isAdmin ? 'Expenses spent by team member' : 'Paid (Done) vs Pending (Due) expense breakdown'}
            </p>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Recent Transactions Table (Admin Only) */}
      {isAdmin && (
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#002B49]">Recent Transactions Log</h2>
              <p className="text-xs text-slate-500 font-medium">Latest recorded financial entries</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Txn ID</th>
                  <th className="py-3 px-4 font-bold">Movement Type</th>
                  <th className="py-3 px-4 font-bold">User Name</th>
                  <th className="py-3 px-4 font-bold">Description</th>
                  <th className="py-3 px-4 font-bold">Amount</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 text-xs font-medium">
                      No cash movement entries created yet. Click "Give Money to User" or "Add Expense" to start.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((t) => (
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
                        {t.type === 'Cash In' ? '+' : '-'}{settings.currency}{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs font-medium">{t.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. GIVE MONEY TO USER MODAL */}
      {isGiveMoneyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsGiveMoneyModalOpen(false)}
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
                  onClick={() => setIsGiveMoneyModalOpen(false)}
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

      {/* 2. TOP UP ADMIN VAULT MODAL */}
      {isTopUpVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsTopUpVaultModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">Top Up Admin Vault</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Add capital funds into Admin Master Vault reserve.</p>

            <form onSubmit={subTopUp(onTopUpVaultSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Top Up Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2000"
                  {...regTopUp('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errTopUp.amount && <p className="text-xs text-rose-500 mt-1">{errTopUp.amount.message}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpVaultModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold shadow-md"
                >
                  Confirm Top Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD TRANSACTION MODAL */}
      {isAddTxnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsAddTxnModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-1">Record New {modalTxnType}</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Fill in details for Shukan Packaging ledger.</p>

            <form onSubmit={subTxn(onAddTxnSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...regTxn('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errTxn.amount && <p className="text-xs text-rose-500 mt-1">{errTxn.amount.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">User Name</label>
                  <select
                    {...regTxn('userName', { required: 'User Name is required' })}
                    disabled={!isAdmin}
                    className={`w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none font-semibold ${!isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
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
                    defaultValue={new Date().toISOString().split('T')[0]}
                    {...regTxn('date', { required: 'Date is required' })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                <select
                  {...regTxn('status')}
                  defaultValue="Done"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  <option value="Done">Done (Paid / Completed)</option>
                  <option value="Due">Due (Pending - No Deduction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe transaction details..."
                  {...regTxn('description')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTxnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437]"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
