import { useId, useState } from 'react';
import { passwordStrength } from '../../lib/validation';

// Password input with show/hide toggle, live strength meter and rule checklist.
// Set `meter={false}` on login screens where only the toggle is needed.

const BAR_COLORS = ['#ef4444', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];

export default function PasswordField({
  label = 'Senha',
  value = '',
  error,
  meter = true,
  accent = '#2563FF',
  ...props
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const invalid = Boolean(error);
  const { score, max, label: strengthLabel, rules } = passwordStrength(value);
  const pct = Math.round((score / max) * 100);
  const barColor = BAR_COLORS[Math.min(score, BAR_COLORS.length - 1)];

  const base =
    'w-full rounded-xl border bg-white px-4 py-3 pr-11 text-sm text-ink placeholder:text-ink/35 outline-none transition focus:ring-4 disabled:opacity-60';

  return (
    <div style={{ '--fl-accent': accent }}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink/80">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          className={`${base} ${invalid ? 'border-red-400 focus:border-red-500' : 'border-black/10 focus:border-[color:var(--fl-accent)]'}`}
          style={{ boxShadow: 'none', '--tw-ring-color': `${accent}22` }}
          aria-invalid={invalid}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 transition hover:text-ink/70"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <path d="M1 1l22 22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      {invalid && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}

      {meter && value.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            <span className="w-24 text-right text-xs font-semibold" style={{ color: barColor }}>
              {strengthLabel}
            </span>
          </div>
          <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {rules.map((r) => (
              <li
                key={r.key}
                className={`flex items-center gap-1.5 text-xs ${r.ok ? 'text-emerald-600' : 'text-ink/45'}`}
              >
                {r.ok ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                ) : (
                  <span className="inline-block h-[13px] w-[13px] rounded-full border border-ink/25" />
                )}
                {r.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
