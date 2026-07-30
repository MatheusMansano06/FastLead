import React from 'react';

export const Navbar = React.forwardRef(
  (
    {
      logo = null,
      title = null,
      items = [],
      rightContent = null,
      sticky = false,
      shadow = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const finalClassName = `
      bg-white
      dark:bg-neutral-900
      ${sticky ? 'sticky top-0 z-sticky' : ''}
      ${shadow ? 'shadow-elevation-1' : 'border-b border-neutral-200 dark:border-neutral-800'}
      transition-all
      duration-200
      ${className}
    `.trim();

    return (
      <nav
        ref={ref}
        className={finalClassName}
        {...props}
      >
        <div className="container flex items-center justify-between h-16 px-6">
          {/* Logo/Title Section */}
          <div className="flex items-center gap-4">
            {logo && (
              <div className="flex-shrink-0">
                {typeof logo === 'string' ? (
                  <img src={logo} alt="Logo" className="h-8" />
                ) : (
                  logo
                )}
              </div>
            )}

            {title && (
              <span className="text-heading-sm font-bold text-neutral-900 dark:text-white">
                {title}
              </span>
            )}
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center gap-2">
            {items.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className={`
                  px-4
                  py-2
                  rounded-md
                  text-body-md
                  font-medium
                  transition-all
                  duration-200
                  ${
                    item.active
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }
                `.trim()}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </a>
            ))}
          </div>

          {/* Right Content (User Menu, etc) */}
          <div className="flex items-center gap-4">
            {rightContent}
          </div>
        </div>
      </nav>
    );
  }
);

Navbar.displayName = 'Navbar';
