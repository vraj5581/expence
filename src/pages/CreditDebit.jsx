import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const CreditDebit = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    transactions,
    users,
    allocationsHistory,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateAllocation,
    deleteAllocation,
    addVaultDeposit
  } = useExpense();

  // Tab & Print View State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'debit' | 'credit'
  const [printTarget, setPrintTarget] = useState('all'); // 'all' | 'debit' | 'credit'

  // Admin User Filter
  const [selectedUser, setSelectedUser] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [modalTxnType, setModalTxnType] = useState('Cash Out');
  const [selectedTxnForAction, setSelectedTxnForAction] = useState(null);

  // Dedicated Print Handlers
  const triggerPrint = (target) => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handlePrintSelection = (target) => {
    setIsPrintModalOpen(false);
    triggerPrint(target);
  };

  // Independent Debit Filter State
  const [debitSearch, setDebitSearch] = useState('');
  const [debitStatus, setDebitStatus] = useState('All');
  const [debitStartDate, setDebitStartDate] = useState('');
  const [debitEndDate, setDebitEndDate] = useState('');
  const [debitMinAmt, setDebitMinAmt] = useState('');
  const [debitMaxAmt, setDebitMaxAmt] = useState('');
  const [isDebitFilterOpen, setIsDebitFilterOpen] = useState(false);

  // Independent Credit Filter State
  const [creditSearch, setCreditSearch] = useState('');
  const [creditDepositTo, setCreditDepositTo] = useState('All');
  const [creditStatus, setCreditStatus] = useState('All');
  const [creditStartDate, setCreditStartDate] = useState('');
  const [creditEndDate, setCreditEndDate] = useState('');
  const [creditMinAmt, setCreditMinAmt] = useState('');
  const [creditMaxAmt, setCreditMaxAmt] = useState('');
  const [isCreditFilterOpen, setIsCreditFilterOpen] = useState(false);

  // Handle location state ONCE on initial navigation and clear history state so F5 refresh NEVER auto-filters
  useEffect(() => {
    if (location.state) {
      if (location.state.selectedUser !== undefined) {
        setSelectedUser(location.state.selectedUser);
      }
      const typeFromState = location.state.typeFilter || location.state.selectedType;
      const statusFromState = location.state.statusFilter || location.state.selectedStatus;
      const depositToFromState = location.state.depositToFilter || location.state.selectedDepositTo;

      if (typeFromState === 'Debit') {
        setActiveTab('debit');
        if (statusFromState) setDebitStatus(statusFromState);
      } else if (typeFromState === 'Credit') {
        setActiveTab('credit');
        if (statusFromState) setCreditStatus(statusFromState);
        if (depositToFromState) setCreditDepositTo(depositToFromState);
      } else if (statusFromState) {
        setDebitStatus(statusFromState);
        setCreditStatus(statusFromState);
      }

      // Clear history state so browser refresh (F5) resets filters cleanly to 'All'
      window.history.replaceState({}, document.title);
    }
  }, []);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const selectedSpender = watch('userName', 'Shukan Company');

  // Separate raw arrays
  const rawDebitTxns = useMemo(() => {
    return transactions.filter(t => t.type !== 'Cash In' && t.type !== 'Credit');
  }, [transactions]);

  const rawCreditTxns = useMemo(() => {
    const directCredits = transactions.filter(t => t.type === 'Cash In' || t.type === 'Credit');
    const mappedAllocations = (allocationsHistory || []).map(a => ({
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
  }, [transactions, allocationsHistory]);

  // Filtered Debit Transactions
  const filteredDebitTxns = useMemo(() => {
    return rawDebitTxns.filter((t) => {
      if (selectedUser !== 'All' && t.userName !== selectedUser) return false;
      if (debitSearch.trim()) {
        const query = debitSearch.toLowerCase();
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchUser = (t.userName || '').toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchDate = (t.date || '').includes(query) || formatDate(t.date).toLowerCase().includes(query);
        if (!matchId && !matchUser && !matchDesc && !matchDate) return false;
      }
      if (debitStatus !== 'All' && (t.status || 'Done') !== debitStatus) return false;
      if (debitStartDate && t.date < debitStartDate) return false;
      if (debitEndDate && t.date > debitEndDate) return false;

      const num = parseFloat(t.amount) || 0;
      if (debitMinAmt && parseFloat(debitMinAmt) > 0 && num < parseFloat(debitMinAmt)) return false;
      if (debitMaxAmt && parseFloat(debitMaxAmt) > 0 && num > parseFloat(debitMaxAmt)) return false;

      return true;
    });
  }, [rawDebitTxns, selectedUser, debitSearch, debitStatus, debitStartDate, debitEndDate, debitMinAmt, debitMaxAmt]);

  // Filtered Credit Transactions
  const filteredCreditTxns = useMemo(() => {
    return rawCreditTxns.filter((t) => {
      if (selectedUser !== 'All' && t.userName !== selectedUser) return false;
      if (creditSearch.trim()) {
        const query = creditSearch.toLowerCase();
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchUser = (t.userName || '').toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchDate = (t.date || '').includes(query) || formatDate(t.date).toLowerCase().includes(query);
        if (!matchId && !matchUser && !matchDesc && !matchDate) return false;
      }
      if (creditDepositTo !== 'All') {
        const target = t.depositTo || 'My Hand';
        if (target !== creditDepositTo) return false;
      }
      if (creditStatus !== 'All' && (t.status || 'Done') !== creditStatus) return false;
      if (creditStartDate && t.date < creditStartDate) return false;
      if (creditEndDate && t.date > creditEndDate) return false;

      const num = parseFloat(t.amount) || 0;
      if (creditMinAmt && parseFloat(creditMinAmt) > 0 && num < parseFloat(creditMinAmt)) return false;
      if (creditMaxAmt && parseFloat(creditMaxAmt) > 0 && num > parseFloat(creditMaxAmt)) return false;

      return true;
    });
  }, [rawCreditTxns, selectedUser, creditSearch, creditDepositTo, creditStatus, creditStartDate, creditEndDate, creditMinAmt, creditMaxAmt]);

  // Debit Summary Stats (Always calculated from raw debit transactions for 100% accurate totals)
  const debitSummary = useMemo(() => {
    let total = 0;
    let doneTotal = 0;
    let dueTotal = 0;

    rawDebitTxns.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const isDone = (t.status || 'Done') === 'Done';
      total += amt;
      if (isDone) doneTotal += amt;
      else dueTotal += amt;
    });

    return { total, doneTotal, dueTotal };
  }, [rawDebitTxns]);

  // Credit Summary Stats (Always calculated from raw credit transactions for 100% accurate totals)
  const creditSummary = useMemo(() => {
    let total = 0;
    let doneTotal = 0;
    let dueTotal = 0;
    let myHandTotal = 0;
    let myHandDone = 0;
    let myHandDue = 0;

    let walletTotal = 0;
    let walletDone = 0;
    let walletDue = 0;

    rawCreditTxns.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const isDone = (t.status || 'Done') === 'Done';
      total += amt;
      if (isDone) doneTotal += amt;
      else dueTotal += amt;

      if (t.depositTo === 'Company Wallet') {
        walletTotal += amt;
        if (isDone) walletDone += amt;
        else walletDue += amt;
      } else {
        myHandTotal += amt;
        if (isDone) myHandDone += amt;
        else myHandDue += amt;
      }
    });

    return { total, doneTotal, dueTotal, myHandTotal, myHandDone, myHandDue, walletTotal, walletDone, walletDue };
  }, [rawCreditTxns]);

  // Filtered Debit Total for Table Footer (exact sum of displayed filtered rows)
  const filteredDebitTotal = useMemo(() => {
    return filteredDebitTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredDebitTxns]);

  // Filtered Credit Total for Table Footer (exact sum of displayed filtered rows)
  const filteredCreditTotal = useMemo(() => {
    return filteredCreditTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredCreditTxns]);

  // Active filter checks
  const hasActiveDebitFilters = Boolean(debitSearch || debitStatus !== 'All' || debitStartDate || debitEndDate || debitMinAmt || debitMaxAmt);
  const hasActiveCreditFilters = Boolean(creditSearch || creditDepositTo !== 'All' || creditStatus !== 'All' || creditStartDate || creditEndDate || creditMinAmt || creditMaxAmt);

  const debitTableFooterLabel = useMemo(() => {
    if (debitStatus === 'Due') return 'TOTAL DUE DEBIT:';
    if (debitStatus === 'Done') return 'TOTAL DONE DEBIT:';
    if (selectedUser !== 'All') return `TOTAL ${selectedUser.toUpperCase()} DEBIT:`;
    if (hasActiveDebitFilters) return 'TOTAL FILTERED DEBIT:';
    return 'TOTAL DEBIT:';
  }, [debitStatus, selectedUser, hasActiveDebitFilters]);

  const creditTableFooterLabel = useMemo(() => {
    if (creditStatus === 'Due') return 'TOTAL DUE CREDIT:';
    if (creditStatus === 'Done') return 'TOTAL DONE CREDIT:';
    if (creditDepositTo !== 'All') return `TOTAL ${creditDepositTo.toUpperCase()} CREDIT:`;
    if (selectedUser !== 'All') return `TOTAL ${selectedUser.toUpperCase()} CREDIT:`;
    if (hasActiveCreditFilters) return 'TOTAL FILTERED CREDIT:';
    return 'TOTAL CREDIT:';
  }, [creditStatus, creditDepositTo, selectedUser, hasActiveCreditFilters]);

  // Dynamic Debit Display Metrics (reflects filters if active)
  const displayDebitTitle = useMemo(() => {
    if (debitStatus !== 'All') return `Total Debit (${debitStatus})`;
    if (hasActiveDebitFilters) return 'Filtered Debit';
    return 'Total Debit';
  }, [debitStatus, hasActiveDebitFilters]);

  const displayDebitTotal = useMemo(() => {
    return hasActiveDebitFilters ? filteredDebitTotal : debitSummary.total;
  }, [hasActiveDebitFilters, filteredDebitTotal, debitSummary.total]);

  const displayDebitDone = useMemo(() => {
    return filteredDebitTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredDebitTxns]);

  const displayDebitDue = useMemo(() => {
    return filteredDebitTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredDebitTxns]);

  // Dynamic Credit Display Metrics (reflects filters if active)
  const displayCreditTotalTitle = useMemo(() => {
    if (creditStatus !== 'All' && creditDepositTo === 'All') return `Total Credit (${creditStatus})`;
    if (hasActiveCreditFilters && creditDepositTo === 'All') return 'Filtered Credit';
    return 'Total Credit';
  }, [creditStatus, creditDepositTo, hasActiveCreditFilters]);

  const displayCreditTotalAmount = useMemo(() => {
    return hasActiveCreditFilters && creditDepositTo === 'All' ? filteredCreditTotal : creditSummary.total;
  }, [hasActiveCreditFilters, creditDepositTo, filteredCreditTotal, creditSummary.total]);

  const displayCreditDone = useMemo(() => {
    return filteredCreditTxns.filter(t => (t.status || 'Done') === 'Done').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredCreditTxns]);

  const displayCreditDue = useMemo(() => {
    return filteredCreditTxns.filter(t => (t.status || 'Done') === 'Due').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredCreditTxns]);

  const resetDebitFilters = () => {
    setDebitSearch('');
    setDebitStatus('All');
    setDebitStartDate('');
    setDebitEndDate('');
    setDebitMinAmt('');
    setDebitMaxAmt('');
  };

  const resetCreditFilters = () => {
    setCreditSearch('');
    setCreditDepositTo('All');
    setCreditStatus('All');
    setCreditStartDate('');
    setCreditEndDate('');
    setCreditMinAmt('');
    setCreditMaxAmt('');
  };

  // Form Submission
  const handleOpenAddModal = (defaultType = 'Cash Out') => {
    setEditingTxn(null);
    setModalTxnType(defaultType);
    let initialUser = selectedUser !== 'All' ? selectedUser : (user?.name || 'Shukan Company');
    if (defaultType === 'Cash In' && (initialUser === 'Shukan Company' || initialUser === 'Shukan Packaging (Company)' || initialUser === 'Company Vault')) {
      initialUser = users.find(u => u.name !== 'Shukan Company')?.name || user?.name || '';
    }
    reset({
      type: defaultType,
      amount: '',
      depositTo: defaultType === 'Cash In' ? 'My Hand' : 'My Hand',
      userName: initialUser,
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (txn) => {
    setEditingTxn(txn);
    setModalTxnType(txn.type || 'Cash Out');
    reset({
      type: txn.type || 'Cash Out',
      amount: txn.amount,
      depositTo: txn.depositTo || 'My Hand',
      userName: txn.userName,
      date: txn.date,
      status: txn.status || 'Done',
      description: txn.description || ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    if (editingTxn) {
      if (editingTxn.isAllocation) {
        const res = updateAllocation(editingTxn.id, {
          amount: data.amount,
          notes: data.description,
          date: data.date,
          userName: data.userName || editingTxn.userName
        });
        if (res && res.success === false) {
          toast.error(res.message, { theme: 'light' });
          return;
        }
        toast.success(`Company Allocation updated successfully!`, { theme: 'light' });
      } else {
        const res = updateTransaction(editingTxn.id, data);
        if (res && res.success === false) {
          toast.error(res.message, { theme: 'light' });
          return;
        }
        toast.success(`Transaction ${editingTxn.id} updated successfully!`, { theme: 'light' });
      }
    } else {
      const finalType = data.type || modalTxnType || 'Cash Out';
      const finalDepositTo = finalType === 'Cash In' ? (data.depositTo || 'My Hand') : 'My Hand';

      let finalUserName = data.userName || (selectedUser !== 'All' ? selectedUser : (user?.name || 'Shukan Company'));
      if (finalType === 'Cash In' && (finalUserName === 'Shukan Company' || finalUserName === 'Shukan Packaging (Company)' || finalUserName === 'Company Vault')) {
        finalUserName = users.find(u => u.name !== 'Shukan Company')?.name || user?.name || '';
      }

      const newTxn = {
        ...data,
        type: finalType,
        depositTo: finalDepositTo,
        status: data.status || 'Done',
        userName: finalUserName,
        createdBy: user?.name || 'Admin'
      };

      const res = addTransaction(newTxn);
      if (res && res.success === false) {
        toast.error(res.message, { theme: 'light' });
        return;
      }

      if (finalType === 'Cash In' && finalDepositTo === 'Company Wallet') {
        addVaultDeposit({
          amount: data.amount,
          date: data.date,
          userName: newTxn.userName,
          notes: `Company Wallet Credit: ${data.description || 'Deposit to Vault'}`
        });
      }

      toast.success(`New ${finalType === 'Cash In' ? 'Credit' : 'Debit'} entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });

      if (finalType === 'Cash In') resetCreditFilters();
      else resetDebitFilters();
    }
    setIsModalOpen(false);
    reset();
  };

  const handleStatusChange = (txn, newStatus) => {
    if (txn.isAllocation) {
      toast.info('Company allocation status is fixed as Done', { theme: 'light' });
      return;
    }
    updateTransaction(txn.id, { ...txn, status: newStatus });
    if (newStatus === 'Done') {
      toast.success(`Transaction marked as Done`, { theme: 'light' });
    } else {
      toast.info(`Transaction marked as Due`, { theme: 'light' });
    }
  };

  const handleDelete = (tOrId) => {
    const id = typeof tOrId === 'object' ? tOrId.id : tOrId;
    const isAlloc = typeof tOrId === 'object' ? tOrId.isAllocation : allocationsHistory.some(a => a.id === id);

    if (isAlloc) {
      if (window.confirm(`Delete Company Cash Allocation record ${id}?`)) {
        deleteAllocation(id);
        toast.info(`Company allocation record removed.`, { theme: 'light' });
      }
    } else {
      if (window.confirm(`Delete transaction record ${id}?`)) {
        deleteTransaction(id);
        toast.info(`Transaction removed.`, { theme: 'light' });
      }
    }
  };

  // Dedicated Print Handlers

  return (
    <div className="space-y-6 print:space-y-4 print:bg-white print:text-black">
      {/* High-Contrast Black & White Print Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-black tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-bold text-black uppercase mt-1">
          {selectedUser !== 'All' ? `${selectedUser} - ` : ''}
          {printTarget === 'debit' ? 'Debit Statement Audit' : printTarget === 'credit' ? 'Credit Statement Audit' : 'Debit & Credit Audit Ledger'}
        </h2>
        <div className="text-xs font-semibold text-black mt-1 flex items-center justify-center space-x-3">
          <span>Date Printed: {formatDate(new Date())}</span>
          {selectedUser !== 'All' && <span>| User: {selectedUser}</span>}
          {printTarget === 'debit' && debitStatus !== 'All' && <span>| Status: {debitStatus}</span>}
          {printTarget === 'credit' && creditStatus !== 'All' && <span>| Status: {creditStatus}</span>}
        </div>
      </div>

      {/* Page Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">Debit & Credit</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Company debit and credit transaction audit log</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap md:flex-nowrap shrink-0">
          {/* User Selector Dropdown */}
          <div className="flex-1 sm:flex-none">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full sm:w-auto px-2.5 sm:px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white font-bold border border-slate-300 focus:outline-none truncate"
            >
              <option value="All">All Users & Co.</option>
              <option value="Shukan Company">🏢 Shukan Co.</option>
              {users.map((u) => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Add Debit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Debit
          </button>

          {/* Add Credit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash In')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Credit
          </button>

          {/* Print Report Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#002B49] text-white hover:bg-[#001D33] text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Print Report"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Debit First, Credit Second) */}
      <div className="grid grid-cols-3 sm:flex sm:w-max items-center gap-1 bg-slate-200/70 p-1 sm:p-1.5 rounded-2xl w-full max-w-full border border-slate-300/50 print:hidden">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition cursor-pointer text-center justify-center flex items-center whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-white text-[#002B49] shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="hidden sm:inline">All Tables ({rawDebitTxns.length + rawCreditTxns.length})</span>
          <span className="sm:hidden">All ({rawDebitTxns.length + rawCreditTxns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('debit')}
          className={`px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center space-x-1 sm:space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'debit'
              ? 'bg-[#c69255] text-white shadow-md'
              : 'text-slate-600 hover:text-[#c69255]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-300 shrink-0"></span>
          <span className="hidden sm:inline">Debit Table ({rawDebitTxns.length})</span>
          <span className="sm:hidden">Debit ({rawDebitTxns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-1.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center space-x-1 sm:space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'credit'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="hidden sm:inline">Credit Table ({rawCreditTxns.length})</span>
          <span className="sm:hidden">Credit ({rawCreditTxns.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 🟠 SECTION 1: DEBIT TRANSACTIONS TABLE & FILTERS (FIRST)  */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'debit' || printTarget === 'all' || printTarget === 'debit') && (
        <div className={`p-1.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-rose-50/60 border border-rose-200/90 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent ${activeTab !== 'all' && activeTab !== 'debit' ? 'hidden print:block' : ''} ${printTarget === 'credit' ? 'print:hidden' : ''}`}>
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 print:border-b-2 print:border-black pb-3 print:pb-1">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center font-black text-sm shrink-0 print:hidden">
                🧾
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-rose-950 print:text-lg print:text-black print:font-black leading-tight">
                    Debit Transactions <span className="text-rose-900/80 font-bold text-xs sm:text-sm print:text-black print:font-bold">(Cash Out)</span>
                  </h2>
                  <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-semibold">
                    {filteredDebitTxns.length} Entries
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-rose-800/80 font-medium print:text-black print:font-semibold">Expenses and payments made</p>
              </div>
            </div>

            {/* Dedicated Debit Filter Trigger & Print Button */}
            <div className="flex items-center space-x-2 print:hidden">
              <button
                onClick={() => setIsDebitFilterOpen(true)}
                className={`flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  hasActiveDebitFilters
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-rose-900 border-rose-300 hover:bg-rose-100/50'
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Debit {hasActiveDebitFilters && <span className="ml-1 text-emerald-300 font-extrabold">●</span>}
              </button>

              <button
                onClick={() => triggerPrint('debit')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Debit
              </button>
            </div>
          </div>

          {/* Quick 1-Line Search Bar for Debit */}
          <div className="flex items-center gap-2 print:hidden">
            <div className="relative flex-1">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={debitSearch}
                onChange={(e) => setDebitSearch(e.target.value)}
                placeholder="Search debit entries (user, description, date, amount)..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input bg-white/90 text-slate-800 placeholder-slate-400 focus:outline-none border border-rose-200/80"
              />
            </div>
            {debitSearch && (
              <button
                onClick={() => setDebitSearch('')}
                className="text-xs text-rose-600 font-bold hover:underline px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Active Debit Filter Badge Banner */}
          {hasActiveDebitFilters && (
            <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <span className="font-extrabold text-rose-950">Active Debit Filters:</span>
                {debitStatus !== 'All' && (
                  <span className="px-2 py-0.5 rounded bg-rose-900 text-white font-bold text-[11px]">
                    Status: {debitStatus}
                  </span>
                )}
                {(debitStartDate || debitEndDate) && (
                  <span className="px-2 py-0.5 rounded bg-white text-slate-800 font-bold text-[11px] border border-rose-200">
                    Date: {debitStartDate || 'Start'} to {debitEndDate || 'Today'}
                  </span>
                )}
                {(debitMinAmt || debitMaxAmt) && (
                  <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-bold text-[11px]">
                    Amount: {debitMinAmt ? `${settings.currency}${debitMinAmt}` : 'Min'} - {debitMaxAmt ? `${settings.currency}${debitMaxAmt}` : 'Max'}
                  </span>
                )}
              </div>
              <button onClick={resetDebitFilters} className="text-[11px] font-bold text-rose-700 hover:underline">
                Reset Debit Filters
              </button>
            </div>
          )}

          {/* Debit Summary Card */}
          <div className="pt-0.5 print:pt-0.5">
            <div
              onClick={() => setDebitStatus('Done')}
              className={`p-2 sm:p-2.5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md w-full sm:w-fit sm:min-w-[220px] max-w-xs print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                debitStatus === 'Done' ? 'border-rose-700 ring-2 ring-rose-500/20' : 'border-rose-200/90'
              }`}
              title="Click middle to filter Done Debit entries"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-rose-950 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide truncate">TOTAL DONE DEBIT</span>
                <div className="flex items-center space-x-1">
                  {hasActiveDebitFilters && (
                    <span
                      onClick={(e) => { e.stopPropagation(); resetDebitFilters(); }}
                      className="text-[9px] font-extrabold text-rose-600 hover:underline print:hidden"
                    >
                      Show All ✕
                    </span>
                  )}
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] sm:text-xs font-black print:hidden">
                    🧾
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black text-rose-900 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight my-0.5">
                  {settings.currency}{displayDebitDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                {/* Web View Interactive Pill Badges */}
                <div className="flex items-center gap-1 mt-1 text-[8px] sm:text-[10px] font-extrabold flex-wrap print:hidden">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDebitStatus('All'); }}
                    className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                      debitStatus === 'All'
                        ? 'bg-rose-900 text-white border-rose-900 shadow-2xs'
                        : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                    }`}
                    title="Click to show all debit transactions"
                  >
                    <span>Total:</span>
                    <span>{settings.currency}{displayDebitTotal.toLocaleString('en-IN')}</span>
                  </button>
                  {displayDebitDue > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDebitStatus(debitStatus === 'Due' ? 'All' : 'Due'); }}
                      className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                        debitStatus === 'Due'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-amber-100/90 text-amber-900 border-amber-200/80 hover:bg-amber-200'
                      }`}
                      title="Click to filter Due expenses"
                    >
                      <span>Due:</span>
                      <span>{settings.currency}{displayDebitDue.toLocaleString('en-IN')}</span>
                    </button>
                  )}
                </div>

                {/* Print View Clean Text Line */}
                <div className="hidden print:block text-[9.5px] font-black text-black print:mt-0.5 whitespace-nowrap">
                  Total: {settings.currency}{displayDebitTotal.toLocaleString('en-IN')}  •  Due: {settings.currency}{displayDebitDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Debit Table Content */}
          <div>
            {/* Mobile Compact Line-by-Line Table View */}
            <div className="block md:hidden print:hidden">
              {filteredDebitTxns.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-white/80 rounded-xl border border-rose-200/70">
                  No debit entries match your filter.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-rose-200/80 shadow-2xs overflow-hidden">
                  <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed text-left text-xs border-collapse">
                      <thead className="text-[10px] uppercase bg-rose-100/90 text-rose-950 sticky top-0 z-10 border-b border-rose-200 shadow-2xs">
                        <tr>
                          <th className="py-2 px-1 font-black w-6 text-center">#</th>
                          <th className="py-2 px-1 font-black">User, Date & Notes</th>
                          <th className="py-2 px-1 font-black text-right w-20">Amount</th>
                          <th className="py-2 px-1 font-black text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {filteredDebitTxns.map((t, index) => {
                          const isDone = (t.status || 'Done') === 'Done';
                          return (
                            <tr
                              key={t.id || index}
                              onClick={() => setSelectedTxnForAction(t)}
                              className="hover:bg-rose-50/70 active:bg-rose-100 transition odd:bg-white even:bg-slate-50/30 cursor-pointer"
                              title="Click entry to view options & change status"
                            >
                              <td className="py-2 px-1 font-bold text-slate-400 text-center align-middle text-[10px] truncate">{index + 1}</td>
                              <td className="py-2 px-1 align-middle min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center space-x-1 min-w-0">
                                    <span className="text-[11px] font-extrabold text-rose-950 truncate">{t.userName}</span>
                                    <span className="text-[9.5px] font-bold text-slate-400 shrink-0">• {formatDate(t.date)}</span>
                                  </div>
                                  <span className="text-[10.5px] font-semibold text-slate-700 truncate leading-tight">{t.description || '-'}</span>
                                </div>
                              </td>
                              <td className="py-2 px-1 font-black text-rose-950 text-right whitespace-nowrap align-middle text-[11px]">
                                {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-1 text-center align-middle">
                                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md inline-block text-center shadow-2xs ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {t.status || 'Done'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {filteredDebitTxns.length > 0 && (
                        <tfoot className="bg-rose-50/90 font-bold text-xs text-rose-950 border-t-2 border-rose-200 sticky bottom-0 z-10 shadow-xs">
                          <tr>
                            <td colSpan="2" className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold text-[11px] text-rose-950">
                              {debitTableFooterLabel}
                            </td>
                            <td className="py-2.5 px-2 text-right font-black text-rose-950 text-xs whitespace-nowrap">
                              {settings.currency}{(filteredDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-1"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Table View & High-Contrast Print View */}
            <div className="hidden md:block overflow-x-auto print:block bg-white rounded-2xl border border-rose-200/80 shadow-2xs">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-rose-100/70 text-rose-950 border-b border-rose-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Date</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Type</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">User Name</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Status</th>
                    <th className="py-3 px-4 font-bold text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredDebitTxns.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-slate-300">
                        No debit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDebitTxns.map((t, index) => {
                      const isDone = (t.status || 'Done') === 'Done';
                      return (
                        <tr key={t.id || index} className="hover:bg-rose-50/40 transition print:bg-white">
                          <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{index + 1}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{formatDate(t.date)}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-extrabold print:text-[11px]">
                              Debit
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-rose-950 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{t.userName}</td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:max-w-none print:whitespace-normal print:break-words">{t.description || '-'}</td>
                          <td className="py-3.5 px-4 font-black text-right text-rose-950 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:font-black">
                            {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="hidden print:inline-block text-black font-extrabold text-[11px] uppercase print:border-none print:p-0">
                              {t.status || 'Done'}
                            </span>
                            <select
                              value={t.status || 'Done'}
                              onChange={(e) => handleStatusChange(t, e.target.value)}
                              className={`print:hidden text-xs font-bold px-3 py-1 rounded-xl cursor-pointer focus:outline-none transition ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              <option value="Done">Done</option>
                              <option value="Due">Due</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button onClick={() => handleOpenEditModal(t)} className="p-1 text-slate-400 hover:text-slate-700" title="Edit Entry">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-1 text-rose-400 hover:text-rose-600" title="Delete Entry">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredDebitTxns.length > 0 && (
                  <tfoot className="bg-rose-50/70 font-bold text-xs text-rose-950 border-t-2 border-rose-200 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                    <tr>
                      <td colSpan="5" className="py-3 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black print:font-black">
                        {debitTableFooterLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-950 text-sm print:py-2 print:px-2 print:border print:border-black print:text-black print:font-black">
                        {settings.currency}{filteredDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan="2" className="print:border print:border-black"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟢 SECTION 2: CREDIT TRANSACTIONS TABLE & FILTERS (SECOND)*/}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'credit' || printTarget === 'all' || printTarget === 'credit') && (
        <div className={`p-1.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-50/60 border border-emerald-200/90 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent ${activeTab !== 'all' && activeTab !== 'credit' ? 'hidden print:block' : ''} ${printTarget === 'debit' ? 'print:hidden' : ''}`}>
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 print:border-b-2 print:border-black pb-3 print:pb-1">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-sm shrink-0 print:hidden">
                💰
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-emerald-950 print:text-lg print:text-black print:font-black leading-tight">
                    Credit Transactions <span className="text-emerald-900/80 font-bold text-xs sm:text-sm print:text-black print:font-bold">(Cash In)</span>
                  </h2>
                  <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-semibold">
                    {filteredCreditTxns.length} Entries
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-800/80 font-medium print:text-black print:font-semibold">Deposits to My Hand or Company Wallet</p>
              </div>
            </div>

            {/* Dedicated Credit Filter Trigger & Print Button */}
            <div className="flex items-center space-x-2 print:hidden">
              <button
                onClick={() => setIsCreditFilterOpen(true)}
                className={`flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  hasActiveCreditFilters
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100/50'
                }`}
              >
                <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Credit {hasActiveCreditFilters && <span className="ml-1 text-amber-300 font-extrabold">●</span>}
              </button>

              <button
                onClick={() => triggerPrint('credit')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Credit
              </button>
            </div>
          </div>

          {/* Quick 1-Line Search Bar for Credit */}
          <div className="flex items-center gap-2 print:hidden">
            <div className="relative flex-1">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={creditSearch}
                onChange={(e) => setCreditSearch(e.target.value)}
                placeholder="Search credit entries (user, description, date, amount)..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input bg-white/90 text-slate-800 placeholder-slate-400 focus:outline-none border border-emerald-200/80"
              />
            </div>
            {creditSearch && (
              <button
                onClick={() => setCreditSearch('')}
                className="text-xs text-rose-600 font-bold hover:underline px-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Active Credit Filter Badge Banner */}
          {hasActiveCreditFilters && (
            <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <span className="font-extrabold text-emerald-950">Active Credit Filters:</span>
                {creditDepositTo !== 'All' && (
                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-[11px]">
                    Account: {creditDepositTo}
                  </span>
                )}
                {creditStatus !== 'All' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-800 text-white font-bold text-[11px]">
                    Status: {creditStatus}
                  </span>
                )}
                {(creditStartDate || creditEndDate) && (
                  <span className="px-2 py-0.5 rounded bg-white text-slate-800 font-bold text-[11px] border border-emerald-200">
                    Date: {creditStartDate || 'Start'} to {creditEndDate || 'Today'}
                  </span>
                )}
                {(creditMinAmt || creditMaxAmt) && (
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">
                    Amount: {creditMinAmt ? `${settings.currency}${creditMinAmt}` : 'Min'} - {creditMaxAmt ? `${settings.currency}${creditMaxAmt}` : 'Max'}
                  </span>
                )}
              </div>
              <button onClick={resetCreditFilters} className="text-[11px] font-bold text-rose-700 hover:underline">
                Reset Credit Filters
              </button>
            </div>
          )}

          {/* Credit Summary Cards (Print High-Contrast Black & White Compact) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2.5 pt-0.5 print:gap-1.5 print:pt-1">
            {/* Total Credit Card */}
            <div
              onClick={() => { setCreditDepositTo('All'); setCreditStatus('Done'); }}
              className={`p-2 sm:p-2.5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                creditDepositTo === 'All' && creditStatus === 'Done' ? 'border-emerald-600 ring-2 ring-emerald-500/15' : 'border-emerald-200/90'
              }`}
              title="Click middle to view Done Credit entries"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-emerald-950 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide truncate">TOTAL DONE CREDIT</span>
                <div className="flex items-center space-x-1">
                  {hasActiveCreditFilters && (
                    <span
                      onClick={(e) => { e.stopPropagation(); resetCreditFilters(); }}
                      className="text-[9px] font-extrabold text-rose-600 hover:underline print:hidden"
                    >
                      Show All ✕
                    </span>
                  )}
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] sm:text-xs font-black print:hidden shrink-0">
                    💰
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black text-emerald-700 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight my-0.5">
                  {settings.currency}{displayCreditDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[8px] sm:text-[10px] font-extrabold flex-wrap print:hidden">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCreditDepositTo('All'); setCreditStatus('All'); }}
                    className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                      creditDepositTo === 'All' && creditStatus === 'All'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-emerald-100/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-200'
                    }`}
                  >
                    <span>Total:</span>
                    <span>{settings.currency}{displayCreditTotalAmount.toLocaleString('en-IN')}</span>
                  </button>
                  {displayCreditDue > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('All'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                      className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                        creditDepositTo === 'All' && creditStatus === 'Due'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-amber-100/90 text-amber-900 border-amber-200/80 hover:bg-amber-200'
                      }`}
                    >
                      <span>Due:</span>
                      <span>{settings.currency}{displayCreditDue.toLocaleString('en-IN')}</span>
                    </button>
                  )}
                </div>
                {/* Print View Clean Text Line */}
                <div className="hidden print:block text-[9.5px] font-black text-black print:mt-0.5 whitespace-nowrap">
                  Total: {settings.currency}{displayCreditTotalAmount.toLocaleString('en-IN')}  •  Due: {settings.currency}{displayCreditDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* My Hand Card */}
            <div
              onClick={() => { setCreditDepositTo('My Hand'); setCreditStatus('Done'); }}
              className={`p-2 sm:p-2.5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                creditDepositTo === 'My Hand' && creditStatus === 'Done' ? 'border-blue-600 ring-2 ring-blue-500/15' : 'border-blue-200/90'
              }`}
              title="Click middle to filter Done My Hand transactions"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-blue-900 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide truncate">MY HAND (DONE)</span>
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] sm:text-xs font-black print:hidden shrink-0">
                  ✋
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black text-blue-800 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight my-0.5">
                  {settings.currency}{creditSummary.myHandDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[8px] sm:text-[10px] font-extrabold flex-wrap print:hidden">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCreditDepositTo('My Hand'); setCreditStatus('All'); }}
                    className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                      creditDepositTo === 'My Hand' && creditStatus === 'All'
                        ? 'bg-blue-700 text-white border-blue-800 shadow-2xs'
                        : 'bg-emerald-100/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-200'
                    }`}
                  >
                    <span>Total:</span>
                    <span>{settings.currency}{(hasActiveCreditFilters && creditDepositTo === 'My Hand' ? filteredCreditTotal : creditSummary.myHandTotal).toLocaleString('en-IN')}</span>
                  </button>
                  {creditSummary.myHandDue > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('My Hand'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                      className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                        creditDepositTo === 'My Hand' && creditStatus === 'Due'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-amber-100/90 text-amber-900 border-amber-200/80 hover:bg-amber-200'
                      }`}
                    >
                      <span>Due:</span>
                      <span>{settings.currency}{creditSummary.myHandDue.toLocaleString('en-IN')}</span>
                    </button>
                  )}
                </div>
                {/* Print View Clean Text Line */}
                <div className="hidden print:block text-[9.5px] font-black text-black print:mt-0.5 whitespace-nowrap">
                  Total: {settings.currency}{creditSummary.myHandTotal.toLocaleString('en-IN')}  •  Due: {settings.currency}{creditSummary.myHandDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Company Wallet Card */}
            <div
              onClick={() => { setCreditDepositTo('Company Wallet'); setCreditStatus('Done'); }}
              className={`p-2 sm:p-2.5 rounded-xl bg-white border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                creditDepositTo === 'Company Wallet' && creditStatus === 'Done' ? 'border-purple-600 ring-2 ring-purple-500/15' : 'border-purple-200/90'
              }`}
              title="Click middle to filter Done Company Wallet transactions"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[11px] font-black uppercase text-purple-900 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide truncate">CO. WALLET (DONE)</span>
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] sm:text-xs font-black print:hidden shrink-0">
                  🏢
                </div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-black text-purple-800 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight my-0.5">
                  {settings.currency}{creditSummary.walletDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[8px] sm:text-[10px] font-extrabold flex-wrap print:hidden">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCreditDepositTo('Company Wallet'); setCreditStatus('All'); }}
                    className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                      creditDepositTo === 'Company Wallet' && creditStatus === 'All'
                        ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                        : 'bg-purple-100/90 text-purple-900 border-purple-200/80 hover:bg-purple-200'
                    }`}
                  >
                    <span>Total:</span>
                    <span>{settings.currency}{(hasActiveCreditFilters && creditDepositTo === 'Company Wallet' ? filteredCreditTotal : creditSummary.walletTotal).toLocaleString('en-IN')}</span>
                  </button>
                  {creditSummary.walletDue > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('Company Wallet'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                      className={`px-1.5 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-0.5 ${
                        creditDepositTo === 'Company Wallet' && creditStatus === 'Due'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-amber-100/90 text-amber-900 border-amber-200/80 hover:bg-amber-200'
                      }`}
                    >
                      <span>Due:</span>
                      <span>{settings.currency}{creditSummary.walletDue.toLocaleString('en-IN')}</span>
                    </button>
                  )}
                </div>
                {/* Print View Clean Text Line */}
                <div className="hidden print:block text-[9.5px] font-black text-black print:mt-0.5 whitespace-nowrap">
                  Done: {settings.currency}{creditSummary.walletDone.toLocaleString('en-IN')}  •  Due: {settings.currency}{creditSummary.walletDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Credit Table Content */}
          <div>
            {/* Mobile Compact Line-by-Line Table View */}
            <div className="block md:hidden print:hidden">
              {filteredCreditTxns.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-white/80 rounded-xl border border-emerald-200/70">
                  No credit entries match your filter.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-2xs overflow-hidden">
                  <div className="max-h-[65vh] overflow-y-auto overflow-x-hidden">
                    <table className="w-full table-fixed text-left text-xs border-collapse">
                      <thead className="text-[10px] uppercase bg-emerald-100/90 text-emerald-950 sticky top-0 z-10 border-b border-emerald-200 shadow-2xs">
                        <tr>
                          <th className="py-2 px-1 font-black w-6 text-center">#</th>
                          <th className="py-2 px-1 font-black">User, Account & Notes</th>
                          <th className="py-2 px-1 font-black text-right w-20">Amount</th>
                          <th className="py-2 px-1 font-black text-center w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {filteredCreditTxns.map((t, index) => {
                          const isDone = (t.status || 'Done') === 'Done';
                          const accountLabel = t.depositTo === 'Company Wallet' ? '🏢 Wallet' : '✋ Hand';
                          return (
                            <tr
                              key={t.id || index}
                              onClick={() => setSelectedTxnForAction(t)}
                              className={`transition cursor-pointer ${
                                t.isAllocation
                                  ? 'bg-amber-50/90 border-l-4 border-l-amber-500 hover:bg-amber-100/70'
                                  : 'hover:bg-emerald-50/70 active:bg-emerald-100 odd:bg-white even:bg-slate-50/30'
                              }`}
                              title="Click entry to view options & change status"
                            >
                              <td className="py-2 px-1 font-bold text-slate-400 text-center align-middle text-[10px] truncate">{index + 1}</td>
                              <td className="py-2 px-1 align-middle min-w-0">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center space-x-1 min-w-0">
                                    <span className="text-[11px] font-extrabold text-emerald-950 truncate">{t.userName}</span>
                                    {t.isAllocation ? (
                                      <span className="px-1 py-0.2 rounded text-[8.5px] font-black bg-amber-500 text-white shadow-2xs shrink-0">
                                        🏢 Allocation
                                      </span>
                                    ) : (
                                      <span className={`px-1 py-0.2 rounded text-[8.5px] font-extrabold truncate shrink-0 ${t.depositTo === 'Company Wallet' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-800'}`}>
                                        {accountLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 min-w-0">
                                    <span className="shrink-0">{formatDate(t.date)}</span>
                                    <span>•</span>
                                    <span className="truncate">{t.description || '-'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-1 font-black text-emerald-700 text-right whitespace-nowrap align-middle text-[11px]">
                                {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-1 text-center align-middle">
                                <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md inline-block text-center shadow-2xs ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {t.status || 'Done'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {filteredCreditTxns.length > 0 && (
                        <tfoot className="bg-emerald-50/90 font-bold text-xs text-emerald-950 border-t-2 border-emerald-200 sticky bottom-0 z-10 shadow-xs">
                          <tr>
                            <td colSpan="2" className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold text-[11px] text-emerald-950">
                              {creditTableFooterLabel}
                            </td>
                            <td className="py-2.5 px-2 text-right font-black text-emerald-700 text-xs whitespace-nowrap">
                              {settings.currency}{(filteredCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-1"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Table View & High-Contrast Print View */}
            <div className="hidden md:block overflow-x-auto print:block bg-white rounded-2xl border border-emerald-200/80 shadow-2xs">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-emerald-100/70 text-emerald-950 border-b border-emerald-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Date</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Type</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">User Name</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Account / Deposit To</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Status</th>
                    <th className="py-3 px-4 font-bold text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredCreditTxns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-slate-300">
                        No credit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCreditTxns.map((t, index) => {
                      const isDone = (t.status || 'Done') === 'Done';
                      const accountLabel = t.depositTo === 'Company Wallet' ? 'Company Wallet' : 'My Hand';
                      return (
                        <tr
                          key={t.id || index}
                          className={`transition ${
                            t.isAllocation
                              ? 'bg-amber-50/90 hover:bg-amber-100/70 border-l-4 border-l-amber-500 print:bg-white print:border-l-0'
                              : 'hover:bg-emerald-50/40 print:bg-white'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{index + 1}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{formatDate(t.date)}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-extrabold print:text-[11px]">
                              Credit
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-950 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{t.userName}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs ${
                              t.depositTo === 'Company Wallet'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {accountLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:max-w-none print:whitespace-normal print:break-words">
                            {t.isAllocation && (
                              <span className="mr-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs border border-amber-600 print:bg-none print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold">
                                <span className="print:hidden">🏢 </span>Company Allocation
                              </span>
                            )}
                            {t.description || '-'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-right text-emerald-700 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:font-black">
                            {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="hidden print:inline-block text-black font-extrabold text-[11px] uppercase print:border-none print:p-0">
                              {t.status || 'Done'}
                            </span>
                            {t.isAllocation ? (
                              <span className="print:hidden text-xs font-bold px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                Done
                              </span>
                            ) : (
                              <select
                                value={t.status || 'Done'}
                                onChange={(e) => handleStatusChange(t, e.target.value)}
                                className={`print:hidden text-xs font-bold px-3 py-1 rounded-xl cursor-pointer focus:outline-none transition ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                <option value="Done">Done</option>
                                <option value="Due">Due</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap print:hidden">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button onClick={() => handleOpenEditModal(t)} className="p-1 text-slate-400 hover:text-slate-700" title="Edit Entry">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleDelete(t.id)} className="p-1 text-rose-400 hover:text-rose-600" title="Delete Entry">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredCreditTxns.length > 0 && (
                  <tfoot className="bg-emerald-50/70 font-bold text-xs text-emerald-950 border-t-2 border-emerald-200 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                    <tr>
                      <td colSpan="6" className="py-3 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black print:font-black">
                        {creditTableFooterLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm print:py-2 print:px-2 print:border print:border-black print:text-black print:font-black">
                        {settings.currency}{filteredCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan="2" className="print:border print:border-black"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟠 DEBIT FILTER MODAL                                    */}
      {/* ======================================================== */}
      {isDebitFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center border border-amber-300">
                  <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Debit Entries</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine debit expenses by status, amount & date</p>
                </div>
              </div>

              <button
                onClick={() => setIsDebitFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={debitStatus}
                  onChange={(e) => setDebitStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Done">Done</option>
                  <option value="Due">Due</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <DateInput
                    value={debitStartDate}
                    max={debitEndDate || undefined}
                    onChange={(e) => setDebitStartDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <DateInput
                    value={debitEndDate}
                    min={debitStartDate || undefined}
                    onChange={(e) => setDebitEndDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Min Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={debitMinAmt}
                    onChange={(e) => setDebitMinAmt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Max Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={debitMaxAmt}
                    onChange={(e) => setDebitMaxAmt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { resetDebitFilters(); setIsDebitFilterOpen(false); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setIsDebitFilterOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#c69255] hover:bg-[#b88548] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟢 CREDIT FILTER MODAL                                   */}
      {/* ======================================================== */}
      {isCreditFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-300">
                  <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter Credit Entries</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine credit records by account, status & date</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreditFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Account / Deposit To</label>
                  <select
                    value={creditDepositTo}
                    onChange={(e) => setCreditDepositTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Accounts</option>
                    <option value="My Hand">✋ My Hand</option>
                    <option value="Company Wallet">🏢 Company Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={creditStatus}
                    onChange={(e) => setCreditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Done">Done</option>
                    <option value="Due">Due</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <DateInput
                    value={creditStartDate}
                    max={creditEndDate || undefined}
                    onChange={(e) => setCreditStartDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <DateInput
                    value={creditEndDate}
                    min={creditStartDate || undefined}
                    onChange={(e) => setCreditEndDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Min Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={creditMinAmt}
                    onChange={(e) => setCreditMinAmt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Max Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={creditMaxAmt}
                    onChange={(e) => setCreditMaxAmt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => { resetCreditFilters(); setIsCreditFilterOpen(false); }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setIsCreditFilterOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📝 ADD / EDIT ENTRY MODAL                                 */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-extrabold text-[#002B49] mb-4">
              {editingTxn ? 'Edit Transaction' : (watch('type') === 'Cash In' ? 'Add Credit Entry' : 'Add Debit Entry')}
            </h3>

            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entry Type</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase ${
                  watch('type') === 'Cash In' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {watch('type') === 'Cash In' ? 'Credit (Deposit / Cash In)' : 'Debit (Expense / Cash Out)'}
                </span>
                <input type="hidden" {...register('type')} />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">User / Account Holder</label>
                <select
                  {...register('userName')}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                >
                  {watch('type') !== 'Cash In' && (
                    <option value="Shukan Company">🏢 Shukan Company</option>
                  )}
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Amount ({settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', { required: 'Amount is required', min: 1 })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              {watch('type') === 'Cash In' && (
                <div>
                  <label className="block text-xs font-bold text-[#002B49] mb-1">Deposit To</label>
                  <select
                    {...register('depositTo')}
                    defaultValue="My Hand"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-white focus:outline-none font-semibold"
                  >
                    <option value="My Hand">My Hand</option>
                    <option value="Company Wallet">Company Wallet</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Date</label>
                <DateInput
                  value={watch('date')}
                  {...register('date', { required: 'Date is required' })}
                  className="w-full pl-4 pr-9 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none"
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#002B49] mb-1">Status</label>
                <select
                  {...register('status')}
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
                  placeholder="Describe details..."
                  {...register('description', { required: 'Description is required' })}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                ></textarea>
                {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>}
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
                  {editingTxn ? 'Save Changes' : 'Submit Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ PRINT REPORT SELECTION MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-bold shadow-xs">
                  🖨️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Print Report Audit</h3>
                  <p className="text-xs text-slate-500 font-medium">Select report type to print or export as PDF</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {/* Option 1: All (Debit & Credit) */}
              <button
                onClick={() => handlePrintSelection('all')}
                className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition">
                    📄
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#002B49] group-hover:text-amber-600 transition">
                      All Audit Ledger (Both Debit & Credit)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Complete financial statement containing all records</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-amber-600 shrink-0 ml-2">➔</span>
              </button>

              {/* Option 2: Debit Only */}
              <button
                onClick={() => handlePrintSelection('debit')}
                className="w-full p-3.5 rounded-2xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-700 text-white flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition">
                    🧾
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-rose-950 group-hover:text-rose-700 transition">
                      Debit Statement Only (Cash Out)
                    </h4>
                    <p className="text-[11px] text-rose-800/80 font-medium">All company expense entries & payments made</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-400 group-hover:text-rose-700 shrink-0 ml-2">➔</span>
              </button>

              {/* Option 3: Credit Only */}
              <button
                onClick={() => handlePrintSelection('credit')}
                className="w-full p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 text-left transition flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition">
                    💰
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 group-hover:text-emerald-700 transition">
                      Credit Statement Only (Cash In)
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 font-medium">All money deposits & company allocations</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-700 shrink-0 ml-2">➔</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="pt-1 text-center">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Action Modal Pop-up (Click Any Row on Mobile) */}
      {selectedTxnForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-fadeIn">
          <div className="bg-white w-full max-w-md p-5 sm:p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            {/* Top Close Button & Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                  selectedTxnForAction.isAllocation
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : selectedTxnForAction.type === 'Cash In' || selectedTxnForAction.type === 'Credit'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {selectedTxnForAction.isAllocation ? '🏢 Company Allocation' : selectedTxnForAction.type === 'Cash In' || selectedTxnForAction.type === 'Credit' ? '💰 Cash In (Credit)' : '🧾 Cash Out (Debit)'}
                </span>
              </div>
              <button
                onClick={() => setSelectedTxnForAction(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Entry Details Card */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User / Party</span>
                  <span className="text-base font-extrabold text-[#002B49]">{selectedTxnForAction.userName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                  <span className="text-xs font-bold text-slate-700">{formatDate(selectedTxnForAction.date)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account / Deposit To</span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedTxnForAction.depositTo || (selectedTxnForAction.isAllocation ? 'My Hand' : 'My Hand')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount</span>
                  <span className={`text-lg font-black ${
                    selectedTxnForAction.type === 'Cash In' || selectedTxnForAction.type === 'Credit' ? 'text-emerald-700' : 'text-rose-950'
                  }`}>
                    {settings.currency}{(parseFloat(selectedTxnForAction.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedTxnForAction.description && (
                <div className="pt-2 border-t border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Description / Notes</span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/60">
                    {selectedTxnForAction.description}
                  </p>
                </div>
              )}
            </div>

            {/* Status Change Buttons (Done / Due) */}
            {!selectedTxnForAction.isAllocation && (
              <div>
                <label className="block text-xs font-extrabold text-[#002B49] uppercase tracking-wider mb-1.5">Change Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTxnForAction, 'Done');
                      setSelectedTxnForAction(prev => prev ? { ...prev, status: 'Done' } : null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer border flex items-center justify-center space-x-1.5 ${
                      (selectedTxnForAction.status || 'Done') === 'Done'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span>✓ Done (Paid)</span>
                  </button>
                  <button
                    onClick={() => {
                      handleStatusChange(selectedTxnForAction, 'Due');
                      setSelectedTxnForAction(prev => prev ? { ...prev, status: 'Due' } : null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer border flex items-center justify-center space-x-1.5 ${
                      (selectedTxnForAction.status || 'Done') === 'Due'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    <span>⏳ Due (Pending)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons: Edit & Delete */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const txnToEdit = selectedTxnForAction;
                  setSelectedTxnForAction(null);
                  handleOpenEditModal(txnToEdit);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                <span>Edit Record</span>
              </button>

              <button
                onClick={() => {
                  const idToDelete = selectedTxnForAction.id;
                  const isAlloc = selectedTxnForAction.isAllocation;
                  setSelectedTxnForAction(null);
                  handleDelete(idToDelete, isAlloc);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedTxnForAction(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditDebit;
