// Full-width accent submit button used across the auth flow.
export default function SubmitButton({
  children,
  loading = false,
  accent = '#2563FF',
  glow = 'rgba(37,99,255,0.5)',
  ...props
}) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold text-white no-underline transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      style={{ background: accent, boxShadow: `0 16px 40px -12px ${glow}` }}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
