import React, { useMemo, useRef, useState } from 'react';
import '../../styles/landing.css';
import SiteHeader from './SiteHeader';
import Hero from './Hero';
import ClaimSection from './ClaimSection';
import SiteFooter from './SiteFooter';
import { buildDemo } from './demo';
import { canAnimate } from '../common/motion';

/** The landing page. Its stylesheet and anime.js load only with this route. */
const Landing = () => {
  const demo = useMemo(buildDemo, []);
  const [motion] = useState(canAnimate);
  const heroRef = useRef(null);

  return (
    <div className="landing" data-motion={motion ? 'on' : 'off'} data-testid="landing">
      <SiteHeader watchRef={heroRef} />
      <main>
        <Hero demo={demo} motion={motion} sectionRef={heroRef} />
        <ClaimSection motion={motion} />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Landing;
