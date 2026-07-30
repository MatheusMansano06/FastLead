import { useRef, useState } from 'react';

/**
 * Montagem visual do anúncio: a empresa sobe o banner e vê, na hora, como ele
 * vai aparecer no tablet — inclusive onde o QR vai cair.
 *
 * A ideia central: o preview usa a proporção real do banner enviado, então o
 * canto escolhido aqui é exatamente o canto onde o QR aparece no carro. Sem
 * isso a empresa escolheria "inferior direito" e o QR cairia em cima do logo.
 */

const BRAND = '#2563FF';

/** Lado maior do banner após redimensionar, em px. */
const MAX_LADO = 1280;

/**
 * Redimensiona no navegador antes de enviar. Uma arte de 4000px viraria uma
 * data-URL de vários MB, que o tablet teria que baixar em 4G a cada playlist.
 */
function fileToBannerDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // PNG preserva transparência mas pesa muito; banner é foto/arte chapada.
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), width: w, height: h });
      };
      img.onerror = () => reject(new Error('Arquivo não parece ser uma imagem válida'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Não consegui ler esse arquivo'));
    reader.readAsDataURL(file);
  });
}

const POSICOES = [
  ['TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT'],
  ['MIDDLE_LEFT', 'CENTER', 'MIDDLE_RIGHT'],
  ['BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT'],
];

/** Converte a posição do enum em classes de alinhamento do overlay. */
export function qrAnchorClasses(pos) {
  const v = { TOP: 'items-start', MIDDLE: 'items-center', BOTTOM: 'items-end' };
  const h = { LEFT: 'justify-start', CENTER: 'justify-center', RIGHT: 'justify-end' };
  const p = pos || 'BOTTOM_RIGHT';
  const vert = p.startsWith('TOP') ? 'TOP' : p.startsWith('BOTTOM') ? 'BOTTOM' : 'MIDDLE';
  const horiz = p.endsWith('LEFT') ? 'LEFT' : p.endsWith('RIGHT') ? 'RIGHT' : 'CENTER';
  return `${v[vert]} ${h[horiz]}`;
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? BRAND : '#CBD2DC' }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? 22 : 2 }}
        />
      </button>
      <span>
        <span className="block text-sm font-semibold text-[#0B1D3A]">{label}</span>
        {hint && <span className="block text-xs text-[#0B1D3A]/45">{hint}</span>}
      </span>
    </label>
  );
}

export default function BannerStudio({ value, onChange, fieldCls, labelCls }) {
  const fileRef = useRef(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const set = (patch) => onChange({ ...value, ...patch });

  const escolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro('');
    setCarregando(true);
    try {
      const { dataUrl, width, height } = await fileToBannerDataUrl(file);
      set({ imageUrl: dataUrl, bannerRatio: width / height });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
      e.target.value = ''; // permite reenviar o mesmo arquivo depois
    }
  };

  const ratio = value.bannerRatio || 16 / 9;

  return (
    <div className="rounded-xl border border-[#EFF1F4] bg-[#FAFBFC] p-4">
      <p className="text-sm font-semibold text-[#0B1D3A]">Banner do anúncio</p>
      <p className="mt-0.5 text-xs text-[#0B1D3A]/45">
        É a arte que aparece na tela do tablet. Preview abaixo mostra exatamente como vai ficar.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {/* Upload / preview */}
        {value.imageUrl ? (
          <div>
            {/* Preview na proporção do TABLET (16:10) com o mesmo object-cover
                do slide real. Mostrar na proporção do arquivo enganaria: a
                empresa aprovaria uma arte cujas bordas somem no carro. */}
            <div
              className="relative w-full overflow-hidden rounded-xl bg-[#0B1D3A] ring-1 ring-black/10"
              style={{ aspectRatio: '16 / 10' }}
            >
              <img src={value.imageUrl} alt="" className="h-full w-full object-cover" />

              {/* Overlay do QR na posição escolhida — mesma lógica do tablet */}
              {value.showQr && (
                <div
                  className={`pointer-events-none absolute inset-0 flex p-[2.5%] ${qrAnchorClasses(
                    value.qrPosition
                  )}`}
                >
                  <div className="flex aspect-square w-[22%] min-w-[54px] items-center justify-center rounded-lg bg-white p-1.5 shadow-lg">
                    <QrPlaceholder />
                  </div>
                </div>
              )}

              {/* Texto sobreposto, quando ligado */}
              {value.showText && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8">
                  <p className="truncate text-[11px] font-bold text-white">
                    {value.title || 'Título do anúncio'}
                  </p>
                </div>
              )}
            </div>

            {/* Arte muito fora de 16:10 perde bastante nas bordas — melhor a
                empresa saber agora do que descobrir com o anúncio no ar. */}
            {ratio && Math.abs(ratio - 1.6) > 0.55 && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sua arte é {ratio > 1.6 ? 'bem mais larga' : 'bem mais alta'} que a tela do tablet,
                então as bordas vão ser cortadas — o preview acima já mostra o que aparece. Para
                aproveitar tudo, o ideal é uma arte próxima de 16:10 (ex.: 1280×800).
              </p>
            )}

            <div className="mt-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="font-semibold"
                style={{ color: BRAND }}
              >
                Trocar banner
              </button>
              <button
                type="button"
                onClick={() => set({ imageUrl: '', bannerRatio: null })}
                className="text-[#0B1D3A]/45 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={carregando}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#D6DBE3] bg-white py-10 transition hover:border-[#2563FF] disabled:opacity-60"
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-sm font-semibold text-[#0B1D3A]">
              {carregando ? 'Processando…' : 'Enviar banner'}
            </span>
            <span className="text-xs text-[#0B1D3A]/45">JPG ou PNG · qualquer proporção</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={escolherArquivo}
          className="hidden"
        />

        {erro && <p className="text-xs text-red-600">{erro}</p>}

        {/* Opções */}
        <div className="flex flex-col gap-3 border-t border-[#EFF1F4] pt-4">
          <Toggle
            checked={value.showQr}
            onChange={(v) => set({ showQr: v })}
            label="Usar QR Code"
            hint="Sem QR o banner ocupa a tela inteira — divulgação de marca, sem captura de lead."
          />

          {value.imageUrl && (
            <Toggle
              checked={value.showText}
              onChange={(v) => set({ showText: v })}
              label="Mostrar título e descrição na tela"
              hint="Desligue se o banner já tem o texto escrito na arte."
            />
          )}
        </div>

        {/* Destino + posição do QR */}
        {value.showQr && (
          <div className="flex flex-col gap-4 border-t border-[#EFF1F4] pt-4">
            <div>
              <label className={labelCls}>Para onde o QR leva</label>
              <input
                className={fieldCls}
                value={value.destinationUrl}
                onChange={(e) => set({ destinationUrl: e.target.value })}
                placeholder="https://seusite.com.br/promocao"
              />
              <p className="mt-1 text-xs text-[#0B1D3A]/45">
                Deixe vazio para usar nossa página de captura, que já pede nome, e-mail e WhatsApp
                do passageiro.
              </p>
            </div>

            {value.imageUrl && (
              <div>
                <label className={labelCls}>Onde colocar o QR no banner</label>
                <div className="flex items-start gap-4">
                  <div className="grid w-[112px] shrink-0 grid-cols-3 gap-1 rounded-lg bg-white p-1 ring-1 ring-black/10">
                    {POSICOES.flat().map((p) => {
                      const ativo = (value.qrPosition || 'BOTTOM_RIGHT') === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-label={p}
                          onClick={() => set({ qrPosition: p })}
                          className="aspect-square rounded transition"
                          style={{
                            background: ativo ? BRAND : '#EDF0F4',
                            outline: ativo ? `2px solid ${BRAND}33` : 'none',
                          }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#0B1D3A]/50">
                    Escolha um espaço vazio da sua arte. O preview acima atualiza na hora — o QR vai
                    cair exatamente onde você marcar.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Desenho estático de QR só para o preview — o real é gerado por motorista. */
function QrPlaceholder() {
  return (
    <svg viewBox="0 0 21 21" className="h-full w-full" shapeRendering="crispEdges">
      <path
        fill="#0B1D3A"
        d="M0 0h7v7H0zM2 2v3h3V2zM14 0h7v7h-7zM16 2v3h3V2zM0 14h7v7H0zM2 16v3h3v-3zM9 0h1v2H9zM11 1h1v1h-1zM9 3h2v1H9zM12 3h1v2h-1zM9 5h1v3H9zM11 6h2v1h-2zM0 9h2v1H0zM3 9h1v2H3zM5 9h2v1H5zM8 9h3v1H8zM12 9h2v1h-2zM15 9h1v2h-1zM17 9h2v1h-2zM20 9h1v3h-1zM1 11h2v1H1zM4 11h1v2H4zM6 11h1v1H6zM9 11h1v2H9zM11 11h2v1h-2zM14 11h1v3h-1zM16 12h2v1h-2zM19 12h1v1h-1zM9 14h2v1H9zM12 14h1v2h-1zM15 14h2v1h-2zM18 14h2v1h-2zM9 16h1v2H9zM11 16h1v1h-1zM13 16h2v1h-2zM16 16h1v2h-1zM18 16h1v1h-1zM20 16h1v2h-1zM9 19h3v1H9zM13 18h1v2h-1zM15 19h2v1h-2zM18 19h2v1h-2z"
      />
    </svg>
  );
}

export { fileToBannerDataUrl };
