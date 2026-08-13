import { useState } from 'react';

const ACCENT = '#0A9D6C';

/**
 * Endereço do site que roda no tablet, pronto para ser aberto de novo.
 *
 * Encerrar a jornada apaga o aparelho no servidor: no dia seguinte o motorista
 * precisa parear outra vez. Só que a tela do tablet mora numa aba do navegador
 * — se ele fechou a aba, o endereço foi junto, e o que as telas ofereciam era
 * "abra /tablet", um caminho relativo que não se digita em lugar nenhum.
 *
 * Por isso o endereço aparece sempre, inteiro e copiável, mesmo antes de gerar
 * código. O QR só existe depois, porque quem o desenha é o servidor junto com
 * o código — desenhar no navegador exigiria uma biblioteca a mais só para isso.
 */
export default function AcessoTablet({ url, qrCode, className = '' }) {
  const [copiado, setCopiado] = useState(false);

  // Sem código gerado ainda o servidor não mandou endereço. O app do motorista
  // e a tela do tablet moram no mesmo domínio, então dá para montar daqui.
  const endereco = url || `${window.location.origin}/tablet`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(endereco);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* navegador sem permissão de área de transferência: o endereço está à
         vista e pode ser digitado, então não vale travar a tela com um erro */
    }
  };

  return (
    <div className={`rounded-2xl border border-ink/[0.07] bg-black/[0.02] p-4 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
        Endereço do tablet
      </p>
      <p className="mt-1 text-sm text-ink/55">
        Abra este endereço no navegador do tablet do carro. Vale para hoje e para os
        próximos dias — se fechar a aba, é por aqui que você volta.
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {qrCode && (
          <img
            src={qrCode}
            alt="QR para abrir o site no tablet"
            className="h-28 w-28 shrink-0 rounded-xl border border-ink/[0.07] bg-white p-1"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2.5">
            {/* `break-all` mantém o endereço inteiro visível no celular em vez
                de cortá-lo — é para ser lido e digitado, não decorado. */}
            <code className="min-w-0 flex-1 break-all font-mono text-sm text-ink/80">
              {endereco}
            </code>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copiar}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: ACCENT }}
            >
              {copiado ? 'Copiado!' : 'Copiar link'}
            </button>
            <a
              href={endereco}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 transition hover:border-ink/20 hover:text-ink"
            >
              Abrir em nova aba
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
