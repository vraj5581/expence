import React, { useRef } from 'react';
import { formatDate } from '../utils/dateUtils';

const DateInput = React.forwardRef(({
  value,
  onChange,
  className,
  placeholder = "DD-MM-YYYY",
  name,
  id,
  disabled,
  ...props
}, ref) => {
  const internalRef = useRef(null);

  // Format value to DD-MM-YYYY for display
  const displayValue = value ? formatDate(value) : '';

  const handleOpenPicker = (e) => {
    if (disabled) return;
    const targetRef = internalRef.current;
    if (targetRef && typeof targetRef.showPicker === 'function') {
      try {
        targetRef.showPicker();
      } catch (err) {
        // Fallback for browsers that don't support showPicker
      }
    }
  };

  return (
    <div className="relative w-full inline-flex items-center">
      {/* Visible Read-Only Input showing DD-MM-YYYY format */}
      <input
        type="text"
        readOnly
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        className={className || "w-full pl-3 pr-9 py-2 text-xs rounded-xl glass-input text-slate-800 focus:outline-none cursor-pointer"}
      />

      {/* Calendar Icon */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Invisible Native Date Input positioned over the field for native mobile & desktop date picking */}
      <input
        ref={(e) => {
          internalRef.current = e;
          if (typeof ref === 'function') ref(e);
          else if (ref) ref.current = e;
        }}
        type="date"
        name={name}
        id={id}
        disabled={disabled}
        value={value || ''}
        onChange={onChange}
        onClick={handleOpenPicker}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
        {...props}
      />
    </div>
  );
});

DateInput.displayName = 'DateInput';

export default DateInput;
