import React from 'react';

export const Toast = React.forwardRef(
  (
    {
      message = '',
      type = 'info',
      position = 'bottom-right',
      duration = 3000,
      onClose = null,
      action = null,
      className = '',
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (duration) {
        const timeout = setTimeout(onClose, duration);
        return () => clearTimeout(timeout);
      }
    }, [duration, onClose]);

    const typeStyles = {
      success: 'bg-success-600 text-white',
      error: 'bg-error-600 text-white',
      warning: 'bg-warning-600 text-white',
      info: 'bg-info-600 text-white',
      default: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
    };

    const positionStyles = {
      'top-left': 'top-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
      'bottom-right': 'bottom-4 right-4',
    };

    return (
      <div
        ref={ref}
        className={`
          fixed
          ${positionStyles[position]}
          max-w-sm
          px-6
          py-4
          rounded-lg
          shadow-elevation-3
          flex
          items-center
          justify-between
          gap-4
          animate-slide-in-bottom
          ${typeStyles[type]}
          ${className}
        `.trim()}
        role="alert"
        {...props}
      >
        <p className="text-body-md font-medium">{message}</p>

        <div className="flex items-center gap-2 ml-2">
          {action && (
            <button
              onClick={action.onClick}
              className="text-body-sm font-semibold hover:opacity-80 transition-opacity underline"
            >
              {action.label}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-body-sm hover:opacity-70 transition-opacity"
              aria-label="Close toast"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }
);

Toast.displayName = 'Toast';
