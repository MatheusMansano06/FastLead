import React from 'react';

export const Badge = React.forwardRef(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      icon = null,
      removable = false,
      onRemove = null,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100',
      secondary: 'bg-secondary-100 text-secondary-900 dark:bg-secondary-900 dark:text-secondary-100',
      success: 'bg-success-100 text-success-900 dark:bg-success-900 dark:text-success-100',
      error: 'bg-error-100 text-error-900 dark:bg-error-900 dark:text-error-100',
      warning: 'bg-warning-100 text-warning-900 dark:bg-warning-900 dark:text-warning-100',
      info: 'bg-info-100 text-info-900 dark:bg-info-900 dark:text-info-100',
      neutral: 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
    };

    const sizeStyles = {
      sm: 'px-2 py-1 text-body-xs rounded-xs gap-1',
      md: 'px-3 py-1.5 text-body-sm rounded-sm gap-1.5',
      lg: 'px-4 py-2 text-body-md rounded-md gap-2',
    };

    const finalClassName = `
      inline-flex items-center
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      font-medium
      rounded-full
      transition-all duration-200
      ${className}
    `.trim();

    return (
      <span ref={ref} className={finalClassName} {...props}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            onClick={onRemove}
            className="ml-1.5 focus:outline-none hover:opacity-70 transition-opacity"
            aria-label="Remove badge"
          >
            ×
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
