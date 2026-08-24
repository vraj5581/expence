import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExpense } from '../context/ExpenseContext';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const CreditDebit = ({ isMyView = false }) => {
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
  const [selectedUser, setSelectedUser] = useState(() => {
    if (isMyView && user?.name) return user.name;
    return 'All';
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGlobalFilterOpen, setIsGlobalFilterOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [modalTxnType, setModalTxnType] = useState('Cash Out');
  const [selectedTxnForAction, setSelectedTxnForAction] = useState(null);

  // Dynamic PDF Filename Generator
  const getDynamicPdfTitle = (target = 'all') => {
    let userNamePart = '';
    if (selectedUser && selectedUser !== 'All') {
      const cleanUser = selectedUser.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      userNamePart = `_${cleanUser}`;
    }

    let startDate = '';
    let endDate = '';

    if (target === 'debit') {
      startDate = debitStartDate;
      endDate = debitEndDate;
    } else if (target === 'credit') {
      startDate = creditStartDate;
      endDate = creditEndDate;
    } else {
      startDate = debitStartDate || creditStartDate;
      endDate = debitEndDate || creditEndDate;
    }

    let datePart = '_ALL';
    if (startDate || endDate) {
      const s = startDate ? formatDate(startDate).replace(/\//g, '-') : 'START';
      const e = endDate ? formatDate(endDate).replace(/\//g, '-') : 'END';
      datePart = `_${s}_TO_${e}`;
    }

    return `Shukan${userNamePart}_Transaction_Report${datePart}`;
  };

  // Dedicated Print Handlers
  const triggerPrint = (target) => {
    setPrintTarget(target);
    const originalTitle = document.title;
    const pdfTitle = getDynamicPdfTitle(target);
    document.title = pdfTitle;

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 250);
  };

  const handlePrintSelection = (target) => {
    setIsPrintModalOpen(false);
    triggerPrint(target);
  };

  // Direct WhatsApp Report Sharing Generator (No download required)
  const generateWhatsAppMessage = (target = 'all') => {
    const isAll = target === 'all';
    const isDebit = target === 'debit';
    const isCredit = target === 'credit';

    const companyName = settings.companyName || 'Shukan Packaging';
    const reportTitle = isDebit
      ? 'DEBIT STATEMENT REPORT (Cash Out)'
      : isCredit
        ? 'CREDIT STATEMENT REPORT (Cash In)'
        : 'DEBIT & CREDIT AUDIT LEDGER';

    const userLabel = selectedUser !== 'All' ? selectedUser : 'All Users';
    const dateStr = formatDate(new Date());

    let lines = [];
    lines.push(`🏢 *${companyName.toUpperCase()}*`);
    lines.push(`📋 *${reportTitle}*`);
    lines.push(`📅 *Report Date:* ${dateStr}`);
    lines.push(``);

    // Explicit Applied Filters Block
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🔍 *APPLIED FILTERS:*`);
    const activeFiltersList = [];

    if (selectedUser !== 'All') {
      activeFiltersList.push(`• *User/Party:* ${selectedUser}`);
    }

    if (isDebit || isAll) {
      if (debitStatus !== 'All') activeFiltersList.push(`• *Debit Status:* ${debitStatus}`);
      if (debitStartDate || debitEndDate) {
        const s = debitStartDate ? formatDate(debitStartDate) : 'Start';
        const e = debitEndDate ? formatDate(debitEndDate) : 'Today';
        activeFiltersList.push(`• *Debit Date:* ${s} to ${e}`);
      }
      if (debitMinAmt || debitMaxAmt) {
        const min = debitMinAmt ? `${settings.currency}${debitMinAmt}` : '0';
        const max = debitMaxAmt ? `${settings.currency}${debitMaxAmt}` : 'Max';
        activeFiltersList.push(`• *Debit Amount:* ${min} - ${max}`);
      }
      if (debitSearch.trim()) activeFiltersList.push(`• *Debit Search:* "${debitSearch.trim()}"`);
    }

    if (isCredit || isAll) {
      if (creditDepositTo !== 'All') activeFiltersList.push(`• *Deposit Account:* ${creditDepositTo}`);
      if (creditStatus !== 'All') activeFiltersList.push(`• *Credit Status:* ${creditStatus}`);
      if (creditStartDate || creditEndDate) {
        const s = creditStartDate ? formatDate(creditStartDate) : 'Start';
        const e = creditEndDate ? formatDate(creditEndDate) : 'Today';
        activeFiltersList.push(`• *Credit Date:* ${s} to ${e}`);
      }
      if (creditMinAmt || creditMaxAmt) {
        const min = creditMinAmt ? `${settings.currency}${creditMinAmt}` : '0';
        const max = creditMaxAmt ? `${settings.currency}${creditMaxAmt}` : 'Max';
        activeFiltersList.push(`• *Credit Amount:* ${min} - ${max}`);
      }
      if (creditSearch.trim()) activeFiltersList.push(`• *Credit Search:* "${creditSearch.trim()}"`);
    }

    if (activeFiltersList.length === 0) {
      lines.push(`• *Filters:* None (All Ledger Entries)`);
    } else {
      activeFiltersList.forEach(f => lines.push(f));
    }
    lines.push(``);

    // Calculate exact filtered metrics
    const debitDoneVal = filteredDebitTxns
      .filter(t => (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const debitDueVal = filteredDebitTxns
      .filter(t => (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const debitTotalVal = debitDoneVal + debitDueVal;

    const creditDoneVal = filteredCreditTxns
      .filter(t => (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const creditDueVal = filteredCreditTxns
      .filter(t => (t.status || 'Done') === 'Due')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const creditTotalVal = creditDoneVal + creditDueVal;

    const myHandDoneVal = filteredCreditTxns
      .filter(t => (t.depositTo || 'My Hand') !== 'Company Wallet' && (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const walletDoneVal = filteredCreditTxns
      .filter(t => t.depositTo === 'Company Wallet' && (t.status || 'Done') === 'Done')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Dynamic Filter-aware labels (Person + Status/Account combined)
    let debitLabel = 'Total Debit';
    let creditLabel = 'Total Credit';
    const personName = selectedUser !== 'All' ? selectedUser : '';

    let debitStatusPart = debitStatus !== 'All' ? ` ${debitStatus}` : '';
    if (personName) {
      debitLabel = `${personName}'s Total${debitStatusPart} Debit`;
    } else {
      debitLabel = `Total${debitStatusPart} Debit`;
    }

    let creditAccountOrStatusPart = '';
    if (creditDepositTo !== 'All') {
      creditAccountOrStatusPart = creditDepositTo === 'Company Wallet' ? ' Co. Wallet' : ' In Hand';
    } else if (creditStatus !== 'All') {
      creditAccountOrStatusPart = ` ${creditStatus}`;
    }

    if (personName) {
      creditLabel = `${personName}'s Total${creditAccountOrStatusPart} Credit`;
    } else {
      creditLabel = `Total${creditAccountOrStatusPart} Credit`;
    }

    // Financial Summary Block (Filter-Aware & Sleek)
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📊 *FINANCIAL SUMMARY*`);

    if (isAll || isDebit) {
      if (debitDueVal > 0) {
        lines.push(`• *${debitLabel}:* ${settings.currency}${debitTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${filteredDebitTxns.length} entries | Done: ${settings.currency}${debitDoneVal.toLocaleString('en-IN')} | Due: ${settings.currency}${debitDueVal.toLocaleString('en-IN')})`);
      } else {
        lines.push(`• *${debitLabel}:* ${settings.currency}${debitTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${filteredDebitTxns.length} entries)`);
      }
    }

    if (isAll || isCredit) {
      const parts = [];
      if (myHandDoneVal > 0 && creditDepositTo !== 'Company Wallet') parts.push(`In Hand: ${settings.currency}${myHandDoneVal.toLocaleString('en-IN')}`);
      if (walletDoneVal > 0 && creditDepositTo !== 'My Hand') parts.push(`Co. Wallet: ${settings.currency}${walletDoneVal.toLocaleString('en-IN')}`);
      if (creditDueVal > 0) parts.push(`Due: ${settings.currency}${creditDueVal.toLocaleString('en-IN')}`);

      const breakdown = parts.length > 0 ? ` | ${parts.join(' • ')}` : '';
      lines.push(`• *${creditLabel}:* ${settings.currency}${creditTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${filteredCreditTxns.length} entries${breakdown})`);
    }

    if (isAll) {
      const availCash = Math.max(0, myHandDoneVal - debitDoneVal);
      const companyOwesMe = Math.max(0, debitDoneVal - myHandDoneVal);

      const targetPerson = personName ? personName : 'Staff';

      if (companyOwesMe > 0) {
        lines.push(`• *Net Position:* Company Owes ${targetPerson} ${settings.currency}${companyOwesMe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      } else if (availCash > 0) {
        lines.push(`• *Net Position:* ${personName ? `${personName} Has Cash In Hand` : 'Cash In Hand'} ${settings.currency}${availCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      } else {
        lines.push(`• *Net Position:* Settled (${settings.currency}0.00)`);
      }
    }

    // Detailed Itemized Entries Block
    if (isAll || isDebit) {
      if (filteredDebitTxns.length > 0) {
        lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`📝 *DEBIT ENTRIES (${filteredDebitTxns.length}):*`);
        lines.push(`─────────────────────────────`);
        filteredDebitTxns.slice(0, 35).forEach((t, i) => {
          const statusFlag = (t.status || 'Done') === 'Done' ? '✅ Done' : '⏳ Due';
          const desc = t.description ? ` - ${t.description}` : '';
          const dateStr = formatDate(t.date);
          lines.push(`${i + 1}. ${dateStr} | *${t.userName}*: ${settings.currency}${(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} [${statusFlag}]${desc}`);
          lines.push(`─────────────────────────────`);
        });
        if (filteredDebitTxns.length > 35) {
          lines.push(`_... and ${filteredDebitTxns.length - 35} more debit entries_`);
        }

        const debitFooterLabel = personName
          ? `TOTAL ${personName.toUpperCase()}${debitStatus !== 'All' ? ` ${debitStatus.toUpperCase()}` : ''} DEBIT`
          : `TOTAL ${debitStatus !== 'All' ? `${debitStatus.toUpperCase()} ` : ''}DEBIT`;

        lines.push(`📊 *${debitFooterLabel}:* ${settings.currency}${debitTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${filteredDebitTxns.length} Entries)`);
        lines.push(``);
      }
    }

    if (isAll || isCredit) {
      if (filteredCreditTxns.length > 0) {
        lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`📥 *CREDIT ENTRIES (${filteredCreditTxns.length}):*`);
        lines.push(`─────────────────────────────`);
        filteredCreditTxns.slice(0, 35).forEach((t, i) => {
          const statusFlag = (t.status || 'Done') === 'Done' ? '✅ Done' : '⏳ Due';
          const accLabel = t.depositTo === 'Company Wallet' ? 'Co. Wallet' : 'In Hand';
          const desc = t.description ? ` - ${t.description}` : '';
          const dateStr = formatDate(t.date);
          lines.push(`${i + 1}. ${dateStr} | *${t.userName}* (${accLabel}): ${settings.currency}${(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} [${statusFlag}]${desc}`);
          lines.push(`─────────────────────────────`);
        });
        if (filteredCreditTxns.length > 35) {
          lines.push(`_... and ${filteredCreditTxns.length - 35} more credit entries_`);
        }

        const creditAccPart = creditDepositTo !== 'All' ? ` ${creditDepositTo.toUpperCase()}` : '';
        const creditStatPart = creditStatus !== 'All' ? ` ${creditStatus.toUpperCase()}` : '';
        const creditFooterLabel = personName
          ? `TOTAL ${personName.toUpperCase()}${creditAccPart}${creditStatPart} CREDIT`
          : `TOTAL${creditAccPart}${creditStatPart} CREDIT`;

        lines.push(`📊 *${creditFooterLabel}:* ${settings.currency}${creditTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${filteredCreditTxns.length} Entries)`);
        lines.push(``);
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`_Generated via Shukan Expense ERP_`);

    return lines.join('\n');
  };

  const handleShareWhatsApp = (target = 'all') => {
    const textMessage = generateWhatsAppMessage(target);
    const encodedText = encodeURIComponent(textMessage);

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${settings.companyName || 'Shukan'} Transaction Report`,
        text: textMessage
      }).catch(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      });
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
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

  useEffect(() => {
    if (isMyView && user?.name) {
      setSelectedUser(user.name);
    }
  }, [isMyView, user?.name]);

  // Handle location state ONCE on initial navigation and clear history state so F5 refresh NEVER auto-filters
  useEffect(() => {
    if (location.state) {
      if (!isMyView && location.state.selectedUser !== undefined) {
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
      if (selectedUser !== 'All' && (t.userName || '').toLowerCase() !== selectedUser.toLowerCase()) return false;
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
      if (selectedUser !== 'All' && (t.userName || '').toLowerCase() !== selectedUser.toLowerCase()) return false;
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

  // Base Debit Transactions filtered by Selected User
  const userDebitTxns = useMemo(() => {
    if (selectedUser === 'All') return rawDebitTxns;
    return rawDebitTxns.filter((t) => (t.userName || '').toLowerCase() === selectedUser.toLowerCase());
  }, [rawDebitTxns, selectedUser]);

  // Base Credit Transactions filtered by Selected User
  const userCreditTxns = useMemo(() => {
    if (selectedUser === 'All') return rawCreditTxns;
    return rawCreditTxns.filter((t) => (t.userName || '').toLowerCase() === selectedUser.toLowerCase());
  }, [rawCreditTxns, selectedUser]);

  // Debit Summary Stats (User-wise when user selected, or global when All users selected)
  const debitSummary = useMemo(() => {
    let total = 0;
    let doneTotal = 0;
    let dueTotal = 0;

    userDebitTxns.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const isDone = (t.status || 'Done') === 'Done';
      total += amt;
      if (isDone) doneTotal += amt;
      else dueTotal += amt;
    });

    return { total, doneTotal, dueTotal };
  }, [userDebitTxns]);

  // Credit Summary Stats (User-wise when user selected, or global when All users selected)
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

    userCreditTxns.forEach(t => {
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
  }, [userCreditTxns]);

  // Filtered Debit Total for Table Footer (exact sum of displayed filtered rows)
  const filteredDebitTotal = useMemo(() => {
    return filteredDebitTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredDebitTxns]);

  // Filtered Credit Total for Table Footer (exact sum of displayed filtered rows)
  const filteredCreditTotal = useMemo(() => {
    return filteredCreditTxns.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  }, [filteredCreditTxns]);

  // Active filter checks
  const isUserFilterActive = !isMyView && selectedUser !== 'All';
  const hasActiveDebitFilters = Boolean(debitSearch || debitStatus !== 'All' || isUserFilterActive || debitStartDate || debitEndDate || debitMinAmt || debitMaxAmt);
  const hasActiveCreditFilters = Boolean(creditSearch || creditDepositTo !== 'All' || creditStatus !== 'All' || isUserFilterActive || creditStartDate || creditEndDate || creditMinAmt || creditMaxAmt);
  const hasAnyActiveFilters = Boolean(hasActiveDebitFilters || hasActiveCreditFilters);

  const debitTableFooterLabel = useMemo(() => {
    if (debitStatus === 'Due') return 'TOTAL DUE DEBIT:';
    if (debitStatus === 'Done') return 'TOTAL DONE DEBIT:';
    if (!isMyView && selectedUser !== 'All') return `TOTAL ${selectedUser.toUpperCase()} DEBIT:`;
    if (hasActiveDebitFilters) return 'TOTAL FILTERED DEBIT:';
    return 'TOTAL DEBIT:';
  }, [debitStatus, selectedUser, isMyView, hasActiveDebitFilters]);

  const creditTableFooterLabel = useMemo(() => {
    if (creditStatus === 'Due') return 'TOTAL DUE CREDIT:';
    if (creditStatus === 'Done') return 'TOTAL DONE CREDIT:';
    if (creditDepositTo !== 'All') return `TOTAL ${creditDepositTo.toUpperCase()} CREDIT:`;
    if (!isMyView && selectedUser !== 'All') return `TOTAL ${selectedUser.toUpperCase()} CREDIT:`;
    if (hasActiveCreditFilters) return 'TOTAL FILTERED CREDIT:';
    return 'TOTAL CREDIT:';
  }, [creditStatus, creditDepositTo, selectedUser, isMyView, hasActiveCreditFilters]);

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

  // Comprehensive Print Filter Labels (Shows active User, Status, Date range, Account, Search)
  const debitFilterSummaryText = useMemo(() => {
    const parts = [];

    if (selectedUser !== 'All') {
      parts.push(`USER: ${selectedUser.toUpperCase()}`);
    }

    if (debitStatus !== 'All') {
      parts.push(`STATUS: ${debitStatus.toUpperCase()}`);
    }

    if (debitStartDate || debitEndDate) {
      if (debitStartDate && debitEndDate) {
        parts.push(`DATE: ${formatDate(debitStartDate)} - ${formatDate(debitEndDate)}`);
      } else if (debitStartDate) {
        parts.push(`FROM: ${formatDate(debitStartDate)}`);
      } else if (debitEndDate) {
        parts.push(`TO: ${formatDate(debitEndDate)}`);
      }
    }

    if (debitSearch.trim()) {
      parts.push(`SEARCH: "${debitSearch.trim()}"`);
    }

    if (parts.length === 0) return 'ALL';
    return parts.join(' | ');
  }, [selectedUser, debitStatus, debitStartDate, debitEndDate, debitSearch]);

  const creditFilterSummaryText = useMemo(() => {
    const parts = [];

    if (selectedUser !== 'All') {
      parts.push(`USER: ${selectedUser.toUpperCase()}`);
    }

    if (creditDepositTo !== 'All') {
      const acc = creditDepositTo === 'Company Wallet' ? 'CO. WALLET' : 'MY HAND';
      parts.push(`ACCOUNT: ${acc}`);
    }

    if (creditStatus !== 'All') {
      parts.push(`STATUS: ${creditStatus.toUpperCase()}`);
    }

    if (creditStartDate || creditEndDate) {
      if (creditStartDate && creditEndDate) {
        parts.push(`DATE: ${formatDate(creditStartDate)} - ${formatDate(creditEndDate)}`);
      } else if (creditStartDate) {
        parts.push(`FROM: ${formatDate(creditStartDate)}`);
      } else if (creditEndDate) {
        parts.push(`TO: ${formatDate(creditEndDate)}`);
      }
    }

    if (creditSearch.trim()) {
      parts.push(`SEARCH: "${creditSearch.trim()}"`);
    }

    if (parts.length === 0) return 'ALL';
    return parts.join(' | ');
  }, [selectedUser, creditDepositTo, creditStatus, creditStartDate, creditEndDate, creditSearch]);

  const resetDebitFilters = () => {
    setDebitSearch('');
    setDebitStatus('All');
    setSelectedUser('All');
    setDebitStartDate('');
    setDebitEndDate('');
    setDebitMinAmt('');
    setDebitMaxAmt('');
  };

  const resetCreditFilters = () => {
    setCreditSearch('');
    setCreditDepositTo('All');
    setCreditStatus('All');
    setSelectedUser('All');
    setCreditStartDate('');
    setCreditEndDate('');
    setCreditMinAmt('');
    setCreditMaxAmt('');
  };

  // Form Submission
  const handleOpenAddModal = (defaultType = 'Cash Out') => {
    setEditingTxn(null);
    setModalTxnType(defaultType);
    let initialUser = isMyView ? (user?.name || '') : (selectedUser !== 'All' ? selectedUser : (user?.name || 'Shukan Company'));
    if (!isMyView && defaultType === 'Cash In' && (initialUser === 'Shukan Company' || initialUser === 'Shukan Packaging (Company)' || initialUser === 'Company Vault')) {
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
      userName: isMyView ? (user?.name || txn.userName) : txn.userName,
      date: txn.date,
      status: txn.status || 'Done',
      description: txn.description || ''
    });
    setIsModalOpen(true);
  };

  const normalizeToYYYYMMDD = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    if (typeof dateStr === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {}
    return new Date().toISOString().split('T')[0];
  };

  const onSubmitForm = async (data) => {
    try {
      const numAmount = parseFloat(data.amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('Please enter a valid amount greater than 0', { theme: 'light' });
        return;
      }
      if (!data.description || !data.description.trim()) {
        toast.error('Description / Notes is required', { theme: 'light' });
        return;
      }

      const formattedDate = normalizeToYYYYMMDD(data.date);

      if (editingTxn) {
        if (editingTxn.isAllocation) {
          const res = await updateAllocation(editingTxn.id, {
            amount: numAmount,
            notes: data.description,
            date: formattedDate,
            userName: data.userName || editingTxn.userName
          }, user?.name || 'Admin');
          if (res && res.success === false) {
            toast.error(res.message, { theme: 'light' });
            return;
          }
          toast.success(`Company Allocation updated successfully!`, { theme: 'light' });
        } else {
          const res = await updateTransaction(editingTxn.id, {
            ...data,
            amount: numAmount,
            date: formattedDate
          }, user?.name || 'Admin');
          if (res && res.success === false) {
            toast.error(res.message, { theme: 'light' });
            return;
          }
          toast.success(`Transaction ${editingTxn.id} updated successfully!`, { theme: 'light' });
        }
      } else {
        const finalType = data.type || modalTxnType || 'Cash Out';
        const finalDepositTo = finalType === 'Cash In' ? (data.depositTo || 'My Hand') : 'My Hand';

        let finalUserName = isMyView ? (user?.name || '') : (data.userName || (selectedUser !== 'All' ? selectedUser : (user?.name || 'Shukan Company')));
        if (!isMyView && finalType === 'Cash In' && (finalUserName === 'Shukan Company' || finalUserName === 'Shukan Packaging (Company)' || finalUserName === 'Company Vault')) {
          finalUserName = users.find(u => u.name !== 'Shukan Company')?.name || user?.name || '';
        }

        const newTxn = {
          ...data,
          amount: numAmount,
          date: formattedDate,
          type: finalType,
          depositTo: finalDepositTo,
          status: data.status || 'Done',
          userName: finalUserName,
          createdBy: user?.name || 'Admin'
        };

        const res = await addTransaction(newTxn);
        if (res && res.success === false) {
          toast.error(res.message, { theme: 'light' });
          return;
        }

        if (finalType === 'Cash In' && finalDepositTo === 'Company Wallet') {
          await addVaultDeposit({
            amount: numAmount,
            date: formattedDate,
            userName: newTxn.userName,
            notes: `Company Wallet Credit: ${data.description || 'Deposit to Vault'}`,
            txnId: res?.transaction?.id || res?.txn?.id,
            status: newTxn.status || 'Done'
          });
        }

        toast.success(`New ${finalType === 'Cash In' ? 'Credit' : 'Debit'} entry of ${settings.currency}${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} recorded!`, { theme: 'light' });

        if (finalType === 'Cash In') resetCreditFilters();
        else resetDebitFilters();
      }
      setIsModalOpen(false);
      reset();
    } catch (err) {
      console.error("Form submission error caught:", err);
      setIsModalOpen(false);
      reset();
    }
  };

  const handleStatusChange = async (txn, newStatus) => {
    if (txn.isAllocation) {
      toast.info('Company allocation status is fixed as Done', { theme: 'light' });
      return;
    }
    const res = await updateTransaction(txn.id, { ...txn, status: newStatus }, user?.name || 'Admin');
    if (res && res.success === false) {
      toast.error(res.message || 'Failed to update transaction status in PHP database', { theme: 'light' });
      return;
    }

    // Sync vault deposit status if linked to Company Wallet credit entry
    if (txn.type === 'Cash In' && txn.depositTo === 'Company Wallet') {
      const linkedDep = vaultDeposits.find(d => d.txnId === txn.id || (d.notes && d.notes.includes(txn.description)));
      if (linkedDep) {
        await updateVaultDeposit(linkedDep.id, { ...linkedDep, status: newStatus });
      }
    }

    if (newStatus === 'Done') {
      toast.success(`Transaction marked as Done`, { theme: 'light' });
    } else {
      toast.info(`Transaction marked as Due`, { theme: 'light' });
    }
  };

  const handleDelete = async (tOrId) => {
    const id = typeof tOrId === 'object' ? tOrId.id : tOrId;
    const isAlloc = typeof tOrId === 'object' ? tOrId.isAllocation : allocationsHistory.some(a => a.id === id);

    if (isAlloc) {
      if (window.confirm(`Delete Company Cash Allocation record ${id}?`)) {
        const res = await deleteAllocation(id);
        if (res && res.success) {
          toast.info(`Company allocation record removed.`, { theme: 'light' });
        } else {
          toast.error(res?.message || 'Failed to delete allocation from PHP database', { theme: 'light' });
        }
      }
    } else {
      if (window.confirm(`Delete transaction record ${id}?`)) {
        const res = await deleteTransaction(id);
        if (res && res.success) {
          toast.info(`Transaction removed.`, { theme: 'light' });
        } else {
          toast.error(res?.message || 'Failed to delete transaction from PHP database', { theme: 'light' });
        }
      }
    }
  };

  // Dedicated Print Handlers

  return (
    <>
      {/* 🖥️ SCREEN DASHBOARD VIEW (Hidden in Print Mode) */}
      <div className="space-y-6 screen-dashboard print:hidden">

      {/* Page Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#002B49] tracking-tight">
            {isMyView ? 'My Debit & Credit' : 'Debit & Credit'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isMyView ? `Personal debit and credit transaction audit log for ${user?.name}` : 'Company debit and credit transaction audit log'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap w-full sm:w-auto">
          {/* Add Debit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash Out')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Debit
          </button>

          {/* Add Credit Button */}
          <button
            onClick={() => handleOpenAddModal('Cash In')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Credit
          </button>

          {/* Global Filter Button */}
          <button
            onClick={() => setIsGlobalFilterOpen(true)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center px-2 sm:px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0 border ${
              hasAnyActiveFilters
                ? 'bg-amber-700 hover:bg-amber-800 text-white border-amber-700'
                : 'bg-white hover:bg-slate-50 text-[#002B49] border-slate-300'
            }`}
            title="Filter Ledger Entries"
          >
            <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0 ${hasAnyActiveFilters ? 'text-white' : 'text-[#002B49]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {hasAnyActiveFilters && (
              <span className="ml-1 text-emerald-400 font-black">●</span>
            )}
          </button>

          {/* Print Report Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-2 sm:px-3.5 py-2 rounded-xl bg-[#002B49] text-white hover:bg-[#001D33] text-xs font-bold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
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
        <div className={`p-1.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-rose-50/60 border border-rose-200/90 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent print:space-y-0 print:mb-4 ${activeTab !== 'all' && activeTab !== 'debit' ? 'hidden print:block' : ''} ${printTarget === 'credit' ? 'print:hidden' : ''}`}>
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 print:border-b-2 print:border-black pb-3 print:pb-1 print:mb-1.5 print-section-header">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center font-black text-sm shrink-0 print:hidden">
                🧾
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-rose-950 print:text-sm print:text-black print:font-black leading-tight uppercase">
                    Debit Transactions <span className="text-rose-900/80 font-bold text-xs sm:text-sm print:text-black print:font-semibold print:normal-case">(Cash Out)</span>
                  </h2>
                  <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold">
                    {filteredDebitTxns.length} Entries • Total Debit: {settings.currency}{(filteredDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-rose-800/80 font-medium print:text-black print:font-medium">Expenses and payments made</p>
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

          {/* Highlighted Active Debit Filter Banner */}
          {hasActiveDebitFilters && (
            <div className="p-3 rounded-2xl bg-amber-100/90 border-2 border-amber-400 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <div className="flex items-center space-x-1.5 font-black text-amber-950 text-xs tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                  <span>Active Debit Filters:</span>
                </div>
                {!isMyView && selectedUser !== 'All' && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    User: {selectedUser}
                  </span>
                )}
                {debitStatus !== 'All' && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-900 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Status: {debitStatus}
                  </span>
                )}
                {(debitStartDate || debitEndDate) && (
                  <span className="px-2.5 py-1 rounded-lg bg-white text-amber-950 font-extrabold text-[11px] border border-amber-300 shadow-2xs flex items-center">
                    Date: {debitStartDate ? formatDate(debitStartDate) : 'Start'} to {debitEndDate ? formatDate(debitEndDate) : 'Today'}
                  </span>
                )}
                {(debitMinAmt || debitMaxAmt) && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-800 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Amount: {debitMinAmt ? `${settings.currency}${debitMinAmt}` : 'Min'} - {debitMaxAmt ? `${settings.currency}${debitMaxAmt}` : 'Max'}
                  </span>
                )}
                {debitSearch && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Search: "{debitSearch}"
                  </span>
                )}
              </div>
              <button
                onClick={resetDebitFilters}
                className="px-3.5 py-1 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-[11px] transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                Reset Debit Filters
              </button>
            </div>
          )}

          {/* Debit Summary Card (Table Style matching Dashboard) */}
          <div className="pt-0.5 grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-4 print:hidden">
            <div className="h-full bg-rose-50/80 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200/90 border-t-3 sm:border-t-4 border-t-rose-500 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
              <div className="flex items-center justify-between border-b border-rose-200/60 pb-1 sm:pb-1.5">
                <div className="flex items-center space-x-1 sm:space-x-1.5 min-w-0">
                  <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-[9px] sm:text-xs shrink-0">
                    ⬆️
                  </div>
                  <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-rose-900 truncate">Debit Summary</h3>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800 uppercase shrink-0">Outflow</span>
              </div>

              <div className="divide-y divide-rose-200/50 text-[9.5px] sm:text-xs">
                <div
                  onClick={() => setDebitStatus('Done')}
                  className={`py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0 ${debitStatus === 'Done' ? 'bg-rose-100/80 font-bold' : ''}`}
                  title="Click to filter Paid Done Debit entries"
                >
                  <span className="text-rose-800 font-semibold truncate mr-1">Done Debit</span>
                  <span className="font-extrabold text-rose-700 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{displayDebitDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => setDebitStatus('Due')}
                  className={`py-0.5 sm:py-1 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 px-0.5 sm:px-1 rounded-md transition min-w-0 ${debitStatus === 'Due' ? 'bg-rose-100/80 font-bold' : ''}`}
                  title="Click to filter Unpaid Due Debit entries"
                >
                  <span className="text-rose-800 font-semibold truncate mr-1">Due Debit</span>
                  <span className="font-extrabold text-rose-900 whitespace-nowrap shrink-0 text-[10px] sm:text-xs">{settings.currency}{displayDebitDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => setDebitStatus('All')}
                  className={`pt-1 flex items-center justify-between font-black text-rose-950 cursor-pointer hover:bg-rose-100/70 px-0.5 sm:px-1 rounded-md transition min-w-0 ${debitStatus === 'All' ? 'bg-rose-100/80' : ''}`}
                  title="Click to filter All Debit entries"
                >
                  <span className="truncate mr-1">Total Debit</span>
                  <span className="text-[10.5px] sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{displayDebitTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
            <div className="hidden md:block overflow-x-auto print:block bg-white rounded-2xl border border-rose-200/80 shadow-2xs print:border-none print:shadow-none print:rounded-none print:overflow-visible">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-rose-100/70 text-rose-950 border-b border-rose-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold text-center print:w-[6%]">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[12%]">Date</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold text-center print:w-[9%]">Type</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[16%]">User Name</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-auto">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[16%]">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[10%]">Status</th>
                    <th className="py-3 px-4 font-bold text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredDebitTxns.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-black">
                        No debit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredDebitTxns.map((t, index) => {
                        const isDone = (t.status || 'Done') === 'Done';
                        return (
                          <tr key={t.id || index} className="hover:bg-rose-50/40 transition print:bg-white">
                            <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-1.5 print:px-2 print:border print:border-black print:text-black text-center">{index + 1}</td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black">{formatDate(t.date)}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs">
                                Debit
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-rose-950 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black">{t.userName}</td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-1.5 print:px-2 print:border print:border-black print:text-black print:max-w-none print:whitespace-normal print:break-words">{t.description || '-'}</td>
                            <td className="py-3.5 px-4 font-black text-right text-rose-950 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-bold">
                              {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black">
                              <span className="hidden print:inline-block text-black font-bold text-xs uppercase print:border-none print:p-0">
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
                      })}

                      {/* TOTAL DEBIT ROW — PLACED IN TBODY SO IT RENDERS ONLY ONCE DIRECTLY AFTER THE LAST ENTRY */}
                      <tr className="bg-rose-100/90 font-black text-rose-950 border-t-2 border-b-2 border-rose-300 print-total-row">
                        <td colSpan="5" className="py-3 px-4 text-right uppercase tracking-wider font-black text-xs print:py-1.5 print:px-2 print:border print:border-black print:font-black print:text-xs">
                          {debitTableFooterLabel}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-950 text-sm print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-black print:text-xs whitespace-nowrap">
                          {settings.currency}{(filteredDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 print:border print:border-black"></td>
                        <td className="py-3 px-4 print:hidden"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🟢 SECTION 2: CREDIT TRANSACTIONS TABLE & FILTERS (SECOND)*/}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'credit' || printTarget === 'all' || printTarget === 'credit') && (
        <div className={`p-1.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-emerald-50/60 border border-emerald-200/90 shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none print:bg-transparent print:space-y-0 print:mb-4 ${activeTab !== 'all' && activeTab !== 'credit' ? 'hidden print:block' : ''} ${printTarget === 'debit' ? 'print:hidden' : ''}`}>
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 print:border-b-2 print:border-black pb-3 print:pb-1 print:mb-1.5 print-section-header">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-sm shrink-0 print:hidden">
                💰
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-emerald-950 print:text-sm print:text-black print:font-black leading-tight uppercase">
                    Credit Transactions <span className="text-emerald-900/80 font-bold text-xs sm:text-sm print:text-black print:font-semibold print:normal-case">(Cash In)</span>
                  </h2>
                  <span className="shrink-0 whitespace-nowrap text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold">
                    {filteredCreditTxns.length} Entries • Total Credit: {settings.currency}{(filteredCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-800/80 font-medium print:text-black print:font-medium">Deposits to My Hand or Company Wallet</p>
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

          {/* Highlighted Active Credit Filter Banner */}
          {hasActiveCreditFilters && (
            <div className="p-3 rounded-2xl bg-amber-100/90 border-2 border-amber-400 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <div className="flex items-center space-x-1.5 font-black text-amber-950 text-xs tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                  <span>Active Credit Filters:</span>
                </div>
                {!isMyView && selectedUser !== 'All' && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    User: {selectedUser}
                  </span>
                )}
                {creditDepositTo !== 'All' && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-800 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Account: {creditDepositTo}
                  </span>
                )}
                {creditStatus !== 'All' && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-900 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Status: {creditStatus}
                  </span>
                )}
                {(creditStartDate || creditEndDate) && (
                  <span className="px-2.5 py-1 rounded-lg bg-white text-amber-950 font-extrabold text-[11px] border border-amber-300 shadow-2xs flex items-center">
                    Date: {creditStartDate ? formatDate(creditStartDate) : 'Start'} to {creditEndDate ? formatDate(creditEndDate) : 'Today'}
                  </span>
                )}
                {(creditMinAmt || creditMaxAmt) && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-800 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Amount: {creditMinAmt ? `${settings.currency}${creditMinAmt}` : 'Min'} - {creditMaxAmt ? `${settings.currency}${creditMaxAmt}` : 'Max'}
                  </span>
                )}
                {creditSearch && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-white font-extrabold text-[11px] shadow-2xs flex items-center">
                    Search: "{creditSearch}"
                  </span>
                )}
              </div>
              <button
                onClick={resetCreditFilters}
                className="px-3.5 py-1 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-[11px] transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                Reset Credit Filters
              </button>
            </div>
          )}

          {/* Credit Summary Cards (Table Style matching Dashboard) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 pt-0.5 print:hidden">
            {/* CARD 1: CREDIT SUMMARY (Light Green Background) */}
            <div className="h-full bg-emerald-50/70 p-2.5 sm:p-4 rounded-2xl border border-emerald-200/90 border-t-4 border-t-emerald-500 shadow-xs flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-[10px] sm:text-xs shrink-0">
                    ⬇️
                  </div>
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-900 truncate">Credit Summary</h3>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase shrink-0">Inflow</span>
              </div>

              <div className="divide-y divide-emerald-200/50 text-[10.5px] sm:text-xs">
                <div
                  onClick={() => { setCreditDepositTo('All'); setCreditStatus('Done'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'All' && creditStatus === 'Done' ? 'bg-emerald-100/80 font-bold' : ''}`}
                  title="Click to view Completed Done Credit entries"
                >
                  <span className="text-emerald-800 font-semibold truncate mr-1">Total Done Credit</span>
                  <span className="font-extrabold text-emerald-700 whitespace-nowrap shrink-0">{settings.currency}{displayCreditDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('All'); setCreditStatus('Due'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'All' && creditStatus === 'Due' ? 'bg-emerald-100/80 font-bold' : ''}`}
                  title="Click to view Uncollected Due Credit entries"
                >
                  <span className="text-emerald-800 font-semibold truncate mr-1">Total Due Credit</span>
                  <span className="font-extrabold text-amber-700 whitespace-nowrap shrink-0">{settings.currency}{displayCreditDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('All'); setCreditStatus('All'); }}
                  className={`pt-1.5 flex items-center justify-between font-black text-emerald-950 cursor-pointer hover:bg-emerald-100/70 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'All' && creditStatus === 'All' ? 'bg-emerald-100/80' : ''}`}
                  title="Click to view All Credit entries"
                >
                  <span className="truncate mr-1">Total Credit</span>
                  <span className="text-xs sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{displayCreditTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: MY HAND SUMMARY (Light Blue Background) */}
            <div className="h-full bg-blue-50/70 p-2.5 sm:p-4 rounded-2xl border border-blue-200/90 border-t-4 border-t-blue-500 shadow-xs flex flex-col justify-between space-y-2 print-summary-card">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] sm:text-xs shrink-0">
                    ✋
                  </div>
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-900 truncate">My Hand</h3>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-100 text-blue-800 uppercase shrink-0">Cash</span>
              </div>

              <div className="divide-y divide-blue-200/50 text-[10.5px] sm:text-xs">
                <div
                  onClick={() => { setCreditDepositTo('My Hand'); setCreditStatus('Done'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'My Hand' && creditStatus === 'Done' ? 'bg-blue-100/80 font-bold' : ''}`}
                  title="Click to view Done My Hand entries"
                >
                  <span className="text-blue-800 font-semibold truncate mr-1">In Hand (Done)</span>
                  <span className="font-extrabold text-blue-700 whitespace-nowrap shrink-0">{settings.currency}{creditSummary.myHandDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('My Hand'); setCreditStatus('Due'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'My Hand' && creditStatus === 'Due' ? 'bg-blue-100/80 font-bold' : ''}`}
                  title="Click to view Due My Hand entries"
                >
                  <span className="text-blue-800 font-semibold truncate mr-1">In Hand (Due)</span>
                  <span className="font-extrabold text-amber-700 whitespace-nowrap shrink-0">{settings.currency}{creditSummary.myHandDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('My Hand'); setCreditStatus('All'); }}
                  className={`pt-1.5 flex items-center justify-between font-black text-blue-950 cursor-pointer hover:bg-blue-100/70 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'My Hand' && creditStatus === 'All' ? 'bg-blue-100/80' : ''}`}
                  title="Click to view All My Hand entries"
                >
                  <span className="truncate mr-1">Total In Hand</span>
                  <span className="text-xs sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{creditSummary.myHandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* CARD 3: COMPANY WALLET SUMMARY (Light Purple Background) */}
            <div className="h-full bg-purple-50/70 p-2.5 sm:p-4 rounded-2xl border border-purple-200/90 border-t-4 border-t-purple-500 shadow-xs flex flex-col justify-between space-y-2 print-summary-card">
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-1.5">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-[10px] sm:text-xs shrink-0">
                    🏢
                  </div>
                  <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-900 truncate">Co. Wallet</h3>
                </div>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 uppercase shrink-0">Wallet</span>
              </div>

              <div className="divide-y divide-purple-200/50 text-[10.5px] sm:text-xs">
                <div
                  onClick={() => { setCreditDepositTo('Company Wallet'); setCreditStatus('Done'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-purple-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'Company Wallet' && creditStatus === 'Done' ? 'bg-purple-100/80 font-bold' : ''}`}
                  title="Click to view Done Company Wallet entries"
                >
                  <span className="text-purple-800 font-semibold truncate mr-1">Wallet (Done)</span>
                  <span className="font-extrabold text-purple-700 whitespace-nowrap shrink-0">{settings.currency}{creditSummary.walletDone.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('Company Wallet'); setCreditStatus('Due'); }}
                  className={`py-1 flex items-center justify-between cursor-pointer hover:bg-purple-100/60 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'Company Wallet' && creditStatus === 'Due' ? 'bg-purple-100/80 font-bold' : ''}`}
                  title="Click to view Due Company Wallet entries"
                >
                  <span className="text-purple-800 font-semibold truncate mr-1">Wallet (Due)</span>
                  <span className="font-extrabold text-amber-700 whitespace-nowrap shrink-0">{settings.currency}{creditSummary.walletDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div
                  onClick={() => { setCreditDepositTo('Company Wallet'); setCreditStatus('All'); }}
                  className={`pt-1.5 flex items-center justify-between font-black text-purple-950 cursor-pointer hover:bg-purple-100/70 px-1 rounded-lg transition min-w-0 ${creditDepositTo === 'Company Wallet' && creditStatus === 'All' ? 'bg-purple-100/80' : ''}`}
                  title="Click to view All Company Wallet entries"
                >
                  <span className="truncate mr-1">Total Wallet</span>
                  <span className="text-xs sm:text-sm whitespace-nowrap shrink-0">{settings.currency}{creditSummary.walletTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
            <div className="hidden md:block overflow-x-auto print:block bg-white rounded-2xl border border-emerald-200/80 shadow-2xs print:border-none print:shadow-none print:rounded-none print:overflow-visible">
              <table className="w-full text-left text-sm text-slate-700 print:text-black print:text-xs border-collapse">
                <thead className="text-xs uppercase bg-emerald-100/70 text-emerald-950 border-b border-emerald-200 print:bg-slate-100 print:text-black print:border-b-2 print:border-black">
                  <tr>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold text-center print:w-[6%]">Sr. No.</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[12%]">Date</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold text-center print:w-[8%]">Type</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[14%]">User Name</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[15%]">Account / Deposit To</th>
                    <th className="py-3 px-4 font-bold print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-auto">Description / Notes</th>
                    <th className="py-3 px-4 font-bold text-right print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[15%]">Amount</th>
                    <th className="py-3 px-4 font-bold text-center print:py-1.5 print:px-2 print:border print:border-black print:font-extrabold print:w-[9%]">Status</th>
                    <th className="py-3 px-4 font-bold text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-y-0">
                  {filteredCreditTxns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-500 text-xs font-medium print:text-black print:border print:border-black">
                        No credit transactions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredCreditTxns.map((t, index) => {
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
                            <td className="py-3.5 px-4 font-bold text-slate-600 text-xs print:py-1.5 print:px-2 print:border print:border-black print:text-black text-center">{index + 1}</td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-500 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black">{formatDate(t.date)}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs">
                                Credit
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-emerald-950 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black">{t.userName}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:text-xs ${
                                t.depositTo === 'Company Wallet'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}>
                                {accountLabel}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate print:py-1.5 print:px-2 print:border print:border-black print:text-black print:max-w-none print:whitespace-normal print:break-words">
                              {t.isAllocation && (
                                <span className="mr-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs border border-amber-600 print:bg-none print:bg-transparent print:border-none print:p-0 print:text-black print:font-bold print:mr-1">
                                  <span className="print:hidden">🏢 </span>Company Allocation{' '}
                                </span>
                              )}
                              {t.description || '-'}
                            </td>
                            <td className="py-3.5 px-4 font-black text-right text-emerald-700 whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-bold">
                              {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap print:py-1.5 print:px-2 print:border print:border-black">
                              <span className="hidden print:inline-block text-black font-bold text-xs uppercase print:border-none print:p-0">
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
                      })}

                      {/* TOTAL CREDIT ROW — PLACED IN TBODY SO IT RENDERS ONLY ONCE DIRECTLY AFTER THE LAST ENTRY */}
                      <tr className="bg-emerald-100/90 font-black text-emerald-950 border-t-2 border-b-2 border-emerald-300 print-total-row">
                        <td colSpan="6" className="py-3 px-4 text-right uppercase tracking-wider font-black text-xs print:py-1.5 print:px-2 print:border print:border-black print:font-black print:text-xs">
                          {creditTableFooterLabel}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-950 text-sm print:py-1.5 print:px-2 print:border print:border-black print:text-black print:font-black print:text-xs whitespace-nowrap">
                          {settings.currency}{(filteredCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 print:border print:border-black"></td>
                        <td className="py-3 px-4 print:hidden"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* ======================================================== */}
      {/* 🌐 GLOBAL LEDGER FILTER MODAL (Debit & Credit)            */}
      {/* ======================================================== */}
      {isGlobalFilterOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white w-full max-w-md p-6 rounded-3xl border border-slate-200 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-black">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#002B49]">Filter All Ledger Entries</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Refine debit & credit records by user, status & date</p>
                </div>
              </div>

              <button
                onClick={() => setIsGlobalFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* User / Party Filter */}
              {!isMyView && (
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">User / Party</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Users & Co.</option>
                    <option value="Shukan Company">🏢 Shukan Co.</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Account / Deposit To */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Account (Credit)</label>
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

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={debitStatus === creditStatus ? debitStatus : 'All'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDebitStatus(val);
                      setCreditStatus(val);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Done">Done</option>
                    <option value="Due">Due</option>
                  </select>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Start Date</label>
                  <DateInput
                    value={debitStartDate || creditStartDate}
                    max={debitEndDate || creditEndDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDebitStartDate(val);
                      setCreditStartDate(val);
                    }}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">End Date</label>
                  <DateInput
                    value={debitEndDate || creditEndDate}
                    min={debitStartDate || creditStartDate || undefined}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDebitEndDate(val);
                      setCreditEndDate(val);
                    }}
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>

              {/* Min & Max Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Min Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={debitMinAmt || creditMinAmt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDebitMinAmt(val);
                      setCreditMinAmt(val);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">Max Amount ({settings.currency})</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={debitMaxAmt || creditMaxAmt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDebitMaxAmt(val);
                      setCreditMaxAmt(val);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none border border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                onClick={() => {
                  resetDebitFilters();
                  resetCreditFilters();
                  setSelectedUser('All');
                  setIsGlobalFilterOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setIsGlobalFilterOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Apply Filters
              </button>
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
              <div className="grid grid-cols-2 gap-3">
                {!isMyView && (
                  <div>
                    <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">User / Party</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                    >
                      <option value="All">All Users & Co.</option>
                      <option value="Shukan Company">🏢 Shukan Co.</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={isMyView ? "col-span-2" : ""}>
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
                  <p className="text-[11px] text-slate-500 font-medium">Refine credit records by user, account, status & date</p>
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
              {!isMyView && (
                <div>
                  <label className="block text-xs font-bold text-[#002B49] uppercase tracking-wider mb-1.5">User / Party</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl glass-input text-slate-800 bg-white focus:outline-none border border-slate-200 font-semibold"
                  >
                    <option value="All">All Users & Co.</option>
                    <option value="Shukan Company">🏢 Shukan Co.</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
                {isMyView ? (
                  <div className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-900 bg-slate-100/90 border border-slate-200 font-bold text-sm flex items-center justify-between">
                    <span>{user?.name}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-extrabold">Fixed (You)</span>
                    <input type="hidden" {...register('userName')} value={user?.name || ''} />
                  </div>
                ) : (
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
                )}
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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePrintSelection('all')}
                  className="flex-1 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition">
                      📄
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#002B49] group-hover:text-amber-600 transition truncate">
                        All Audit Ledger
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate">Both Debit & Credit records</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 shrink-0 ml-1">🖨️</span>
                </button>
                <button
                  onClick={() => { setIsPrintModalOpen(false); handleShareWhatsApp('all'); }}
                  className="px-3 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition cursor-pointer flex items-center shrink-0"
                  title="Direct Share All Ledger on WhatsApp"
                >
                  💬 Share
                </button>
              </div>

              {/* Option 2: Debit Only */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePrintSelection('debit')}
                  className="flex-1 p-3 rounded-2xl bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-700 text-white flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition">
                      🧾
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-rose-950 group-hover:text-rose-700 transition truncate">
                        Debit Statement Only
                      </h4>
                      <p className="text-[10px] text-rose-800/80 font-medium truncate">Cash Out expense entries</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-400 shrink-0 ml-1">🖨️</span>
                </button>
                <button
                  onClick={() => { setIsPrintModalOpen(false); handleShareWhatsApp('debit'); }}
                  className="px-3 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition cursor-pointer flex items-center shrink-0"
                  title="Direct Share Debit Statement on WhatsApp"
                >
                  💬 Share
                </button>
              </div>

              {/* Option 3: Credit Only */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePrintSelection('credit')}
                  className="flex-1 p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 text-left transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition">
                      💰
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-emerald-950 group-hover:text-emerald-700 transition truncate">
                        Credit Statement Only
                      </h4>
                      <p className="text-[10px] text-emerald-800/80 font-medium truncate">Cash In & Allocations</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 shrink-0 ml-1">🖨️</span>
                </button>
                <button
                  onClick={() => { setIsPrintModalOpen(false); handleShareWhatsApp('credit'); }}
                  className="px-3 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition cursor-pointer flex items-center shrink-0"
                  title="Direct Share Credit Statement on WhatsApp"
                >
                  💬 Share
                </button>
              </div>
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

      {/* 🖨️ DEDICATED PRINT-ONLY LEDGER REPORT (Strict B&W, No Cards, No Emojis, No Icons, No Actions) */}
      <div className="hidden print:block print-ledger-report">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3 print-header">
          <h1 className="text-xl font-bold uppercase text-black tracking-wider">SHUKAN PACKAGING</h1>
          <h2 className="text-xs font-bold text-black uppercase mt-0.5">
            {selectedUser !== 'All' ? `${selectedUser} - ` : ''}
            {printTarget === 'debit' ? 'Debit Statement Audit' : printTarget === 'credit' ? 'Credit Statement Audit' : 'Debit & Credit Audit Ledger'}
          </h2>
          <div className="text-[9pt] font-normal text-black mt-1 flex items-center justify-center space-x-2">
            <span>Date Printed: {formatDate(new Date())}</span>
            {selectedUser !== 'All' && <span>| User: {selectedUser}</span>}
            {(printTarget === 'all' || printTarget === 'debit') && debitStatus !== 'All' && <span>| Debit Status: {debitStatus}</span>}
            {(printTarget === 'all' || printTarget === 'credit') && creditStatus !== 'All' && <span>| Credit Status: {creditStatus}</span>}
          </div>
        </div>

        {/* SECTION 1: DEBIT TRANSACTIONS TABLE */}
        {(printTarget === 'all' || printTarget === 'debit') && (
          <div className="mb-4 print-section">
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  Debit Transactions <span className="font-normal normal-case">(Cash Out)</span>
                </h2>
                <span className="text-[7.5pt] sm:text-xs font-bold text-black uppercase tracking-wider text-right ml-2">
                  FILTER: {debitFilterSummaryText}
                </span>
              </div>
              <div className="text-[8.5pt] font-semibold text-black mt-0.5">
                {filteredDebitTxns.length} Entries | Total Debit: {settings.currency}{(filteredDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Print-Only Debit Summary Card */}
            <div className="print-debit-card-wrapper">
              <div className="print-card print-card-debit">
                <div className="card-title">
                  DEBIT SUMMARY
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="card-label">Done Debit</span>
                    <span className="card-value">{settings.currency}{(displayDebitDone || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="card-row">
                    <span className="card-label">Due Debit</span>
                    <span className="card-value">{settings.currency}{(displayDebitDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="card-total">
                  <span className="card-label">TOTAL DEBIT</span>
                  <span className="card-value">{settings.currency}{(displayDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <table className="print-table debit-print-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '11%' }} className="date-cell">DATE</th>
                  <th style={{ width: '9%' }} className="type-cell">TYPE</th>
                  <th style={{ width: '13%' }} className="user-cell">USER NAME</th>
                  <th style={{ width: '34%' }} className="description-cell">DESCRIPTION / NOTES</th>
                  <th style={{ width: '18%' }} className="amount-cell">AMOUNT</th>
                  <th style={{ width: '9%' }} className="status-cell">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebitTxns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      No debit transactions match the criteria.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredDebitTxns.map((t, index) => (
                      <tr key={t.id || index}>
                        <td className="sr-cell">{index + 1}</td>
                        <td className="date-cell">{formatDate(t.date)}</td>
                        <td className="type-cell">DEBIT</td>
                        <td className="user-cell">{t.userName}</td>
                        <td className="description-cell">{t.description || '-'}</td>
                        <td className="amount-cell">
                          {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="status-cell">{t.status ? t.status.toUpperCase() : 'DONE'}</td>
                      </tr>
                    ))}
                    <tr className="print-total-row debit-total-row">
                      <td colSpan={5} className="total-label">
                        {debitTableFooterLabel}
                      </td>
                      <td className="total-amount">
                        {settings.currency}{(filteredDebitTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="status-cell"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: CREDIT TRANSACTIONS SECTION (Starts at top of Page 2 when printing full report) */}
        {(printTarget === 'all' || printTarget === 'credit') && (
          <div className={`mb-4 print-section credit-table-print-section ${printTarget === 'all' ? 'print-page-break-before' : ''}`}>
            {/* 1. Credit Transactions Heading */}
            <div className="border-b border-black pb-1 mb-2 print-section-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-black uppercase">
                  Credit Transactions <span className="font-normal normal-case">(Cash In)</span>
                </h2>
                <span className="text-[7.5pt] sm:text-xs font-bold text-black uppercase tracking-wider text-right ml-2">
                  FILTER: {creditFilterSummaryText}
                </span>
              </div>
              <div className="text-[8.5pt] font-semibold text-black mt-0.5">
                {filteredCreditTxns.length} Entries | Total Credit: {settings.currency}{(filteredCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* 2. Print-Only Credit Summary Cards Grid (3 Columns) - RENDERED DIRECTLY BELOW HEADING & BEFORE TABLE */}
            <div className="credit-summary-print-wrapper mb-3">
              <div className="credit-summary-print-grid">
                {/* CARD 1: CREDIT SUMMARY */}
                <div className="print-card">
                  <div className="card-title">
                    CREDIT SUMMARY
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">Total Done Credit</span>
                      <span className="card-value">{settings.currency}{(displayCreditDone || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Total Due Credit</span>
                      <span className="card-value">{settings.currency}{(displayCreditDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="card-total">
                    <span className="card-label">TOTAL CREDIT</span>
                    <span className="card-value">{settings.currency}{(displayCreditTotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* CARD 2: MY HAND */}
                <div className="print-card">
                  <div className="card-title">
                    MY HAND
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">In Hand (Done)</span>
                      <span className="card-value">{settings.currency}{(creditSummary?.myHandDone || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">In Hand (Due)</span>
                      <span className="card-value">{settings.currency}{(creditSummary?.myHandDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="card-total">
                    <span className="card-label">TOTAL IN HAND</span>
                    <span className="card-value">{settings.currency}{(creditSummary?.myHandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* CARD 3: CO. WALLET */}
                <div className="print-card">
                  <div className="card-title">
                    CO. WALLET
                  </div>
                  <div className="card-body">
                    <div className="card-row">
                      <span className="card-label">Wallet (Done)</span>
                      <span className="card-value">{settings.currency}{(creditSummary?.walletDone || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Wallet (Due)</span>
                      <span className="card-value">{settings.currency}{(creditSummary?.walletDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="card-total">
                    <span className="card-label">TOTAL WALLET</span>
                    <span className="card-value">{settings.currency}{(creditSummary?.walletTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Credit Transactions Table */}
            <table className="print-table credit-print-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }} className="sr-cell">SR. NO.</th>
                  <th style={{ width: '10%' }} className="date-cell">DATE</th>
                  <th style={{ width: '9%' }} className="type-cell">TYPE</th>
                  <th style={{ width: '12%' }} className="user-cell">USER NAME</th>
                  <th style={{ width: '15%' }} className="account-cell">ACCOUNT / DEPOSIT TO</th>
                  <th style={{ width: '28%' }} className="description-cell">DESCRIPTION / NOTES</th>
                  <th style={{ width: '13%' }} className="amount-cell">AMOUNT</th>
                  <th style={{ width: '7%' }} className="status-cell">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreditTxns.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      No credit transactions match the criteria.
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredCreditTxns.map((t, index) => {
                      const accountLabel = t.depositTo === 'Company Wallet' ? 'Company Wallet' : 'My Hand';
                      const cleanDesc = t.isAllocation ? `Company Allocation - ${t.description || ''}` : (t.description || '-');
                      return (
                        <tr key={t.id || index}>
                          <td className="sr-cell">{index + 1}</td>
                          <td className="date-cell">{formatDate(t.date)}</td>
                          <td className="type-cell">CREDIT</td>
                          <td className="user-cell">{t.userName}</td>
                          <td className="account-cell">{accountLabel}</td>
                          <td className="description-cell">{cleanDesc}</td>
                          <td className="amount-cell">
                            {settings.currency}{(parseFloat(t.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="status-cell">{t.status ? t.status.toUpperCase() : 'DONE'}</td>
                        </tr>
                      );
                    })}
                    <tr className="print-total-row credit-total-row">
                      <td colSpan={6} className="total-label">
                        {creditTableFooterLabel}
                      </td>
                      <td className="total-amount">
                        {settings.currency}{(filteredCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="status-cell"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 text-center border-t border-black text-[8pt] text-black print-footer mt-4">
          <span>Shukan Packaging - Expense Management Software</span>
        </div>
      </div>
    </>
  );
};

export default CreditDebit;
