import React from 'react';

export const Accordion = React.forwardRef(
  (
    {
      items = [],
      defaultOpenIndex = null,
      allowMultiple = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const [openIndexes, setOpenIndexes] = React.useState(
      defaultOpenIndex !== null ? [defaultOpenIndex] : []
    );

    const toggleItem = (index) => {
      if (allowMultiple) {
        setOpenIndexes((prev) =>
          prev.includes(index)
            ? prev.filter((i) => i !== index)
            : [...prev, index]
        );
      } else {
        setOpenIndexes((prev) =>
          prev.includes(index) ? [] : [index]
        );
      }
    };

    return (
      <div ref={ref} className={`space-y-2 ${className}`} {...props}>
        {items.map((item, index) => (
          <div
            key={index}
            className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => toggleItem(index)}
              className={`
                w-full
                flex
                items-center
                justify-between
                px-6
                py-4
                transition-all
                duration-200
                hover:bg-neutral-50
                dark:hover:bg-neutral-800
                ${
                  openIndexes.includes(index)
                    ? 'bg-primary-50 dark:bg-primary-950'
                    : ''
                }
              `.trim()}
              aria-expanded={openIndexes.includes(index)}
              aria-controls={`accordion-content-${index}`}
            >
              <span className="text-heading-sm font-semibold text-neutral-900 dark:text-white">
                {item.label}
              </span>

              <svg
                className={`
                  w-5
                  h-5
                  transition-transform
                  duration-200
                  ${
                    openIndexes.includes(index)
                      ? 'rotate-180'
                      : ''
                  }
                `.trim()}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Content */}
            {openIndexes.includes(index) && (
              <div
                id={`accordion-content-${index}`}
                className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800"
              >
                {item.content}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

Accordion.displayName = 'Accordion';
