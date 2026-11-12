import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '../brand/Mark';
import { useProfile } from '../../context/ProfileContext';
import { profileCompleteness } from '../../lib/profile';

/**
 * Fixed header: transparent and white over the hero, solid once the hero has
 * scrolled out from under it. Returning users go straight to their plan.
 */
const SiteHeader = ({ watchRef }) => {
  const { profile } = useProfile();
  const [overHero, setOverHero] = useState(true);
  const returning = profileCompleteness(profile).percent > 0;

  useEffect(() => {
    const target = watchRef.current;
    if (!target || typeof window.IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(([entry]) => setOverHero(entry.isIntersecting), {
      rootMargin: '-60px 0px 0px 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchRef]);

  return (
    <header className={`site-header${overHero ? ' is-over-hero' : ' is-solid'}`}>
      <Link to="/" className="site-header-brand" aria-label="SmartMoney home">
        <Wordmark />
      </Link>
      <Link to={returning ? '/advisor' : '/start'} className="btn btn-small site-header-cta">
        {returning ? 'Open my plan' : 'Get my plan'}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </header>
  );
};

export default SiteHeader;
