import React from 'react';

export const Select = React.forwardRef(
  (
    {
      label,
      placeholder = 'Select an option',
      options = [],
      value = null,
      onChange = null,
      size = 'md',
      disabled = false,
      error = false,
      errorMessage = '',
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-sans transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none';

    const sizeStyles = {
      sm: 'px-3 py-2 text-body-sm rounded-sm',
      md: 'px-4 py-2.5 text-body-md rounded-md',
      lg: 'px-5 py-3 text-body-md rounded-lg',
    };

    const variantStyles =
      'bg-white border-2 border-neutral-200 text-neutral-900 hover:border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white';

    const errorStyles = error ? 'border-error-500 focus:ring-error-500' : '';

    const selectClassName = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles}
      ${errorStyles}
      ${fullWidth ? 'w-full' : ''}
      pr-10
      ${className}
    `.trim();

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-label font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={selectClassName}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-neutral-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
        </div>

        {error && errorMessage && (
          <p className="mt-2 text-body-xs text-error-600 font-medium">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
