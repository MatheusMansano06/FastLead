import React from 'react';

export const Modal = React.forwardRef(
  (
    {
      isOpen = false,
      onClose = null,
      title = null,
      children,
      size = 'md',
      footer = null,
      closeButton = true,
      className = '',
      ...props
    },
    ref
  ) => {
    if (!isOpen) return null;

    const sizeStyles = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      'full': 'max-w-full',
    };

    React.useEffect(() => {
      const handleEscape = (e) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        return () => {
          document.removeEventListener('keydown', handleEscape);
          document.body.style.overflow = '';
        };
      }
    }, [isOpen, onClose]);

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-modal-backdrop transition-opacity"
          onClick={onClose}
          role="presentation"
        />

        {/* Modal */}
        <div
          className="fixed inset-0 flex items-center justify-center z-modal px-4"
          ref={ref}
          {...props}
        >
          <div
            className={`
              bg-white dark:bg-neutral-900
              rounded-lg
              shadow-elevation-3
              ${sizeStyles[size]}
              w-full
              max-h-[90vh]
              overflow-y-auto
              ${className}
            `.trim()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || closeButton) && (
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
                {title && (
                  <h2 className="text-heading-md font-bold text-neutral-900 dark:text-white">
                    {title}
                  </h2>
                )}
                {closeButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label="Close modal"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
                {footer}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';
