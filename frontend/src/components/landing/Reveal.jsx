import { useRef, useLayoutEffect } from 'react';
import { useMotionValueEvent } from 'framer-motion';

// Linear piecewise interpolation.
const interp = (p, inp, out) => {
  const n = inp.length;
  if (p <= inp[0]) return out[0];
  if (p >= inp[n - 1]) return out[n - 1];
  for (let i = 0; i < n - 1; i++) {
    if (p <= inp[i + 1]) {
      const t = (p - inp[i]) / (inp[i + 1] - inp[i]);
      return out[i] + t * (out[i + 1] - out[i]);
    }
  }
  return out[n - 1];
};

// Scroll-driven opacity/translate applied straight to the DOM node via a motion
// subscription. This sidesteps Framer's WAAPI acceleration, which mis-handles
// monotonic (1→0) opacity fades by ignoring the input breakpoints.
export default function Reveal({ progress, o, oOut, y, yOut, className = '', children }) {
  const ref = useRef(null);

  const apply = (p) => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = interp(p, o, oOut);
    if (y) el.style.transform = `translateY(${interp(p, y, yOut)}px)`;
  };

  useLayoutEffect(() => {
    apply(progress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMotionValueEvent(progress, 'change', apply);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
