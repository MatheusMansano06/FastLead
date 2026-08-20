import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PRESETS = [100, 250, 500, 1000];

const ROTULO_TX = {
  DEPOSIT: 'Crédito adicionado',
  CAMPAIGN_DEBIT: 'Anúncio publicado',
  LEAD_PAYOUT: 'Lead convertido (modelo antigo)',
  SCREEN_PAYOUT: 'Tempo de tela exibido',
  REFUND: 'Reembolso',
  ADJUSTMENT: 'Ajuste',
};

/** Entradas somam, o resto sai. Define o sinal e a cor da linha do extrato. */
const ehEntrada = (tipo) => tipo === 'DEPOSIT' || tipo === 'REFUND';

export default function CarteiraEmpresa() {
  const [saldo, setSaldo] = useState(null);
  const [retiravel, setRetiravel] = useState(null);
  const [extrato, setExtrato] = useState(null);
  const [erro, setErro] = useState('');

  const [abrindoValor, setAbrindoValor] = useState(false);
  const [valor, setValor] = useState('');
  const [gerando, setGerando] = useState(false);
  const [cobranca, setCobranca] = useState(null);
  const [pago, setPago] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [abrindoSaque, setAbrindoSaque] = useState(false);
  const [valorSaque, setValorSaque] = useState('');
  const [sacando, setSacando] = useState(false);
  const [aviso, setAviso] = useState('');

  const pollRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const [s, e, r] = await Promise.all([
        apiClient.getBalance(),
        apiClient.getBillingHistory(30),
        apiClient.getRefundable(),
      ]);
      setSaldo(s);
      setExtrato(e);
      setRetiravel(r);
      setErro('');
    } catch {
      setErro('Não foi possível carregar a carteira.');
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Enquanto o PIX estiver aberto, pergunta ao Mercado Pago se já caiu. O
  // webhook também credita — creditar é idempotente, então os dois caminhos
  // convivem sem creditar duas vezes.
  useEffect(() => {
    if (!cobranca || pago) return undefined;

    pollRef.current = setInterval(async () => {
      try {
        const r = await apiClient.verifyPayment(cobranca.payment_id);
        if (r.status === 'approved') {
          setPago(true);
          clearInterval(pollRef.current);
          carregar();
        }
      } catch {
        /* pagamento ainda não caiu; segue tentando */
      }
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [cobranca, pago, carregar]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const gerarPix = async (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;

    setGerando(true);
    setErro('');
    try {
      setCobranca(await apiClient.createPixCheckout(n));
      setPago(false);
    } catch (e) {
      const d = e?.response?.data;
      // O handler de erro da API às vezes devolve só { error: 'Error' }, que
      // não diz nada a quem está tentando pagar.
      const detalhe = [d?.message, d?.error].find((m) => m && m !== 'Error');
      setErro(detalhe || 'Não foi possível gerar o PIX. Tente de novo.');
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(cobranca.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const sacar = async () => {
    const n = Number(valorSaque);
    if (!Number.isFinite(n) || n <= 0) return;

    setSacando(true);
    setErro('');
    setAviso('');
    try {
      const r = await apiClient.refundBalance(n);
      setAviso(
        r.falhas > 0
          ? `${brl(r.estornado)} devolvidos. Parte não pôde ser estornada e continua no seu saldo.`
          : `${brl(r.estornado)} a caminho de volta para a origem do pagamento.`,
      );
      setAbrindoSaque(false);
      setValorSaque('');
      carregar();
    } catch (e) {
      const d = e?.response?.data;
      const detalhe = [d?.message, d?.error].find((m) => m && m !== 'Error');
      setErro(detalhe || 'Não foi possível concluir a retirada.');
    } finally {
      setSacando(false);
    }
  };

  const fechar = () => {
    clearInterval(pollRef.current);
    setCobranca(null);
    setPago(false);
    setAbrindoValor(false);
    setValor('');
  };

  return (
    <div className="space-y-5">
      {erro && (
        <div className="rounded-lg border border-[#FECDCA] bg-[#FFFBFA] px-4 py-3 text-sm text-[#B42318]">
          {erro}
        </div>
      )}

      {aviso && (
        <div className="rounded-lg border border-[#ABEFC6] bg-[#F6FEF9] px-4 py-3 text-sm text-[#067647]">
          {aviso}
        </div>
      )}

      {/* ── Saldo ── */}
      <div className="rounded-xl border border-[#E4E7EC] bg-white p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0B1D3A]/40">
          Saldo disponível
        </p>
        <p className="mt-1.5 font-grotesk text-4xl font-bold text-ink">
          {saldo == null ? '—' : brl(saldo)}
        </p>
        <p className="mt-2 text-sm text-[#0B1D3A]/55">
          É deste saldo que sai a comissão quando você converte um lead.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setAbrindoValor((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg bg-[#2563FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d54e0]"
          >
            Adicionar crédito
          </button>
          <button
            onClick={() => {
              setAbrindoSaque((v) => !v);
              setAbrindoValor(false);
            }}
            disabled={!retiravel}
            className="inline-flex items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-medium text-[#0B1D3A]/75 transition hover:bg-[#F7F8FA] disabled:opacity-50"
          >
            Retirar saldo
          </button>
          <button
            onClick={carregar}
            className="inline-flex items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-medium text-[#0B1D3A]/75 transition hover:bg-[#F7F8FA]"
          >
            Atualizar
          </button>
        </div>

        {abrindoSaque && (
          <div className="mt-5 border-t border-[#E4E7EC] pt-5">
            <p className="text-xs font-semibold text-[#0B1D3A]/70">
              Quanto você quer retirar?
            </p>
            <p className="mt-1 text-xs text-[#0B1D3A]/45">
              O valor volta para a mesma conta e forma de pagamento que usou na
              recarga. Não dá para escolher outro destino.
            </p>
            <p className="mt-2 text-xs font-semibold text-[#0B1D3A]/70">
              Disponível para retirada: {retiravel == null ? '—' : brl(retiravel)}
              {retiravel != null && saldo != null && retiravel < saldo && (
                <span className="ml-1 font-normal text-[#0B1D3A]/45">
                  — menor que o saldo porque só volta o que entrou por pagamento
                  e ainda não foi estornado.
                </span>
              )}
            </p>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                max={retiravel ?? undefined}
                value={valorSaque}
                onChange={(e) => setValorSaque(e.target.value)}
                placeholder={retiravel ? `até ${retiravel.toFixed(2)}` : '0,00'}
                className="w-40 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-[#0B1D3A]/35 focus:border-[#2563FF] focus:ring-2 focus:ring-[#2563FF22]"
              />
              <button
                disabled={sacando || !valorSaque}
                onClick={sacar}
                className="inline-flex items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1D3A]/80 transition hover:bg-[#F7F8FA] disabled:opacity-60"
              >
                {sacando ? 'Devolvendo…' : 'Confirmar retirada'}
              </button>
            </div>
          </div>
        )}

        {abrindoValor && !cobranca && (
          <div className="mt-5 border-t border-[#E4E7EC] pt-5">
            <p className="mb-2.5 text-xs font-semibold text-[#0B1D3A]/70">
              Quanto você quer adicionar?
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  disabled={gerando}
                  onClick={() => gerarPix(p)}
                  className="rounded-lg border border-[#E4E7EC] bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-[#2563FF] hover:text-[#2563FF] disabled:opacity-60"
                >
                  {brl(p)}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min="1"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Outro valor"
                className="w-40 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-[#0B1D3A]/35 focus:border-[#2563FF] focus:ring-2 focus:ring-[#2563FF22]"
              />
              <button
                disabled={gerando || !valor}
                onClick={() => gerarPix(valor)}
                className="inline-flex items-center justify-center rounded-lg bg-[#2563FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d54e0] disabled:opacity-60"
              >
                {gerando ? 'Gerando…' : 'Gerar PIX'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PIX gerado ── */}
      {cobranca && (
        <div className="rounded-xl border border-[#E4E7EC] bg-white p-6">
          {pago ? (
            <div className="text-center">
              <p className="font-grotesk text-lg font-bold text-[#067647]">
                Pagamento confirmado
              </p>
              <p className="mt-1 text-sm text-[#0B1D3A]/60">
                {brl(cobranca.amount)} entraram na sua carteira.
              </p>
              <button
                onClick={fechar}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#2563FF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d54e0]"
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-grotesk text-lg font-bold text-ink">
                    PIX de {brl(cobranca.amount)}
                  </p>
                  <p className="mt-1 text-sm text-[#0B1D3A]/60">
                    Escaneie o código ou use o copia-e-cola. O saldo entra sozinho
                    assim que o pagamento cair.
                  </p>
                </div>
                <button
                  onClick={fechar}
                  className="shrink-0 text-sm font-medium text-[#0B1D3A]/45 hover:text-ink"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
                {cobranca.qr_code_base64 && (
                  <img
                    src={`data:image/png;base64,${cobranca.qr_code_base64}`}
                    alt="QR Code do PIX"
                    className="h-44 w-44 shrink-0 rounded-lg border border-[#E4E7EC]"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-xs font-semibold text-[#0B1D3A]/70">
                    PIX copia-e-cola
                  </p>
                  <p className="break-all rounded-lg bg-[#F7F8FA] p-3 font-mono text-xs text-[#0B1D3A]/75">
                    {cobranca.qr_code}
                  </p>
                  <button
                    onClick={copiar}
                    className="mt-2.5 inline-flex items-center justify-center rounded-lg border border-[#E4E7EC] bg-white px-3.5 py-2 text-sm font-medium text-[#0B1D3A]/75 transition hover:bg-[#F7F8FA]"
                  >
                    {copiado ? 'Copiado' : 'Copiar código'}
                  </button>

                  <p className="mt-4 flex items-center gap-2 text-xs text-[#0B1D3A]/45">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563FF]" />
                    Aguardando o pagamento…
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Extrato ── */}
      <div className="rounded-xl border border-[#E4E7EC] bg-white">
        <div className="border-b border-[#E4E7EC] px-6 py-4">
          <h3 className="font-grotesk text-base font-bold text-ink">Extrato</h3>
        </div>

        {extrato == null ? (
          <p className="px-6 py-10 text-center text-sm text-[#0B1D3A]/45">Carregando…</p>
        ) : extrato.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[#0B1D3A]/45">
            Nenhuma movimentação ainda.
          </p>
        ) : (
          <ul className="divide-y divide-[#E4E7EC]">
            {extrato.map((tx) => {
              const entrada = ehEntrada(tx.type);
              return (
                <li key={tx.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {ROTULO_TX[tx.type] || tx.type}
                    </p>
                    <p className="truncate text-xs text-[#0B1D3A]/45">
                      {tx.campaign?.title || tx.description || '—'}
                      {' · '}
                      {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold ${
                        entrada ? 'text-[#067647]' : 'text-[#B42318]'
                      }`}
                    >
                      {entrada ? '+' : '−'} {brl(Math.abs(Number(tx.amount)))}
                    </p>
                    <p className="text-[11px] text-[#0B1D3A]/35">
                      saldo {brl(tx.balance_after)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
