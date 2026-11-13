import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Section 2. The heading reveals once as it scrolls into view, then a coral
 * band sweeps across its second half (CSS; see .sweep in landing.css).
 */
const ClaimSection = ({ motion }) => {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!motion || !ref.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [motion]);

  return (
    <section className={`claim${revealed ? ' is-revealed' : ''}`} ref={ref} aria-labelledby="claim-title">
      <h2 className="claim-title" id="claim-title">
        Honest math. <span className="sweep">Zero judgment.</span>
      </h2>
      <p className="claim-body">
        Every answer is worked out from your real income, debts and goals, then explained without the lecture.
      </p>
      <Link to="/start" className="btn-glass claim-cta">
        Get my plan
      </Link>
      <p className="claim-note">A few quick questions and a statement. Saved on this device, not in an account.</p>
    </section>
  );
};

export default ClaimSection;
