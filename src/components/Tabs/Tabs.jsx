import React from 'react';

export const Tabs = React.forwardRef(
  (
    {
      tabs = [],
      defaultActiveTab = 0,
      onChange = null,
      variant = 'default',
      className = '',
      ...props
    },
    ref
  ) => {
    const [activeTab, setActiveTab] = React.useState(defaultActiveTab);

    const handleTabChange = (index) => {
      setActiveTab(index);
      onChange?.(index);
    };

    const variantStyles = {
      default: 'border-b-2 border-neutral-200 dark:border-neutral-800',
      pills: 'bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg',
      underline: 'border-b-2 border-neutral-200 dark:border-neutral-800',
    };

    const tabButtonStyles = {
      default: `
        px-4 py-3
        text-body-md
        font-medium
        border-b-2
        transition-all
        duration-200
        ${
          activeTab === 0
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300'
        }
      `,
      pills: `
        px-4
        py-2
        text-body-md
        font-medium
        rounded-md
        transition-all
        duration-200
        ${
          activeTab === 0
            ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-elevation-1'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300'
        }
      `,
      underline: `
        px-4
        py-3
        text-body-md
        font-medium
        border-b-2
        transition-all
        duration-200
        ${
          activeTab === 0
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300'
        }
      `,
    };

    return (
      <div ref={ref} className={className} {...props}>
        {/* Tab Buttons */}
        <div
          className={`
            flex
            ${variant === 'pills' ? 'flex-wrap gap-2' : 'overflow-x-auto'}
            ${variantStyles[variant]}
          `.trim()}
          role="tablist"
        >
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              className={tabButtonStyles[variant]}
              role="tab"
              aria-selected={activeTab === index}
              aria-controls={`tab-content-${index}`}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {tabs.map((tab, index) => (
            <div
              key={index}
              id={`tab-content-${index}`}
              role="tabpanel"
              hidden={activeTab !== index}
              className={activeTab === index ? 'animate-fade-in' : 'hidden'}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
