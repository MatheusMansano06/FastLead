import { motion, useTransform } from 'framer-motion';
import { LogoMark } from './Logo';
import Reveal from './Reveal';

const SCREEN = 'absolute inset-0 flex flex-col items-center justify-center p-5 text-center';

// A cross-fading layer inside the tablet screen, keyed to scroll progress.
// `range` offsets must stay within [0,1] (WAAPI requirement).
function ScreenLayer({ progress, range, output = [0, 1, 1, 0], children }) {
  const opacity = useTransform(progress, range, output);
  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center"
    >
      {children}
    </motion.div>
  );
}

// Stylized QR matrix (decorative — reads as a QR without encoding data).
const QR = [
  '11101010111',
  '11100110111',
  '11110101111',
  '01011011010',
  '10101110101',
  '01110101100',
  '10001010011',
  '01011101010',
  '11101011010',
  '11110110101',
  '11101001110',
];

export default function Tablet({ progress, reduced }) {
  return (
    <div className="relative">
      {/* Device frame */}
      <div className="relative w-[clamp(220px,26vw,330px)] aspect-[3/4] rounded-[2rem] bg-gradient-to-b from-[#1c1c24] to-[#050507] p-3 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
        {/* Camera */}
        <div className="absolute left-1/2 top-4 z-20 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/25" />
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[1.4rem] bg-ink">
          {/* screen ambient */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(0,201,138,0.18),transparent_60%)]" />

          {/* 1 · Logo (hero) — visible from the very top */}
          <Reveal progress={progress} o={[0.09, 0.14]} oOut={[1, 0]} className={SCREEN}>
            <LogoMark className="h-16 w-auto" glow />
            <p className="mt-5 font-grotesk text-lg font-bold tracking-tight text-offwhite">
              FAST<span className="text-brand">LEAD</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-offwhite/45">
              Anuncie em movimento
            </p>
          </Reveal>

          {/* 2 · Anúncio rodando */}
          <ScreenLayer progress={progress} range={[0.12, 0.17, 0.30, 0.35]}>
            <div className="w-full overflow-hidden rounded-2xl bg-graphite ring-1 ring-white/10">
              <div className="flex h-16 items-center justify-center bg-gradient-to-br from-[#ff7a1f] to-[#ff5d5d] text-2xl">
                ☕
              </div>
              <div className="p-3 text-left">
                <span className="rounded-full bg-[#ff5d5d]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#ff8a6b]">
                  Oferta
                </span>
                <p className="mt-2 font-grotesk text-base font-bold leading-tight text-offwhite">
                  30% OFF no seu café
                </p>
                <p className="mt-0.5 text-[11px] text-offwhite/55">Só hoje, perto de você</p>
                <div className="mt-3 rounded-lg bg-brand py-1.5 text-center text-xs font-semibold text-white">
                  Pedir agora
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-offwhite/35">
              Tela cheia · sem concorrência
            </p>
          </ScreenLayer>

          {/* 3 · Audiência ao vivo */}
          <ScreenLayer progress={progress} range={[0.32, 0.37, 0.50, 0.55]}>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mint">
                Ao vivo
              </span>
            </div>
            <p className="mt-4 font-grotesk text-4xl font-bold text-offwhite">1.248</p>
            <p className="text-xs text-offwhite/55">passageiros agora</p>
            <div className="mt-4 grid w-full grid-cols-3 gap-1.5">
              {['SP', 'RJ', 'BH', 'POA', 'REC', 'CWB'].map((c, i) => (
                <div
                  key={c}
                  className="rounded-lg bg-graphite py-1.5 text-[9px] font-semibold text-aqua ring-1 ring-white/5"
                  style={{ opacity: 0.55 + (i % 3) * 0.15 }}
                >
                  {c}
                </div>
              ))}
            </div>
          </ScreenLayer>

          {/* 4 · QR code */}
          <ScreenLayer progress={progress} range={[0.52, 0.57, 0.70, 0.75]}>
            <div className="relative rounded-2xl bg-white p-3">
              <div className="grid grid-cols-11 gap-[3px]">
                {QR.flatMap((row, y) =>
                  row.split('').map((cell, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`h-2 w-2 rounded-[1px] ${cell === '1' ? 'bg-ink' : 'bg-transparent'}`}
                    />
                  )),
                )}
              </div>
              {!reduced && (
                <div className="pointer-events-none absolute inset-x-3 top-3 h-0.5 animate-[scan_2.2s_ease-in-out_infinite] bg-mint shadow-[0_0_10px_2px_rgba(0,201,138,0.8)]" />
              )}
            </div>
            <p className="mt-4 font-grotesk text-sm font-bold text-offwhite">Aponte a câmera</p>
            <p className="text-[11px] text-offwhite/55">e entre pra promoção</p>
          </ScreenLayer>

          {/* 5 · Lead capturado */}
          <ScreenLayer progress={progress} range={[0.72, 0.77, 0.84, 0.88]}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint/15 ring-2 ring-mint">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-mint" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5 5L20 6" />
              </svg>
            </div>
            <p className="mt-4 font-grotesk text-lg font-bold text-offwhite">Lead capturado</p>
            <div className="mt-3 w-full rounded-xl bg-graphite p-3 text-left ring-1 ring-white/10">
              <p className="text-xs font-semibold text-offwhite">Marina S.</p>
              <p className="text-[11px] text-offwhite/55">(11) 9•••• ••••</p>
              <p className="mt-1 text-[10px] font-medium text-mint">→ adicionado ao seu CRM</p>
            </div>
          </ScreenLayer>

          {/* Finale · Logo again — visible through the very end */}
          <Reveal progress={progress} o={[0.86, 0.92]} oOut={[0, 1]} className={SCREEN}>
            <LogoMark className="h-16 w-auto" glow />
            <p className="mt-5 font-grotesk text-lg font-bold tracking-tight text-offwhite">
              FAST<span className="text-brand">LEAD</span>
            </p>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
