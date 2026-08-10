import { useEffect, useRef, useState } from 'react';

/**
 * Reveal de entrada — fade + 8px de deslocamento, uma vez só.
 *
 * O teto de 8px é deliberado. Os três concorrentes analisados (AquiAds,
 * JCDecaux, Eletromidia) usam de 0 a 4px de deslocamento e nenhum usa parallax,
 * scrub ou WebGL. Movimento grande é o que fazia a landing anterior parecer
 * demo de portfólio em vez de fornecedor de mídia. Se for mexer neste número,
 * mexa para baixo.
 */
export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Quem pediu menos movimento no sistema não recebe nem os 8px.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisivel(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? 'none' : 'translateY(8px)',
        transition: `opacity 520ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 520ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
