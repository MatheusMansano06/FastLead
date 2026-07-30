import React from 'react';

export const Divider = React.forwardRef(
  (
    {
      text = null,
      vertical = false,
      className = '',
      ...props
    },
    ref
  ) => {
    if (vertical) {
      return (
        <div
          ref={ref}
          className={`h-6 w-px bg-neutral-200 dark:bg-neutral-800 ${className}`.trim()}
          {...props}
        />
      );
    }

    if (text) {
      return (
        <div
          ref={ref}
          className={`flex items-center gap-4 my-6 ${className}`.trim()}
          {...props}
        >
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          <span className="text-body-sm text-neutral-500 dark:text-neutral-400 font-medium">
            {text}
          </span>
          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={`h-px bg-neutral-200 dark:bg-neutral-800 my-6 ${className}`.trim()}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';
