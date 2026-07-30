import React from 'react';

export const Alert = React.forwardRef(
  (
    {
      type = 'info',
      title = null,
      message = null,
      closable = false,
      onClose = null,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(true);

    if (!isVisible) return null;

    const typeStyles = {
      success: {
        bg: 'bg-success-50 dark:bg-success-950',
        border: 'border-success-200 dark:border-success-800',
        text: 'text-success-900 dark:text-success-100',
        icon: '✓',
      },
      error: {
        bg: 'bg-error-50 dark:bg-error-950',
        border: 'border-error-200 dark:border-error-800',
        text: 'text-error-900 dark:text-error-100',
        icon: '!',
      },
      warning: {
        bg: 'bg-warning-50 dark:bg-warning-950',
        border: 'border-warning-200 dark:border-warning-800',
        text: 'text-warning-900 dark:text-warning-100',
        icon: '⚠',
      },
      info: {
        bg: 'bg-info-50 dark:bg-info-950',
        border: 'border-info-200 dark:border-info-800',
        text: 'text-info-900 dark:text-info-100',
        icon: 'ℹ',
      },
    };

    const style = typeStyles[type];

    const handleClose = () => {
      setIsVisible(false);
      onClose?.();
    };

    return (
      <div
        ref={ref}
        className={`
          ${style.bg}
          ${style.border}
          ${style.text}
          border-l-4
          rounded-md
          p-4
          flex
          gap-4
          ${className}
        `.trim()}
        role="alert"
        {...props}
      >
        {/* Icon */}
        <div className="flex-shrink-0 flex items-start justify-center w-6 h-6 font-bold mt-0.5">
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          {title && (
            <h4 className="font-bold text-body-md mb-1">{title}</h4>
          )}
          {message && (
            <p className="text-body-sm">{message}</p>
          )}
        </div>

        {/* Close Button */}
        {closable && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-body-md opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
