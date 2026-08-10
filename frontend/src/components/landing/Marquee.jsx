import { CIDADES } from '../../lib/pracas';

/**
 * Faixa rolante de praças. Comunica abrangência em dois segundos por
 * praticamente nada — padrão que a Eletromidia usa e que funciona bem.
 *
 * A lista é duplicada porque o keyframe translada -50%: quando a primeira
 * metade sai, a segunda já está no lugar exato e o loop fica sem emenda.
 */

const CORES = ['#2563FF', '#00A0C4', '#00A86B', '#0B1D3A', '#7C5CFF'];

export default function Marquee() {
  const itens = CIDADES.slice(0, 22);

  return (
    <div className="w-full overflow-hidden border-y border-ink/[0.07] bg-white py-5">
      <div className="fl-marquee-track flex w-max gap-2.5">
        {[...itens, ...itens].map((c, i) => (
          <span
            key={i}
            aria-hidden={i >= itens.length}
            className="whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
            style={{ backgroundColor: CORES[i % CORES.length] }}
          >
            {c.cidade} · {c.uf}
          </span>
        ))}
      </div>
    </div>
  );
}
