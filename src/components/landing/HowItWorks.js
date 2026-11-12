import React from 'react';
import { Check } from 'lucide-react';
import StrategyCard from '../planning/StrategyCard';
import ScoreDial from '../cards/ScoreDial';
import { money, RATING_TONE } from '../cards/display';

/** Three steps, each shown with the real component fed by the demo profile. */
const HowItWorks = ({ demo }) => {
  const { completeness, strategy, slowest, health, rating, payoff, topRate } = demo;
  const tone = RATING_TONE[rating];

  return (
    <section className="how" aria-labelledby="how-title">
      <div className="how-head">
        <p className="eyebrow how-eyebrow">How it works</p>
        <h2 className="how-title" id="how-title">
          A plan in three steps, no spreadsheet.
        </h2>
      </div>

      <ol className="how-grid">
        <li className="how-step">
          <div className="how-visual" aria-hidden="true">
            <div className="card how-meter">
              <div className="how-meter-head">
                <span className="figure">{completeness.percent}%</span>
                <span className="tool-card-label">complete</span>
              </div>
              <div className="bar">
                <div className="bar-fill bar-fill-accent" style={{ width: `${completeness.percent}%` }} />
              </div>
              <ul className="how-meter-list">
                {completeness.sections.map((section) => (
                  <li key={section.key} className={section.complete ? 'is-done' : ''}>
                    {section.complete && <Check size={12} />}
                    {section.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <h3 className="how-step-title">Tell it straight</h3>
          <p className="how-step-body">
            What comes in, what goes out, what you owe. Rough numbers are fine, and you can skip anything you do not know yet.
          </p>
        </li>

        <li className="how-step">
          <div className="how-visual" aria-hidden="true">
            <StrategyCard
              variant="recommended"
              badge={`+${money(payoff.extraPayment)} a month`}
              title="Highest rate first"
              description={`Every extra dollar goes to the ${topRate}% card first`}
              result={strategy}
              timelineWidth={`${(strategy.months / slowest) * 100}%`}
            />
          </div>
          <h3 className="how-step-title">It runs the numbers</h3>
          <p className="how-step-body">
            Payoff dates, interest, what an extra {money(payoff.extraPayment)} does. Calculated by code, not guessed by a chatbot.
          </p>
        </li>

        <li className="how-step">
          <div className="how-visual" aria-hidden="true">
            <div className="card how-score">
              <ScoreDial score={health.total} tone={`var(--color-${tone})`} size={148} />
              <span className={`chip chip-${tone}`}>{rating}</span>
            </div>
          </div>
          <h3 className="how-step-title">You get a plan</h3>
          <p className="how-step-body">
            A health score, a debt-free date and an advisor that answers in your numbers, with no lecture attached.
          </p>
        </li>
      </ol>
    </section>
  );
};

export default HowItWorks;
