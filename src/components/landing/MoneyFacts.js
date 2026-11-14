import React, { useEffect, useRef, useState } from 'react';
import useRevealOnce from './useRevealOnce';
import { CARD_EXAMPLE, SAVINGS_EXAMPLE, SURVEY_FACTS } from './facts';
import { duration, money } from '../cards/display';

const format = (value, { prefix = '', suffix = '', decimals = 0 }) =>
  `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

/**
 * A number that counts up once it is on screen. Assistive tech reads the
 * final figure only; the moving one is decorative.
 */
export const CountUp = ({ value, run, unit, ...options }) => {
  const [shown, setShown] = useState(run === null ? value : 0);

  useEffect(() => {
    if (!run) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1400);
      setShown(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, value]);

  return (
    <>
      <span aria-hidden="true">
        {format(shown, options)}
        {unit && <span className="fact-unit"> {unit}</span>}
      </span>
      <span className="visually-hidden">{`${format(value, options)}${unit ? ` ${unit}` : ''}`}</span>
    </>
  );
};

/** "You're in good company": published figures and two worked examples. */
const MoneyFacts = ({ motion, facts }) => {
  const ref = useRef(null);
  const revealed = useRevealOnce(ref, motion, 0.25);
  // null: no motion, show final values. false: waiting. true: counting.
  const run = motion ? revealed : null;
  const { slow, fast, savings } = facts;
  const monthsSooner = slow.months - fast.months;
  const interestSaved = slow.totalInterest - fast.totalInterest;

  return (
    <section className={`facts${revealed ? ' is-revealed' : ''}`} ref={ref} aria-labelledby="facts-title">
      <div className="section-head">
        <p className="kicker">Deep breath</p>
        <h2 className="section-heading" id="facts-title">
          If money feels tight, you’re far from the only one.
        </h2>
      </div>
      <ul className="fact-grid">
        {SURVEY_FACTS.map((fact, index) => (
          <li key={fact.key} className="fact" style={{ '--i': index }}>
            <p className="fact-figure tabular">
              <CountUp value={fact.value} run={run} prefix={fact.prefix} suffix={fact.suffix} unit={fact.unit} decimals={fact.decimals} />
            </p>
            <p className="fact-label">{fact.label}</p>
            <p className="fact-source">
              Source:{' '}
              <a href={fact.href} target="_blank" rel="noreferrer">
                {fact.source}
              </a>
            </p>
          </li>
        ))}
        <li className="fact" style={{ '--i': 2 }}>
          <p className="fact-figure tabular">
            <CountUp value={monthsSooner} run={run} unit="months" />
          </p>
          <p className="fact-label">
            sooner, and {money(interestSaved)} less interest, from paying {money(CARD_EXAMPLE.fast)} instead of{' '}
            {money(CARD_EXAMPLE.slow)} a month on {money(CARD_EXAMPLE.balance)} at {CARD_EXAMPLE.apr}% APR. Small
            changes move big numbers.
          </p>
          <p className="fact-source">
            Worked out with our payoff calculator: {duration(slow.months)} versus {duration(fast.months)}.
          </p>
        </li>
        <li className="fact" style={{ '--i': 3 }}>
          <p className="fact-figure tabular">
            <CountUp value={Math.round(savings.finalBalance)} run={run} prefix="$" />
          </p>
          <p className="fact-label">
            from {money(SAVINGS_EXAMPLE.monthly)} a month for {SAVINGS_EXAMPLE.years} years. You’d put in{' '}
            {money(savings.totalContributed)}; the rest is growth.
          </p>
          <p className="fact-source">{savings.assumption}</p>
        </li>
      </ul>
    </section>
  );
};

export default MoneyFacts;
