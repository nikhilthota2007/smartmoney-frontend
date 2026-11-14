import { useEffect, useState } from 'react';

/**
 * True once the element has scrolled into view. Without motion it is true
 * from the start, so tests and reduced-motion visitors see finished states.
 */
const useRevealOnce = (ref, motion, threshold = 0.3) => {
  const [revealed, setRevealed] = useState(!motion);

  useEffect(() => {
    if (!motion || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [motion, ref, threshold]);

  return revealed;
};

export default useRevealOnce;
