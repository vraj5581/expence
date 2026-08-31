// Centralized Date Utility to enforce local timezone date handling & DD-MM-YYYY format across the entire application

const dateCache = new Map();

export const getTodayYMD = (dateInput = new Date()) => {
  if (!dateInput) dateInput = new Date();
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const normalizeToYYYYMMDD = (dateStr) => {
  if (!dateStr) return getTodayYMD();
  if (typeof dateStr === 'string') {
    const clean = dateStr.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('-');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('/');
      return `${y}-${m}-${d}`;
    }
  }
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}
  return getTodayYMD();
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  if (typeof dateInput === 'string' && dateCache.has(dateInput)) {
    return dateCache.get(dateInput);
  }

  // String check for YYYY-MM-DD format
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [year, month, day] = cleanStr.split('-');
      const res = `${day}-${month}-${year}`;
      if (dateCache.size > 2000) dateCache.clear();
      dateCache.set(dateInput, res);
      return res;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
      if (dateCache.size > 2000) dateCache.clear();
      dateCache.set(dateInput, cleanStr);
      return cleanStr;
    }
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const res = `${day}-${month}-${year}`;
    if (typeof dateInput === 'string') {
      if (dateCache.size > 2000) dateCache.clear();
      dateCache.set(dateInput, res);
    }
    return res;
  } catch (e) {
    return String(dateInput);
  }
};

export const getTodayFormatted = () => {
  return formatDate(getTodayYMD());
};
