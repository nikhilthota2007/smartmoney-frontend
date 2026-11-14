import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CreditCard, Eye, ShieldCheck, Target } from 'lucide-react';
import useRevealOnce from './useRevealOnce';

/** Each door opens setup with that goal already picked. */
export const DOORS = [
  { goal: 'debt', icon: CreditCard, title: 'My cards feel heavy', sub: 'Find the fastest, cheapest way out.' },
  { goal: 'safety', icon: ShieldCheck, title: 'One surprise bill would sink me', sub: 'Build a cushion, a little at a time.' },
  { goal: 'smarter', icon: Eye, title: 'I don’t know where it all goes', sub: 'Add a statement and see the leaks.' },
  { goal: 'save', icon: Target, title: 'I’m saving for something', sub: 'Find out if the date is realistic.' },
];

/** "Not sure where to start?" Four plain-language ways in. */
const StartHere = ({ motion }) => {
  const ref = useRef(null);
  const revealed = useRevealOnce(ref, motion, 0.2);

  return (
    <section className={`start-here${revealed ? ' is-revealed' : ''}`} ref={ref} aria-labelledby="start-here-title">
      <div className="section-head">
        <p className="kicker">Start here</p>
        <h2 className="section-heading" id="start-here-title">
          Not sure where to begin? Pick the one that sounds like you.
        </h2>
        <p className="section-lede">
          No wrong answers, and you can change it later. We’ll take it from there.
        </p>
      </div>
      <ul className="doors">
        {DOORS.map(({ goal, icon: Icon, title, sub }, index) => (
          <li key={goal} style={{ '--i': index }}>
            <Link to={`/start?goal=${goal}`} className="door">
              <span className="door-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="door-title">{title}</span>
              <span className="door-sub">{sub}</span>
              <ArrowUpRight className="door-arrow" size={20} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default StartHere;
