import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
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
  const navigate = useNavigate();
  const {
    adminVaultBalance,
    totalVaultDeposited,
    userAllocations,
    allocationsHistory,
    transactions,
    totalAllocatedToTeam,
    totalCashIn,
    totalCashOut,
    users,
    settings,
    allocateMoneyToUser,
    addVaultDeposit,
    getUserStats,
    addTransaction
  } = useExpense();

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.id === 'admin' || currentUser?.role === 'Administrator';

  const handleRowClick = (accountName) => {
    const targetPath = isAdmin ? '/admin/credit-debit' : '/admin/my-credit-debit';
    navigate(targetPath, { state: { selectedUser: accountName } });
  };

  // Modals state
  const [isGiveMoneyModalOpen, setIsGiveMoneyModalOpen] = useState(false);
  const [isTopUpVaultModalOpen, setIsTopUpVaultModalOpen] = useState(false);
  const [isAddTxnModalOpen, setIsAddTxnModalOpen] = useState(false);
  const [modalTxnType, setModalTxnType] = useState('Cash Out');

  // React Hook Forms
  const { register: regGive, handleSubmit: subGive, reset: resetGive, formState: { errors: errGive } } = useForm();
  const { register: regTopUp, handleSubmit: subTopUp, reset: resetTopUp, formState: { errors: errTopUp } } = useForm();
  const { register: regTxn, handleSubmit: subTxn, reset: resetTxn, formState: { errors: errTxn } } = useForm();

  // Company Direct Stats
  const companyStats = getUserStats('Shukan Company');
  const teamSpentTotal = totalCashOut - companyStats.spent;

  // Get active and past/inactive users
  const activeUsers = users.filter(u => u.status !== 'Inactive' && !u.isDeleted);
  const inactiveUsers = users.filter(u => u.status === 'Inactive' || u.isDeleted);

  // Find any orphan historical user names from allocations & transactions that are not in users array at all
  const knownUserNames = new Set(users.map(u => u.name));
  const allocationUserNames = Object.keys(userAllocations).filter(name => (userAllocations[name] || 0) > 0);
  const transactionUserNames = transactions
    .map(t => t.userName)
    .filter(name => name && !['Shukan Company', 'Shukan Packaging (Company)', 'Company Vault', 'Shukan Admin'].includes(name));

  const orphanNames = Array.from(new Set([...allocationUserNames, ...transactionUserNames]))
    .filter(name => !knownUserNames.has(name));

  const orphanAccounts = orphanNames.map(name => ({
    id: `past-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    status: 'Inactive',
    isPastUser: true
  }));

  // Combine Company, Active Users, Inactive Users, and Orphan Historical Accounts for Summary Table
  const allAccounts = [
    {
      id: 'COMPANY-VAULT',
      name: 'Shukan Company',
      role: 'Company Account',
      isCompany: true
    },
    ...activeUsers,
    ...inactiveUsers.map(u => ({ ...u, isPastUser: true })),
    ...orphanAccounts
  ];

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

  const openGiveMoneyModalForUser = (userName = '', amount = '') => {
    const resolvedUser = typeof userName === 'string' && userName ? userName : (users[0]?.name || 'Raj');
    const resolvedAmount = amount ? amount.toString() : '';
    resetGive({
      userName: resolvedUser,
      amount: resolvedAmount,
      notes: ''
    });
    setIsGiveMoneyModalOpen(true);
  };

  // Top Up Vault Submission
  const onTopUpVaultSubmit = (data) => {
    const res = addVaultDeposit({
      amount: data.amount,
      userName: 'Shukan Admin',
      notes: data.notes || ''
    });
    if (res.success) {
      toast.success(`Admin Vault deposited by ${settings.currency}${parseFloat(data.amount).toLocaleString()}!`, { theme: 'light' });
      setIsTopUpVaultModalOpen(false);
      resetTopUp();
    } else {
      toast.error(res.message || 'Invalid amount entered.', { theme: 'light' });
    }
  };

  // Add Transaction Submission
  const openAddTxnModal = (type = 'Cash Out') => {
    setModalTxnType(type);
    resetTxn({
      type,
      amount: '',
      userName: 'Shukan Company',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsAddTxnModalOpen(true);
  };

  const onAddTxnSubmit = (data) => {
    const res = addTransaction({
      ...data,
      createdBy: currentUser?.name || 'Admin'
    });
    if (res && res.success === false) {
      toast.error(res.message, { theme: 'light' });
      return;
    }
    toast.success(`${data.type} entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });
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

  // Calculations for Financial Overview Bar Chart
  const isCompanyTxn = (t) => t.userName === 'Shukan Company' || t.userName === 'Shukan Packaging (Company)' || t.userName === 'Company Vault';

  const teamDoneTotal = transactions
    .filter(t => !isCompanyTxn(t) && t.type === 'Cash Out' && (t.status || 'Done') === 'Done')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const teamDueTotal = transactions
    .filter(t => !isCompanyTxn(t) && t.type === 'Cash Out' && (t.status || 'Done') === 'Due')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const userDoneTotal = userTransactions
    .filter(t => (t.status || 'Done') === 'Done')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const userDueTotal = userTransactions
    .filter(t => (t.status || 'Done') === 'Due')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const doneTotal = isAdmin ? teamDoneTotal : userDoneTotal;
  const dueTotal = isAdmin ? teamDueTotal : userDueTotal;
  const moneyGiven = isAdmin ? totalAllocatedToTeam : myStats.allocated;
  const neededFromAdmin = Math.max(0, (doneTotal + dueTotal) - moneyGiven);

  const overviewBarChartLabels = isAdmin
    ? [['Cash', 'Given'], ['Team', 'Spent'], ['Company', 'Spent'], ['Unpaid', 'Due'], ['Company', 'Owes']]
    : [['Cash', 'Given'], ['My', 'Spent'], ['Unpaid', 'Due'], ['Company', 'Owes']];

  const overviewBarChartFullLabels = isAdmin
    ? ['Cash Advanced to Team', 'Approved Team Expenses', 'Company Spent Expenses', 'Unpaid / Pending Bills', 'Net Amount Owed by Company']
    : ['Cash Given to Me', 'My Completed Expenses', 'Unpaid / Pending Bills', 'Net Amount Owed by Company'];

  const overviewBarChartData = {
    labels: overviewBarChartLabels,
    datasets: [
      {
        label: 'Amount',
        data: isAdmin
          ? [moneyGiven, teamDoneTotal, companyStats.spent, dueTotal, neededFromAdmin]
          : [moneyGiven, doneTotal, dueTotal, neededFromAdmin],
        backgroundColor: isAdmin
          ? ['#c69255', '#10b981', '#002B49', '#f59e0b', '#ef4444']
          : ['#c69255', '#10b981', '#f59e0b', '#ef4444'],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isAdmin
          ? ['#b88548', '#059669', '#001D33', '#d97706', '#dc2626']
          : ['#b88548', '#059669', '#d97706', '#dc2626']
      }
    ]
  };

  const staffBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 10,
        backgroundColor: '#002B49',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'Inter', weight: '700', size: 12 },
        bodyFont: { family: 'Inter', weight: '600', size: 12 },
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0]?.dataIndex;
            return overviewBarChartFullLabels[index] || '';
          },
          label: (context) => ` Amount: ${settings.currency}${context.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: false,
          color: '#475569',
          font: { family: 'Inter', weight: '700', size: 10 },
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 },
          callback: (value) => `${settings.currency}${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`
        }
      }
    }
  };

  // Doughnut Chart Data Logic - Include BOTH Team & Shukan Company Expenses!
  const userTotalsMap = {};
  if (isAdmin) {
    // 1. Team Users Expenses
    users.forEach(u => {
      const stats = getUserStats(u.name);
      if (stats.spent > 0) {
        userTotalsMap[u.name] = stats.spent;
      }
    });

    // 2. Company Direct Expenses (Plumbing, Recharge, etc.)
    if (companyStats.spent > 0) {
      userTotalsMap['Shukan Company'] = companyStats.spent;
    }
  } else {
    // For staff user, break down by Done vs Due status
    const doneTotal = userTransactions
      .filter(t => (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const dueTotal = userTransactions
      .filter(t => (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    if (doneTotal > 0) userTotalsMap['Done'] = doneTotal;
    if (dueTotal > 0) userTotalsMap['Due'] = dueTotal;
  }

  const getAccountColor = (name) => {
    if (name === 'Shukan Company' || name === 'Shukan Packaging (Company)' || name === 'Company Vault') {
      return '#002B49'; // Navy Blue for Company Direct Expenses
    }
    const teamColors = ['#c69255', '#10b981', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899'];
    const teamNames = Object.keys(userTotalsMap).filter(n => n !== 'Shukan Company' && n !== 'Shukan Packaging (Company)' && n !== 'Company Vault');
    const index = teamNames.indexOf(name);
    return index >= 0 ? teamColors[index % teamColors.length] : '#64748b';
  };

  const doughnutBackgroundColors = Object.keys(userTotalsMap).length
    ? Object.keys(userTotalsMap).map(name => getAccountColor(name))
    : ['#cbd5e1'];

  const doughnutData = {
    labels: Object.keys(userTotalsMap).length ? Object.keys(userTotalsMap) : ['No Expense Logs'],
    datasets: [
      {
        data: Object.values(userTotalsMap).length ? Object.values(userTotalsMap) : [1],
        backgroundColor: doughnutBackgroundColors,
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
        labels: { color: '#334155', font: { size: 11, family: 'Inter', weight: '600' } }
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Action Buttons for Admin */}
        {isAdmin && (
          <div className="flex items-center space-x-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setIsTopUpVaultModalOpen(true)}
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-[#002B49] text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-[#002B49] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Deposit Vault
            </button>

            <button
              onClick={() => openAddTxnModal('Cash Out')}
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#c69255] hover:bg-[#b88548] text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Direct Expense
            </button>
          </div>
        )}
      </div>

      {/* Team Balances & Status Bar (Shows All Users!) */}
      {isAdmin && (() => {
        const teamUsers = users.filter(u => u.id !== 'admin');
        if (teamUsers.length === 0) return null;
        
        const totalNeeded = teamUsers.reduce((sum, u) => sum + getUserStats(u.name).needFromCompany, 0);
        const totalInHand = teamUsers.reduce((sum, u) => sum + Math.max(0, getUserStats(u.name).remaining), 0);

        return (
          <div className="glass-card p-3 sm:p-4 rounded-2xl print:hidden shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-xl bg-[#002B49]/10 flex items-center justify-center text-[#002B49] shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#002B49]">
                  Team Balances
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-extrabold flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 border border-emerald-300 shadow-2xs">
                  Team In Hand: {settings.currency}{totalInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                {totalNeeded > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-800 border border-rose-300 shadow-2xs">
                    Due: {settings.currency}{totalNeeded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
              {teamUsers.map(u => {
                const s = getUserStats(u.name);
                const isNeed = s.needFromCompany > 0;
                const hasBal = s.remaining > 0;

                return (
                  <button
                    key={u.id}
                    onClick={() => openGiveMoneyModalForUser(u.name, isNeed ? s.needFromCompany : '')}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer whitespace-nowrap shrink-0 ${
                      isNeed
                        ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-600 hover:text-white'
                        : hasBal
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-[#002B49] hover:text-white'
                    }`}
                    title={`Click to allocate money to ${u.name}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      isNeed
                        ? 'bg-rose-200 text-rose-800'
                        : hasBal
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {u.name.charAt(0)}
                    </span>
                    <span>{u.name}</span>
                    <span className="font-extrabold">
                      {isNeed
                        ? `Need: +${settings.currency}${s.needFromCompany.toLocaleString('en-IN')}`
                        : `Bal: ${settings.currency}${s.remaining.toLocaleString('en-IN')}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Simplified Financial Summary Grid */}
      {/* Main KPI Credit & Debit Summary Cards Grid */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {/* 1. TOTAL CREDIT (INFLOW) */}
          <div
            onClick={() => navigate('/admin/credit-debit', { state: { selectedType: 'Credit', selectedDepositTo: 'My Hand' } })}
            className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            title="Click to view My Hand Credit Entries"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">TOTAL CREDIT</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                  Inflow
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                  {settings.currency}{(totalCashIn + totalVaultDeposited).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">Total capital & credit entries</p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>System Inflow</span>
              <span className="text-emerald-700 font-extrabold">View Inflow →</span>
            </div>
          </div>

          {/* 2. TOTAL DEBIT (OUTFLOW) */}
          <div
            onClick={() => navigate('/admin/credit-debit', { state: { selectedType: 'Debit' } })}
            className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-[#002B49] flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            title="Click to view All Debit Entries"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#002B49]/10 flex items-center justify-center text-[#002B49] shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">TOTAL DEBIT</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#002B49]/10 text-[#002B49] uppercase">
                  Outflow
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl font-black text-[#002B49]">
                  {settings.currency}{totalCashOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">Total expenditure & cash out</p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>System Outflow</span>
              <span className="text-[#002B49] font-extrabold">View Outflow →</span>
            </div>
          </div>

          {/* 3. CASH RESERVE (NET BALANCE) */}
          <div
            onClick={() => navigate('/admin/deposit-allocate')}
            className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-[#c69255] flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            title="Click to view Master Vault Balance"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#c69255]/15 flex items-center justify-center text-[#9e6e34] shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">CASH RESERVE</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#c69255]/15 text-[#9e6e34] uppercase">
                  Vault
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl font-black text-[#9e6e34]">
                  {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">Available Master Vault balance</p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Master Vault</span>
              <span className="text-[#9e6e34] font-extrabold">Manage Vault →</span>
            </div>
          </div>

          {/* 4. PENDING DEBIT (DUE BILLS) */}
          <div
            onClick={() => navigate('/admin/credit-debit', { state: { selectedStatus: 'Due' } })}
            className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-amber-500 flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            title="Click to view Unpaid Due Entries"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-700 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">PENDING DEBIT</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                  Due Bills
                </span>
              </div>
              <div className="mt-3 sm:mt-4">
                <div className="text-2xl sm:text-3xl font-black text-amber-800">
                  {settings.currency}{transactions.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">Unpaid due bills & claims</p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Pending Claims</span>
              <span className="text-amber-800 font-extrabold">View Dues →</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {/* 1. MY TOTAL CREDIT */}
          <div
            onClick={() => navigate('/admin/my-credit-debit', { state: { typeFilter: 'Credit', depositToFilter: 'My Hand' } })}
            className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            title="Click to view My Hand Credit Entries"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-600 truncate">MY TOTAL CREDIT</span>
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">📥</span>
              </div>
              <p className="text-base sm:text-2xl font-black text-emerald-700 mt-1 sm:mt-2 truncate">
                {settings.currency}{(myStats.allocated + myStats.cashInReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className="text-[10px] sm:text-xs text-emerald-700 mt-1 font-semibold truncate">Cash Received & Credit</p>
          </div>

          {/* 2. MY TOTAL DEBIT */}
          <div
            onClick={() => navigate('/admin/my-credit-debit', { state: { typeFilter: 'Debit' } })}
            className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#002B49] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            title="Click to view My Debit Receipts"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-600 truncate">MY TOTAL DEBIT</span>
                <span className="w-6 h-6 rounded-lg bg-[#002B49]/10 text-[#002B49] flex items-center justify-center text-xs shrink-0">🧾</span>
              </div>
              <p className="text-base sm:text-2xl font-black text-[#002B49] mt-1 sm:mt-2 truncate">
                {settings.currency}{myStats.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1 font-semibold truncate">Logged Expenses & Debit</p>
          </div>

          {/* 3. CASH IN HAND */}
          <div
            onClick={() => navigate('/admin/my-credit-debit')}
            className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 border-l-[#c69255] cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            title="Click to view Cash In Hand"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs uppercase font-extrabold text-slate-600 truncate">CASH IN HAND</span>
                <span className="w-6 h-6 rounded-lg bg-[#c69255]/15 text-[#9e6e34] flex items-center justify-center text-xs shrink-0">💵</span>
              </div>
              <p className="text-base sm:text-2xl font-black text-[#9e6e34] mt-1 sm:mt-2 truncate">
                {settings.currency}{Math.max(0, myStats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className="text-[10px] sm:text-xs text-[#9e6e34] mt-1 font-semibold truncate">Available Cash Balance</p>
          </div>

          {/* 4. COMPANY OWES ME */}
          <div
            onClick={() => navigate('/admin/my-credit-debit', { state: { statusFilter: 'Due' } })}
            className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border-l-2 sm:border-l-4 flex flex-col justify-between transition-all cursor-pointer hover:shadow-lg ${
              myStats.needFromCompany > 0
                ? 'bg-rose-50 border border-rose-200 border-l-rose-500 shadow-xs'
                : 'glass-card border-l-slate-400'
            }`}
            title="Click to view Pending Dues"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] sm:text-xs uppercase font-extrabold truncate ${
                  myStats.needFromCompany > 0 ? 'text-rose-700' : 'text-slate-600'
                }`}>COMPANY OWES ME</span>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  myStats.needFromCompany > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                }`}>⚠️</span>
              </div>
              <p className={`text-base sm:text-2xl font-black mt-1 sm:mt-2 truncate ${
                myStats.needFromCompany > 0 ? 'text-rose-700' : 'text-slate-700'
              }`}>
                {settings.currency}{myStats.needFromCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <p className={`text-[10px] sm:text-xs mt-1 font-extrabold truncate ${
              myStats.needFromCompany > 0 ? 'text-rose-600' : 'text-slate-500'
            }`}>
              {myStats.needFromCompany > 0 ? 'Pending Reimbursement' : 'No Balance Pending'}
            </p>
          </div>
        </div>
      )}

      {/* Account Balance & Expense Summary Table (Admin Only - Includes Shukan Company!) */}
      {isAdmin && (
        <div className="glass-card p-3.5 sm:p-6 rounded-xl sm:rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#002B49]">Account Balance & Expenditure Summary</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                Includes Company Vault Direct Expenses alongside team member allowances
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGiveMoneyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Allocate Money
              </button>
            </div>
          </div>

          {/* Mobile View Card List */}
          <div className="block md:hidden space-y-3">
            {allAccounts.map((u) => {
              const isComp = u.isCompany;
              const stats = isComp ? companyStats : getUserStats(u.name);
              const allocatedVal = isComp ? totalVaultDeposited : stats.allocated;
              const rawPercent = allocatedVal > 0 ? Math.round((stats.spent / allocatedVal) * 100) : (stats.spent > 0 ? 100 : 0);
              const isOverSpent = allocatedVal > 0 ? stats.spent > allocatedVal : stats.spent > 0;
              const displayPercent = Math.min(100, rawPercent);
              const overSpentAmount = Math.max(0, stats.spent - allocatedVal);
              
              return (
                <div
                  key={u.id}
                  onClick={() => handleRowClick(u.name)}
                  className={`p-3.5 rounded-2xl bg-white border shadow-xs space-y-2.5 cursor-pointer hover:border-slate-400 hover:shadow-md transition-all ${isComp ? 'border-[#002B49]/40 bg-slate-50/50' : 'border-slate-200/80'}`}
                  title={`Click to view ${u.name}'s expenses`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-sm font-extrabold text-[#002B49]">{u.name}</span>
                      {isComp ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#002B49] text-white uppercase whitespace-nowrap shrink-0">
                          Company Vault
                        </span>
                      ) : u.isPastUser ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 text-slate-700 uppercase border border-slate-300 whitespace-nowrap shrink-0">
                          Past User
                        </span>
                      ) : null}
                    </div>
                    {!isComp && (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 uppercase">{u.id}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">{isComp ? 'Total Capital Deposited' : 'Money Given'}</span>
                      <span className="font-extrabold text-[#9e6e34]">
                        {settings.currency}{allocatedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">{isComp ? 'Company Direct Expenses' : 'Spent Expenses'}</span>
                      <span className="font-extrabold text-[#002B49]">
                        {settings.currency}{stats.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">{isComp ? 'Master Reserve' : 'Remaining Balance'}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        stats.remaining < 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs font-black'
                          : stats.remaining > 0
                            ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {settings.currency}{stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {isComp ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTopUpVaultModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#003c66] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Deposit Vault
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetGive({ userName: u.name, amount: '', notes: '' });
                          setIsGiveMoneyModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#c69255] hover:bg-[#d4a359] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Allocate
                      </button>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                      <span className="text-slate-400 uppercase font-bold">Utilization</span>
                      <span className={isOverSpent ? 'text-rose-700 font-extrabold' : 'text-slate-500'}>
                        {isOverSpent ? `⚠️ ${rawPercent}% spent (+${settings.currency}${overSpentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} over)` : `${displayPercent}% spent`}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isOverSpent ? 'bg-rose-100 border border-rose-300' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverSpent
                            ? 'bg-rose-600'
                            : displayPercent > 85
                              ? 'bg-amber-500'
                              : displayPercent > 50
                                ? 'bg-[#c69255]'
                                : 'bg-emerald-500'
                        }`}
                        style={{ width: `${displayPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-bold">Account Name</th>
                  <th className="py-3 px-4 font-bold">ID / Type</th>
                  <th className="py-3 px-4 font-bold">Capital / Money Given</th>
                  <th className="py-3 px-4 font-bold">Spent Expenses</th>
                  <th className="py-3 px-4 font-bold">Available Reserve / Balance</th>
                  <th className="py-3 px-4 font-bold">Utilization</th>
                  <th className="py-3 px-4 text-right font-bold no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allAccounts.map((u) => {
                  const isComp = u.isCompany;
                  const stats = isComp ? companyStats : getUserStats(u.name);
                  const allocatedVal = isComp ? totalVaultDeposited : stats.allocated;
                  const rawPercent = allocatedVal > 0 ? Math.round((stats.spent / allocatedVal) * 100) : (stats.spent > 0 ? 100 : 0);
                  const isOverSpent = allocatedVal > 0 ? stats.spent > allocatedVal : stats.spent > 0;
                  const displayPercent = Math.min(100, rawPercent);
                  const overSpentAmount = Math.max(0, stats.spent - allocatedVal);
                  
                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleRowClick(u.name)}
                      className={`cursor-pointer hover:bg-slate-100/90 transition-all ${isComp ? 'bg-slate-50/60 font-bold' : ''}`}
                      title={`Click to view ${u.name}'s expenses`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">
                        <div className="flex items-center space-x-2">
                          <span>{u.name}</span>
                          {isComp ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#002B49] text-white uppercase">
                              Company Direct
                            </span>
                          ) : u.isPastUser ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 text-slate-700 uppercase border border-slate-300">
                              Past User
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{u.id}</td>
                      <td className="py-3.5 px-4 font-bold text-[#9e6e34]">
                        {settings.currency}{allocatedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#002B49]">
                        {settings.currency}{stats.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold ${
                          stats.remaining < 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs font-black'
                            : stats.remaining > 0
                              ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-700'
                        }`}>
                          {settings.currency}{stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 w-44">
                        <div className={`w-full h-2 rounded-full overflow-hidden ${isOverSpent ? 'bg-rose-100 border border-rose-300' : 'bg-slate-200'}`}>
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOverSpent
                                ? 'bg-rose-600 font-bold'
                                : displayPercent > 85
                                  ? 'bg-amber-500'
                                  : displayPercent > 50
                                    ? 'bg-[#c69255]'
                                    : 'bg-emerald-500'
                            }`}
                            style={{ width: `${displayPercent}%` }}
                          ></div>
                        </div>
                        {isOverSpent ? (
                          <div className="text-[10px] text-rose-700 font-extrabold mt-1 truncate">
                            ⚠️ {rawPercent}% spent (+{settings.currency}{overSpentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} over)
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold">{displayPercent}% spent</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right no-print">
                        {isComp ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsTopUpVaultModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold transition cursor-pointer"
                          >
                            Deposit Vault
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resetGive({ userName: u.name, amount: '', notes: '' });
                              setIsGiveMoneyModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-[#002B49] hover:text-white text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer"
                          >
                            Allocate
                          </button>
                        )}
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
        {/* Financial Overview Chart */}
        <div className="lg:col-span-2 glass-card p-4 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#002B49] flex items-center gap-2">
                📊 {isAdmin ? 'Financial Overview' : 'My Financial Summary'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                Complete track of allocations, expenses & pending dues
              </p>
            </div>
            <span className="shrink-0 text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-[#c69255]/30 text-[#9e6e34] font-bold shadow-2xs">
              FY 2025-26
            </span>
          </div>

          <div className="h-64 sm:h-72">
            <Bar data={overviewBarChartData} options={staffBarChartOptions} />
          </div>

          <div className={`grid grid-cols-2 ${isAdmin ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-2 sm:gap-2.5 mt-4 pt-3 border-t border-slate-100 text-center`}>
            <div
              onClick={() => navigate('/admin/deposit-allocate', { state: { activeTab: 'Give Money' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center cursor-pointer hover:bg-amber-500/20 hover:scale-102 transition-all"
              title="Click to view Cash Allocations"
            >
              <span className="text-[10px] font-extrabold uppercase text-amber-900/70 block truncate">Cash Advanced</span>
              <span className="text-xs sm:text-sm font-black text-[#9e6e34] mt-0.5 truncate">
                {settings.currency}{moneyGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/admin/my-credit-debit', { state: { selectedStatus: 'Done' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center cursor-pointer hover:bg-emerald-500/20 hover:scale-102 transition-all"
              title="Click to view Completed Expenses"
            >
              <span className="text-[10px] font-extrabold uppercase text-emerald-900/70 block truncate">{isAdmin ? 'Team Spent' : 'My Spent'}</span>
              <span className="text-xs sm:text-sm font-black text-emerald-800 mt-0.5 truncate">
                {settings.currency}{doneTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {isAdmin && (
              <div
                onClick={() => navigate('/admin/credit-debit', { state: { selectedUser: 'Shukan Company' } })}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-900/10 border border-slate-900/20 flex flex-col justify-center cursor-pointer hover:bg-slate-900/20 hover:scale-102 transition-all"
                title="Click to view Company Expenses"
              >
                <span className="text-[10px] font-extrabold uppercase text-slate-700 block truncate">Company Spent</span>
                <span className="text-xs sm:text-sm font-black text-[#002B49] mt-0.5 truncate">
                  {settings.currency}{companyStats.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/admin/my-credit-debit', { state: { selectedStatus: 'Due' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-center cursor-pointer hover:bg-amber-500/20 hover:scale-102 transition-all"
              title="Click to view Unpaid Due Bills"
            >
              <span className="text-[10px] font-extrabold uppercase text-amber-900/70 block truncate">Unpaid Bills</span>
              <span className="text-xs sm:text-sm font-black text-amber-800 mt-0.5 truncate">
                {settings.currency}{dueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div
              className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 flex flex-col justify-center shadow-2xs transition-all ${isAdmin ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              <span className="text-[10px] font-extrabold uppercase text-rose-800 block truncate">Company Owes</span>
              <span className="text-xs sm:text-sm font-black text-rose-700 mt-0.5 truncate">
                {settings.currency}{neededFromAdmin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* User & Company Expenditure Breakdown Doughnut Chart */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-[#002B49]">
                {isAdmin ? 'Expenditure Breakdown' : 'My Expense Status Breakdown'}
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {isAdmin ? 'Team & Company' : 'Status'}
              </span>
            </div>
            <div className="h-56 relative flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>

          {/* Structured Account Breakdown List */}
          {isAdmin && Object.keys(userTotalsMap).length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              {Object.entries(userTotalsMap).map(([name, amount]) => {
                const isCompany = name === 'Shukan Company' || name === 'Shukan Packaging (Company)' || name === 'Company Vault';
                const totalExpenses = Object.values(userTotalsMap).reduce((a, b) => a + b, 0);
                const percent = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                const color = getAccountColor(name);

                return (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }}></span>
                      <span className={`font-bold ${isCompany ? 'text-[#002B49]' : 'text-slate-700'}`}>
                        {name} {isCompany ? '(Company)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-[#002B49]">
                        {settings.currency}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        ({percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="glass-card p-3.5 sm:p-6 rounded-xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#002B49]">Recent Transactions Log</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Latest expense and cash movement entries</p>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden space-y-3">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No cash movement entries created yet.
            </div>
          ) : (
            recentTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    {isAdmin && <span className="text-sm font-extrabold text-[#002B49]">{t.userName}</span>}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{formatDate(t.date)}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                    {t.description || 'Expense Entry'}
                  </div>
                  <div className="text-sm font-extrabold text-[#002B49]">
                    {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                <th className="py-3 px-4 font-bold">Sr. No.</th>
                <th className="py-3 px-4 font-bold">Date</th>
                {isAdmin && <th className="py-3 px-4 font-bold">User Name</th>}
                <th className="py-3 px-4 font-bold">Description</th>
                <th className="py-3 px-4 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-slate-500 text-xs font-medium">
                    No cash movement entries created yet. Click "Direct Expense" to record one.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs font-medium">{formatDate(t.date)}</td>
                    {isAdmin && <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>}
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">
                      {t.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-right text-[#002B49]">
                      {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. GIVE MONEY TO USER MODAL */}
      {isGiveMoneyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md p-6 sm:p-8 rounded-3xl border border-slate-200 relative shadow-2xl">
            <button
              onClick={() => setIsGiveMoneyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">Allocate to User</h3>

            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Available Admin Vault Balance:</span>
              <span className="font-extrabold text-[#002B49]">{settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <form onSubmit={subGive(onGiveMoneySubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Select or Type User Name</label>
                <input
                  type="text"
                  list="dash-allocate-user-list"
                  placeholder="Type user name manually or select..."
                  {...regGive('userName', { required: 'Please select or enter a user name' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none font-semibold"
                />
                <datalist id="dash-allocate-user-list">
                  {users.map((u) => (
                    <option key={u.id} value={u.name} />
                  ))}
                </datalist>
                {errGive.userName && <p className="text-xs text-rose-500 mt-1">{errGive.userName.message}</p>}
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
                  placeholder="e.g. Factory petty cash advance"
                  {...regGive('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGiveMoneyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md bg-[#c69255] hover:bg-[#b88548] cursor-pointer"
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">Deposit Admin Vault Capital</h3>

            <form onSubmit={subTopUp(onTopUpVaultSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Deposit Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000"
                  {...regTopUp('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errTopUp.amount && <p className="text-xs text-rose-500 mt-1">{errTopUp.amount.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Notes / Deposit Source</label>
                <input
                  type="text"
                  placeholder="e.g. Capital injection from Bank Account"
                  {...regTopUp('notes')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTopUpVaultModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Deposit
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">Record New Direct Expense</h3>

            {adminVaultBalance <= 0 && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start space-x-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Company Vault Empty ({settings.currency}0.00).</strong> Shukan Company direct expenses cannot be recorded until capital is deposited into the vault.</span>
              </div>
            )}

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
                  <label className="block text-xs font-bold text-[#002B49] mb-1">User / Account Name</label>
                  <select
                    {...regTxn('userName', { required: 'User Name is required' })}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                  >
                    <option value="Shukan Company">
                      🏢 Shukan Company (Vault Bal: {settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                    </option>
                    {users.map((u) => {
                      const stats = getUserStats(u.name);
                      const isOver = stats.remaining < 0;
                      return (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role || 'Staff'}) — {isOver ? `Company Owes: ${settings.currency}${Math.abs(stats.remaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `Cash Bal: ${settings.currency}${stats.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
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
                  <option value="Done">Done</option>
                  <option value="Due">Due</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Description / Notes <span className="text-rose-500">*</span></label>
                <textarea
                  rows="3"
                  placeholder="Describe transaction details (e.g. plumbing work, recharge, electricity)..."
                  {...regTxn('description', { required: 'Description is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
                {errTxn.description && <p className="text-xs text-rose-500 mt-1">{errTxn.description.message}</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddTxnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md bg-[#c69255] hover:bg-[#b88548] cursor-pointer"
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
