import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/app/AppHeader';
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import CapturaSelfie from '../../components/app/CapturaSelfie';

/**
 * Verificação de identidade do motorista e, quando o tablet é nosso, aceite do
 * comodato.
 *
 * Todo motorista passa por aqui antes de parear qualquer aparelho — inclusive
 * quem usa tablet próprio. A verificação é portão de entrada da plataforma,
 * não só garantia do equipamento. O que muda entre os dois caminhos é o
 * contrato: só quem leva tablet da FastLead assina comodato e recebe um código
 * de retirada para mostrar na entrega.
 */

const ACCENT = '#0a9d6c';

/** Lado maior da foto do documento. Menos que isso e o RG fica ilegível. */
const DOC_MAX_PX = 1280;

/**
 * TEXTO DO CONTRATO DE COMODATO — substituir pelo definitivo.
 *
 * Ao trocar este texto, suba também CONTRACT_VERSION no backend
 * (src/services/tabletRequestService.ts): os aceites já gravados continuam
 * apontando para a versão que a pessoa de fato leu.
 */
const CONTRATO_COMODATO = `CONTRATO DE COMODATO DE EQUIPAMENTO

1. A FastLead empresta ao motorista, sem cobrança, 1 (um) tablet de sua
propriedade, destinado exclusivamente à exibição de anúncios da plataforma.

2. O equipamento continua sendo propriedade da FastLead durante todo o período
do empréstimo. O motorista é responsável pela guarda e conservação.

3. Em caso de perda, furto, roubo ou dano, o motorista deve comunicar a
FastLead imediatamente.

4. O motorista devolverá o equipamento ao encerrar sua participação na
plataforma ou quando solicitado.

[TEXTO PROVISÓRIO — substituir pelo contrato definitivo antes de operar.]`;

/**
 * Reduz a foto no próprio navegador antes de subir.
 *
 * Não existe storage de arquivo no projeto: a imagem vai como data-URL para o
 * Postgres. Uma foto de celular sem tratamento tem 4 MB e o servidor recusa
 * qualquer coisa acima de ~300 KB, então o redimensionamento aqui não é
 * otimização, é o que faz o envio funcionar.
 */
function fileToDocDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const escala = Math.min(1, DOC_MAX_PX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('Não consegui ler essa imagem'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Não consegui ler esse arquivo'));
    reader.readAsDataURL(file);
  });
}

function Card({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-black/5 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(6,40,29,0.5)] ${className}`}
    >
      {children}
    </section>
  );
}

/** Uma das três fotos. Abre a câmera direto no celular. */
function FotoSlot({ label, hint, facing, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [erro, setErro] = useState(null);
  const [lendo, setLendo] = useState(false);

  const escolher = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo depois de um erro
    if (!file) return;
    setErro(null);
    setLendo(true);
    try {
      // O arquivo vai junto porque a selfie ainda precisa virar avatar, e
      // recortar a partir do original sai melhor que reprocessar o reduzido.
      await onChange(await fileToDocDataUrl(file), file);
    } catch (err) {
      setErro(err.message || 'Não consegui usar essa foto');
    } finally {
      setLendo(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/70">{label}</span>
      <button
        type="button"
        disabled={disabled || lendo}
        onClick={() => inputRef.current?.click()}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors disabled:opacity-60"
        style={{
          borderColor: value ? ACCENT : 'rgba(0,0,0,0.14)',
          background: value ? '#fff' : 'rgba(0,0,0,0.02)',
        }}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <span
              className="absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Trocar
            </span>
          </>
        ) : (
          <span className="px-4 text-center text-sm text-ink/45">
            {lendo ? 'Processando…' : hint}
          </span>
        )}
      </button>
      {erro && <span className="text-xs font-medium text-red-600">{erro}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={facing}
        onChange={escolher}
        className="hidden"
      />
    </div>
  );
}

/**
 * Espaço da selfie. Abre a câmera em vez de um seletor de arquivos.
 *
 * Visualmente igual aos slots de documento para a linha não ficar torta, mas
 * sem `input[type=file]` por baixo: aqui não há caminho para galeria.
 */
function SlotSelfie({ value, onAbrir, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/70">Seu rosto</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onAbrir}
        className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors disabled:opacity-60"
        style={{
          borderColor: value ? ACCENT : 'rgba(0,0,0,0.14)',
          background: value ? '#fff' : 'rgba(0,0,0,0.02)',
        }}
      >
        {value ? (
          <>
            <img src={value} alt="Seu rosto" className="h-full w-full object-cover" />
            <span
              className="absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Refazer
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-4 text-center">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-sm text-ink/45">Abrir câmera</span>
            <span className="text-[11px] text-ink/35">a foto é tirada na hora</span>
          </span>
        )}
      </button>
    </div>
  );
}

/** Cartão de escolha do caminho: aparelho próprio ou comodato. */
function OpcaoCaminho({ titulo, descricao, selecionado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-2xl border-2 p-5 text-left transition-colors"
      style={{
        borderColor: selecionado ? ACCENT : 'rgba(0,0,0,0.10)',
        background: selecionado ? `${ACCENT}0d` : '#fff',
      }}
    >
      <span
        className="font-grotesk block text-base font-bold"
        style={{ color: selecionado ? ACCENT : '#111827' }}
      >
        {titulo}
      </span>
      <span className="mt-1 block text-sm text-ink/55">{descricao}</span>
    </button>
  );
}

/** Quanto falta do prazo de retirada, em texto curto. */
function prazoRestante(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'vencido';
  const horas = Math.floor(ms / 3600_000);
  if (horas >= 1) return `${horas}h restantes`;
  return `${Math.max(1, Math.floor(ms / 60_000))} min restantes`;
}

export default function AdquirirTablet() {
  const navigate = useNavigate();
  const setAvatar = useAuthStore((s) => s.setAvatar);

  const [carregando, setCarregando] = useState(true);
  const [estado, setEstado] = useState(null); // { request, verified, contractVersion }
  const [erro, setErro] = useState(null);

  // Formulário
  const [caminho, setCaminho] = useState(null); // 'OWN_DEVICE' | 'FASTLEAD_LOAN'
  const [selfie, setSelfie] = useState('');
  /** Recorte quadrado da mesma selfie, que vira a foto de perfil. */
  const [avatar, setAvatarLocal] = useState('');
  const [cameraAberta, setCameraAberta] = useState(false);
  const [docFrente, setDocFrente] = useState('');
  const [docVerso, setDocVerso] = useState('');
  const [aceite, setAceite] = useState(false);
  const [assinatura, setAssinatura] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEstado(await apiClient.getMyTabletRequest());
      setErro(null);
    } catch {
      setErro('Não consegui carregar sua situação. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pedido = estado?.request ?? null;
  const isComodato = caminho === 'FASTLEAD_LOAN';

  // Recusado ou vencido não é fim de linha: o motorista refaz o envio.
  const podeReenviar = !pedido || pedido.status === 'REJECTED' || pedido.status === 'EXPIRED';

  const formCompleto =
    caminho &&
    selfie &&
    docFrente &&
    docVerso &&
    (!isComodato || (aceite && assinatura.trim().length >= 5));

  const enviar = async () => {
    if (!formCompleto || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await apiClient.createTabletRequest({
        acquisition: caminho,
        selfiePhoto: selfie,
        docFrontPhoto: docFrente,
        docBackPhoto: docVerso,
        ...(avatar ? { avatarPhoto: avatar } : {}),
        ...(isComodato ? { contractSignature: assinatura.trim() } : {}),
      });
      // A selfie virou foto de perfil no servidor; o cabeçalho precisa saber.
      if (avatar) setAvatar(avatar);
      setSelfie('');
      setAvatarLocal('');
      setDocFrente('');
      setDocVerso('');
      setAceite(false);
      setAssinatura('');
      setCaminho(null);
      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.error || e?.message || 'Não consegui enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7]">
      <AppHeader accent={ACCENT} badge="Motorista" />

      <main className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <h1 className="font-grotesk text-2xl font-bold text-ink">Liberar seu tablet</h1>
        <p className="mt-1.5 text-sm text-ink/55">
          Antes de rodar anúncios, precisamos confirmar quem você é. Leva 2 minutos.
        </p>

        {erro && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erro}
          </div>
        )}

        {carregando ? (
          <Card className="mt-6">
            <p className="text-sm text-ink/50">Carregando…</p>
          </Card>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {/* ---------- Situação de um pedido já enviado ---------- */}
            {pedido?.status === 'PENDING' && (
              <Card>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                  Em análise
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  Recebemos seus documentos
                </h2>
                <p className="mt-1.5 text-sm text-ink/55">
                  Estamos conferindo. Assim que liberarmos, o próximo passo aparece aqui nesta tela.
                </p>
              </Card>
            )}

            {pedido?.status === 'APPROVED' && pedido.acquisition === 'FASTLEAD_LOAN' && (
              <Card>
                <span
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Aprovado
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  Mostre este código na retirada
                </h2>
                <p
                  className="font-grotesk mt-4 rounded-2xl py-5 text-center text-4xl font-bold tracking-[0.2em]"
                  style={{ background: `${ACCENT}12`, color: ACCENT }}
                >
                  {pedido.withdrawal_code}
                </p>
                <p className="mt-3 text-sm text-ink/55">
                  Válido por 48 horas
                  {prazoRestante(pedido.withdrawal_expires_at)
                    ? ` — ${prazoRestante(pedido.withdrawal_expires_at)}`
                    : ''}
                  . Se o prazo vencer, é só pedir de novo por aqui.
                </p>
              </Card>
            )}

            {pedido?.status === 'APPROVED' && pedido.acquisition === 'OWN_DEVICE' && (
              <Card>
                <span
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Liberado
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  Tudo certo com seus documentos
                </h2>
                <p className="mt-1.5 text-sm text-ink/55">
                  Agora é só parear o tablet que você já tem e escolher os anúncios.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/motorista/perfil')}
                  className="mt-4 rounded-xl px-5 py-3 text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  Parear meu tablet
                </button>
              </Card>
            )}

            {pedido?.status === 'DELIVERED' && (
              <Card>
                <span
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Entregue
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  Tablet entregue a você
                </h2>
                <p className="mt-1.5 text-sm text-ink/55">
                  {pedido.device_identifier ? `Aparelho ${pedido.device_identifier}. ` : ''}
                  Pareie no perfil para começar a rodar anúncios.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/app/motorista/perfil')}
                  className="mt-4 rounded-xl px-5 py-3 text-sm font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  Parear meu tablet
                </button>
              </Card>
            )}

            {pedido?.status === 'REJECTED' && (
              <Card>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                  Não aprovado
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  Precisamos que você reenvie
                </h2>
                <p className="mt-1.5 text-sm text-ink/70">{pedido.rejection_reason}</p>
                <p className="mt-3 text-sm text-ink/45">
                  Corrija o que foi apontado e envie de novo abaixo.
                </p>
              </Card>
            )}

            {pedido?.status === 'EXPIRED' && (
              <Card>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                  Prazo vencido
                </span>
                <h2 className="font-grotesk mt-2 text-lg font-bold text-ink">
                  O código de retirada expirou
                </h2>
                <p className="mt-1.5 text-sm text-ink/55">
                  As 48 horas passaram sem a retirada. Faça o pedido de novo abaixo.
                </p>
              </Card>
            )}

            {/* ---------- Formulário ---------- */}
            {podeReenviar && (
              <>
                <Card>
                  <h2 className="font-grotesk text-lg font-bold text-ink">
                    Como você vai começar?
                  </h2>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <OpcaoCaminho
                      titulo="Já tenho meu tablet"
                      descricao="Vou usar um aparelho que já é meu."
                      selecionado={caminho === 'OWN_DEVICE'}
                      onClick={() => setCaminho('OWN_DEVICE')}
                    />
                    <OpcaoCaminho
                      titulo="Adquirir com a FastLead"
                      descricao="A FastLead empresta o tablet por contrato de comodato."
                      selecionado={caminho === 'FASTLEAD_LOAN'}
                      onClick={() => setCaminho('FASTLEAD_LOAN')}
                    />
                  </div>
                </Card>

                {caminho && (
                  <Card>
                    <h2 className="font-grotesk text-lg font-bold text-ink">Selfie e documento</h2>
                    <p className="mt-1 text-sm text-ink/50">
                      Use RG ou CNH. Precisa estar legível e sem reflexo.
                    </p>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {/* A selfie não aceita arquivo: sai da câmera, na hora.
                          Aceitar upload aqui transformaria a verificação em
                          "mande qualquer imagem de qualquer pessoa". */}
                      <SlotSelfie
                        value={selfie}
                        disabled={enviando}
                        onAbrir={() => setCameraAberta(true)}
                      />
                      <FotoSlot
                        label="Documento — frente"
                        hint="Fotografar frente"
                        facing="environment"
                        value={docFrente}
                        onChange={setDocFrente}
                        disabled={enviando}
                      />
                      <FotoSlot
                        label="Documento — verso"
                        hint="Fotografar verso"
                        facing="environment"
                        value={docVerso}
                        onChange={setDocVerso}
                        disabled={enviando}
                      />
                    </div>
                  </Card>
                )}

                {isComodato && (
                  <Card>
                    <h2 className="font-grotesk text-lg font-bold text-ink">
                      Contrato de comodato
                    </h2>
                    <p className="mt-1 text-sm text-ink/50">
                      O tablet continua sendo da FastLead. Leia antes de aceitar.
                    </p>

                    <pre className="mt-4 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-black/10 bg-black/[0.02] p-4 font-sans text-[13px] leading-relaxed text-ink/70">
                      {CONTRATO_COMODATO}
                    </pre>

                    <label className="mt-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={aceite}
                        onChange={(e) => setAceite(e.target.checked)}
                        className="mt-0.5 h-4 w-4"
                        style={{ accentColor: ACCENT }}
                      />
                      <span className="text-sm text-ink/70">
                        Li e aceito o contrato de comodato. A assinatura em papel será feita na
                        entrega.
                      </span>
                    </label>

                    <label className="mt-4 flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-ink/70">
                        Digite seu nome completo
                      </span>
                      <input
                        value={assinatura}
                        onChange={(e) => setAssinatura(e.target.value)}
                        placeholder="Como está no documento"
                        className="rounded-xl border border-black/10 bg-white px-4 py-3 text-ink placeholder-ink/30 outline-none transition-colors focus:border-[#0a9d6c]"
                      />
                    </label>
                  </Card>
                )}

                {caminho && (
                  <button
                    type="button"
                    onClick={enviar}
                    disabled={!formCompleto || enviando}
                    className="rounded-xl px-6 py-4 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: ACCENT }}
                  >
                    {enviando ? 'Enviando…' : 'Enviar para análise'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <CapturaSelfie
        aberto={cameraAberta}
        aoFechar={() => setCameraAberta(false)}
        aoUsar={({ foto, avatar: recorte }) => {
          setSelfie(foto);
          setAvatarLocal(recorte);
        }}
      />
    </div>
  );
}
