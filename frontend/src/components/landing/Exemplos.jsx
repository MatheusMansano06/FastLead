import AdTablet from './AdTablet';
import Reveal from './Reveal';

/**
 * Galeria de peças de exemplo.
 *
 * A seção #formatos explica os três formatos no abstrato, com marcas fictícias.
 * Esta aqui existe para o visitante conseguir *imaginar a própria marca* na
 * tela: mesmos três formatos, mas assinados por marcas grandes e conhecidas.
 *
 * ATENÇÃO — as marcas abaixo NÃO são clientes. São exemplos de layout, e a
 * página diz isso em texto visível logo abaixo da galeria. Por isso também
 * nunca reproduzimos logotipo: só o nome em tipografia neutra. Se um dia a
 * área jurídica pedir para tirar, basta trocar os `marca` desta lista por
 * nomes fictícios — nada mais no arquivo depende deles.
 */

const EXEMPLOS = [
  {
    marca: 'Cimed',
    setor: 'Farmacêutica',
    formato: 'Display · sem QR',
    objetivo: 'Presença de marca',
    texto:
      'Tela cheia, sem chamada para ação. O passageiro só precisa ver — a métrica que importa é impressão por praça e horário.',
    props: {
      variant: 'display',
      eyebrow: 'Saúde ao seu alcance',
      headline: 'Cuidar da família\ncabe no orçamento',
      cta: null,
      cores: ['#0B3FA8', '#1479D0', '#16B8C4'],
      pontoCor: '#0B3FA8',
    },
  },
  {
    marca: "McDonald's",
    setor: 'Alimentação',
    formato: 'Display · com QR',
    objetivo: 'Cupom e lead',
    texto:
      'O QR é exclusivo da campanha. Cada leitura entra no painel já atribuída à praça e ao motorista que exibiu a peça.',
    props: {
      variant: 'interactive',
      eyebrow: 'Só nesta corrida',
      headline: 'Oferta do dia\nno seu celular',
      qrTexto: 'Aponte a câmera\ne pegue o cupom',
      cores: ['#C8102E', '#E23744', '#FFC72C'],
      pontoCor: '#FFC72C',
    },
  },
  {
    marca: 'XP Investimentos',
    setor: 'Serviços financeiros',
    formato: 'Vídeo · 15s',
    objetivo: 'Lançamento e ticket alto',
    texto:
      'Movimento e som durante o trajeto. A impressão só é registrada quando o vídeo roda até o fim, não quando entra na fila.',
    props: {
      variant: 'video',
      eyebrow: 'Novo aporte automático',
      headline: 'Invista com quem\nexplica o porquê',
      cores: ['#101014', '#26262C', '#FFC800'],
      pontoCor: '#FFC800',
    },
  },
  {
    marca: 'Loovi',
    setor: 'Seguro auto',
    formato: 'Display · com QR',
    objetivo: 'Cotação e lead',
    texto:
      'Público duplo: o passageiro que também dirige. O QR abre a cotação já com a praça de origem marcada na campanha.',
    props: {
      variant: 'interactive',
      eyebrow: 'Seguro para quem roda',
      headline: 'Cotação em 2 min,\nsem letra miúda',
      qrTexto: 'Aponte a câmera\ne faça sua cotação',
      cores: ['#2A1B6B', '#4C3BD4', '#8B5CF6'],
      pontoCor: '#8B5CF6',
    },
  },
];

export default function Exemplos() {
  return (
    <section id="exemplos" className="w-full bg-ink px-5 py-20 text-white md:px-8 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-aqua">
              Exemplos
            </span>
            <h2 className="mt-3 font-grotesk text-[32px] font-bold leading-[1.08] tracking-tight md:text-[42px]">
              Assim uma marca grande aparece no banco de trás.
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-white/60">
              Quatro peças, três formatos: publicidade estática sem QR, oferta com QR que vira
              lead e vídeo para lançamento. Mesma tela, mesmo tablet.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {EXEMPLOS.map((e, i) => (
            <Reveal key={e.marca} delay={i * 80}>
              <figure className="m-0 h-full">
                <AdTablet brand={e.marca} {...e.props} />

                <figcaption className="mt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-aqua">
                      {e.formato}
                    </span>
                    <span className="text-[12.5px] text-white/40">{e.setor}</span>
                  </div>

                  <h3 className="mt-3 font-grotesk text-[19px] font-bold">{e.marca}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/55">{e.texto}</p>
                  <p className="mt-2.5 text-[13.5px] font-semibold text-aqua">{e.objetivo}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <p className="mt-10 max-w-3xl text-[13px] leading-relaxed text-white/35">
            Peças ilustrativas criadas pela FastLead apenas para demonstrar os formatos de tela.
            As marcas citadas servem de exemplo de layout e não são clientes, anunciantes nem
            parceiras da FastLead — nenhum logotipo, arte ou campanha real foi reproduzido.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
