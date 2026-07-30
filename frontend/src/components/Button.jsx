import clsx from 'clsx';

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 dark:bg-secondary-700 dark:hover:bg-secondary-600',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 dark:border-primary-400 dark:text-primary-400',
    ghost: 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950',
    danger: 'bg-error text-white hover:bg-red-600 dark:hover:bg-red-700',
    success: 'bg-success text-white hover:bg-green-600 dark:hover:bg-green-700',
  };

  const sizes = {
    sm: 'px-3 py-2 text-body-sm',
    md: 'px-4 py-2.5 text-body-md',
    lg: 'px-6 py-3 text-body-lg',
  };

  const classes = clsx(
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    isLoading && 'opacity-70 cursor-wait',
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
