import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import AcessoTablet from './AcessoTablet';

const ACCENT = '#0A9D6C';

/**
 * Passo a passo do pareamento, em caixa flutuante.
 *
 * Aparece quando o motorista tenta aceitar um anúncio sem tablet pareado — a
 * API recusa com 400 e antes ele via só "Request failed with status code 400",
 * sem saber o que fazer.
 *
 * O QR abre o site no tablet; o código de 6 dígitos continua sendo digitado à
 * mão. Por isso o QR não carrega segredo nenhum e pode ficar exposto na tela do
 * celular sem risco de alguém parear um tablet que não é dele.
 */
export default function ModalPareamento({ aberto, aoFechar, aoParear }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [restante, setRestante] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    let cancelado = false;

    setDados(null);
    setErro('');
    apiClient
      .createPairingCode()
      .then((d) => !cancelado && setDados(d))
      .catch((e) => !cancelado && setErro(e?.message || 'Não foi possível gerar o código.'));

    return () => {
      cancelado = true;
    };
  }, [aberto]);

  // Conta o tempo que resta: o código expira em 15 minutos e um código vencido
  // faz o tablet recusar sem explicar o motivo.
  useEffect(() => {
    if (!dados?.expiresAt) return;
    const tick = () => {
      const ms = new Date(dados.expiresAt) - Date.now();
      setRestante(ms > 0 ? Math.ceil(ms / 60000) : 0);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [dados]);

  // Enquanto a caixa está aberta, confere se o tablet já apareceu — assim o
  // motorista não precisa adivinhar quando voltar para o celular.
  useEffect(() => {
    if (!aberto || !dados) return;
    const id = setInterval(async () => {
      try {
        const ds = await apiClient.getDriverDevices();
        if (ds.some((d) => d.status === 'ACTIVE')) aoParear?.();
      } catch {
        /* rede instável não deve fechar a caixa */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [aberto, dados, aoParear]);

  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const PASSOS = [
    {
      titulo: 'Abra o site no tablet do carro',
      texto:
        'Aponte a câmera do tablet para o QR, ou digite o endereço direto no navegador dele. Os dois levam à mesma tela.',
    },
    {
      titulo: 'Digite o código na tela do tablet',
      texto: 'São 6 dígitos. Aparecem no teclado do próprio tablet.',
    },
    {
      titulo: 'Pronto — volte aqui',
      texto: 'Com o tablet pareado você escolhe os anúncios normalmente, por aqui mesmo.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
              Pareie o tablet primeiro!
            </p>
            <h2 className="font-grotesk mt-1 text-xl font-bold text-ink">
              O anúncio precisa de uma tela para aparecer
            </h2>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-ink/40 transition hover:bg-black/5 hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {erro && (
            <div className="rounded-xl border border-[#FECDCA] bg-[#FFFBFA] px-4 py-3 text-sm text-[#B42318]">
              {erro}
            </div>
          )}

          <ol className="space-y-4">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{p.titulo}</p>
                  <p className="mt-0.5 text-sm text-ink/55">{p.texto}</p>

                  {i === 0 && (
                    <div className="mt-3">
                      {/* O endereço aparece mesmo enquanto o código carrega: quem
                          voltou aqui porque perdeu a aba precisa dele, não do
                          QR. Antes ele existia em 11px cinza sob o QR, largura
                          de 10rem e quebrado no meio — ilegível para digitar. */}
                      <AcessoTablet url={dados?.tabletUrl} qrCode={dados?.tabletUrlQrCode} />
                    </div>
                  )}

                  {i === 1 && (
                    <div className="mt-3">
                      {dados ? (
                        <>
                          <div
                            className="inline-flex items-center gap-2 rounded-2xl px-5 py-3"
                            style={{ background: `${ACCENT}14` }}
                          >
                            <span
                              className="font-grotesk text-3xl font-bold tabular-nums tracking-[0.3em]"
                              style={{ color: ACCENT }}
                            >
                              {dados.code}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-ink/45">
                            {restante === 0
                              ? 'Código expirado — feche e abra de novo para gerar outro.'
                              : restante != null
                                ? `Vale por mais ${restante} min.`
                                : ''}
                          </p>
                        </>
                      ) : (
                        !erro && <div className="h-12 w-44 animate-pulse rounded-2xl bg-black/5" />
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] px-6 py-4">
          <p className="text-xs text-ink/45">Assim que o tablet parear, esta janela fecha sozinha.</p>
          <button
            onClick={aoFechar}
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: ACCENT }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
