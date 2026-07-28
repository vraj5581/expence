import React, { useState } from 'react';
import { useExpense } from '../context/ExpenseContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const {
    adminVaultBalance,
    allocationsHistory,
    transactions,
    users,
    settings,
    totalAllocatedToTeam,
    totalCashOut,
    getUserStats
  } = useExpense();

  const [filterPeriod, setFilterPeriod] = useState('All');
  const [filterUser, setFilterUser] = useState('All');

  const filteredTransactions = transactions.filter((t) => {
    if (filterUser !== 'All' && t.userName !== filterUser) return false;
    return true;
  });

  const barChartData = {
    labels: users.map(u => u.name),
    datasets: [
      {
        label: 'Money Given (Allocated)',
        data: users.map(u => getUserStats(u.name).allocated),
        backgroundColor: '#c69255',
        borderRadius: 8
      },
      {
        label: 'Spent Expenses',
        data: users.map(u => getUserStats(u.name).spent),
        backgroundColor: '#002B49',
        borderRadius: 8
      }
    ]
  };

  const barChartOptions = {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002B49] tracking-tight">Shukan Packaging Audit Reports</h1>
          <p className="text-sm text-slate-500 font-medium">Petty cash vault logs, user allowance reports, and audit logs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl glass-input text-xs font-bold text-slate-800 bg-white focus:outline-none"
          >
            <option value="All">All Time</option>
            <option value="This Month">This Month (July 2026)</option>
            <option value="This Quarter">Q3 2026</option>
            <option value="YTD">Year to Date 2026</option>
          </select>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3.5 py-2 rounded-xl glass-input text-xs font-bold text-slate-800 bg-white focus:outline-none"
          >
            <option value="All">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
          >
            <svg className="w-4 h-4 mr-1.5 text-[#002B49]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Export Audit
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#002B49]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Admin Vault Reserve</p>
          <p className="text-2xl font-extrabold text-[#002B49] mt-2">
            {settings.currency}{adminVaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Available in Master Vault</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#c69255]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Money Given to Team</p>
          <p className="text-2xl font-extrabold text-[#9e6e34] mt-2">
            {settings.currency}{totalAllocatedToTeam.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Total Allowance Distributed</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-[#d4a359]">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Expenses Spent</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">
            {settings.currency}{totalCashOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{transactions.filter(t => t.type === 'Cash Out').length} Logged Expense Receipts</p>
        </div>
      </div>

      {/* User Comparative Bar Chart */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#002B49]">User Allowance vs Expenditure Breakdown</h2>
          <p className="text-xs text-slate-500 font-medium">Money given by Admin vs actual money spent by user</p>
        </div>
        <div className="h-80">
          <Bar data={barChartData} options={barChartOptions} />
        </div>
      </div>

      {/* Admin Money Allocation Transfer History Log */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49]">Admin Money Transfer Log</h2>
            <p className="text-xs text-slate-500 font-medium">History of funds given from Admin Vault to team members</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Log ID</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Given To User</th>
                <th className="py-3 px-4 font-bold">Notes / Purpose</th>
                <th className="py-3 px-4 font-bold text-right">Amount Given</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocationsHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500 text-xs font-medium">
                    No admin money transfer logs recorded yet.
                  </td>
                </tr>
              ) : (
                allocationsHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#002B49]">{log.id}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{log.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{log.userName}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">{log.notes || '-'}</td>
                    <td className="py-3.5 px-4 font-bold text-right text-[#9e6e34]">
                      +{settings.currency}{log.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Transaction Report Table */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49]">User Expense Receipts Log</h2>
            <p className="text-xs text-slate-500 font-medium">Showing {filteredTransactions.length} filtered items</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-100/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Txn ID</th>
                <th className="py-3 px-4 font-bold">Movement Type</th>
                <th className="py-3 px-4 font-bold">User Name</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No expense receipt logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#002B49]">{t.id}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                          t.type === 'Cash In' ? 'bg-amber-500/15 text-[#9e6e34]' : 'bg-slate-900/10 text-[#002B49]'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">{t.description || '-'}</td>
                    <td className={`py-3.5 px-4 font-bold text-right ${t.type === 'Cash In' ? 'text-[#9e6e34]' : 'text-[#002B49]'}`}>
                      {t.type === 'Cash In' ? '+' : '-'}{settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
