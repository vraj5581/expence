const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}/${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const errorText = await res.text();
      let parsedMessage = '';
      try {
        const parsed = JSON.parse(errorText);
        parsedMessage = parsed.message || parsed.error;
      } catch (e) {
        parsedMessage = errorText;
      }
      return { success: false, error: parsedMessage || `HTTP Error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    console.error(`API Request failed for ${endpoint}:`, err.message);
    return { success: false, error: err.message || 'Failed to connect to PHP database server' };
  }
}

export const apiService = {
  // Ultra-fast single-request bootstrap fetch
  getBootstrapData: () => request('bootstrap.php', { method: 'GET' }),

  // Auth
  login: (credentials) => request('auth.php?action=login', { method: 'POST', body: credentials }),
  changePassword: (username, currentPassword, newPassword) =>
    request('auth.php?action=change_password', {
      method: 'POST',
      body: { username, currentPassword, newPassword }
    }),

  // Debit Transactions (Cash Out / Expenses) - dedicated table
  getDebits: () => request('debit.php', { method: 'GET' }),
  addDebit: (data) => request('debit.php', { method: 'POST', body: data }),
  updateDebit: (id, data) => request('debit.php', { method: 'PUT', body: { id, ...data } }),
  deleteDebit: (id) => request(`debit.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Credit Transactions (Cash In / Inflows) - dedicated table
  getCredits: () => request('credit.php', { method: 'GET' }),
  addCredit: (data) => request('credit.php', { method: 'POST', body: data }),
  updateCredit: (id, data) => request('credit.php', { method: 'PUT', body: { id, ...data } }),
  deleteCredit: (id) => request(`credit.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Transactions (merged view for dashboard calculations - reads both tables)
  getTransactions: () => request('transactions.php', { method: 'GET' }),
  addTransaction: (txnData) => request('transactions.php', { method: 'POST', body: txnData }),
  updateTransaction: (id, txnData) => request('transactions.php', { method: 'PUT', body: { id, ...txnData } }),
  deleteTransaction: (id) => request(`transactions.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Vault Deposits
  getVaultDeposits: () => request('vault_deposits.php', { method: 'GET' }),
  addVaultDeposit: (depositData) => request('vault_deposits.php', { method: 'POST', body: depositData }),
  updateVaultDeposit: (id, depositData) => request('vault_deposits.php', { method: 'PUT', body: { id, ...depositData } }),
  deleteVaultDeposit: (id) => request(`vault_deposits.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Allocations
  getAllocations: () => request('allocations.php', { method: 'GET' }),
  allocateMoney: (allocationData) => request('allocations.php', { method: 'POST', body: allocationData }),
  updateAllocation: (id, allocationData) => request('allocations.php', { method: 'PUT', body: { id, ...allocationData } }),
  deleteAllocation: (id) => request(`allocations.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Users
  getUsers: () => request('users.php', { method: 'GET' }),
  addUser: (userData) => request('users.php', { method: 'POST', body: userData }),
  updateUser: (id, userData) => request('users.php', { method: 'PUT', body: { id, ...userData } }),
  deleteUser: (id) => request(`users.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Settings
  getSettings: () => request('settings.php', { method: 'GET' }),
  updateSettings: (settingsData) => request('settings.php', { method: 'POST', body: settingsData }),

  // Tasks
  getTasks: () => request('tasks.php', { method: 'GET' }),
  addTask: (taskData) => request('tasks.php', { method: 'POST', body: taskData }),
  updateTask: (id, taskData) => request('tasks.php', { method: 'PUT', body: { id, ...taskData } }),
  deleteTask: (id) => request(`tasks.php?id=${id}`, { method: 'DELETE', body: { id } }),

  // Audit Logs (backed by database)
  getAuditLogs: () => request('audit_logs.php', { method: 'GET' }),
  addAuditLog: (logData) => request('audit_logs.php', { method: 'POST', body: logData }),
  deleteAuditLog: (id) => request(`audit_logs.php?id=${id}`, { method: 'DELETE', body: { id } }),
};

