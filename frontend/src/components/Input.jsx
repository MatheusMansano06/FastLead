import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const classes = clsx(
    'w-full px-4 py-2.5 rounded-lg',
    'bg-neutral-50 dark:bg-neutral-900',
    'border border-neutral-200 dark:border-neutral-800',
    'text-neutral-900 dark:text-neutral-50',
    'placeholder-neutral-500 dark:placeholder-neutral-400',
    'focus:outline-none focus:ring-2 focus:ring-primary-500',
    'transition-all duration-200',
    error && 'ring-2 ring-error border-error',
    disabled && 'opacity-60 cursor-not-allowed',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-body-md font-medium mb-2 text-neutral-900 dark:text-neutral-50">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={classes}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p className="text-error text-body-sm mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-neutral-500 dark:text-neutral-400 text-body-sm mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
