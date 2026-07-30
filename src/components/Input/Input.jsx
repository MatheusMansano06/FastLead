import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      placeholder,
      type = 'text',
      size = 'md',
      variant = 'default',
      disabled = false,
      error = false,
      errorMessage = '',
      helperText = '',
      icon = null,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'font-sans transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizeStyles = {
      sm: 'px-3 py-2 text-body-sm rounded-sm',
      md: 'px-4 py-2.5 text-body-md rounded-md',
      lg: 'px-5 py-3 text-body-md rounded-lg',
    };

    const variantStyles = {
      default:
        'bg-white border-2 border-neutral-200 text-neutral-900 placeholder-neutral-400 hover:border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:placeholder-neutral-500',
      outlined:
        'bg-transparent border-2 border-neutral-300 text-neutral-900 hover:border-primary-400 dark:border-neutral-600 dark:text-white',
      filled:
        'bg-neutral-100 border-2 border-neutral-200 text-neutral-900 hover:bg-neutral-150 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white',
    };

    const errorStyles = error ? 'border-error-500 focus:ring-error-500' : '';

    const inputClassName = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${errorStyles}
      ${fullWidth ? 'w-full' : ''}
      ${icon ? 'pl-10' : ''}
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
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClassName}
            {...props}
          />
        </div>

        {error && errorMessage && (
          <p className="mt-2 text-body-xs text-error-600 font-medium">{errorMessage}</p>
        )}

        {!error && helperText && (
          <p className="mt-2 text-body-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
