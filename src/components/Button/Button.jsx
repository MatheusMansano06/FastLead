import React from 'react';
import './Button.css';

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-elevation-1 hover:shadow-elevation-1-hover',
      secondary:
        'bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800 shadow-elevation-1 hover:shadow-elevation-1-hover',
      outline:
        'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 dark:hover:bg-primary-950',
      ghost:
        'text-primary-600 hover:bg-primary-50 active:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-950',
      danger:
        'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 shadow-elevation-1 hover:shadow-elevation-1-hover',
      success:
        'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-elevation-1 hover:shadow-elevation-1-hover',
    };

    const sizeStyles = {
      xs: 'px-3 py-1.5 text-body-xs rounded-xs gap-1.5',
      sm: 'px-4 py-2 text-body-sm rounded-sm gap-2',
      md: 'px-6 py-2.5 text-body-md rounded-md gap-2',
      lg: 'px-8 py-3 text-body-md rounded-lg gap-2.5',
      xl: 'px-10 py-3.5 text-body-lg rounded-lg gap-3',
    };

    const finalClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim();

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={finalClassName}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
