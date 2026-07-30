import { LogoMark } from './Logo';

// Stylized QR matrix (decorative).
const QR = [
  '11101010111', '11100110111', '11110101111', '01011011010',
  '10101110101', '01110101100', '10001010011', '01011101010',
  '11101011010', '11110110101', '11101001110',
];

function Panel({ active, children }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

// The morphing UI that lives on the 3D tablet's screen. `section` is the active
// narrative beat (0..5).
export default function ScreenContent({ section }) {
  return (
    <div className="relative h-[440px] w-[312px] overflow-hidden rounded-[26px] bg-ink font-sans">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(0,201,138,0.22),transparent_60%)]" />

      {/* 0 · Logo */}
      <Panel active={section === 0}>
        <LogoMark className="h-20 w-auto" glow />
        <p className="mt-6 font-grotesk text-2xl font-bold tracking-tight text-offwhite">
          FAST<span className="text-brand">LEAD</span>
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-offwhite/45">
          Anuncie em movimento
        </p>
      </Panel>

      {/* 1 · Anúncio */}
      <Panel active={section === 1}>
        <div className="w-full overflow-hidden rounded-2xl bg-graphite ring-1 ring-white/10">
          <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#ff7a1f] to-[#ff5d5d] text-4xl">
            ☕
          </div>
          <div className="p-4 text-left">
            <span className="rounded-full bg-[#ff5d5d]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ff8a6b]">
              Oferta
            </span>
            <p className="mt-2 font-grotesk text-xl font-bold leading-tight text-offwhite">
              30% OFF no seu café
            </p>
            <p className="mt-0.5 text-xs text-offwhite/55">Só hoje, perto de você</p>
            <div className="mt-3 rounded-lg bg-brand py-2 text-center text-sm font-semibold text-white">
              Pedir agora
            </div>
          </div>
        </div>
      </Panel>

      {/* 2 · Audiência ao vivo */}
      <Panel active={section === 2}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-mint">Ao vivo</span>
        </div>
        <p className="mt-5 font-grotesk text-6xl font-bold text-offwhite">1.248</p>
        <p className="text-sm text-offwhite/55">passageiros agora</p>
        <div className="mt-5 grid w-full grid-cols-3 gap-2">
          {['SP', 'RJ', 'BH', 'POA', 'REC', 'CWB'].map((c, i) => (
            <div
              key={c}
              className="rounded-lg bg-graphite py-2 text-[11px] font-semibold text-aqua ring-1 ring-white/5"
              style={{ opacity: 0.55 + (i % 3) * 0.15 }}
            >
              {c}
            </div>
          ))}
        </div>
      </Panel>

      {/* 3 · QR */}
      <Panel active={section === 3}>
        <div className="rounded-2xl bg-white p-4">
          <div className="grid grid-cols-11 gap-[3px]">
            {QR.flatMap((row, y) =>
              row.split('').map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`h-2.5 w-2.5 rounded-[1px] ${cell === '1' ? 'bg-ink' : 'bg-transparent'}`}
                />
              )),
            )}
          </div>
        </div>
        <p className="mt-5 font-grotesk text-lg font-bold text-offwhite">Aponte a câmera</p>
        <p className="text-sm text-offwhite/55">e entre pra promoção</p>
      </Panel>

      {/* 4 · Motorista / ganhos */}
      <Panel active={section === 4}>
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-mint">
          Sua renda extra
        </span>
        <p className="mt-4 font-grotesk text-5xl font-bold text-offwhite">R$ 1.240</p>
        <p className="text-sm text-offwhite/55">ganhos este mês</p>
        <div className="mt-5 flex w-full items-center justify-between rounded-xl bg-graphite p-3 ring-1 ring-white/10">
          <span className="text-2xl">🚕</span>
          <div className="text-right">
            <p className="text-xs font-semibold text-offwhite">Só dirigindo</p>
            <p className="text-[11px] text-mint">+18% vs. mês passado</p>
          </div>
        </div>
      </Panel>

      {/* 5 · Finale */}
      <Panel active={section === 5}>
        <LogoMark className="h-20 w-auto" glow />
        <p className="mt-6 font-grotesk text-2xl font-bold tracking-tight text-offwhite">
          FAST<span className="text-brand">LEAD</span>
        </p>
        <p className="mt-2 text-sm text-offwhite/55">Bora começar?</p>
      </Panel>
    </div>
  );
}
