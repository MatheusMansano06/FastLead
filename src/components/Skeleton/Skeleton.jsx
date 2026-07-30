import React from 'react';

export const Skeleton = React.forwardRef(
  (
    {
      className = '',
      variant = 'text',
      count = 1,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      text: 'h-4 rounded-md',
      avatar: 'h-10 w-10 rounded-full',
      'avatar-lg': 'h-20 w-20 rounded-full',
      'image-square': 'h-40 w-40 rounded-lg',
      'image-rect': 'h-40 w-full rounded-lg',
      'card': 'h-64 rounded-lg',
      'button': 'h-10 w-24 rounded-md',
      'title': 'h-6 rounded-md w-1/2',
    };

    const finalClassName = `
      animate-pulse
      bg-neutral-200
      dark:bg-neutral-800
      ${variantStyles[variant]}
      ${className}
    `.trim();

    if (count > 1) {
      return (
        <div className="space-y-3" ref={ref} {...props}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={finalClassName} />
          ))}
        </div>
      );
    }

    return <div ref={ref} className={finalClassName} {...props} />;
  }
);

Skeleton.displayName = 'Skeleton';
