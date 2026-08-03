import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const MyCreditDebit = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    transactions,
    allocationsHistory,
    settings,
    addTransaction,
    updateTransaction,
    addVaultDeposit
  } = useExpense();

  // Tab & Print View State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'debit' | 'credit'
  const [printTarget, setPrintTarget] = useState('all'); // 'all' | 'debit' | 'credit'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTxnType, setModalTxnType] = useState('Cash Out');

  // Independent Debit Filter State
  const [debitSearch, setDebitSearch] = useState('');
  const [debitStatus, setDebitStatus] = useState(
    location.state?.typeFilter === 'Debit' ? (location.state?.statusFilter || 'All') : 'All'
  );
  const [debitStartDate, setDebitStartDate] = useState('');
  const [debitEndDate, setDebitEndDate] = useState('');
  const [debitMinAmt, setDebitMinAmt] = useState('');
  const [debitMaxAmt, setDebitMaxAmt] = useState('');
  const [isDebitFilterOpen, setIsDebitFilterOpen] = useState(false);

  // Independent Credit Filter State
  const [creditSearch, setCreditSearch] = useState('');
  const [creditDepositTo, setCreditDepositTo] = useState(
    location.state?.depositToFilter || location.state?.selectedDepositTo || 'All'
  );
  const [creditStatus, setCreditStatus] = useState(
    location.state?.typeFilter === 'Credit' ? (location.state?.statusFilter || 'All') : 'All'
  );
  const [creditStartDate, setCreditStartDate] = useState('');
  const [creditEndDate, setCreditEndDate] = useState('');
  const [creditMinAmt, setCreditMinAmt] = useState('');
  const [creditMaxAmt, setCreditMaxAmt] = useState('');
  const [isCreditFilterOpen, setIsCreditFilterOpen] = useState(false);

  // Handle location state changes
  useEffect(() => {
    const typeFromState = location.state?.typeFilter || location.state?.selectedType;
    const statusFromState = location.state?.statusFilter || location.state?.selectedStatus;
    const depositToFromState = location.state?.depositToFilter || location.state?.selectedDepositTo;

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
  }, [location.state, location.key]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();

  // All transactions belonging to logged in user
  const myTransactions = useMemo(() => {
    return transactions.filter(t => t.userName === user?.name);
  }, [transactions, user?.name]);

  // Extract user allocations from allocationsHistory
  const myAllocations = useMemo(() => {
    return (allocationsHistory || []).filter(a => a.userName === user?.name);
  }, [allocationsHistory, user?.name]);

  // Separate raw arrays
  const rawDebitTxns = useMemo(() => {
    return myTransactions.filter(t => t.type !== 'Cash In' && t.type !== 'Credit');
  }, [myTransactions]);

  const rawCreditTxns = useMemo(() => {
    const directCredits = myTransactions.filter(t => t.type === 'Cash In' || t.type === 'Credit');
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
  }, [myTransactions, myAllocations]);

  // Filtered Debit Transactions
  const filteredDebitTxns = useMemo(() => {
    return rawDebitTxns.filter((t) => {
      if (debitSearch.trim()) {
        const query = debitSearch.toLowerCase();
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchDate = (t.date || '').includes(query) || formatDate(t.date).toLowerCase().includes(query);
        if (!matchId && !matchDesc && !matchDate) return false;
      }
      if (debitStatus !== 'All' && (t.status || 'Done') !== debitStatus) return false;
      if (debitStartDate && t.date < debitStartDate) return false;
      if (debitEndDate && t.date > debitEndDate) return false;

      const num = parseFloat(t.amount) || 0;
      if (debitMinAmt && parseFloat(debitMinAmt) > 0 && num < parseFloat(debitMinAmt)) return false;
      if (debitMaxAmt && parseFloat(debitMaxAmt) > 0 && num > parseFloat(debitMaxAmt)) return false;

      return true;
    });
  }, [rawDebitTxns, debitSearch, debitStatus, debitStartDate, debitEndDate, debitMinAmt, debitMaxAmt]);

  // Filtered Credit Transactions
  const filteredCreditTxns = useMemo(() => {
    return rawCreditTxns.filter((t) => {
      if (creditSearch.trim()) {
        const query = creditSearch.toLowerCase();
        const matchId = (t.id || '').toLowerCase().includes(query);
        const matchDesc = (t.description || '').toLowerCase().includes(query);
        const matchDate = (t.date || '').includes(query) || formatDate(t.date).toLowerCase().includes(query);
        if (!matchId && !matchDesc && !matchDate) return false;
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
  }, [rawCreditTxns, creditSearch, creditDepositTo, creditStatus, creditStartDate, creditEndDate, creditMinAmt, creditMaxAmt]);

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
    setModalTxnType(defaultType);
    reset({
      type: defaultType,
      amount: '',
      depositTo: defaultType === 'Cash In' ? 'My Hand' : 'My Hand',
      date: new Date().toISOString().split('T')[0],
      status: 'Done',
      description: ''
    });
    setIsModalOpen(true);
  };

  const onSubmitForm = (data) => {
    const finalType = data.type || modalTxnType || 'Cash Out';
    const finalDepositTo = finalType === 'Cash In' ? (data.depositTo || 'My Hand') : 'My Hand';

    const newTxn = {
      ...data,
      type: finalType,
      depositTo: finalDepositTo,
      status: data.status || 'Done',
      userName: user?.name || 'Partner',
      createdBy: user?.name || 'Partner'
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
        userName: user?.name || 'Partner',
        notes: `Company Wallet Credit: ${data.description || 'Deposit to Vault'}`
      });
    }

    toast.success(`${finalType === 'Cash In' ? 'Credit' : 'Debit'} entry of ${settings.currency}${parseFloat(data.amount).toLocaleString()} recorded!`, { theme: 'light' });

    if (finalType === 'Cash In') resetCreditFilters();
    else resetDebitFilters();

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

  // Dedicated Print Handlers
  const triggerPrint = (target) => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-6 print:space-y-4 print:bg-white print:text-black">
      {/* High-Contrast Black & White Print Header */}
      <div className="hidden print:block text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-2xl font-black uppercase text-black tracking-wider">SHUKAN PACKAGING</h1>
        <h2 className="text-sm font-bold text-black uppercase mt-1">
          {user?.name ? `${user.name} - ` : ''}
          {printTarget === 'debit' ? 'My Debit Statement' : printTarget === 'credit' ? 'My Credit Statement' : 'My Debit & Credit Ledger'}
        </h2>
        <div className="text-xs font-semibold text-black mt-1 flex items-center justify-center space-x-3">
          <span>Date Printed: {formatDate(new Date())}</span>
          <span>| User: {user?.name}</span>
          {printTarget === 'debit' && debitStatus !== 'All' && <span>| Status: {debitStatus}</span>}
          {printTarget === 'credit' && creditStatus !== 'All' && <span>| Status: {creditStatus}</span>}
        </div>
      </div>

      {/* Main Page Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">My Debit & Credit</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Manage debit and credit ledgers with dedicated tables and filters</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 overflow-x-auto pb-1 md:pb-0">
          {/* Add Debit Button (First) */}
          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Debit
          </button>

          {/* Add Credit Button (Second) */}
          <button
            onClick={() => handleOpenAddModal('Cash In')}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Credit
          </button>

          {/* Print Report Button */}
          <button
            onClick={() => triggerPrint('all')}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#002B49] text-white hover:bg-[#001D33] text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
            title="Print Complete Statement"
          >
            <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>
      </div>

      {/* View Switcher Tabs (Debit First, Credit Second) */}
      <div className="flex items-center space-x-1 bg-slate-200/70 p-1.5 rounded-2xl w-max border border-slate-300/50 print:hidden">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-[#002B49] shadow-md'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Tables ({rawDebitTxns.length + rawCreditTxns.length})
        </button>
        <button
          onClick={() => setActiveTab('debit')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'debit'
              ? 'bg-[#c69255] text-white shadow-md'
              : 'text-slate-600 hover:text-[#c69255]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-300"></span>
          <span>Debit Table ({rawDebitTxns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('credit')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 cursor-pointer ${
            activeTab === 'credit'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Credit Table ({rawCreditTxns.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 🟠 SECTION 1: DEBIT TRANSACTIONS TABLE & FILTERS (FIRST)  */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'debit') && (
        <div className={`space-y-4 ${printTarget === 'credit' ? 'print:hidden' : ''}`}>
          {/* Section Header Card */}
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-[#c69255] space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 print:border-b-2 print:border-black pb-3 print:pb-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm print:hidden">
                  🧾
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#002B49] print:text-lg print:text-black print:font-black flex items-center gap-2">
                    Debit Transactions (Cash Out)
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-semibold">
                      {filteredDebitTxns.length} Entries
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium print:text-black print:font-semibold">Expenses and payments made</p>
                </div>
              </div>

              {/* Dedicated Debit Filter Trigger & Print Button */}
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  onClick={() => setIsDebitFilterOpen(true)}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    hasActiveDebitFilters
                      ? 'bg-[#c69255] text-white border-[#c69255] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filter Debit {hasActiveDebitFilters && <span className="ml-1 text-emerald-300 font-extrabold">●</span>}
                </button>

                <button
                  onClick={() => triggerPrint('debit')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#c69255] hover:bg-[#b88548] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center"
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
                  placeholder="Search debit entries (description, date, amount)..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
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
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                <div className="flex flex-wrap items-center gap-2 text-slate-800">
                  <span className="font-extrabold text-[#002B49]">Active Debit Filters:</span>
                  {debitStatus !== 'All' && (
                    <span className="px-2 py-0.5 rounded bg-[#002B49] text-white font-bold text-[11px]">
                      Status: {debitStatus}
                    </span>
                  )}
                  {(debitStartDate || debitEndDate) && (
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                      Date: {debitStartDate || 'Start'} to {debitEndDate || 'Today'}
                    </span>
                  )}
                  {(debitMinAmt || debitMaxAmt) && (
                    <span className="px-2 py-0.5 rounded bg-[#c69255] text-white font-bold text-[11px]">
                      Amount: {debitMinAmt ? `${settings.currency}${debitMinAmt}` : 'Min'} - {debitMaxAmt ? `${settings.currency}${debitMaxAmt}` : 'Max'}
                    </span>
                  )}
                </div>
                <button onClick={resetDebitFilters} className="text-[11px] font-bold text-rose-600 hover:underline">
                  Reset Debit Filters
                </button>
              </div>
            )}

            {/* Debit Summary Card (Interactive Single Combined Compact Card) */}
            <div className="pt-1 print:pt-0.5">
              <div
                onClick={() => setDebitStatus('All')}
                className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/90 border transition-all cursor-pointer shadow-2xs hover:shadow-md w-full sm:w-fit min-w-[210px] sm:min-w-[240px] max-w-[270px] print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                  debitStatus === 'All' && !hasActiveDebitFilters ? 'border-[#002B49] ring-2 ring-[#002B49]/15' : 'border-slate-200/90'
                }`}
                title="Click to show all debit transactions"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-[#002B49] print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide">{displayDebitTitle}</span>
                  <div className="flex items-center space-x-1.5">
                    {hasActiveDebitFilters && (
                      <span
                        onClick={(e) => { e.stopPropagation(); resetDebitFilters(); }}
                        className="text-[10px] font-extrabold text-rose-600 hover:underline print:hidden"
                      >
                        Show All ✕
                      </span>
                    )}
                    <div className="w-6 h-6 rounded-lg bg-[#002B49]/10 text-[#002B49] flex items-center justify-center text-xs font-black print:hidden">
                      🧾
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-[#002B49] print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight mt-0.5">
                    {settings.currency}{displayDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>

                  {/* Web View Interactive Pill Badges */}
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[10px] font-extrabold flex-wrap gap-y-1 print:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDebitStatus(debitStatus === 'Done' ? 'All' : 'Done'); }}
                      className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                        debitStatus === 'Done'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-100/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-200'
                      }`}
                      title="Click to filter Done expenses"
                    >
                      <span>Done:</span>
                      <span>{settings.currency}{displayDebitDone.toLocaleString('en-IN')}</span>
                    </button>
                    {displayDebitDue > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDebitStatus(debitStatus === 'Due' ? 'All' : 'Due'); }}
                        className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                          debitStatus === 'Due'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
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
                    Done: {settings.currency}{displayDebitDone.toLocaleString('en-IN')}  •  Due: {settings.currency}{displayDebitDue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Debit Table (Desktop & Mobile) */}
          <div className="glass-card p-3.5 sm:p-5 rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-transparent">
            {/* Mobile View */}
            <div className="block md:hidden space-y-3 print:hidden">
              {filteredDebitTxns.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No debit entries match your filter.
                </div>
              ) : (
                filteredDebitTxns.map((t, index) => {
                  const isDone = (t.status || 'Done') === 'Done';
                  return (
                    <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900">
                            Debit
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDate(t.date)}</span>
                      </div>

                      <div className="text-xs text-slate-600 font-medium line-clamp-2">
                        {t.description || '-'}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-sm font-extrabold text-[#002B49]">
                          {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        <select
                          value={t.status || 'Done'}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer focus:outline-none transition ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <option value="Done">Done</option>
                          <option value="Due">Due</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View & High-Contrast Print View */}
            <div className="hidden md:block overflow-x-auto print:block">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-amber-50/80 text-amber-900 border-b border-amber-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Date</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Type</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredDebitTxns.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-slate-300">
                        No debit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDebitTxns.map((t, index) => {
                      const isDone = (t.status || 'Done') === 'Done';
                      return (
                        <tr key={t.id || index} className="hover:bg-amber-50/30 transition print:bg-white">
                          <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{index + 1}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{formatDate(t.date)}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-extrabold print:text-[11px]">
                              Debit
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:max-w-none print:whitespace-normal print:break-words">{t.description || '-'}</td>
                          <td className="py-3.5 px-4 font-black text-right text-[#002B49] whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black print:font-black">
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredDebitTxns.length > 0 && (
                  <tfoot className="bg-amber-50/50 font-bold text-xs text-amber-900 border-t-2 border-amber-200 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                    <tr>
                      <td colSpan="4" className="py-3 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black print:font-black">
                        {hasActiveDebitFilters ? 'Total Filtered Debit:' : 'Total Debit:'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#002B49] text-sm print:py-2 print:px-2 print:border print:border-black print:text-black print:font-black">
                        {settings.currency}{filteredDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="print:border print:border-black"></td>
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
      {(activeTab === 'all' || activeTab === 'credit') && (
        <div className={`space-y-4 ${printTarget === 'debit' ? 'print:hidden' : ''}`}>
          {/* Section Header Card */}
          <div className="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500 space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 print:border-b-2 print:border-black pb-3 print:pb-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm print:hidden">
                  💰
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#002B49] print:text-lg print:text-black print:font-black flex items-center gap-2">
                    Credit Transactions (Cash In)
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-semibold">
                      {filteredCreditTxns.length} Entries
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium print:text-black print:font-semibold">Deposits to My Hand or Company Wallet</p>
                </div>
              </div>

              {/* Dedicated Credit Filter Trigger & Print Button */}
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  onClick={() => setIsCreditFilterOpen(true)}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    hasActiveCreditFilters
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  placeholder="Search credit entries (description, date, amount)..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-slate-800 placeholder-slate-400 focus:outline-none"
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
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
                <div className="flex flex-wrap items-center gap-2 text-slate-800">
                  <span className="font-extrabold text-emerald-900">Active Credit Filters:</span>
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
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                      Date: {creditStartDate || 'Start'} to {creditEndDate || 'Today'}
                    </span>
                  )}
                  {(creditMinAmt || creditMaxAmt) && (
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[11px]">
                      Amount: {creditMinAmt ? `${settings.currency}${creditMinAmt}` : 'Min'} - {creditMaxAmt ? `${settings.currency}${creditMaxAmt}` : 'Max'}
                    </span>
                  )}
                </div>
                <button onClick={resetCreditFilters} className="text-[11px] font-bold text-rose-600 hover:underline">
                  Reset Credit Filters
                </button>
              </div>
            )}

            {/* Credit Summary Cards (Print High-Contrast Black & White Compact) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 print:gap-1.5 print:pt-1">
              {/* Total Credit Card */}
              <div
                onClick={() => { setCreditDepositTo('All'); setCreditStatus('All'); }}
                className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                  creditDepositTo === 'All' && creditStatus === 'All' ? 'border-emerald-600 ring-2 ring-emerald-500/15' : 'border-emerald-200/90'
                }`}
                title="Click to show all credit transactions"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-emerald-800 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide">{displayCreditTotalTitle}</span>
                  <div className="flex items-center space-x-1.5">
                    {hasActiveCreditFilters && (
                      <span
                        onClick={(e) => { e.stopPropagation(); resetCreditFilters(); }}
                        className="text-[10px] font-extrabold text-rose-600 hover:underline print:hidden"
                      >
                        Show All ✕
                      </span>
                    )}
                    <div className="w-6 h-6 rounded-lg bg-emerald-200/80 text-emerald-800 flex items-center justify-center text-xs font-black print:hidden">
                      💰
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-emerald-700 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight mt-0.5">
                    {settings.currency}{displayCreditTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[10px] font-extrabold flex-wrap gap-y-1 print:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('All'); setCreditStatus(creditStatus === 'Done' ? 'All' : 'Done'); }}
                      className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                        creditDepositTo === 'All' && creditStatus === 'Done'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                          : 'bg-emerald-100/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-200'
                      }`}
                    >
                      <span>Done:</span>
                      <span>{settings.currency}{displayCreditDone.toLocaleString('en-IN')}</span>
                    </button>
                    {displayCreditDue > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCreditDepositTo('All'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                        className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                          creditDepositTo === 'All' && creditStatus === 'Due'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
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
                    Done: {settings.currency}{displayCreditDone.toLocaleString('en-IN')}  •  Due: {settings.currency}{displayCreditDue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* My Hand Card */}
              <div
                onClick={() => { setCreditDepositTo(creditDepositTo === 'My Hand' && creditStatus === 'All' ? 'All' : 'My Hand'); setCreditStatus('All'); }}
                className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                  creditDepositTo === 'My Hand' ? 'border-blue-600 ring-2 ring-blue-500/15' : 'border-blue-200/90'
                }`}
                title="Click to filter My Hand transactions"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-blue-900 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide">My Hand</span>
                  <div className="w-6 h-6 rounded-lg bg-blue-200/80 text-blue-800 flex items-center justify-center text-xs font-black print:hidden">
                    ✋
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-blue-800 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight mt-0.5">
                    {settings.currency}{(hasActiveCreditFilters && creditDepositTo === 'My Hand' ? filteredCreditTotal : creditSummary.myHandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[10px] font-extrabold flex-wrap gap-y-1 print:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('My Hand'); setCreditStatus(creditStatus === 'Done' ? 'All' : 'Done'); }}
                      className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                        creditDepositTo === 'My Hand' && creditStatus === 'Done'
                          ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                          : 'bg-emerald-100/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-200'
                      }`}
                    >
                      <span>Done:</span>
                      <span>{settings.currency}{creditSummary.myHandDone.toLocaleString('en-IN')}</span>
                    </button>
                    {creditSummary.myHandDue > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCreditDepositTo('My Hand'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                        className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                          creditDepositTo === 'My Hand' && creditStatus === 'Due'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
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
                    Done: {settings.currency}{creditSummary.myHandDone.toLocaleString('en-IN')}  •  Due: {settings.currency}{creditSummary.myHandDue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Company Wallet Card */}
              <div
                onClick={() => { setCreditDepositTo(creditDepositTo === 'Company Wallet' && creditStatus === 'All' ? 'All' : 'Company Wallet'); setCreditStatus('All'); }}
                className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/60 border transition-all cursor-pointer shadow-2xs hover:shadow-md print:p-1.5 print:rounded-lg print:border-2 print:border-black print:bg-white print:text-black print:shadow-none print:ring-0 ${
                  creditDepositTo === 'Company Wallet' ? 'border-purple-600 ring-2 ring-purple-500/15' : 'border-purple-200/90'
                }`}
                title="Click to filter Company Wallet transactions"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-purple-900 print:text-[9.5px] print:font-black print:text-black print:tracking-wider tracking-wide">Co. Wallet</span>
                  <div className="w-6 h-6 rounded-lg bg-purple-200/80 text-purple-800 flex items-center justify-center text-xs font-black print:hidden">
                    🏢
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-black text-purple-800 print:text-base print:font-black print:text-black print:leading-tight print:my-0.5 tracking-tight mt-0.5">
                    {settings.currency}{(hasActiveCreditFilters && creditDepositTo === 'Company Wallet' ? filteredCreditTotal : creditSummary.walletTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1.5 text-[10px] font-extrabold flex-wrap gap-y-1 print:hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCreditDepositTo('Company Wallet'); setCreditStatus(creditStatus === 'Done' ? 'All' : 'Done'); }}
                      className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                        creditDepositTo === 'Company Wallet' && creditStatus === 'Done'
                          ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                          : 'bg-purple-100/90 text-purple-900 border-purple-200/80 hover:bg-purple-200'
                      }`}
                    >
                      <span>Done:</span>
                      <span>{settings.currency}{creditSummary.walletDone.toLocaleString('en-IN')}</span>
                    </button>
                    {creditSummary.walletDue > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCreditDepositTo('Company Wallet'); setCreditStatus(creditStatus === 'Due' ? 'All' : 'Due'); }}
                        className={`px-2 py-0.5 rounded-md border transition cursor-pointer flex items-center space-x-1 ${
                          creditDepositTo === 'Company Wallet' && creditStatus === 'Due'
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
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
          </div>

          {/* Credit Table (Desktop & Mobile) */}
          <div className="glass-card p-3.5 sm:p-5 rounded-2xl print:p-0 print:border-none print:shadow-none print:bg-transparent">
            {/* Mobile View */}
            <div className="block md:hidden space-y-3 print:hidden">
              {filteredCreditTxns.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
                  No credit entries match your filter.
                </div>
              ) : (
                filteredCreditTxns.map((t, index) => {
                  const isDone = (t.status || 'Done') === 'Done';
                  const accountLabel = t.depositTo === 'Company Wallet' ? '🏢 Company Wallet' : '✋ My Hand';
                  return (
                    <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                            Credit
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${t.depositTo === 'Company Wallet' ? 'bg-purple-100 text-purple-800' : 'bg-blue-50 text-blue-800'}`}>
                            {accountLabel}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-semibold">{formatDate(t.date)}</span>
                      </div>

                      <div className="text-xs text-slate-600 font-medium line-clamp-2">
                        {t.description || '-'}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-sm font-extrabold text-emerald-700">
                          {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        <select
                          value={t.status || 'Done'}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl cursor-pointer focus:outline-none transition ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <option value="Done">Done</option>
                          <option value="Due">Due</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View & High-Contrast Print View */}
            <div className="hidden md:block overflow-x-auto print:block">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-emerald-50/80 text-emerald-900 border-b border-emerald-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Date</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Type</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Account / Deposit To</th>
                    <th className="py-3 px-4 font-bold print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-2 print:px-2 print:border print:border-slate-400 print:font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredCreditTxns.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-slate-300">
                        No credit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCreditTxns.map((t, index) => {
                      const isDone = (t.status || 'Done') === 'Done';
                      const accountLabel = t.depositTo === 'Company Wallet' ? 'Company Wallet' : 'My Hand';
                      return (
                        <tr key={t.id || index} className="hover:bg-emerald-50/40 transition print:bg-white">
                          <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{index + 1}</td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300 print:text-black">{formatDate(t.date)}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap print:py-2 print:px-2 print:border print:border-slate-300">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-extrabold print:text-[11px]">
                              Credit
                            </span>
                          </td>
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
                              <span className="mr-1.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 print:bg-transparent print:border-none print:p-0 print:text-black">
                                Company Allocation
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredCreditTxns.length > 0 && (
                  <tfoot className="bg-emerald-50/50 font-bold text-xs text-emerald-900 border-t-2 border-emerald-200 print:bg-slate-100 print:text-black print:border-t-2 print:border-black">
                    <tr>
                      <td colSpan="5" className="py-3 px-4 text-right uppercase tracking-wider print:py-2 print:px-2 print:border print:border-black print:font-black">
                        {hasActiveCreditFilters ? 'Total Filtered Credit:' : 'Total Credit:'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm print:py-2 print:px-2 print:border print:border-black print:text-black print:font-black">
                        {settings.currency}{filteredCreditTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="print:border print:border-black"></td>
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
      {/* 📝 ADD ENTRY MODAL                                        */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
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
              {watch('type') === 'Cash In' ? 'Add Credit Entry' : 'Add Debit Entry'}
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
                  Submit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCreditDebit;
