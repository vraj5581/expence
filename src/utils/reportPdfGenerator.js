import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getTodayYMD } from './dateUtils';

const PRIMARY_COLOR = [0, 43, 73]; // #002B49
const ACCENT_COLOR = [158, 110, 52]; // #9e6e34
const DARK_TEXT = [30, 41, 59];
const LIGHT_BG = [248, 250, 252];

const formatCurrency = (amount, currency = '₹') => {
  const num = parseFloat(amount || 0);
  const formattedNum = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = (currency === '₹' || currency === 'INR' || !currency) ? 'Rs. ' : `${currency} `;
  return `${symbol}${formattedNum}`;
};

/**
 * Export Company Money Transfer Log to PDF
 */
export const exportTransferLogPDF = ({ logs, currency = '₹', filterUser = 'All', filterPeriod = 'All' }) => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SHUKAN PACKAGING', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Company Money Transfer Log', 14, 21);

  // Metadata Right Aligned
  const todayStr = formatDate(new Date());
  doc.setFontSize(9);
  doc.text(`Generated: ${todayStr}`, 196, 13, { align: 'right' });
  doc.text(`User: ${filterUser} | Period: ${filterPeriod}`, 196, 21, { align: 'right' });

  // Summary Metrics Box
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, 34, 182, 18, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 18, 3, 3, 'S');

  doc.setTextColor(...DARK_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL RECORDS:', 20, 45);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(`${logs.length}`, 52, 45);

  doc.setTextColor(...DARK_TEXT);
  doc.text('TOTAL AMOUNT GIVEN:', 110, 45);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(formatCurrency(totalAmount, currency), 155, 45);

  // Table Data Preparation
  const tableRows = logs.map((log, index) => [
    index + 1,
    formatDate(log.date),
    log.userName || '-',
    log.notes || 'Petty Cash Allowance',
    `+${formatCurrency(log.amount, currency)}`
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 58,
    head: [['SR. NO.', 'DATE', 'GIVEN TO USER', 'NOTES / PURPOSE', 'AMOUNT GIVEN']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 65 },
      4: { halign: 'right', fontStyle: 'bold', textColor: ACCENT_COLOR, cellWidth: 35 }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: DARK_TEXT
    },
    foot: [
      ['', '', '', 'GRAND TOTAL', `+${formatCurrency(totalAmount, currency)}`]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: ACCENT_COLOR,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'right'
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, 287, { align: 'right' });
      doc.text('Shukan Packaging - Official Financial Log', 14, 287);
    }
  });

  doc.save(`Company_Money_Transfer_Log_${getTodayYMD()}.pdf`);
};

/**
 * Export User Expense Receipts Log to PDF
 */
export const exportExpenseLogPDF = ({ transactions, currency = '₹', filterUser = 'All', filterPeriod = 'All' }) => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SHUKAN PACKAGING', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('User Expense Receipts & Payment Log', 14, 21);

  // Metadata Right Aligned
  const todayStr = formatDate(new Date());
  doc.setFontSize(9);
  doc.text(`Generated: ${todayStr}`, 196, 13, { align: 'right' });
  doc.text(`Account: ${filterUser} | Period: ${filterPeriod}`, 196, 21, { align: 'right' });

  // Summary Metrics Box
  const totalAmount = transactions.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const doneAmount = transactions
    .filter(t => (t.status || 'Done') === 'Done')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const dueAmount = transactions
    .filter(t => (t.status || 'Done') === 'Due')
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, 33, 182, 20, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, 182, 20, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_TEXT);

  doc.text('TOTAL ENTRIES', 20, 41);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(9.5);
  doc.text(`${transactions.length} Records`, 20, 48);

  doc.setFontSize(8);
  doc.setTextColor(...DARK_TEXT);
  doc.text('DONE AMOUNT', 65, 41);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.setFontSize(9.5);
  doc.text(formatCurrency(doneAmount, currency), 65, 48);

  doc.setFontSize(8);
  doc.setTextColor(...DARK_TEXT);
  doc.text('DUE AMOUNT', 115, 41);
  doc.setTextColor(217, 119, 6); // Amber
  doc.setFontSize(9.5);
  doc.text(formatCurrency(dueAmount, currency), 115, 48);

  doc.setFontSize(8);
  doc.setTextColor(...DARK_TEXT);
  doc.text('TOTAL AMOUNT', 160, 41);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(9.5);
  doc.text(formatCurrency(totalAmount, currency), 160, 48);

  // Table Data Preparation
  const tableRows = transactions.map((t, index) => [
    index + 1,
    formatDate(t.date),
    t.userName || '-',
    t.description || 'Expense Entry',
    (t.status || 'Done') === 'Done' ? 'Done' : 'Due',
    formatCurrency(t.amount, currency)
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 58,
    head: [['SR. NO.', 'DATE', 'ACCOUNT / USER', 'DESCRIPTION / PURPOSE', 'STATUS', 'AMOUNT']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', cellWidth: 38 },
      3: { cellWidth: 60 },
      4: { cellWidth: 26, fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold', textColor: PRIMARY_COLOR, cellWidth: 26 }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: DARK_TEXT
    },
    foot: [
      ['', '', '', '', 'GRAND TOTAL', formatCurrency(totalAmount, currency)]
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: PRIMARY_COLOR,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'right'
    },
    didDrawPage: () => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, 287, { align: 'right' });
      doc.text('Shukan Packaging - Official Financial Log', 14, 287);
    }
  });

  doc.save(`Shukan_Expense_Receipts_${filterUser}_${getTodayYMD()}.pdf`);
};

/**
 * Export Combined Audit PDF Report (Both Reports Included)
 */
export const exportCombinedAuditPDF = ({
  logs,
  transactions,
  currency = '₹',
  filterUser = 'All',
  filterPeriod = 'All',
  adminVaultBalance = 0,
  totalAllocated = 0,
  totalSpent = 0
}) => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SHUKAN PACKAGING', 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Financial Audit Report', 14, 21);

  // Metadata Right Aligned
  const todayStr = formatDate(new Date());
  doc.setFontSize(9);
  doc.text(`Generated: ${todayStr}`, 196, 13, { align: 'right' });
  doc.text(`User: ${filterUser} | Period: ${filterPeriod}`, 196, 21, { align: 'right' });

  // Executive Summary Box
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(14, 34, 182, 22, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, 182, 22, 3, 3, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  
  doc.setTextColor(...DARK_TEXT);
  doc.text('ADMIN VAULT RESERVE', 20, 43);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFontSize(10);
  doc.text(formatCurrency(adminVaultBalance, currency), 20, 50);

  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text('TOTAL MONEY GIVEN', 80, 43);
  doc.setTextColor(...ACCENT_COLOR);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalAllocated, currency), 80, 50);

  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_TEXT);
  doc.text('TOTAL EXPENSES SPENT', 140, 43);
  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(10);
  doc.text(formatCurrency(totalSpent, currency), 140, 50);

  // 1. Section: Company Money Transfer Log
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('1. Company Money Transfer Log', 14, 65);

  const transferRows = logs.map((log, index) => [
    index + 1,
    formatDate(log.date),
    log.userName || '-',
    log.notes || 'Petty Cash Allowance',
    `+${formatCurrency(log.amount, currency)}`
  ]);

  const totalTransferAmount = logs.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);

  autoTable(doc, {
    startY: 69,
    head: [['SR. NO.', 'DATE', 'GIVEN TO USER', 'NOTES / PURPOSE', 'AMOUNT GIVEN']],
    body: transferRows,
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { cellWidth: 28 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 65 },
      4: { halign: 'right', fontStyle: 'bold', textColor: ACCENT_COLOR, cellWidth: 35 }
    },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK_TEXT },
    foot: [['', '', '', 'TOTAL TRANSFERRED', `+${formatCurrency(totalTransferAmount, currency)}`]],
    footStyles: { fillColor: [241, 245, 249], textColor: ACCENT_COLOR, fontStyle: 'bold', fontSize: 8.5, halign: 'right' }
  });

  // 2. Section: User Expense Receipts Log
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 120;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text('2. User Expense Receipts Log', 14, finalY);

  const expenseRows = transactions.map((t, index) => [
    index + 1,
    formatDate(t.date),
    t.userName || '-',
    t.description || 'Expense Entry',
    formatCurrency(t.amount, currency)
  ]);

  const totalExpenseAmount = transactions.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0);

  autoTable(doc, {
    startY: finalY + 4,
    head: [['SR. NO.', 'DATE', 'USER NAME', 'DESCRIPTION / NOTES', 'AMOUNT']],
    body: expenseRows,
    theme: 'striped',
    headStyles: { fillColor: PRIMARY_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      1: { cellWidth: 28 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: 65 },
      4: { halign: 'right', fontStyle: 'bold', textColor: PRIMARY_COLOR, cellWidth: 35 }
    },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK_TEXT },
    foot: [['', '', '', 'TOTAL EXPENSE', formatCurrency(totalExpenseAmount, currency)]],
    footStyles: { fillColor: [241, 245, 249], textColor: PRIMARY_COLOR, fontStyle: 'bold', fontSize: 8.5, halign: 'right' },
    didDrawPage: () => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, 196, 287, { align: 'right' });
      doc.text('Shukan Packaging - Official Financial Audit', 14, 287);
    }
  });

  doc.save(`Shukan_Audit_Report_${getTodayYMD()}.pdf`);
};
