// FastLead brand mark — pin de localização com o tablet no encosto do banco
// e a seta de crescimento. Paleta oficial: navy (#0B1D3A) + azul elétrico (#2563FF).
// Em superfícies escuras use onDark para o navy virar off-white.

export function LogoMark({ className = '', glow = false, onDark = false }) {
  const fg = onDark ? '#F2F4F7' : '#0B1D3A';
  return (
    <svg
      viewBox="0 0 128 122"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FastLead"
      style={glow ? { filter: 'drop-shadow(0 0 14px rgba(37,99,255,0.55))' } : undefined}
    >
      {/* Pin: anel + cauda apontando para baixo */}
      <path
        fillRule="evenodd"
        fill={fg}
        d="M24.6 73.1 A43 43 0 1 1 91.4 73.1 L58 114 Z M58 15 A31 31 0 1 0 58 77 A31 31 0 1 0 58 15 Z"
      />

      {/* Encosto de cabeça + hastes */}
      <rect x="45" y="21" width="26" height="14" rx="6" fill={fg} />
      <rect x="50.5" y="34" width="4" height="8" fill={fg} />
      <rect x="61.5" y="34" width="4" height="8" fill={fg} />

      {/* Tablet: moldura, tela, play e câmera */}
      <rect x="36" y="40" width="44" height="30" rx="5.5" fill={fg} />
      <rect x="40.5" y="44.5" width="35" height="18.5" rx="2.5" fill="#2563FF" />
      <path d="M52.5 48.5 L66 53.75 L52.5 59 Z" fill={onDark ? '#0B1D3A' : '#fff'} />
      <circle cx="58" cy="66.5" r="1.8" fill={onDark ? '#0B1D3A' : '#fff'} />

      {/* Seta de crescimento atravessando o pin */}
      <path
        fill="#2563FF"
        d="M26 58 C27 86 44 98 64 94 C84 90 103 62 112 34 L115.7 36.5 L120.2 6.9 L94.3 21.9 L98 24.4 C93 46 80 68 60 78 C44 84 30 70 26 58 Z"
      />
    </svg>
  );
}

export function LogoWordmark({ className = '', dark = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-auto" onDark={dark} />
      <span className="font-grotesk font-bold italic tracking-tight text-xl leading-none">
        <span className={dark ? 'text-offwhite' : 'text-ink'}>fast</span>
        <span className={dark ? 'text-[#4D82FF]' : 'text-brand'}>LEAD</span>
      </span>
    </div>
  );
}
