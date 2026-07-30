import { useId } from 'react';

// Labeled input with error/hint + optional right-side adornment.
// Works controlled; parent handles masking via onChange.

export default function Field({
  label,
  error,
  hint,
  optional = false,
  icon = null,
  as = 'input',
  children,
  className = '',
  accent = '#2563FF',
  ...props
}) {
  const id = useId();
  const invalid = Boolean(error);
  const Tag = as;

  const base =
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/35 outline-none transition ' +
    'focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60';
  const ok = 'border-black/10 focus:border-[color:var(--fl-accent)]';
  const bad = 'border-red-400 focus:border-red-500';

  return (
    <div className={className} style={{ '--fl-accent': accent }}>
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink/80">
          {label}
          {optional && <span className="text-xs font-normal text-ink/40">(opcional)</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40">
            {icon}
          </span>
        )}
        {as === 'select' ? (
          <select
            id={id}
            className={`${base} ${invalid ? bad : ok} ${icon ? 'pl-10' : ''} appearance-none pr-10`}
            style={{ boxShadow: 'none' }}
            aria-invalid={invalid}
            {...props}
          >
            {children}
          </select>
        ) : (
          <Tag
            id={id}
            className={`${base} ${invalid ? bad : ok} ${icon ? 'pl-10' : ''}`}
            style={{
              boxShadow: 'none',
              // focus ring color via accent
              '--tw-ring-color': `${accent}22`,
            }}
            aria-invalid={invalid}
            {...props}
          >
            {children}
          </Tag>
        )}
        {as === 'select' && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        )}
      </div>
      {invalid ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink/45">{hint}</p>
      ) : null}
    </div>
  );
}
