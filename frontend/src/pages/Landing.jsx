import { Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { LogoWordmark } from '../components/landing/Logo';
import Scene from '../components/landing/Scene';
import AppBadges from '../components/landing/AppBadges';
import AdTablet from '../components/landing/AdTablet';

// Full-height ANIMATED beat (transparent — the fixed 3D Canvas shows through).
// The card side is kept OPPOSITE the tablet's position at each beat so the 3D
// tablet is never covered.
function Beat({ beat, children, className = '' }) {
  return (
    <section
      data-beat={beat}
      className={`flex min-h-screen w-full flex-col px-6 py-24 md:px-16 ${className}`}
    >
      {children}
    </section>
  );
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`max-w-md rounded-3xl bg-[#e8eaf0]/90 p-7 shadow-[0_24px_60px_-28px_rgba(11,29,58,0.4)] ring-1 ring-black/5 backdrop-blur-md md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

function Check({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

// Glass highlight chips that add substance to the animated beats.
function Pills({ items, className = '' }) {
  return (
    <div className={`mt-6 flex flex-wrap gap-2 ${className}`}>
      {items.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3.5 py-1.5 text-xs font-semibold text-ink/70 shadow-sm ring-1 ring-black/5 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {t}
        </span>
      ))}
    </div>
  );
}

export default function Landing() {
  const progress = useRef(0);

  const [navDark, setNavDark] = useState(false);
  const navDarkRef = useRef(false);
  // 6 beats → the 3D backdrop alternates white/navy/white/blue/white/navy.
  const DARK_SECTIONS = [false, true, false, true, false, true];

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      const Vy = window.scrollY + vh / 2;

      const beats = [...document.querySelectorAll('[data-beat]')]
        .map((el) => ({ i: Number(el.dataset.beat), el }))
        .sort((a, b) => a.i - b.i);

      if (beats.length > 1) {
        const centers = beats.map((b) => {
          const r = b.el.getBoundingClientRect();
          return r.top + window.scrollY + r.height / 2;
        });
        let f;
        if (Vy <= centers[0]) f = 0;
        else if (Vy >= centers[centers.length - 1]) f = centers.length - 1;
        else {
          f = centers.length - 1;
          for (let i = 0; i < centers.length - 1; i++) {
            if (Vy <= centers[i + 1]) {
              f = i + (Vy - centers[i]) / (centers[i + 1] - centers[i]);
              break;
            }
          }
        }
        progress.current = f / (centers.length - 1);
      }

      let dark = false;
      const probeY = 10;
      for (const s of document.querySelectorAll('main section')) {
        const r = s.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) {
          dark =
            s.dataset.beat !== undefined
              ? DARK_SECTIONS[Number(s.dataset.beat)]
              : s.dataset.dark !== undefined;
          break;
        }
      }
      if (dark !== navDarkRef.current) {
        navDarkRef.current = dark;
        setNavDark(dark);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="relative w-full bg-[#f4f5f7] text-ink">
      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-10">
        <LogoWordmark dark={navDark} />
        <div className="flex items-center gap-1 md:gap-3">
          <Link
            to="/entrar"
            className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium no-underline transition ${
              navDark ? 'text-white/85 hover:text-white' : 'text-ink/70 hover:text-ink'
            }`}
          >
            Faço parte do time
          </Link>
          <Link
            to="/cadastro"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold no-underline shadow-[0_10px_30px_-8px_rgba(37,99,255,0.5)] transition hover:brightness-110 ${
              navDark ? 'bg-white text-ink' : 'bg-brand text-white'
            }`}
          >
            Fazer parte
          </Link>
        </div>
      </nav>

      {/* Fixed 3D background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 8.6], fov: 32 }} gl={{ antialias: true }}>
          <color attach="background" args={['#f4f5f7']} />
          <fog attach="fog" args={['#f4f5f7', 12, 26]} />
          <Suspense fallback={null}>
            <Scene progress={progress} />
          </Suspense>
        </Canvas>
      </div>

      <main className="relative z-10">
        {/* ═══ 🎞️ Hero · tablet à direita ═══ */}
        <Beat beat={0} className="items-start justify-center text-left">
          <div className="max-w-md lg:max-w-xl">
            <span className="mb-5 inline-block rounded-full border border-ink/10 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand shadow-sm">
              Publicidade que anda com a cidade
            </span>
            <h1 className="font-grotesk text-3xl font-bold leading-[1.06] tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Sua marca de forma <span className="text-brand">criativa e inteligente</span> em
              milhares de veículos <span className="text-brand">simultaneamente</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink/60 md:text-lg">
              Telas premium dentro dos veículos de aplicativo, flutuando pela
              cidade. Anúncios que viajam com o passageiro e viram leads reais.
            </p>
            <span className="mt-10 inline-block animate-pulse text-[11px] uppercase tracking-[0.25em] text-ink/40">
              Role para descobrir ↓
            </span>
          </div>
        </Beat>

        {/* ─── 🟦 ESTÁTICO · Dados do trajeto ───
            ponytail: números ainda HIPOTÉTICOS (pedido do sócio: "temos que
            levantar"). Confirmar fonte e citá-la aqui antes de publicar. */}
        <section className="relative w-full bg-white px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Você sabia?
              </span>
              <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
                O trajeto é o melhor horário nobre que existe.
              </h2>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-2">
              {[
                {
                  k: '~15 min',
                  t: 'de atenção por corrida',
                  d: 'É o tempo médio que o passageiro passa dentro do carro — sentado, com o celular na mão e a sua tela à frente.',
                },
                {
                  k: 'Todas as classes',
                  t: 'circulam no aplicativo',
                  d: 'A comodidade e a facilidade fizeram do carro de aplicativo uma escolha transversal — seu anúncio alcança perfis que a mídia tradicional segmenta separadamente.',
                },
              ].map((s) => (
                <div key={s.k} className="rounded-3xl border border-black/5 bg-[#f7f8fa] p-8 shadow-[0_20px_50px_-30px_rgba(11,29,58,0.35)]">
                  <p className="font-grotesk text-4xl font-bold tracking-tight text-brand md:text-5xl">{s.k}</p>
                  <h3 className="mt-2 font-grotesk text-xl font-bold text-ink">{s.t}</h3>
                  <p className="mt-3 text-sm text-ink/55">{s.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-ink/40">
              Dados de referência do setor — estudo próprio em levantamento.
            </p>
          </div>
        </section>

        {/* ─── 🟦 ESTÁTICO · Passo a passo · dois fluxos ─── */}
        <section className="relative w-full bg-[#f4f5f7] px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Passo a passo
              </span>
              <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
                Siga os passos para se tornar parceiro ou anunciante.
              </h2>
            </div>

            {[
              {
                eyebrow: 'Para parceiros · motoristas de aplicativo',
                accent: '#0a9d6c',
                steps: [
                  { n: '1', t: 'Adquire o Kit Renda Extra', d: 'Tablet, suporte e chip da operadora — a escolha da operadora é feita na hora da compra. Instala no veículo e está pronto.' },
                  { n: '2', t: 'Baixa o aplicativo', d: 'Consulta e gerencia os próprios ganhos direto no app, em tempo real.' },
                  { n: '3', t: 'Indique e ganhe', d: 'Trouxe outro motorista para a rede? Você ganha por isso também.' },
                ],
              },
              {
                eyebrow: 'Para clientes · anunciar',
                accent: '#2563FF',
                steps: [
                  { n: '1', t: 'Define onde e por quanto tempo', d: 'Delimita o raio de atuação (município, estado, país ou global), a abrangência em número de veículos e o período — de um dia a um ano.' },
                  { n: '2', t: 'Envia e aprova a arte', d: 'Sobe a peça na plataforma e aprova o preview antes de entrar no ar.' },
                  { n: '3', t: 'Acompanha e mede o ROI', d: 'Dashboard com acessos, escaneamentos de QR e leads gerados — o retorno por campanha, em tempo real.' },
                ],
              },
            ].map((track) => (
              <div key={track.eyebrow} className="mt-14">
                <span
                  className="text-xs font-semibold uppercase tracking-[0.25em]"
                  style={{ color: track.accent }}
                >
                  {track.eyebrow}
                </span>
                <div className="mt-6 grid gap-8 md:grid-cols-3">
                  {track.steps.map((s) => (
                    <div key={s.n} className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_20px_50px_-30px_rgba(11,29,58,0.35)]">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-full font-grotesk text-lg font-bold text-white"
                        style={{ backgroundColor: track.accent }}
                      >
                        {s.n}
                      </span>
                      <h3 className="mt-5 font-grotesk text-xl font-bold text-ink">{s.t}</h3>
                      <p className="mt-2 text-sm text-ink/55">{s.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 🎞️ O que é · tablet à direita → card à esquerda ═══ */}
        <Beat beat={1} className="items-start justify-center text-left">
          <Card>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">O que é</span>
            <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.08] tracking-tight text-ink md:text-5xl">
              Uma tela no banco de trás. Mil histórias por dia.
            </h2>
            <p className="mt-4 text-base text-ink/55">
              A FastLead coloca tablets de alta definição dentro dos veículos de
              aplicativo. Enquanto o passageiro viaja, sua campanha ocupa a
              atenção — em tela cheia, sem concorrência.
            </p>
            <Pills items={['Tela cheia', 'Sem concorrência', 'Alta definição']} />
          </Card>
        </Beat>

        {/* ─── 🟦 ESTÁTICO · Formatos ─── */}
        <section id="formatos" className="relative w-full bg-[#f4f5f7] px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Formatos
              </span>
              <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
                Um formato para cada intenção.
              </h2>
              <p className="mt-4 max-w-lg text-base text-ink/55">
                A maior tela do carro, adaptada ao seu objetivo — da marca em tela
                cheia à conversa direta com o passageiro. Food, imobiliário,
                beleza, varejo: se o seu cliente anda de carro, ele te vê.
              </p>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <div>
                <AdTablet variant="display" brand="Rango Burger" eyebrow="Só hoje, perto de você" headline={'Combo duplo\npor R$ 24,90'} tone="brand" />
                <h3 className="mt-5 font-grotesk text-lg font-bold text-ink">Display</h3>
                <p className="mt-1 text-sm text-ink/55">
                  Imagem em alta definição que domina a tela — ideal para marca e oferta.
                </p>
              </div>
              <div>
                <AdTablet variant="video" brand="Viver Construtora" eyebrow="Lançamento" headline={'Seu apê na planta,\nentrada facilitada'} tone="deep" />
                <h3 className="mt-5 font-grotesk text-lg font-bold text-ink">Vídeo</h3>
                <p className="mt-1 text-sm text-ink/55">
                  Movimento e som que prendem a atenção no trajeto — sua história em tela cheia.
                </p>
              </div>
              <div>
                <AdTablet variant="interactive" brand="Essência" eyebrow="Mês das mães" headline={'Presente que\nchega hoje'} tone="mint" />
                <h3 className="mt-5 font-grotesk text-lg font-bold text-ink">Interativo</h3>
                <p className="mt-1 text-sm text-ink/55">
                  QR que vira compra na hora ou conversa direta com a empresa. Sem intermediário.
                </p>
              </div>
            </div>

            {/* Política de conteúdo */}
            <div className="mt-14 rounded-3xl border border-black/5 bg-white p-8 md:p-10">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Curadoria
              </span>
              <h3 className="mt-3 font-grotesk text-2xl font-bold text-ink">
                Nem toda marca entra na tela.
              </h3>
              <p className="mt-3 max-w-3xl text-base text-ink/55">
                O passageiro é público cativo e a tela está ao alcance de qualquer
                idade. Por isso recusamos campanhas de apostas, bebidas e produtos
                de risco à saúde, conteúdo adulto, disputa político-partidária e
                qualquer peça que apele para agressão ou constrangimento. É um
                ambiente seguro para a sua marca porque é seguro para quem viaja.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 🎞️ Para que serve · tablet à esquerda → card à direita ═══ */}
        <Beat beat={2} className="items-end justify-center text-right">
          <Card>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Para que serve
            </span>
            <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.08] tracking-tight text-ink md:text-5xl">
              Alcance quem está em movimento — e pronto para agir.
            </h2>
            <p className="mt-4 text-base text-ink/55">
              Passageiros de aplicativo estão a caminho de algum lugar: comprar,
              comer, decidir. Fale com eles no momento certo, no trajeto certo, na
              sua cidade.
            </p>
            <Pills items={['No momento certo', 'No trajeto certo', 'Na sua cidade']} className="justify-end" />
          </Card>
        </Beat>

        {/* ═══ 🎞️ Como funciona · tablet à direita → card à esquerda ═══ */}
        <Beat beat={3} className="relative items-start justify-center text-left">
          <Card>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
              Como funciona
            </span>
            <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.08] tracking-tight text-ink md:text-5xl">
              Viu, escaneou, comprou.
            </h2>
            <p className="mt-4 text-base text-ink/55">
              Cada anúncio traz um QR exclusivo. O passageiro escaneia e, em
              segundos, compra na hora ou fala direto com a empresa anunciante.
              Sem intermediário.
            </p>
            <Pills items={['QR exclusivo', 'Compra na hora', 'Sem intermediário']} />
          </Card>
        </Beat>

        {/* ─── 🟦 ESTÁTICO · Plano ─── */}
        <section className="relative w-full bg-white px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0a9d6c]">
              Plano do motorista
            </span>
            <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
              Fature em cada corrida.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-ink/55">
              O motorista adere ao plano e recebe o Kit Renda Extra. Contratos
              trimestrais, semestrais ou anuais.
            </p>
            <p className="mx-auto mt-6 max-w-xl font-grotesk text-lg font-semibold text-ink/80">
              A mágica está na plataforma — não no tablet.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-black/5 bg-[#f7f8fa] p-8 shadow-[0_24px_60px_-30px_rgba(11,29,58,0.4)] md:p-10">
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
              Kit Renda Extra
            </span>
            <h3 className="mt-5 font-grotesk text-2xl font-bold text-ink">
              Tablet, suporte e chip no banco de trás
            </h3>
            <p className="mt-2 text-base text-ink/55">
              Tudo pronto pra rodar e faturar com cada anúncio exibido.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'Tablet, suporte e aplicativo inclusos',
                'Chip da operadora à sua escolha na compra',
                'Anúncios em carrossel, offline',
                'Relatório mensal de acessos e leads',
                'Ganhe por lead convertido',
                'Indique outro motorista e ganhe',
              ].map((li) => (
                <li key={li} className="flex gap-2.5 text-sm text-ink/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0a9d6c]" />
                  {li}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-black/5 pt-6">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink/40">
                Contratos
              </span>
              {['Trimestral', 'Semestral', 'Anual'].map((per) => (
                <span key={per} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 ring-1 ring-black/5">
                  {per}
                </span>
              ))}
            </div>
            <p className="mt-5 text-xs text-ink/40">Valores sob consulta.</p>
          </div>
        </section>

        {/* ═══ 🎞️ Para o motorista · tablet à direita → card à esquerda ═══ */}
        <Beat beat={4} className="items-start justify-center text-left">
          <Card>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#0a9d6c]">
              Para o motorista
            </span>
            <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.08] tracking-tight text-ink md:text-5xl">
              O tablet que dirige junto — e rende.
            </h2>
            <p className="mt-4 text-base text-ink/55">
              Enquanto roda a cidade, o motorista fatura com cada anúncio exibido.
              Uma renda extra que anda junto com a corrida — sem esforço, sem
              desvio de rota.
            </p>
            <div className="mt-6 border-t border-black/5 pt-5">
              <AppBadges />
            </div>
          </Card>
        </Beat>

        {/* ═══ 🎞️ Fecho · tablet centralizado ═══ */}
        <Beat beat={5} className="items-center justify-center text-center">
          <Card className="max-w-lg text-center">
            <span className="font-grotesk text-sm font-semibold uppercase tracking-[0.25em] text-brand">
              O resultado
            </span>
            <h2 className="mt-2 font-grotesk text-4xl font-bold leading-[1.04] tracking-tight text-ink md:text-5xl">
              Sua marca em <span className="text-brand">cada corrida</span>.
            </h2>
          </Card>
        </Beat>

        {/* ─── 🟦 ESTÁTICO · Ecossistema ─── */}
        <section className="relative w-full bg-white px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                Ecossistema
              </span>
              <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-ink md:text-5xl">
                Por que fazer parte?
              </h2>
            </div>
            <ul className="mt-14 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Leads inteligentes', 'Quem escaneia demonstrou interesse — você fala com intenção, não com audiência.'],
                ['Ganhos para os dois lados', 'O motorista fatura rodando, o anunciante paga por resultado.'],
                ['Versatilidade estratégica', 'Da campanha de bairro ao lançamento nacional, no mesmo painel.'],
                ['Metodologia que gera resultado', 'Raio, abrangência e período definidos por objetivo — não por chute.'],
                ['Alcance abrangente', 'Município, estado, país ou global: você escolhe até onde a marca vai.'],
                ['Flexibilidade e praticidade', 'Sobe a arte, aprova e entra no ar. Sem produção, sem instalação.'],
                ['Acompanhamento em tempo real', 'Veja quantos veículos estão online e em movimento, agora.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3 border-t border-black/5 pt-5">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand" />
                  <div>
                    <h3 className="font-grotesk text-base font-bold text-ink">{t}</h3>
                    <p className="mt-1 text-sm text-ink/55">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── 🟦 ESTÁTICO · Anunciante × Motorista + CTA ─── */}
        <section data-dark className="relative w-full bg-[#0B1D3A] px-6 py-24 md:px-16 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-aqua">
                Dois caminhos
              </span>
              <h2 className="mt-3 font-grotesk text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl">
                Você quer <span className="text-brand">anunciar</span> ou ser{' '}
                <span className="text-[#33d69f]">parceiro</span>?
              </h2>
              <p className="mt-4 text-base text-white/60">
                Siga os passos para se tornar um parceiro ou anunciante.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {/* Anunciante */}
              <div className="flex flex-col rounded-3xl bg-white/[0.04] p-8 ring-1 ring-white/10 md:p-10">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">
                  Anunciante
                </span>
                <h3 className="mt-3 font-grotesk text-2xl font-bold text-white">
                  Sua marca em movimento
                </h3>
                <ul className="mt-6 space-y-3 text-sm text-white/70">
                  {[
                    'Escolha quantidade de veículos, cidade e período',
                    'Relatórios de acesso, QR e leads potenciais',
                    'Fale direto com quem escaneou — sem intermediário',
                  ].map((li) => (
                    <li key={li} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {li}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cadastro/empresa"
                  className="mt-8 rounded-full bg-brand px-8 py-3.5 text-center text-sm font-semibold text-white no-underline shadow-[0_16px_44px_-12px_rgba(37,99,255,0.8)] transition hover:brightness-110"
                >
                  Desejo anunciar
                </Link>
              </div>

              {/* Motorista */}
              <div className="flex flex-col rounded-3xl bg-white/[0.04] p-8 ring-1 ring-white/10 md:p-10">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#33d69f]">
                  Motorista
                </span>
                <h3 className="mt-3 font-grotesk text-2xl font-bold text-white">
                  Renda extra que anda com você
                </h3>
                <ul className="mt-6 space-y-3 text-sm text-white/70">
                  {[
                    'Tablet FastLead no banco de trás do carro',
                    'Ganhe por lead convertido durante as corridas',
                    'Relatório mensal no app, em gráficos',
                  ].map((li) => (
                    <li key={li} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#33d69f]" />
                      {li}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-6">
                  {['Uber', '99', 'inDrive'].map((app) => (
                    <span
                      key={app}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-white/10"
                    >
                      {app}
                    </span>
                  ))}
                </div>
                <Link
                  to="/cadastro/motorista"
                  className="mt-8 rounded-full bg-[#0a9d6c] px-8 py-3.5 text-center text-sm font-semibold text-white no-underline shadow-[0_16px_44px_-12px_rgba(10,157,108,0.8)] transition hover:brightness-110"
                >
                  Desejo ser parceiro
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
