import clsx from 'clsx';

const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const variants = {
    success: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-200',
      icon: '✓',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: '✕',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: '⚠',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'ℹ',
    },
  };

  const variant = variants[type];

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg border-l-4',
        variant.bg,
        variant.border,
        variant.text,
        className
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <span className="flex-shrink-0 text-lg font-bold">{variant.icon}</span>
        <div className="flex-grow">
          {title && <h4 className="font-semibold">{title}</h4>}
          {message && <p className="text-body-sm">{message}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-lg font-bold opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
