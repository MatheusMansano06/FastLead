import { Link } from 'react-router-dom';
import SiteHeader, { IconWhats, WHATSAPP } from '../components/landing/SiteHeader';
import SiteFooter from '../components/landing/SiteFooter';
import PlanBuilder from '../components/landing/PlanBuilder';
import Marquee from '../components/landing/Marquee';
import Reveal from '../components/landing/Reveal';
import AdTablet from '../components/landing/AdTablet';
import AppBadges from '../components/landing/AppBadges';
import AssistenteFastLead from '../components/landing/AssistenteFastLead';
import { calcularPlano, moeda } from '../lib/rateCard';
import passageiroTabletImg from '/passageiro-tablet.webp';

/**
 * Landing pública.
 *
 * Reescrita em 2026-08-09 depois que a versão com cena 3D (React Three Fiber)
 * foi rejeitada por parecer pouco profissional. A análise dos três concorrentes
 * de referência — AquiAds, JCDecaux e Eletromidia — mostrou que NENHUM usa 3D,
 * scrollytelling ou parallax: o teto de movimento deles é um fade com ~4px de
 * deslocamento. Credibilidade em mídia B2B vem de foto real do produto em
 * operação, tipografia disciplinada e número com fonte declarada.
 *
 * A aposta de diferenciação está na seção #atribuicao: os três concorrentes
 * param a métrica no impacto ("69% prestam atenção"). Nenhum fala de conversão.
 * O funil impressão → scan → lead é o único terreno em que somos mais
 * verificáveis que eles, então ele é o eixo da página, não um bullet.
 */

/* ─────────────────────────── ícones ─────────────────────────── */

const Ico = ({ d, className = '' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IconTela = (p) => <Ico {...p} d="M4 4h16v11H4zM9 19h6M12 15v4" />;
const IconQr = (p) => <Ico {...p} d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />;
const IconLead = (p) => <Ico {...p} d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 8v6M21 11h-6" />;
const IconCheck = (p) => <Ico {...p} d="M4 12l5 5L20 6" />;
const IconEscudo = (p) => <Ico {...p} d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3ZM9 12l2 2 4-4" />;
const IconAlvo = (p) => <Ico {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />;
const IconGrafico = (p) => <Ico {...p} d="M4 20V10M10 20V4M16 20v-7M22 20H2" />;
const IconRaio = (p) => <Ico {...p} d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />;
const IconSeta = (p) => <Ico {...p} d="M5 12h14M13 6l6 6-6 6" />;

/* ──────────────────────── blocos auxiliares ──────────────────────── */

function Eyebrow({ children, cor = 'text-brand' }) {
  return (
    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${cor}`}>{children}</span>
  );
}

function Secao({ id, children, className = '', fundo = 'bg-white' }) {
  return (
    <section id={id} className={`w-full px-5 py-20 md:px-8 md:py-28 ${fundo} ${className}`}>
      <div className="mx-auto max-w-[1240px]">{children}</div>
    </section>
  );
}

/* ─────────────────────────── página ─────────────────────────── */

// Piso de investimento derivado do MESMO rate card do simulador — se o preço
// mudar lá, a âncora do hero acompanha sozinha em vez de virar mentira.
const PLANO_ENTRADA = calcularPlano({
  veiculos: 10,
  contratoId: '1s',
  horas: 2,
  periodos: ['tarde'],
  pracas: [],
});

const ETAPAS_ISL = [
  {
    sigla: 'I',
    titulo: 'Impressão',
    icone: IconTela,
    cor: '#2563FF',
    texto:
      'O tablet registra cada exibição da sua peça na tela, com carro, praça e horário. Funciona offline e sincroniza depois — corrida em túnel não some do relatório.',
  },
  {
    sigla: 'S',
    titulo: 'Scan',
    icone: IconQr,
    cor: '#00A0C4',
    texto:
      'Cada campanha tem um QR exclusivo. Quando o passageiro aponta a câmera, o scan é gravado e atribuído àquela campanha e àquele motorista — não a um agregado.',
  },
  {
    sigla: 'L',
    titulo: 'Lead',
    icone: IconLead,
    cor: '#00A86B',
    texto:
      'O scan vira contato com nome e telefone, ou vai direto para a sua página. Você fala com quem demonstrou interesse, sem intermediário e sem estimativa.',
  },
];

export default function Landing() {
  return (
    <div className="w-full bg-white text-ink antialiased">
      <AssistenteFastLead />
      <SiteHeader />

      <main className="pt-[68px]">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative w-full overflow-hidden px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
          <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-brand">
                <IconRaio className="h-3.5 w-3.5" />
                Mídia em veículos de aplicativo
              </span>

              <h1 className="mt-6 font-grotesk text-[36px] font-bold leading-[1.06] tracking-tight text-ink sm:text-[44px] lg:text-[52px]">
                Sua marca roda a cidade.
                <br />
                E volta com <span className="text-brand">o nome do cliente</span>.
              </h1>

              <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink/60 md:text-[17.5px]">
                Tablets no banco de trás de carros de aplicativo, com QR exclusivo em cada
                campanha. Você não recebe só estimativa de quantas pessoas viram — recebe o
                lead de quem escaneou.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#simulador"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('#simulador')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-7 py-4 text-[14.5px] font-bold text-white no-underline transition hover:bg-[#1d51d8]"
                >
                  Simular minha campanha
                  <IconSeta className="h-4 w-4" />
                </a>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/12 px-7 py-4 text-[14.5px] font-semibold text-ink/75 no-underline transition hover:border-ink/25 hover:text-ink"
                >
                  <IconWhats className="h-[18px] w-[18px] text-[#25D366]" />
                  Falar com especialista
                </a>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="relative">
                <img
                  src={passageiroTabletImg}
                  alt="Passageira no banco de trás de um carro de aplicativo apontando a câmera do celular para o QR code exibido no tablet FastLead"
                  width="1373"
                  height="1146"
                  fetchPriority="high"
                  className="w-full rounded-2xl object-cover shadow-[0_30px_70px_-40px_rgba(11,29,58,0.45)]"
                />
                {/* etiqueta de leitura rápida sobre a foto */}
                <div className="absolute -bottom-5 left-4 right-4 rounded-xl border border-ink/[0.07] bg-white/95 p-4 backdrop-blur md:left-6 md:right-auto md:w-[300px]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#00A86B]/10 text-[#00A86B]">
                      <IconQr className="h-[18px] w-[18px]" />
                    </span>
                    <p className="text-[13px] font-semibold leading-snug text-ink">
                      Escaneou o QR?
                      <span className="block font-normal text-ink/50">
                        Virou lead no seu painel, na hora.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <Marquee />

        {/* ═══════════════ O PRODUTO ═══════════════ */}
        <Secao id="produto" fundo="bg-[#F4F6FA]">
          <Reveal>
            <div className="max-w-2xl">
              <Eyebrow>O produto</Eyebrow>
              <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight text-ink md:text-[42px]">
                O trajeto é o horário nobre que ninguém está usando.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink/55">
                Dentro do carro o passageiro está sentado, parado e com o celular na mão. É o
                raro momento em que a tela da sua marca não disputa espaço com mais nada — e
                em que agir custa um gesto.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icone: IconTela,
                titulo: 'Tela cheia, sem concorrência',
                texto:
                  'Sua peça ocupa o tablet inteiro. Não há feed, não há anúncio ao lado, não há botão de pular.',
              },
              {
                icone: IconAlvo,
                titulo: 'Segmentação que existe de verdade',
                texto:
                  'Cidade, estado ou região; Uber, 99, inDrive ou táxi; e a modalidade da corrida. Os filtros do simulador são os mesmos do painel.',
              },
              {
                icone: IconGrafico,
                titulo: 'Relatório do que aconteceu',
                texto:
                  'Impressões, scans e leads por campanha e por praça. Número que sai do banco, não de projeção de alcance.',
              },
            ].map((c, i) => (
              <Reveal key={c.titulo} delay={i * 70}>
                <div className="h-full rounded-2xl border border-ink/[0.07] bg-white p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.08] text-brand">
                    <c.icone className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-grotesk text-[19px] font-bold text-ink">{c.titulo}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink/55">{c.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Secao>

        {/* ═══════════════ ATRIBUIÇÃO — o diferencial ═══════════════ */}
        <Secao id="atribuicao" fundo="bg-ink" className="text-white">
          <Reveal>
            <div className="max-w-3xl">
              <Eyebrow cor="text-aqua">Atribuição ISL</Eyebrow>
              <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight md:text-[42px]">
                A mídia de rua para de contar no impacto.
                <br />
                <span className="text-aqua">A gente conta até o lead.</span>
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-white/60">
                Painel de rua, elevador e metrô medem quantas pessoas passaram por perto e
                quantas declararam prestar atenção. É estimativa de audiência. Nosso funil é
                registrado evento a evento — <strong className="font-semibold text-white">
                impressão → scan → lead</strong> — e cada etapa fica atribuída à campanha, à
                praça e ao motorista que a exibiu.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {ETAPAS_ISL.map((e, i) => (
              <Reveal key={e.sigla} delay={i * 80}>
                <div className="relative h-full rounded-2xl bg-white/[0.04] p-7 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: e.cor }}
                    >
                      <e.icone className="h-5 w-5" />
                    </span>
                    <span className="font-grotesk text-[42px] font-bold leading-none text-white/10">
                      {e.sigla}
                    </span>
                  </div>
                  <h3 className="mt-5 font-grotesk text-[19px] font-bold">{e.titulo}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/55">{e.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <p className="mt-8 max-w-3xl text-[13px] leading-relaxed text-white/35">
              ISL é o nome do nosso funil de atribuição: Impressão, Scan e Lead são eventos
              gravados individualmente na plataforma. Os relatórios do painel derivam desses
              eventos — não publicamos número de alcance que não venha deles.
            </p>
          </Reveal>
        </Secao>

        {/* ═══════════════ FORMATOS ═══════════════ */}
        <Secao id="formatos">
          <Reveal>
            <div className="max-w-2xl">
              <Eyebrow>Formatos</Eyebrow>
              <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight text-ink md:text-[42px]">
                Um formato para cada intenção.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink/55">
                A maior tela do carro, adaptada ao seu objetivo — da marca em tela cheia à
                conversa direta com o passageiro.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                props: {
                  variant: 'display',
                  brand: "McDonald's",
                  imagem: '/ad-mcdonalds.webp',
                  imagemAlt: "Peça de exemplo do McDonald's ocupando a tela do tablet",
                },
                titulo: 'Display',
                texto: 'Imagem em alta definição que domina a tela.',
                ideal: 'Ideal para oferta local e reforço de marca.',
              },
              {
                props: {
                  variant: 'video',
                  brand: 'Loovi',
                  imagem: '/ad-loovi.webp',
                  imagemAlt: 'Peça de exemplo da Loovi em formato de vídeo no tablet',
                },
                titulo: 'Vídeo',
                texto: 'Movimento e som que prendem a atenção no trajeto.',
                ideal: 'Ideal para lançamento e produto de ticket alto.',
              },
              {
                props: {
                  variant: 'interactive',
                  brand: 'Nubank',
                  imagem: '/ad-nubank.webp',
                  imagemAlt: 'Peça de exemplo do Nubank com QR code na tela do tablet',
                },
                titulo: 'Interativo',
                texto: 'QR que vira compra na hora ou conversa direta.',
                ideal: 'Ideal para quem quer lead com nome e telefone.',
              },
            ].map((f, i) => (
              <Reveal key={f.titulo} delay={i * 70}>
                <div>
                  <AdTablet {...f.props} />
                  <h3 className="mt-5 font-grotesk text-[19px] font-bold text-ink">{f.titulo}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink/55">{f.texto}</p>
                  <p className="mt-2 text-[13.5px] font-semibold text-brand">{f.ideal}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={80}>
            <p className="mt-8 max-w-3xl text-[13px] leading-relaxed text-ink/40">
              Peças exibidas apenas para demonstrar como cada formato ocupa a tela. As marcas
              citadas não são clientes, anunciantes nem parceiras da FastLead.
            </p>
          </Reveal>

          {/* curadoria */}
          <Reveal delay={100}>
            <div
              id="curadoria"
              className="mt-14 grid gap-8 rounded-2xl border border-ink/[0.07] bg-[#F4F6FA] p-8 md:grid-cols-[auto_1fr] md:p-10"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-white">
                <IconEscudo className="h-6 w-6" />
              </span>
              <div>
                <Eyebrow>Curadoria</Eyebrow>
                <h3 className="mt-2.5 font-grotesk text-[24px] font-bold text-ink">
                  Nem toda marca entra na tela.
                </h3>
                <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink/55">
                  O passageiro é público cativo e a tela está ao alcance de qualquer idade. Por
                  isso recusamos campanhas de apostas, bebidas e produtos de risco à saúde,
                  conteúdo adulto, disputa político-partidária e qualquer peça que apele para
                  agressão ou constrangimento. É um ambiente seguro para a sua marca porque é
                  seguro para quem viaja.
                </p>
              </div>
            </div>
          </Reveal>
        </Secao>

        {/* ═══════════════ SIMULADOR ═══════════════ */}
        <PlanBuilder />

        {/* ═══════════════ COMO FUNCIONA ═══════════════ */}
        <Secao>
          <Reveal>
            <div className="max-w-2xl">
              <Eyebrow>Como funciona</Eyebrow>
              <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight text-ink md:text-[42px]">
                Dois caminhos, o mesmo tablet.
              </h2>
            </div>
          </Reveal>

          {[
            {
              eyebrow: 'Para anunciantes',
              cor: '#2563FF',
              passos: [
                ['Monte o plano', 'Escolha praças, número de veículos, prazo e período no simulador. O plano vira proposta.'],
                ['Suba a arte', 'Envie a peça, escolha onde o QR aparece no banner e aprove o preview antes de entrar no ar.'],
                ['Acompanhe o funil', 'Impressões, scans e leads por campanha e praça, atualizados no painel.'],
              ],
            },
            {
              eyebrow: 'Para motoristas parceiros',
              cor: '#00A86B',
              passos: [
                ['Adquira o Kit Renda Extra', 'Tablet, suporte e chip. Instala no encosto do banco e pareia com um código.'],
                ['Escolha o que exibe', 'O marketplace mostra as campanhas disponíveis para o seu perfil. É o seu carro — você aceita ou recusa.'],
                ['Receba por lead', 'O ganho é registrado no momento da conversão e fica visível no app, corrida a corrida.'],
              ],
            },
          ].map((trilho) => (
            <div key={trilho.eyebrow} className="mt-14">
              <Reveal>
                <Eyebrow cor="">
                  <span style={{ color: trilho.cor }}>{trilho.eyebrow}</span>
                </Eyebrow>
              </Reveal>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {trilho.passos.map(([titulo, texto], i) => (
                  <Reveal key={titulo} delay={i * 70}>
                    <div className="h-full rounded-2xl border border-ink/[0.07] bg-white p-7">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-lg font-grotesk text-[16px] font-bold text-white"
                        style={{ backgroundColor: trilho.cor }}
                      >
                        {i + 1}
                      </span>
                      <h3 className="mt-5 font-grotesk text-[18px] font-bold text-ink">{titulo}</h3>
                      <p className="mt-2 text-[14.5px] leading-relaxed text-ink/55">{texto}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </Secao>

        {/* ═══════════════ MOTORISTA ═══════════════ */}
        <Secao fundo="bg-[#F4F6FA]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <Eyebrow cor="text-[#00A86B]">Para o motorista</Eyebrow>
              <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight text-ink md:text-[42px]">
                O tablet que dirige junto — e rende.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink/55">
                Enquanto roda a cidade, o motorista fatura com cada lead convertido. Uma renda
                extra que anda junto com a corrida, sem esforço e sem desvio de rota.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  'Anúncios em carrossel, funciona offline',
                  'Ganho registrado na conversão',
                  'Relatório mensal no app',
                  'Indique outro motorista e ganhe',
                  'Você aceita ou recusa cada campanha',
                  'Uber, 99, inDrive e táxi',
                ].map((li) => (
                  <li key={li} className="flex gap-2.5 text-[14.5px] text-ink/65">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#00A86B]" strokeWidth="2.5" />
                    {li}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  to="/cadastro/motorista"
                  className="inline-block rounded-lg bg-[#00A86B] px-7 py-3.5 text-[14.5px] font-bold text-white no-underline transition hover:bg-[#00915c]"
                >
                  Quero ser parceiro
                </Link>
              </div>
              <div className="mt-8 border-t border-ink/[0.07] pt-6">
                <AppBadges />
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-2xl border border-ink/[0.07] bg-white p-8">
                <Eyebrow>Kit Renda Extra</Eyebrow>
                <h3 className="mt-3 font-grotesk text-[22px] font-bold text-ink">
                  Tablet, suporte e chip no banco de trás
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink/55">
                  Tudo pronto para rodar. A operadora do chip é escolhida na compra.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink/[0.07] pt-6">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.15em] text-ink/35">
                    Contratos
                  </span>
                  {['Trimestral', 'Semestral', 'Anual'].map((p) => (
                    <span
                      key={p}
                      className="rounded-lg bg-[#F4F6FA] px-3 py-1.5 text-[12.5px] font-semibold text-ink/65"
                    >
                      {p}
                    </span>
                  ))}
                </div>
                <p className="mt-5 text-[12.5px] text-ink/40">
                  Valores do kit sob consulta — falamos por WhatsApp.
                </p>
              </div>
            </Reveal>
          </div>
        </Secao>
      </main>

      <SiteFooter />
    </div>
  );
}
