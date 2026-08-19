import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Captura a selfie pela câmera, ao vivo — como banco faz.
 *
 * Não existe caminho de "escolher arquivo" aqui de propósito. A foto do rosto
 * é a única coisa que liga a pessoa ao tablet que ela vai levar; aceitar upload
 * transformaria a verificação em "mande qualquer imagem de qualquer um".
 *
 * O que isto garante: a imagem saiu da câmera do aparelho neste momento.
 * O que isto NÃO garante: que não é alguém segurando uma foto impressa na
 * frente da lente. Barrar isso é detecção de vivacidade de verdade, que precisa
 * de SDK especializado — a conferência humana no painel continua sendo a
 * defesa contra esse caso.
 */

const ACCENT = '#0a9d6c';

/** Lado maior da foto guardada. Mesmo teto usado nas fotos de documento. */
const FOTO_MAX_PX = 1280;
/** Lado do recorte quadrado que vira a foto de perfil. */
const AVATAR_PX = 256;

/** Traduz a falha do getUserMedia para algo que o motorista consiga resolver. */
function explicarErro(err) {
  const nome = err?.name || '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError')
    return 'Você bloqueou a câmera. Libere o acesso nas permissões do navegador e toque em "Tentar de novo".';
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError')
    return 'Não encontrei uma câmera frontal neste aparelho. Tente pelo celular.';
  if (nome === 'NotReadableError')
    return 'A câmera está sendo usada por outro aplicativo. Feche os outros e tente de novo.';
  if (!window.isSecureContext)
    return 'A câmera só funciona em conexão segura (https). Abra o site pelo endereço oficial.';
  return 'Não consegui abrir a câmera. Verifique as permissões e tente de novo.';
}

/**
 * @param aberto   Controla a montagem — a câmera só liga com a tela aberta.
 * @param aoFechar Fecha sem capturar.
 * @param aoUsar   Recebe { foto, avatar }, ambos data-URL JPEG.
 */
export default function CapturaSelfie({ aberto, aoFechar, aoUsar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState(null);
  const [contagem, setContagem] = useState(null);
  const [capturada, setCapturada] = useState(null); // { foto, avatar }

  /** Desliga a câmera. Sem isso a luz do aparelho fica acesa após fechar. */
  const desligar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPronto(false);
  }, []);

  const ligar = useCallback(async () => {
    setErro(null);
    setCapturada(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('sem suporte'), { name: 'NotFoundError' });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPronto(true);
    } catch (e) {
      setErro(explicarErro(e));
    }
  }, []);

  useEffect(() => {
    if (aberto) ligar();
    return desligar;
  }, [aberto, ligar, desligar]);

  /** Congela o quadro atual do vídeo em duas imagens: a grande e o avatar. */
  const capturar = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const escala = Math.min(1, FOTO_MAX_PX / Math.max(video.videoWidth, video.videoHeight));
    const largura = Math.round(video.videoWidth * escala);
    const altura = Math.round(video.videoHeight * escala);

    // Espelhado para bater com a prévia: a pessoa se vê como no espelho, e a
    // foto salva sai igual ao que ela acabou de olhar.
    const grande = document.createElement('canvas');
    grande.width = largura;
    grande.height = altura;
    const g = grande.getContext('2d');
    g.translate(largura, 0);
    g.scale(-1, 1);
    g.drawImage(video, 0, 0, largura, altura);

    const quadrado = document.createElement('canvas');
    quadrado.width = AVATAR_PX;
    quadrado.height = AVATAR_PX;
    const lado = Math.min(largura, altura);
    quadrado
      .getContext('2d')
      .drawImage(
        grande,
        (largura - lado) / 2,
        (altura - lado) / 2,
        lado,
        lado,
        0,
        0,
        AVATAR_PX,
        AVATAR_PX
      );

    setCapturada({
      foto: grande.toDataURL('image/jpeg', 0.75),
      avatar: quadrado.toDataURL('image/jpeg', 0.72),
    });
    desligar();
  }, [desligar]);

  /** 3, 2, 1 — dá tempo de posicionar o rosto antes do clique. */
  const iniciarContagem = useCallback(() => {
    if (!pronto || contagem != null) return;
    let n = 3;
    setContagem(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setContagem(null);
        capturar();
      } else {
        setContagem(n);
      }
    }, 1000);
  }, [pronto, contagem, capturar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      {/* ---------- Topo ---------- */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-sm font-semibold text-white">
          {capturada ? 'Ficou boa?' : 'Foto do seu rosto'}
        </span>
        <button
          onClick={() => {
            desligar();
            aoFechar();
          }}
          className="rounded-full border border-white/25 px-4 py-1.5 text-sm text-white/80 transition-colors hover:text-white"
        >
          Cancelar
        </button>
      </div>

      {/* ---------- Palco ---------- */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {erro ? (
          <div className="max-w-sm px-8 text-center">
            <p className="text-base font-semibold text-white">Câmera indisponível</p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{erro}</p>
            <button
              onClick={ligar}
              className="mt-6 rounded-xl px-5 py-3 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Tentar de novo
            </button>
          </div>
        ) : capturada ? (
          <img
            src={capturada.foto}
            alt="Sua selfie"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Guia oval: sem ele a pessoa fotografa o teto ou meio rosto. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-[50%] border-[3px]"
                style={{
                  width: 'min(62vw, 260px)',
                  height: 'min(82vw, 340px)',
                  borderColor: pronto ? ACCENT : 'rgba(255,255,255,0.4)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                }}
              />
            </div>

            {contagem != null && (
              <span className="pointer-events-none absolute font-grotesk text-8xl font-bold text-white drop-shadow-lg">
                {contagem}
              </span>
            )}

            <p className="pointer-events-none absolute bottom-5 px-8 text-center text-sm text-white/85">
              {pronto
                ? 'Centralize o rosto no oval, com boa luz e sem boné ou óculos escuros.'
                : 'Abrindo a câmera…'}
            </p>
          </>
        )}
      </div>

      {/* ---------- Ações ---------- */}
      <div className="flex items-center justify-center gap-3 px-5 py-6">
        {capturada ? (
          <>
            <button
              onClick={ligar}
              className="rounded-xl border border-white/25 px-5 py-3.5 text-sm font-semibold text-white/85"
            >
              Tirar outra
            </button>
            <button
              onClick={() => {
                aoUsar(capturada);
                aoFechar();
              }}
              className="rounded-xl px-7 py-3.5 text-sm font-semibold text-white"
              style={{ background: ACCENT }}
            >
              Usar esta foto
            </button>
          </>
        ) : (
          !erro && (
            <button
              onClick={iniciarContagem}
              disabled={!pronto || contagem != null}
              aria-label="Tirar foto"
              className="h-16 w-16 rounded-full border-4 border-white/80 transition-transform disabled:opacity-40 active:scale-95"
              style={{ background: ACCENT }}
            />
          )
        )}
      </div>
    </div>
  );
}
