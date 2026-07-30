// "Compatible with" badges for the ride apps drivers use (brand-colored).
const APPS = [
  { name: 'Uber', bg: '#000000', fg: '#ffffff' },
  { name: '99', bg: '#FFDD00', fg: '#16161e' },
  { name: 'inDrive', bg: '#0b0b12', fg: '#C1F11D' },
  { name: 'Táxi', bg: '#FFC400', fg: '#16161e', emoji: '🚕' },
];

export default function AppBadges() {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
        Compatível com táxi e motoristas de aplicativo
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        {APPS.map((a) => (
          <span
            key={a.name}
            style={{ background: a.bg, color: a.fg }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold shadow-md ring-1 ring-black/10"
          >
            {a.emoji && <span className="text-base leading-none">{a.emoji}</span>}
            {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}
