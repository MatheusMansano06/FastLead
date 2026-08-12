import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tela que fica rodando no tablet dentro do carro.
 *
 * Premissas que moldaram o código:
 * - Ninguém opera esse aparelho. Ele liga, pareia uma vez e roda sozinho.
 * - A conexão cai (túnel, periferia, roaming). A playlist é cacheada e a
 *   rotação continua offline; impressões ficam na fila até dar para enviar.
 * - Não guardamos e-mail/senha do motorista aqui — só um device token.
 */

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'fl_device_token';
const PLAYLIST_CACHE_KEY = 'fl_playlist_cache';
const IMPRESSION_QUEUE_KEY = 'fl_impression_queue';

/**
 * Modo quiosque: tela cheia de verdade, sem barra de navegador.
 *
 * O navegador só concede tela cheia dentro de um gesto do usuário — não dá
 * para entrar sozinho no carregamento. Por isso pedimos no toque do
 * pareamento e deixamos um botão discreto para reentrar depois.
 */
function useKioskMode() {
  const [fullscreen, setFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement
  );

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);

    // No carro ninguém vai querer menu de contexto, seleção de texto nem
    // zoom acidental ao esbarrar na tela.
    const blockMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', blockMenu);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('contextmenu', blockMenu);
    };
  }, []);

  const enter = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      // Trava a orientação quando o navegador permite — evita a tela girar
      // com o carro fazendo curva.
      try {
        await screen.orientation?.lock?.('landscape');
      } catch {
        /* nem todo navegador/aparelho permite; segue sem travar */
      }
    } catch {
      /* usuário negou ou o navegador não suporta — o app funciona igual */
    }
  }, []);

  return { fullscreen, enter };
}

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

async function tabletFetch(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Device-Token': token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // `message` primeiro: o tratador de erro do servidor manda o NOME da classe
    // em `error` ("ValidationError") e o texto para humanos em `message`. Lendo
    // `error` primeiro, a tela anunciava "ValidationError" e — pior — o teste
    // que devolve o tablet ao pareamento comparava contra esse nome e nunca
    // batia. O `/pair` responde sem `message`, então o `error` segue de reserva.
    const erro = new Error(json.message || json.error || 'Falha na comunicação');
    if (json.code) erro.apiCode = json.code;
    throw erro;
  }
  return json.data;
}

/* ---------------------------------------------------------------- Pareamento */

function PairingScreen({ onPaired, onEnterKiosk }) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (code) => {
    setBusy(true);
    setError('');
    try {
      const data = await tabletFetch('/tablet/pair', { method: 'POST', body: { code } });
      localStorage.setItem(TOKEN_KEY, data.deviceToken);
      // O toque do último dígito é o gesto que o navegador exige para conceder
      // tela cheia — aproveitamos ele para já entrar em modo quiosque.
      onEnterKiosk?.();
      onPaired(data);
    } catch (e) {
      setError(e.message);
      setDigits('');
    } finally {
      setBusy(false);
    }
  };

  const press = (d) => {
    if (busy) return;
    const next = (digits + d).slice(0, 6);
    setDigits(next);
    setError('');
    if (next.length === 6) submit(next);
  };

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center p-8 select-none">
      <div className="text-center mb-8">
        <div className="text-4xl font-bold tracking-tight mb-3">FastLead</div>
        <p className="text-white/60 text-lg">
          Abra o app FastLead no celular, gere o código e digite aqui
        </p>
      </div>

      <div className="flex gap-3 mb-6" aria-label="Código de pareamento">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-16 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold border-2 transition-colors ${
              digits[i]
                ? 'bg-white/10 border-brand text-white'
                : 'bg-white/5 border-white/15 text-white/30'
            }`}
          >
            {digits[i] || '•'}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-5 py-3 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200">
          {error}
        </div>
      )}
      {busy && <div className="mb-4 text-white/60">Pareando…</div>}

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => press(String(n))}
            className="w-24 h-24 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-3xl font-semibold transition-colors"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setDigits('')}
          className="w-24 h-24 rounded-2xl bg-white/5 hover:bg-white/10 text-lg text-white/70 transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={() => press('0')}
          className="w-24 h-24 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-3xl font-semibold transition-colors"
        >
          0
        </button>
        <button
          onClick={() => setDigits((d) => d.slice(0, -1))}
          className="w-24 h-24 rounded-2xl bg-white/5 hover:bg-white/10 text-lg text-white/70 transition-colors"
        >
          ←
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Anúncio */

/**
 * Lado do QR. `min()` resolve as duas orientações com um valor só:
 * em paisagem manda a altura, em retrato manda a largura — e o cartão
 * continua quadrado nas duas. Grande o bastante para ler do banco de trás.
 */
const QR_SIDE = 'min(48vh, 60vw)';

/** Converte a posição escolhida pela empresa em alinhamento do overlay. */
function qrAnchor(pos) {
  const p = pos || 'BOTTOM_RIGHT';
  const vert = p.startsWith('TOP')
    ? 'items-start'
    : p.startsWith('BOTTOM')
      ? 'items-end'
      : 'items-center';
  const horiz = p.endsWith('LEFT')
    ? 'justify-start'
    : p.endsWith('RIGHT')
      ? 'justify-end'
      : 'justify-center';
  return `${vert} ${horiz}`;
}

/**
 * Slide com banner: a arte do anunciante ocupa a tela e o QR é sobreposto.
 *
 * O contêiner assume a proporção REAL do banner (medida no onLoad). Sem isso o
 * `object-contain` deixaria faixas pretas dentro da caixa e o QR ancoraria no
 * canto da caixa, não no canto da arte — a empresa escolheria "inferior
 * direito" e o QR flutuaria fora do banner.
 */
/**
 * Camada de QR e texto sobre o banner de fundo.
 *
 * O banner já preenche a tela inteira (renderizado em AdSlide), então o canto
 * escolhido pela empresa coincide com o canto da tela — não é preciso medir
 * proporção nem ancorar em caixa intermediária, como nas versões anteriores.
 */
function BannerOverlay({ item }) {
  return (
    <div className="relative flex-1 min-h-0">
      {item.showQr && item.qrImage && (
        <div className={`absolute inset-0 flex p-[2.5%] ${qrAnchor(item.qrPosition)}`}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="bg-white rounded-xl shadow-2xl p-[3%] aspect-square"
              style={{ width: 'min(26vh, 26vw)' }}
            >
              <img src={item.qrImage} alt="QR Code" className="h-full w-full object-contain" />
            </div>
            {/* Chamada é independente do título: a empresa pode querer só ela,
                só o título, os dois, ou nenhum — o banner muitas vezes já diz tudo. */}
            {item.ctaText && (
              <span
                className="rounded-md bg-black/65 px-2 py-1 text-center text-xs sm:text-sm font-medium text-white line-clamp-2"
                style={{ maxWidth: 'min(26vh, 26vw)' }}
              >
                {item.ctaText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Título/descrição só quando a empresa pediu — a maioria dos banners já
          traz o texto na própria arte, e repetir polui a tela. */}
      {item.showText && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-4 pt-14">
          <div className="text-mint text-[10px] sm:text-xs font-semibold uppercase tracking-widest">
            {item.advertiser}
          </div>
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold leading-tight line-clamp-2">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-xs sm:text-sm text-white/75 line-clamp-1">{item.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AdSlide({ item, motorista, index, total, online, rotationMs }) {
  // Barra de progresso: anima de 0 a 1 na duração real da rotação.
  // Feita com transform+transition em vez de keyframe do Tailwind — a versão
  // anterior usava `animate-[grow_20s_linear]`, e esse keyframe nunca existiu
  // no config, então a barra ficava parada e ainda mentia a duração.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setProgress(1)));
    return () => cancelAnimationFrame(id);
  }, [index, rotationMs]);

  // Com banner, a arte é o fundo da tela inteira e passa por trás do cabeçalho.
  // Sem banner, o cabeçalho é uma faixa sólida no topo.
  const comBanner = Boolean(item.imageUrl);

  return (
    // h-screen + overflow-hidden: o tablet é quiosque, nada pode rolar.
    // Se o conteúdo não couber, ele encolhe — nunca cria barra de rolagem.
    <div className="relative h-screen overflow-hidden bg-ink text-white flex flex-col">
      {/* Banner de fundo, cobrindo tudo — inclusive atrás do cabeçalho. */}
      {comBanner && (
        <img
          src={item.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Barra do motorista — a foto redonda que identifica o carro.
          Sobre o banner vira translúcida com leve sombreado, para o nome
          continuar legível sem tapar a arte. */}
      <div
        className={`relative shrink-0 flex items-center justify-between px-6 py-3 ${
          comBanner
            ? 'bg-gradient-to-b from-black/60 to-transparent'
            : 'border-b border-white/10'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {motorista?.avatarUrl ? (
            <img
              src={motorista.avatarUrl}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-mint/60 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-full bg-mint/20 ring-2 ring-mint/60 flex items-center justify-center text-lg font-bold text-mint">
              {(motorista?.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">
              {motorista?.name || 'Motorista'}
            </div>
            <div className="text-white/50 text-xs truncate">
              {[motorista?.city, motorista?.state].filter(Boolean).join(' · ') || 'FastLead'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/50 shrink-0">
          {!online && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs">
              offline
            </span>
          )}
          <span className="tabular-nums">
            {index + 1}/{total}
          </span>
        </div>
      </div>

      {/* Com banner, o QR e o texto entram sobrepostos à arte de fundo.
          Sem banner, layout de texto + QR lado a lado. */}
      {comBanner ? (
        <BannerOverlay item={item} />
      ) : (
        <div className="relative flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.3fr_auto] gap-6 p-6">
          <div className="min-h-0 flex flex-col justify-center overflow-hidden">
            <div className="text-mint text-xs sm:text-sm font-semibold uppercase tracking-widest mb-2 shrink-0">
              {item.advertiser}
            </div>
            <h1 className="shrink-0 text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.08] mb-3 line-clamp-3">
              {item.title}
            </h1>
            {item.description && (
              <p className="shrink-0 text-base sm:text-lg text-white/70 leading-snug line-clamp-3">
                {item.description}
              </p>
            )}
          </div>

          {/* QR: sempre quadrado. O lado sai do menor espaço disponível — usar
              h-full + max-w fazia o cartão virar retângulo em tela retrato,
              porque a largura era limitada mas a altura não. */}
          {item.showQr && item.qrImage && (
            <div className="min-h-0 flex flex-col items-center justify-center gap-3">
              <div
                className="shrink-0 bg-white p-3 sm:p-4 rounded-2xl shadow-2xl"
                style={{ width: QR_SIDE, height: QR_SIDE }}
              >
                <img src={item.qrImage} alt="QR Code" className="w-full h-full object-contain" />
              </div>
              {item.ctaText && (
              <p
                className="shrink-0 text-center text-sm sm:text-base lg:text-lg font-medium text-white/90 line-clamp-2"
                style={{ maxWidth: QR_SIDE }}
              >
                {item.ctaText}
              </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progresso da rotação */}
      <div className="shrink-0 h-1.5 bg-white/10 overflow-hidden">
        <div
          className="h-full origin-left bg-gradient-to-r from-brand via-aqua to-mint ease-linear"
          style={{
            transform: `scaleX(${progress})`,
            transitionProperty: 'transform',
            transitionDuration: `${progress === 0 ? 0 : rotationMs}ms`,
          }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------- Resumo da jornada */

/**
 * Tela que o motorista vê ao encerrar. Todo número aqui veio de evento real
 * gravado durante a jornada — nada é estimado.
 */
function SessionSummary({ resumo, onFinish }) {
  const inicio = new Date(resumo.startedAt);
  const fim = new Date(resumo.endedAt);
  const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const h = Math.floor(resumo.durationMinutes / 60);
  const m = resumo.durationMinutes % 60;

  return (
    <div className="h-screen overflow-y-auto bg-ink text-white">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center p-8">
        <div className="mb-1 text-sm font-semibold uppercase tracking-widest text-mint">
          Jornada encerrada
        </div>
        <h1 className="font-grotesk text-3xl sm:text-4xl font-bold">
          {inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
        </h1>
        <p className="mt-1 text-white/50">
          {hora(inicio)} às {hora(fim)} · {h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`}{' '}
          rodando
        </p>

        <div className="mt-7 grid grid-cols-3 gap-3">
          {[
            ['Exibições', resumo.totals.impressions, 'text-white'],
            ['Leram o QR', resumo.totals.uniqueScans, 'text-aqua'],
            ['Leads', resumo.totals.leads, 'text-mint'],
          ].map(([label, valor, cor]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className={`text-4xl font-bold tabular-nums ${cor}`}>{valor}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-white/45">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/45">
            Anúncios que rodaram
          </h2>
          {resumo.campaigns.length === 0 ? (
            <p className="text-white/40">
              Nenhum anúncio chegou a ser exibido nesta jornada.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumo.campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="truncate text-xs text-white/45">{c.advertiser}</div>
                  </div>
                  <div className="flex shrink-0 gap-4 text-sm tabular-nums">
                    <span className="text-white/60" title="Exibições">
                      {c.impressions}×
                    </span>
                    <span className="text-aqua" title="Leituras do QR">
                      {c.scans}
                    </span>
                    <span className="text-mint" title="Leads">
                      {c.leads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onFinish}
          className="mt-8 w-full rounded-xl bg-mint py-4 text-lg font-semibold text-ink transition hover:bg-mint/90"
        >
          Concluir
        </button>
        <p className="mt-3 text-center text-sm text-white/40">
          O tablet volta a pedir o código. Para rodar de novo, gere um novo no aplicativo.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Tablet */

export default function Tablet() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [playlist, setPlaylist] = useState(() => readJSON(PLAYLIST_CACHE_KEY, null));
  const [current, setCurrent] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');

  const queueRef = useRef(readJSON(IMPRESSION_QUEUE_KEY, []));
  const shownAtRef = useRef(Date.now());
  const { fullscreen, enter: entrarTelaCheia } = useKioskMode();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [resumo, setResumo] = useState(null);
  /** Ref e não state: precisa valer imediatamente, sem esperar re-render. */
  const encerrandoRef = useRef(false);

  /* Playlist: busca no servidor, cai para o cache quando a rede falha. */
  const loadPlaylist = useCallback(async () => {
    if (!token) return;
    try {
      const data = await tabletFetch('/tablet/playlist', { token });
      setPlaylist(data);
      localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(data));
      setError('');
    } catch (e) {
      // Pareamento que não existe mais: o motorista desvinculou, ou a jornada
      // foi encerrada (encerrar apaga o aparelho no servidor). Sem descartar o
      // token aqui, o tablet seguia exibindo para sempre o perfil e os anúncios
      // do dono anterior, servidos do cache — inclusive depois de ler um QR de
      // pareamento novo, porque a tela do teclado nunca chegava a aparecer.
      //
      // A fila de impressões vai junto: ela foi gravada sob o aparelho antigo e
      // não tem mais para onde ser enviada. Se sobrevivesse até o próximo
      // pareamento, seria despejada no motorista novo — creditando a ele
      // exibições que quem rodou foi outro.
      //
      // Só a falta de pareamento limpa. Queda de rede cai no `setError` abaixo
      // e o cache continua rodando, que é o ponto de ter cache num carro.
      if (e.apiCode === 'TABLET_NOT_PAIRED' || /não pareado/i.test(e.message)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(PLAYLIST_CACHE_KEY);
        localStorage.removeItem(IMPRESSION_QUEUE_KEY);
        queueRef.current = [];
        setToken(null);
        setPlaylist(null);
        setError('');
        return;
      }
      setError(e.message);
    }
  }, [token]);

  useEffect(() => {
    loadPlaylist();
    // Recarrega de tempos em tempos para pegar campanha nova sem reiniciar o tablet.
    const id = setInterval(loadPlaylist, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadPlaylist]);

  /**
   * Trava o comportamento de página comum enquanto o tablet está na rota.
   * Sem isso um esbarrão no banco de trás seleciona texto, dá zoom ou dispara
   * o "puxar para atualizar" e o anúncio pisca.
   */
  useEffect(() => {
    const anterior = {
      userSelect: document.body.style.userSelect,
      overscroll: document.documentElement.style.overscrollBehavior,
      touchAction: document.body.style.touchAction,
    };
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'manipulation';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.userSelect = anterior.userSelect;
      document.body.style.touchAction = anterior.touchAction;
      document.documentElement.style.overscrollBehavior = anterior.overscroll;
    };
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  /* Wake lock: sem isso a tela apaga e o anúncio some no meio da corrida. */
  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      } catch {
        /* alguns navegadores negam sem gesto do usuário; segue sem travar */
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  const items = playlist?.items || [];
  const rotationMs = (playlist?.rotationSeconds || 8) * 1000;

  /* Fila de impressões: acumula e envia em lote, sobrevive a recarga. */
  const enqueueImpression = useCallback((campaignId, durationMs) => {
    // Depois que o encerramento começou, nada mais entra na fila: uma impressão
    // enfileirada aqui pertenceria à jornada que acabou, mas seria enviada já
    // na próxima — inflando o número da jornada errada.
    if (encerrandoRef.current) return;
    queueRef.current.push({ campaignId, durationMs });
    localStorage.setItem(IMPRESSION_QUEUE_KEY, JSON.stringify(queueRef.current));
  }, []);

  const flushImpressions = useCallback(async () => {
    if (!token || !queueRef.current.length) return;
    const batch = queueRef.current;
    queueRef.current = [];
    localStorage.setItem(IMPRESSION_QUEUE_KEY, '[]');
    try {
      await tabletFetch('/tablet/impressions', { method: 'POST', token, body: { items: batch } });
    } catch {
      // Sem rede: devolve para a fila em vez de perder a métrica.
      queueRef.current = batch.concat(queueRef.current);
      localStorage.setItem(IMPRESSION_QUEUE_KEY, JSON.stringify(queueRef.current));
    }
  }, [token]);

  useEffect(() => {
    const id = setInterval(flushImpressions, 30 * 1000);
    const onHide = () => flushImpressions();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flushImpressions]);

  /* Rotação dos anúncios. */
  useEffect(() => {
    if (items.length === 0) return;
    shownAtRef.current = Date.now();
    const id = setTimeout(() => {
      const item = items[current];
      if (item) enqueueImpression(item.campaignId, Date.now() - shownAtRef.current);
      setCurrent((c) => (c + 1) % items.length);
    }, rotationMs);
    return () => clearTimeout(id);
  }, [current, items, rotationMs, enqueueImpression]);

  /**
   * Encerrar a jornada: envia o que ainda estiver na fila de impressões antes,
   * senão os últimos anúncios exibidos não entrariam no resumo.
   */
  const encerrarJornada = async () => {
    setEncerrando(true);
    encerrandoRef.current = true; // trava a fila antes de qualquer await
    try {
      await flushImpressions();
      const dados = await tabletFetch('/tablet/session/end', { method: 'POST', token });
      // O aparelho foi solto no servidor: limpa tudo que era desta jornada.
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PLAYLIST_CACHE_KEY);
      localStorage.removeItem(IMPRESSION_QUEUE_KEY);
      queueRef.current = [];
      setResumo(dados);
      setConfirmarSaida(false);
    } catch (e) {
      // Falhou: destrava para o tablet continuar contando normalmente.
      encerrandoRef.current = false;
      setError(e.message);
      setConfirmarSaida(false);
    } finally {
      setEncerrando(false);
    }
  };

  // Resumo tem prioridade: mesmo sem token, é o que o motorista precisa ver.
  if (resumo) {
    return (
      <SessionSummary
        resumo={resumo}
        onFinish={() => {
          // Destrava só agora, com a jornada anterior já fechada e a fila vazia.
          encerrandoRef.current = false;
          localStorage.removeItem(IMPRESSION_QUEUE_KEY);
          queueRef.current = [];
          setResumo(null);
          setToken(null);
          setPlaylist(null);
          setCurrent(0);
        }}
      />
    );
  }

  if (!token) {
    return (
      <PairingScreen
        onEnterKiosk={entrarTelaCheia}
        onPaired={() => {
          setToken(localStorage.getItem(TOKEN_KEY));
        }}
      />
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-semibold">Carregando anúncios…</div>
        {error && <div className="text-red-300">{error}</div>}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center p-10 text-center gap-4">
        <div className="text-3xl font-bold">Tablet pareado e pronto</div>
        <p className="text-white/60 text-xl max-w-lg">
          Nenhuma campanha ativa para {playlist.motorista?.name || 'este motorista'} ainda. Assim que
          uma empresa publicar um anúncio, ele aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <>
      <AdSlide
        item={items[current]}
        motorista={playlist.motorista}
        index={current}
        total={items.length}
        online={online}
        rotationMs={rotationMs}
      />

      {/* Controles só aparecem fora da tela cheia. Em modo quiosque a tela
          fica limpa; para mexer, o motorista sai do fullscreen primeiro
          (deslizando de cima ou pelo botão do aparelho). */}
      {!fullscreen && (
        <div className="fixed bottom-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => setConfirmarSaida(true)}
            className="rounded-full bg-black/70 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-red-600"
          >
            Encerrar jornada
          </button>
          <button
            onClick={entrarTelaCheia}
            className="rounded-full bg-black/70 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-black/85"
          >
            Tela cheia
          </button>
        </div>
      )}

      {confirmarSaida && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 text-ink">
            <h3 className="font-grotesk text-xl font-bold">Encerrar a jornada?</h3>
            <p className="mt-2 text-sm text-ink/60">
              Os anúncios param de rodar e você vê o resumo do que rendeu. O tablet volta a pedir o
              código — para começar de novo, gere um novo no aplicativo.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setConfirmarSaida(false)}
                disabled={encerrando}
                className="flex-1 rounded-xl border border-black/10 py-3 font-semibold text-ink/70 transition hover:bg-black/5 disabled:opacity-50"
              >
                Continuar rodando
              </button>
              <button
                onClick={encerrarJornada}
                disabled={encerrando}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {encerrando ? 'Encerrando…' : 'Encerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
