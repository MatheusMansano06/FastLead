/**
 * Quanto do dia de tela já está vendido.
 *
 * O tablet tem um teto diário de minutos de anúncio, e cada campanha aceita
 * ocupa uma fatia fixa dele. Este é o número que decide se o motorista ainda
 * pode aceitar mais alguém — e antes ele só existia enterrado numa API.
 *
 * A barra usa uma cor só, com o restante em cinza: é uma grandeza sobre um
 * total, não categorias disputando identidade. As campanhas aparecem como
 * linhas de texto logo abaixo, então cada uma é identificada pelo nome e não
 * por uma cor que o motorista teria de decorar.
 */

const ACCENT = '#0a9d6c';

export default function ProgressoDoDia({ capacidade, carregando, aoVerOportunidades }) {
  if (carregando) {
    return <p className="text-sm text-ink/40">Carregando…</p>;
  }
  if (!capacidade) return null;

  const { capMinutes, committedMinutes, campaigns } = capacidade;
  const teto = Math.max(1, capMinutes);
  const usado = Math.min(committedMinutes, teto);
  const proporcao = (usado / teto) * 100;
  const livre = Math.max(0, capMinutes - committedMinutes);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-grotesk text-2xl font-bold text-ink">
          {capacidade.committedLabel}
        </span>
        <span className="text-sm text-ink/45">de {capacidade.capLabel} por dia</span>
      </div>

      {/* Ponta arredondada só do lado que cresce, ancorada na base. */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(proporcao, usado > 0 ? 3 : 0)}%`, background: ACCENT }}
        />
      </div>

      <p className="mt-2 text-xs text-ink/45">
        {livre > 0
          ? `Ainda cabem ${capacidade.availableLabel} de anúncio no seu dia.`
          : 'Seu dia está cheio. Para aceitar outro anúncio, remova um dos atuais.'}
      </p>

      {campaigns?.length > 0 ? (
        <ul className="mt-4 divide-y divide-black/[0.05] border-t border-black/[0.05]">
          {campaigns.map((c) => (
            <li key={c.campaignId} className="flex items-center justify-between gap-3 py-2.5">
              <span className="truncate text-sm text-ink/75">{c.title}</span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-ink/55">
                {c.dailyMinutes} min/dia
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <button
          onClick={aoVerOportunidades}
          className="mt-4 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-colors"
          style={{ borderColor: `${ACCENT}33`, background: `${ACCENT}0a`, color: ACCENT }}
        >
          Seu dia está livre — ver quem está buscando parceiros
        </button>
      )}
    </div>
  );
}
