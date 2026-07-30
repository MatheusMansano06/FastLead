// Static, JourneyTV-style landscape tablet mockup used in the non-animated
// sections. Renders a fake in-car ad screen with a neutral ride bar (no real
// competitor branding). Three variants: display · video · interactive (QR).

function IconMoon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}
function IconVolume({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M16 9a3 3 0 0 1 0 6" />
    </svg>
  );
}
function IconSun({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function IconPin({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  );
}

// Decorative QR (reads as a QR without encoding data).
const QR = [
  '1110101',
  '1001011',
  '1011101',
  '0101010',
  '1110011',
  '0100101',
  '1011110',
];

function AdBadge() {
  return (
    <span className="absolute bottom-2 right-2 z-20 rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur">
      Ad
    </span>
  );
}

function RideBar() {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-black/5 bg-white/95 px-3 py-1.5 text-ink/55 backdrop-blur">
      <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.15em]">
        <IconPin className="h-3 w-3 text-brand" /> Em corrida
      </span>
      <div className="flex items-center gap-3.5">
        <span className="flex flex-col items-center gap-0.5 text-[7px] uppercase tracking-wide">
          <IconMoon className="h-3.5 w-3.5" /> Soneca
        </span>
        <span className="flex flex-col items-center gap-0.5 text-[7px] uppercase tracking-wide">
          <IconVolume className="h-3.5 w-3.5" /> Volume
        </span>
        <span className="flex flex-col items-center gap-0.5 text-[7px] uppercase tracking-wide">
          <IconSun className="h-3.5 w-3.5" /> Brilho
        </span>
      </div>
      <span className="text-[9px] font-semibold tracking-wide">20:17 · desembarque</span>
    </div>
  );
}

function BrandChip({ brand }) {
  return (
    <span className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm backdrop-blur">
      <span className="h-2 w-2 rounded-full bg-brand" />
      {brand}
    </span>
  );
}

// On-brand palette only (electric blue · navy · cyan · mint) so the mockups
// belong to the same world as the 3D narrative.
const TONES = {
  brand: 'from-[#2563FF] via-[#3f7bff] to-[#00B4D8]',
  deep: 'from-[#0B1D3A] via-[#173a72] to-[#2563FF]',
  mint: 'from-[#00C98A] via-[#00b4d8] to-[#0B1D3A]',
};

export default function AdTablet({
  variant = 'display',
  brand = 'Aurora',
  eyebrow = 'Apresentando',
  headline = 'Sua próxima\nexperiência',
  tone = 'brand',
  className = '',
}) {
  const gradient = TONES[tone] ?? TONES.brand;

  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[1.5rem] bg-gradient-to-b from-[#16161e] to-[#050507] p-2 shadow-[0_40px_110px_-30px_rgba(11,29,58,0.55)] ring-1 ring-black/10">
        <div className="flex aspect-[16/10] w-full flex-col overflow-hidden rounded-[1.05rem] bg-ink">
          {/* Ad area */}
          <div className="relative flex-1 overflow-hidden">
            {variant === 'interactive' ? (
              <div className="flex h-full">
                {/* QR half */}
                <div className="flex w-[42%] flex-col items-center justify-center gap-2 bg-white p-3">
                  <div className="grid grid-cols-7 gap-[2px]">
                    {QR.flatMap((row, y) =>
                      row.split('').map((c, x) => (
                        <span
                          key={`${x}-${y}`}
                          className={`h-1.5 w-1.5 rounded-[1px] ${c === '1' ? 'bg-ink' : 'bg-transparent'}`}
                        />
                      )),
                    )}
                  </div>
                  <p className="text-center text-[8px] font-semibold leading-tight text-ink/60">
                    Escaneie e fale
                    <br />
                    direto com a marca
                  </p>
                </div>
                {/* Ad half */}
                <div className={`relative flex-1 bg-gradient-to-br ${gradient}`}>
                  <BrandChip brand={brand} />
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {eyebrow}
                    </p>
                    <p className="whitespace-pre-line font-grotesk text-lg font-bold leading-[1.02] text-white">
                      {headline}
                    </p>
                  </div>
                  <AdBadge />
                </div>
              </div>
            ) : (
              <div className={`relative h-full bg-gradient-to-br ${gradient}`}>
                <BrandChip brand={brand} />

                {variant === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur">
                      <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 text-ink" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                    {eyebrow}
                  </p>
                  <p className="whitespace-pre-line font-grotesk text-2xl font-bold leading-[1.02] text-white md:text-[26px]">
                    {headline}
                  </p>
                  {variant === 'display' && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-ink shadow-sm">
                      Enviar pro e-mail →
                    </span>
                  )}
                </div>
                <AdBadge />
              </div>
            )}
          </div>

          {/* Neutral in-car ride bar */}
          <RideBar />
        </div>
      </div>
    </div>
  );
}
