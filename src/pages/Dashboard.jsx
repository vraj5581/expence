import React, { useState, useMemo } from 'react';
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
    addTransaction,
    tasks,
    updateTaskStatus
  } = useExpense();

  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.id === 'admin' || currentUser?.role === 'Administrator' || currentUser?.name?.toLowerCase() === 'vraj';

  // Pending Tasks Due Today Logic
  const todayYMD = new Date().toISOString().split('T')[0];
  const todayD = new Date();
  const todayDayStr = String(todayD.getDate()).padStart(2, '0');
  const todayMonthStr = String(todayD.getMonth() + 1).padStart(2, '0');
  const todayYearStr = String(todayD.getFullYear());
  const todayDMY = `${todayDayStr}-${todayMonthStr}-${todayYearStr}`;

  const isTaskDueToday = (task) => {
    if (!task || !task.dueDate) return false;
    const clean = String(task.dueDate).split('T')[0].trim();
    if (clean === todayYMD || clean === todayDMY) return true;
    try {
      const taskD = new Date(clean);
      if (!isNaN(taskD.getTime())) {
        return (
          taskD.getFullYear() === todayD.getFullYear() &&
          taskD.getMonth() === todayD.getMonth() &&
          taskD.getDate() === todayD.getDate()
        );
      }
    } catch (e) {}
    return false;
  };

  const dueTodayTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      if (t.status !== 'Pending') return false;
      if (!isTaskDueToday(t)) return false;
      if (!isAdmin && t.assignedTo && currentUser?.name) {
        return t.assignedTo.toLowerCase() === currentUser.name.toLowerCase();
      }
      return true;
    });
  }, [tasks, isAdmin, currentUser?.name, todayYMD]);

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

  const handleRowClick = (accountName) => {
    const targetPath = isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit';
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
  const totalCompanyDirectExpenses = companyStats.spent;
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
  const onGiveMoneySubmit = async (data) => {
    const res = await allocateMoneyToUser(data.userName, data.amount, data.notes);
    if (res && res.success) {
      toast.success(`Successfully allocated ${settings.currency}${parseFloat(data.amount).toLocaleString()} to ${data.userName}!`, { theme: 'light' });
      setIsGiveMoneyModalOpen(false);
      resetGive();
    } else {
      toast.error(res?.message || 'Failed to save allocation to PHP database', { theme: 'light' });
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
  const onTopUpVaultSubmit = async (data) => {
    const res = await addVaultDeposit({
      amount: data.amount,
      userName: 'Shukan Admin',
      notes: data.notes || ''
    });
    if (res && res.success) {
      toast.success(`Admin Vault deposited by ${settings.currency}${parseFloat(data.amount).toLocaleString()}!`, { theme: 'light' });
      setIsTopUpVaultModalOpen(false);
      resetTopUp();
    } else {
      toast.error(res?.message || 'Failed to save vault deposit to PHP database.', { theme: 'light' });
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

  const onAddTxnSubmit = async (data) => {
    const res = await addTransaction({
      ...data,
      createdBy: currentUser?.name || 'Admin'
    });
    if (!res || res.success === false) {
      toast.error(res?.message || 'Failed to save transaction to PHP database', { theme: 'light' });
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

  // Extract user allocations from allocationsHistory (Money Received from Company)
  const myAllocations = useMemo(() => {
    return (allocationsHistory || []).filter(a => a.userName === currentUser?.name);
  }, [allocationsHistory, currentUser?.name]);

  // Staff User Financial Totals (Strictly Matching My Debit & Credit Page)
  const myDebitTxns = useMemo(() => {
    return userTransactions.filter(t => t.type !== 'Cash In' && t.type !== 'Credit');
  }, [userTransactions]);

  const myCreditTxns = useMemo(() => {
    const directCredits = userTransactions.filter(t => t.type === 'Cash In' || t.type === 'Credit');
    const mappedAllocations = myAllocations.map(a => ({
      id: a.id,
      type: 'Credit',
      depositTo: 'My Hand',
      userName: a.userName,
      amount: parseFloat(a.amount) || 0,
      date: a.date,
      description: a.notes || `Company Cash Allocation (${a.userName})`,
      status: 'Done',
      isAllocation: true
    }));
    return [...mappedAllocations, ...directCredits].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [userTransactions, myAllocations]);

  const myDebitTotal = useMemo(() => {
    return myDebitTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  const myCreditTotal = useMemo(() => {
    return myCreditTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myDoneCredit = useMemo(() => {
    return myCreditTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myHandDoneCredit = useMemo(() => {
    return myCreditTxns.filter(t => (t.status || 'Done') === 'Done' && (t.depositTo === 'My Hand' || !t.depositTo || (t.depositTo !== 'Company Wallet' && !t.depositTo.includes('Bank')))).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myWalletDoneCredit = useMemo(() => {
    return myCreditTxns.filter(t => (t.status || 'Done') === 'Done' && t.depositTo === 'Company Wallet').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myBankDoneCredit = useMemo(() => {
    return myCreditTxns.filter(t => (t.status || 'Done') === 'Done' && t.depositTo && (t.depositTo.includes('Bank') || t.depositTo === 'Banks')).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myDueCredit = useMemo(() => {
    return myCreditTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myCreditTxns]);

  const myDoneDebit = useMemo(() => {
    return myDebitTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  const myDueDebit = useMemo(() => {
    return myDebitTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [myDebitTxns]);

  // Admin System-Wide Financial Totals (Strictly Matching Admin Credit & Debit Page)
  const allDebitTxns = useMemo(() => {
    return transactions.filter(t => t.type !== 'Cash In' && t.type !== 'Credit');
  }, [transactions]);

  const allCreditTxns = useMemo(() => {
    return transactions.filter(t => t.type === 'Cash In' || t.type === 'Credit');
  }, [transactions]);

  const adminTotalDebit = useMemo(() => {
    return allDebitTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allDebitTxns]);

  const adminDoneDebit = useMemo(() => {
    return allDebitTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allDebitTxns]);

  const adminDueDebit = useMemo(() => {
    return allDebitTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allDebitTxns]);

  const adminTotalCredit = useMemo(() => {
    return allCreditTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allCreditTxns]);

  const adminDoneCredit = useMemo(() => {
    return allCreditTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allCreditTxns]);

  const adminDueCredit = useMemo(() => {
    return allCreditTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [allCreditTxns]);

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

  const doneTotal = isAdmin ? teamDoneTotal : myDoneDebit;
  const dueTotal = isAdmin ? teamDueTotal : myDueDebit;
  const moneyGiven = isAdmin ? totalAllocatedToTeam : myHandDoneCredit;
  const neededFromAdmin = isAdmin
    ? Math.max(0, adminDoneDebit - totalAllocatedToTeam)
    : Math.max(0, myDoneDebit - myHandDoneCredit);

  const overviewBarChartLabels = isAdmin
    ? [['Done', 'Credit'], ['Done', 'Debit'], ['Pending', 'Credit'], ['Pending', 'Debit'], ['Allocations'], ['Must Pay']]
    : [['Money', 'Received'], ['Total', 'Spent'], ['Pending', 'Credit'], ['Pending', 'Bills'], ['Allocations'], ['Owes Me']];

  const overviewBarChartFullLabels = isAdmin
    ? ['Total Done Credit', 'Total Done Debit', 'Total Pending Credit', 'Total Pending Debit', 'Total Allocations', 'Company Must Pay']
    : ['Money Received in Hand', 'Total Done Debit', 'Total Pending Credit', 'Total Pending Debit', 'Total Allocations', 'Company Owes Me'];

  const overviewBarChartData = {
    labels: overviewBarChartLabels,
    datasets: [
      {
        label: 'Amount',
        data: isAdmin
          ? [adminDoneCredit, adminDoneDebit, adminDueCredit, adminDueDebit, totalAllocatedToTeam, neededFromAdmin]
          : [myHandDoneCredit, myDoneDebit, myDueCredit, myDueDebit, moneyGiven, neededFromAdmin],
        backgroundColor: isAdmin
          ? ['#10b981', '#f43f5e', '#34d399', '#fb7185', '#0284c7', '#e11d48']
          : ['#10b981', '#f43f5e', '#34d399', '#fb7185', '#0284c7', '#e11d48'],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isAdmin
          ? ['#059669', '#e11d48', '#059669', '#be123c', '#0369a1', '#be123c']
          : ['#059669', '#e11d48', '#059669', '#be123c', '#0369a1', '#be123c']
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
          font: (context) => ({
            family: 'Inter',
            weight: '700',
            size: typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 10
          }),
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
    const teamColors = ['#6366f1', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
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
      }
    }
  };

  const handleAccountClick = (userName, typeFilter = 'All', statusFilter = 'All') => {
    const targetRoute = isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit';
    navigate(targetRoute, {
      state: {
        selectedUser: userName,
        typeFilter: typeFilter,
        statusFilter: statusFilter
      }
    });
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

      {/* Pending Tasks Due Today Alert Section (Shown at the very top of Dashboard when due today) */}
      {dueTodayTasks.length > 0 && (
        <div className="glass-card p-4 sm:p-5 rounded-2xl border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/10 via-amber-50/40 to-white shadow-md print:hidden space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 animate-pulse">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm sm:text-base font-extrabold text-[#002B49]">
                    Tasks Due Today ({dueTodayTasks.length})
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider">
                    Action Required
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pending duties scheduled for completion today ({formatDate(todayYMD)})
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(isAdmin ? '/admin/tasks' : '/user/tasks')}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>Manage Tasks</span>
              <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
            {dueTodayTasks.map((t) => (
              <div
                key={t.id}
                className="p-3 sm:p-3.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs hover:shadow-md transition space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-extrabold text-[#002B49] bg-slate-100 px-2 py-0.5 rounded font-mono">{t.id}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                      {t.category || 'General'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadgeClass(t.priority)}`}>
                    {t.priority}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{t.title}</h3>
                  {t.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#002B49] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                      {t.assignedTo ? t.assignedTo.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="font-extrabold text-[#9e6e34] text-[11px]">{t.assignedTo}</span>
                  </div>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const res = await updateTaskStatus(t.id, 'Completed');
                      if (res && res.success) {
                        toast.success(`Task "${t.title}" marked as Completed!`, { theme: 'light' });
                      } else {
                        toast.error(res?.message || 'Failed to update task status', { theme: 'light' });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold shadow-2xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Complete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      {/* Financial Summary Cards (3 Compact Table-Style Summary Cards) */}
      {isAdmin ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-4">
          {/* CARD 1: DEBIT SUMMARY (Light Red Background) */}
          <div className="h-full bg-rose-50/70 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200/90 border-t-3 sm:border-t-4 border-t-rose-500 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-1 sm:pb-1.5">
              <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-[9px] sm:text-xs shrink-0 print:hidden">
                  ⬆️
                </div>
                <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-rose-900 truncate">Debit Summary</h3>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800 uppercase shrink-0 print:hidden">Outflow</span>
            </div>

            <div className="divide-y divide-rose-200/50 text-[9.5px] sm:text-xs">
              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } })}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view Paid Done Debit entries"
              >
                <span className="text-rose-800 font-semibold truncate mr-1">Done Debit</span>
                <span className="font-extrabold text-rose-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{adminDoneDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Due' } })}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view Unpaid Due Debit entries"
              >
                <span className="text-rose-800 font-semibold truncate mr-1">Due Debit</span>
                <span className="font-extrabold text-rose-900 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{adminDueDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'All' } })}
                className="pt-1 flex items-center justify-between font-black text-rose-950 cursor-pointer hover:bg-rose-100/70 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view All Debit entries"
              >
                <span className="truncate mr-1">Total Debit</span>
                <span className="text-[10.5px] sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{adminTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: CREDIT SUMMARY (Light Green Background) */}
          <div className="h-full bg-emerald-50/70 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200/90 border-t-3 sm:border-t-4 border-t-emerald-500 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1 sm:pb-1.5">
              <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-[9px] sm:text-xs shrink-0 print:hidden">
                  ⬇️
                </div>
                <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-emerald-900 truncate">Credit Summary</h3>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase shrink-0 print:hidden">Inflow</span>
            </div>

            <div className="divide-y divide-emerald-200/50 text-[9.5px] sm:text-xs">
              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done' } })}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view Completed Done Credit entries"
              >
                <span className="text-emerald-800 font-semibold truncate mr-1">Done Credit</span>
                <span className="font-extrabold text-emerald-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{adminDoneCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Due' } })}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view Uncollected Due Credit entries"
              >
                <span className="text-emerald-800 font-semibold truncate mr-1">Due Credit</span>
                <span className="font-extrabold text-amber-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{adminDueCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'All' } })}
                className="pt-1 flex items-center justify-between font-black text-emerald-950 cursor-pointer hover:bg-emerald-100/70 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view All Credit entries"
              >
                <span className="truncate mr-1">Total Credit</span>
                <span className="text-[10.5px] sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{adminTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CARD 3: VAULT & RESERVE SUMMARY (Light Warm Amber Background) */}
          <div className="h-full bg-amber-50/60 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200/90 border-t-3 sm:border-t-4 border-t-[#c69255] shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-1 sm:pb-1.5">
              <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-amber-100 flex items-center justify-center text-[#9e6e34] font-bold text-[9px] sm:text-xs shrink-0 print:hidden">
                  🏦
                </div>
                <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-[#9e6e34] truncate">Vault & Reserve</h3>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-[#9e6e34] uppercase shrink-0 print:hidden">Capital</span>
            </div>

            <div className="divide-y divide-amber-200/50 text-[9.5px] sm:text-xs">
              <div
                onClick={() => navigate('/admin/deposit-allocate')}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to manage Vault Deposits"
              >
                <span className="text-amber-900 font-semibold truncate mr-1">Deposited</span>
                <span className="font-extrabold text-[#002B49] whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{totalVaultDeposited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/deposit-allocate')}
                className="py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to manage Allocations"
              >
                <span className="text-amber-900 font-semibold truncate mr-1">Allocations</span>
                <span className="font-extrabold text-[#c69255] whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{totalAllocatedToTeam.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div
                onClick={() => navigate('/admin/deposit-allocate')}
                className="pt-1 flex items-center justify-between font-black text-[#9e6e34] cursor-pointer hover:bg-amber-100/70 px-0.5 sm:px-1 rounded-md transition min-w-0"
                title="Click to view Cash Reserve"
              >
                <span className="truncate mr-1">Available</span>
                <span className="text-[10.5px] sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{adminVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* 1. CASH IN HAND */}
          <div
            onClick={() => navigate('/user/my-credit-debit', { state: { statusFilter: 'Done' } })}
            className="p-2.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            title="Click middle to view Done entries"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-blue-900 tracking-wider">CASH IN HAND</span>
              <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-xs shrink-0 font-bold">💵</span>
            </div>
            <div className="my-1 text-center">
              <div className="text-lg sm:text-xl font-black text-blue-800 tracking-tight">
                {settings.currency}{Math.max(0, myHandDoneCredit - myDoneDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] font-black uppercase text-blue-700/80 tracking-wider">Available Balance</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold">
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done', depositToFilter: 'My Hand' } }); }}
                className="hover:text-emerald-700 hover:underline transition cursor-pointer"
                title="Click to view Hand Received Credits"
              >
                <span className="text-slate-400">Hand In: </span>
                <span className="text-emerald-700">{settings.currency}{myHandDoneCredit.toLocaleString('en-IN')}</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } }); }}
                className="hover:text-slate-900 hover:underline transition cursor-pointer"
                title="Click to view Spent Debits"
              >
                <span className="text-slate-400">Spent Out: </span>
                <span className="text-slate-800">{settings.currency}{myDoneDebit.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* 2. COMPANY OWES ME */}
          {(() => {
            const companyOwesMe = Math.max(0, myDoneDebit - myHandDoneCredit);
            return (
              <div
                onClick={() => navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } })}
                className={`p-2.5 rounded-xl bg-white border shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
                  companyOwesMe > 0 ? 'border-rose-200/90 bg-rose-50/20' : 'border-slate-200/80'
                }`}
                title="Click middle to view Done Out-of-pocket Expenses"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${companyOwesMe > 0 ? 'text-rose-900' : 'text-slate-600'}`}>
                    COMPANY OWES ME
                  </span>
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-bold ${
                    companyOwesMe > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    ⚠️
                  </span>
                </div>
                <div className="my-1 text-center">
                  <div className={`text-lg sm:text-xl font-black tracking-tight ${companyOwesMe > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                    {settings.currency}{companyOwesMe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${companyOwesMe > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    Payback Needed
                  </span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold">
                  <div
                    onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } }); }}
                    className="hover:text-rose-700 hover:underline transition cursor-pointer"
                    title="Click to view Total Spent"
                  >
                    <span className="text-slate-400">Total Spent: </span>
                    <span className="text-slate-800">{settings.currency}{myDoneDebit.toLocaleString('en-IN')}</span>
                  </div>
                  <div
                    onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done' } }); }}
                    className="hover:text-emerald-700 hover:underline transition cursor-pointer"
                    title="Click to view Money Received"
                  >
                    <span className="text-slate-400">Total Credit: </span>
                    <span className="text-emerald-700">{settings.currency}{myHandDoneCredit.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. TOTAL DEBIT */}
          <div
            onClick={() => navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } })}
            className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            title="Click middle to view Total Spent entries"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-900 tracking-wider">TOTAL DEBIT</span>
              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 flex items-center justify-center text-xs shrink-0 font-bold">🧾</span>
            </div>
            <div className="my-1 text-center">
              <div className="text-lg sm:text-xl font-black text-amber-900 tracking-tight">
                {settings.currency}{myDoneDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] font-black uppercase text-amber-800/80 tracking-wider">Total Spent</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold">
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'All' } }); }}
                className="hover:text-amber-900 hover:underline transition cursor-pointer"
                title="Click to view All Debit entries"
              >
                <span className="text-slate-400">All Bills: </span>
                <span className="text-slate-800">{settings.currency}{myDebitTotal.toLocaleString('en-IN')}</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate('/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Due' } }); }}
                className="hover:text-amber-700 hover:underline transition cursor-pointer"
                title="Click to view Unpaid Due Debit entries"
              >
                <span className="text-slate-400">Unpaid Due: </span>
                <span className="text-amber-700">{settings.currency}{myDueDebit.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* 4. TOTAL CREDIT */}
          <div
            onClick={() => navigate('/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done', depositToFilter: 'All' } })}
            className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            title="Click middle to view Money Received entries"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-800 tracking-wider">TOTAL CREDIT</span>
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0 font-bold">💰</span>
            </div>
            <div className="my-1 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
                {settings.currency}{myDoneCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-700/80 tracking-wider">Money Received</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold gap-1">
              <div
                onClick={(e) => { e.stopPropagation(); navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done', depositToFilter: 'My Hand' } }); }}
                className="hover:text-emerald-700 hover:underline transition cursor-pointer"
                title="Click to view My Hand Credit entries"
              >
                <span className="text-slate-400">In Hand: </span>
                <span className="text-emerald-700">{settings.currency}{myHandDoneCredit.toLocaleString('en-IN')}</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done', depositToFilter: 'Company Wallet' } }); }}
                className="hover:text-purple-700 hover:underline transition cursor-pointer"
                title="Click to view Company Wallet Credit entries"
              >
                <span className="text-slate-400">In Wallet: </span>
                <span className="text-purple-700">{settings.currency}{myWalletDoneCredit.toLocaleString('en-IN')}</span>
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done', depositToFilter: 'Banks' } }); }}
                className="hover:text-blue-700 hover:underline transition cursor-pointer"
                title="Click to view Bank Credit entries"
              >
                <span className="text-slate-400">In Bank: </span>
                <span className="text-blue-700">{settings.currency}{myBankDoneCredit.toLocaleString('en-IN')}</span>
              </div>
            </div>
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
              const allocatedVal = isComp ? totalVaultDeposited : (stats.totalCashAvailable || (stats.allocated + stats.cashInReceived));
              const rawPercent = allocatedVal > 0 ? Math.round((stats.spent / allocatedVal) * 100) : (stats.spent > 0 ? 100 : 0);
              const isOverSpent = allocatedVal > 0 ? stats.spent > allocatedVal : stats.spent > 0;
              const displayPercent = Math.min(100, rawPercent);
              const overSpentAmount = Math.max(0, stats.spent - allocatedVal);
              
              return (
                <div
                  key={u.id}
                  onClick={() => handleAccountClick(u.name, 'All', 'All')}
                  className={`p-3.5 rounded-2xl bg-white border shadow-xs space-y-2.5 cursor-pointer hover:border-slate-400 hover:shadow-md transition-all ${isComp ? 'border-[#002B49]/40 bg-slate-50/50' : 'border-slate-200/80'}`}
                  title={`Click to view ${u.name}'s records`}
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
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountClick(u.name, 'Credit', 'Done');
                      }}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                      title={`Click to view Total Done Credit for ${u.name}`}
                    >
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-0.5">{isComp ? 'Total Capital Deposited' : 'Total Done Credit'}</span>
                      <span className="font-extrabold text-emerald-700">
                        {settings.currency}{allocatedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountClick(u.name, 'Debit', 'Done');
                      }}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title={`Click to view TOTAL DONE DEBIT for ${u.name}`}
                    >
                      <span className="text-[10px] font-bold uppercase text-rose-800 block mb-0.5">{isComp ? 'Company Direct Expenses' : 'TOTAL DONE DEBIT'}</span>
                      <span className="font-extrabold text-rose-700">
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
                  <th className="py-3 px-4 font-bold">Total Done Credit</th>
                  <th className="py-3 px-4 font-bold">TOTAL DONE DEBIT</th>
                  <th className="py-3 px-4 font-bold">Available Reserve / Balance</th>
                  <th className="py-3 px-4 font-bold">Utilization</th>
                  <th className="py-3 px-4 text-right font-bold no-print">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allAccounts.map((u) => {
                  const isComp = u.isCompany;
                  const stats = isComp ? companyStats : getUserStats(u.name);
                  const allocatedVal = isComp ? totalVaultDeposited : (stats.totalCashAvailable || (stats.allocated + stats.cashInReceived));
                  const rawPercent = allocatedVal > 0 ? Math.round((stats.spent / allocatedVal) * 100) : (stats.spent > 0 ? 100 : 0);
                  const isOverSpent = allocatedVal > 0 ? stats.spent > allocatedVal : stats.spent > 0;
                  const displayPercent = Math.min(100, rawPercent);
                  const overSpentAmount = Math.max(0, stats.spent - allocatedVal);
                  
                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleAccountClick(u.name, 'All', 'All')}
                      className={`cursor-pointer hover:bg-slate-100/90 transition-all ${isComp ? 'bg-slate-50/60 font-bold' : ''}`}
                      title={`Click to view all records for ${u.name}`}
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
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccountClick(u.name, 'Credit', 'Done');
                        }}
                        className="py-3.5 px-4 font-bold text-emerald-800 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer"
                        title={`Click to view Total Done Credit for ${u.name}`}
                      >
                        {settings.currency}{allocatedVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccountClick(u.name, 'Debit', 'Done');
                        }}
                        className="py-3.5 px-4 font-bold text-rose-800 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
                        title={`Click to view TOTAL DONE DEBIT for ${u.name}`}
                      >
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 mt-4 pt-3 border-t border-slate-100 text-center">
            {/* 1. Total Done Credit (Light Green) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Done' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-center cursor-pointer hover:bg-emerald-100 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Total Done Credit"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-emerald-900 block truncate">{isAdmin ? 'Total Done Credit' : 'Money Received'}</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">
                {settings.currency}{(isAdmin ? adminDoneCredit : myHandDoneCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 2. Total Done Debit (Light Red) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Done' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-center cursor-pointer hover:bg-rose-100 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Total Done Debit"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-rose-900 block truncate">{isAdmin ? 'Total Done Debit' : 'Total Spent'}</span>
              <span className="text-xs sm:text-sm font-black text-rose-700 mt-0.5 truncate">
                {settings.currency}{(isAdmin ? adminDoneDebit : myDoneDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 3. Total Pending Credit (Light Green) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Credit', statusFilter: 'Due' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col justify-center cursor-pointer hover:bg-emerald-100 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Total Pending Credit"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-emerald-900 block truncate">Pending Credit</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">
                {settings.currency}{(isAdmin ? adminDueCredit : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 4. Total Pending Debit (Light Red) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'Due' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-rose-50/80 border border-rose-300 flex flex-col justify-center cursor-pointer hover:bg-rose-100 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Total Pending Debit"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-rose-900 block truncate">{isAdmin ? 'Pending Debit' : 'Pending Bills'}</span>
              <span className="text-xs sm:text-sm font-black text-rose-700 mt-0.5 truncate">
                {settings.currency}{(isAdmin ? adminDueDebit : myDueDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 5. Total Allocations (Sky Blue) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/deposit-allocate' : '/user/my-credit-debit')}
              className="p-2 sm:p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex flex-col justify-center cursor-pointer hover:bg-sky-100 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Total Allocations"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-sky-900 block truncate">{isAdmin ? 'Total Allocations' : 'My Allocations'}</span>
              <span className="text-xs sm:text-sm font-black text-sky-700 mt-0.5 truncate">
                {settings.currency}{(isAdmin ? totalAllocatedToTeam : moneyGiven).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* 6. Company Must Pay (Light Red) */}
            <div
              onClick={() => navigate(isAdmin ? '/admin/credit-debit' : '/user/my-credit-debit', { state: { typeFilter: 'Debit', statusFilter: 'All' } })}
              className="p-2 sm:p-2.5 rounded-xl bg-rose-100 border border-rose-300 flex flex-col justify-center cursor-pointer hover:bg-rose-200 hover:scale-102 transition-all shadow-2xs"
              title="Click to view Company Must Pay"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-rose-900 block truncate">{isAdmin ? 'Company Must Pay' : 'Company Owes Me'}</span>
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
