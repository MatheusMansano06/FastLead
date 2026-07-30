import React from 'react';

export const Card = React.forwardRef(
  (
    {
      children,
      className = '',
      hoverable = false,
      interactive = false,
      bordered = true,
      shadow = 'elevation-1',
      padding = 'md',
      onClick = null,
      ...props
    },
    ref
  ) => {
    const paddingStyles = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const shadowStyles = {
      none: '',
      'elevation-1': 'shadow-elevation-1',
      'elevation-1-hover': 'shadow-elevation-1 hover:shadow-elevation-1-hover',
      'elevation-2': 'shadow-elevation-2',
      'elevation-2-hover': 'shadow-elevation-2 hover:shadow-elevation-2-hover',
      'elevation-3': 'shadow-elevation-3',
      'elevation-3-hover': 'shadow-elevation-3 hover:shadow-elevation-3-hover',
    };

    const finalClassName = `
      bg-white dark:bg-neutral-900
      ${bordered ? 'border border-neutral-200 dark:border-neutral-800' : ''}
      ${paddingStyles[padding]}
      ${shadowStyles[shadow]}
      rounded-lg
      transition-all duration-200
      ${hoverable ? 'hover:shadow-elevation-1-hover hover:border-primary-200' : ''}
      ${interactive ? 'cursor-pointer hover:border-primary-400' : ''}
      ${className}
    `.trim();

    return (
      <div
        ref={ref}
        className={finalClassName}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
