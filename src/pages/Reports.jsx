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

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl glass-input text-xs font-bold text-slate-800 bg-white focus:outline-none w-full sm:w-auto"
          >
            <option value="All">All Time</option>
            <option value="This Month">This Month (July 2026)</option>
            <option value="This Quarter">Q3 2026</option>
            <option value="YTD">Year to Date 2026</option>
          </select>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3.5 py-2 rounded-xl glass-input text-xs font-bold text-slate-800 bg-white focus:outline-none w-full sm:w-auto"
          >
            <option value="All">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition w-full sm:w-auto"
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
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49]">Company Money Transfer Log</h2>
            <p className="text-xs text-slate-500 font-medium">History of funds given from Vault to team members</p>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden space-y-3">
          {allocationsHistory.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No money transfer logs recorded yet.
            </div>
          ) : (
            allocationsHistory.map((log, index) => (
              <div key={log.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-sm font-extrabold text-[#002B49]">{log.userName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{log.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                    {log.notes || 'Petty Cash Allowance'}
                  </div>
                  <div className="text-sm font-extrabold text-[#9e6e34]">
                    +{settings.currency}{log.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                allocationsHistory.map((log, index) => (
                  <tr key={log.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
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
      <div className="glass-card p-3.5 sm:p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#002B49]">User Expense Receipts Log</h2>
            <p className="text-xs text-slate-500 font-medium">Showing {filteredTransactions.length} filtered items</p>
          </div>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-xl">
              No expense receipt logs recorded yet.
            </div>
          ) : (
            filteredTransactions.map((t, index) => (
              <div key={t.id || index} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400">#{index + 1}</span>
                    <span className="text-sm font-extrabold text-[#002B49]">{t.userName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{t.date}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="text-xs text-slate-600 font-medium truncate max-w-[180px]">
                    {t.description || 'Expense Entry'}
                  </div>
                  <div className="text-sm font-extrabold text-[#002B49]">
                    {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                <th className="py-3 px-4 font-bold">User Name</th>
                <th className="py-3 px-4 font-bold">Description / Notes</th>
                <th className="py-3 px-4 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs font-medium">
                    No expense receipt logs recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, index) => (
                  <tr key={t.id || index} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-600 text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-4 font-bold text-[#002B49]">{t.userName}</td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium max-w-xs truncate">{t.description || '-'}</td>
                    <td className="py-3.5 px-4 font-bold text-right text-[#002B49]">
                      {settings.currency}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
