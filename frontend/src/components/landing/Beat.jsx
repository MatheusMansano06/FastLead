import { motion, useTransform } from 'framer-motion';

// A scroll-driven text beat that fades + slides in and out over a progress range.
// range = [fadeInStart, fullStart, fullEnd, fadeOutEnd]
export default function Beat({ progress, range, reduced, className = '', children }) {
  const [a, b, c, d] = range;
  const opacity = useTransform(progress, [a, b, c, d], [0, 1, 1, 0]);
  const y = useTransform(progress, [a, b, c, d], reduced ? [0, 0, 0, 0] : [48, 0, 0, -48]);
  return (
    <motion.div style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}
