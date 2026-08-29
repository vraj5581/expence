// Centralized Date Utility to enforce DD-MM-YYYY format across the entire application

const dateCache = new Map();

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
  return formatDate(new Date());
};
