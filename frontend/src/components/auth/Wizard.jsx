// Chrome compartilhado dos cadastros em etapas (empresa e motorista).
// O formulário inteiro não cabe numa tela; quebrar em passos evita o scroll
// longo e deixa cada etapa centralizada no viewport.

/** Constrói o mapa campo -> índice do passo, para saber quando exibir cada erro. */
export function fieldStepMap(steps) {
  const m = {};
  steps.forEach((s, i) => s.fields.forEach((f) => { m[f] = i; }));
  return m;
}

export function Stepper({ steps, current, accent }) {
  return (
    <ol className="mb-6 flex list-none items-start gap-2 p-0">
      {steps.map((s, i) => {
        const reached = i <= current;
        return (
          <li key={s.label} className="flex flex-1 flex-col gap-1.5">
            <span
              className="h-1 rounded-full transition-colors duration-300"
              style={{ background: reached ? accent : 'rgba(11,29,58,0.12)' }}
            />
            <span
              className="text-[11px] font-medium leading-tight transition-colors"
              style={{ color: i === current ? accent : 'rgba(11,29,58,0.4)' }}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WizardNav({ step, onBack, children }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      {step > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-ink/70 transition hover:border-black/20 hover:text-ink"
        >
          Voltar
        </button>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Botão "Continuar" das etapas intermediárias — mesmo peso visual do submit. */
export function NextButton({ accent, glow }) {
  return (
    <button
      type="submit"
      className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
      style={{ background: accent, boxShadow: `0 10px 30px -10px ${glow}` }}
    >
      Continuar
    </button>
  );
}
