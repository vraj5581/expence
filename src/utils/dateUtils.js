// Centralized Date Utility to enforce DD-MM-YYYY format across the entire application

export const formatDate = (dateInput) => {
  if (!dateInput) return '-';

  // String check for YYYY-MM-DD format
  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.split('T')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [year, month, day] = cleanStr.split('-');
      return `${day}-${month}-${year}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
      return cleanStr;
    }
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateInput);
  }
};

export const getTodayFormatted = () => {
  return formatDate(new Date());
};
