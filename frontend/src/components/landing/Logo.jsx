// FastLead brand mark — fast-forward arrow + play + speed lines.
// Approximates the official logo with the brand gradient (blue → cyan → green).

export function LogoMark({ className = '', glow = false }) {
  const id = 'flgrad';
  return (
    <svg
      viewBox="0 0 132 84"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FastLead"
      style={glow ? { filter: 'drop-shadow(0 0 14px rgba(0,201,138,0.55))' } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="132" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563FF" />
          <stop offset="0.55" stopColor="#00B4D8" />
          <stop offset="1" stopColor="#00C98A" />
        </linearGradient>
      </defs>

      {/* Speed lines */}
      <circle cx="8" cy="18" r="6" fill="#2563FF" />
      <rect x="20" y="13" width="46" height="10" rx="5" fill={`url(#${id})`} />
      <rect x="4" y="37" width="70" height="10" rx="5" fill={`url(#${id})`} />
      <rect x="20" y="61" width="46" height="10" rx="5" fill={`url(#${id})`} />
      <circle cx="8" cy="66" r="6" fill="#00C98A" />

      {/* Forward chevron / arrow */}
      <path
        d="M74 8 L120 42 L74 76 L74 58 L96 42 L74 26 Z"
        fill={`url(#${id})`}
      />

      {/* Play button notch */}
      <rect x="60" y="28" width="28" height="28" rx="8" fill="#0B1D3A" />
      <path d="M70 36 L82 42 L70 48 Z" fill="#00C98A" />
    </svg>
  );
}

export function LogoWordmark({ className = '', dark = true }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark className="h-8 w-auto" />
      <span className="font-grotesk font-bold tracking-tight text-xl leading-none">
        <span className={dark ? 'text-offwhite' : 'text-ink'}>FAST</span>
        <span className={dark ? 'text-aqua' : 'text-brand'}>LEAD</span>
      </span>
    </div>
  );
}
