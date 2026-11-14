import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import useRevealOnce from './useRevealOnce';
import { CARD_EXAMPLE, SAVINGS_EXAMPLE } from './facts';
import { duration, money } from '../cards/display';

/** Money myths that keep people stuck, each with the truth on the back. */
export const buildMyths = ({ slow, fast, savings }) => [
  {
    key: 'score',
    myth: 'Checking my credit score will lower it.',
    truth: (
      <>
        Checking your own score is a soft inquiry and never counts against you. Your credit reports are free every
        week at{' '}
        <a href="https://www.annualcreditreport.com" target="_blank" rel="noreferrer">
          AnnualCreditReport.com
        </a>
        .
      </>
    ),
  },
  {
    key: 'balance',
    myth: 'I have to carry a balance to build credit.',
    truth: 'Paying the full statement balance every month builds the same history, and costs nothing in interest.',
  },
  {
    key: 'extra',
    myth: 'Paying a little extra barely makes a dent.',
    truth: `${money(CARD_EXAMPLE.balance)} at ${CARD_EXAMPLE.apr}% APR, paying ${money(CARD_EXAMPLE.slow)} a month: ${duration(slow.months)} and ${money(slow.totalInterest)} in interest. Paying ${money(CARD_EXAMPLE.fast)}: ${duration(fast.months)} and ${money(fast.totalInterest)}.`,
  },
  {
    key: 'small',
    myth: 'Small amounts aren’t worth saving.',
    truth: `${money(SAVINGS_EXAMPLE.monthly)} a month for ${SAVINGS_EXAMPLE.years} years is ${money(savings.totalContributed)} put away, and about ${money(savings.finalBalance)} if it earns 5% a year. Returns aren’t guaranteed; the habit is.`,
  },
  {
    key: 'verdict',
    myth: 'Being in debt means I’m bad with money.',
    truth: 'Debt is a math problem, not a verdict on you. Math problems have answers, and you can start on yours today.',
  },
  {
    key: 'everything',
    myth: 'I have to fix everything at once.',
    truth: 'One change you keep beats five you drop. Start with whichever one is loudest, then add the next.',
  },
];

const MythCard = ({ item }) => {
  const [flipped, setFlipped] = useState(false);
  const titleId = `myth-${item.key}`;
  const frontRef = useRef(null);
  const resetRef = useRef(null);
  const touched = useRef(false);

  // The face being left becomes inert, so focus follows the card over.
  useEffect(() => {
    if (!touched.current) return;
    (flipped ? resetRef : frontRef).current?.focus({ preventScroll: true });
  }, [flipped]);

  const flip = (value) => {
    touched.current = true;
    setFlipped(value);
  };

  return (
    <li className={`myth${flipped ? ' is-flipped' : ''}`}>
      <div className="myth-inner">
        <button
          type="button"
          className="myth-face myth-front"
          ref={frontRef}
          onClick={() => flip(true)}
          aria-expanded={flipped}
          aria-controls={`${titleId}-truth`}
          inert={flipped ? true : undefined}
        >
          <span className="myth-tag">Myth</span>
          <span className="myth-text" id={titleId}>
            “{item.myth}”
          </span>
          <span className="myth-hint">Tap for the truth</span>
        </button>
        <div
          className="myth-face myth-back"
          id={`${titleId}-truth`}
          role="region"
          aria-labelledby={titleId}
          inert={flipped ? undefined : true}
        >
          <span className="myth-tag">Actually</span>
          <p className="myth-truth">{item.truth}</p>
          <button type="button" className="myth-reset" ref={resetRef} onClick={() => flip(false)}>
            <RotateCcw size={14} aria-hidden="true" />
            Flip back
          </button>
        </div>
      </div>
    </li>
  );
};

/** "Things that sound true and aren't." */
const MythCards = ({ motion, facts }) => {
  const ref = useRef(null);
  const revealed = useRevealOnce(ref, motion, 0.15);
  const myths = buildMyths(facts);

  return (
    <section className={`myths${revealed ? ' is-revealed' : ''}`} ref={ref} aria-labelledby="myths-title">
      <div className="section-head">
        <p className="kicker">Money myths</p>
        <h2 className="section-heading" id="myths-title">
          Things that sound true, and aren’t.
        </h2>
        <p className="section-lede">Tap a card. A few of these might take a weight off.</p>
      </div>
      <ul className="myth-grid">
        {myths.map((item) => (
          <MythCard key={item.key} item={item} />
        ))}
      </ul>
    </section>
  );
};

export default MythCards;
