import React from 'react';

export const Avatar = React.forwardRef(
  (
    {
      src = null,
      alt = 'Avatar',
      initials = null,
      size = 'md',
      status = null,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      xs: 'w-6 h-6 text-body-xs',
      sm: 'w-8 h-8 text-body-sm',
      md: 'w-10 h-10 text-body-md',
      lg: 'w-12 h-12 text-body-md',
      xl: 'w-16 h-16 text-body-lg',
      '2xl': 'w-20 h-20 text-heading-xs',
    };

    const statusSizeStyles = {
      xs: 'w-2 h-2 bottom-0 right-0',
      sm: 'w-2.5 h-2.5 bottom-0 right-0',
      md: 'w-3 h-3 bottom-0 right-0',
      lg: 'w-3.5 h-3.5 bottom-0 right-0',
      xl: 'w-4 h-4 bottom-1 right-1',
      '2xl': 'w-5 h-5 bottom-1 right-1',
    };

    const statusColor = {
      online: 'bg-success-500',
      offline: 'bg-neutral-400',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
    };

    const finalClassName = `
      ${sizeStyles[size]}
      rounded-full
      flex-shrink-0
      overflow-hidden
      relative
      ${className}
    `.trim();

    return (
      <div ref={ref} className={finalClassName} {...props}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex-center text-white font-bold">
            {initials}
          </div>
        )}

        {status && (
          <div
            className={`
              absolute
              rounded-full
              border-2
              border-white
              dark:border-neutral-900
              ${statusColor[status]}
              ${statusSizeStyles[size]}
            `.trim()}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
