import React from 'react';

export const Sidebar = React.forwardRef(
  (
    {
      items = [],
      activeItem = null,
      onItemClick = null,
      footer = null,
      collapsed = false,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <aside
        ref={ref}
        className={`
          bg-white
          dark:bg-neutral-900
          border-r
          border-neutral-200
          dark:border-neutral-800
          h-screen
          overflow-y-auto
          transition-all
          duration-300
          ${collapsed ? 'w-20' : 'w-64'}
          ${className}
        `.trim()}
        {...props}
      >
        {/* Sidebar Content */}
        <nav className="p-4 space-y-2">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => onItemClick?.(item.id)}
              className={`
                w-full
                flex
                items-center
                gap-3
                px-4
                py-3
                rounded-lg
                text-body-md
                font-medium
                transition-all
                duration-200
                ${
                  activeItem === item.id
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }
              `.trim()}
            >
              {item.icon && (
                <span className="flex-shrink-0">{item.icon}</span>
              )}
              {!collapsed && (
                <span className="flex-1 text-left">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-800">
            {footer}
          </div>
        )}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';
