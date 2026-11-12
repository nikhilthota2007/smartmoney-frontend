import React from 'react';
import { AlertTriangle, Calculator, CalendarCheck } from 'lucide-react';
import { duration, money, monthLabel, shortDuration } from './display';

const TimelineBar = ({ label, months, max, muted }) => (
  <div className="timeline">
    <div className="timeline-head">
      <span>{label}</span>
      <span className="tabular">{shortDuration(months)}</span>
    </div>
    <div className="bar" aria-hidden="true">
      <div
        className={`bar-fill bar-grow${muted ? ' bar-fill-muted' : ' bar-fill-accent'}`}
        style={{ width: `${Math.max(4, (months / max) * 100)}%` }}
      />
    </div>
  </div>
);

/**
 * A simulate_debt_payoff result: when the debt clears, what the extra payment
 * buys against minimums alone, and how the two timelines compare.
 */
const PayoffCard = ({ result, today = new Date(), className = '' }) => {
  if (!result || result.error || !result.avalanche) return null;

  const { avalanche, snowball, comparedToMinimumsOnly: saved = {}, extraPayment = 0 } = result;
  const clears = avalanche.clearsWithinProjection !== false;
  const monthsSaved = saved.monthsSaved || 0;
  const baselineMonths = avalanche.months + monthsSaved;
  const snowballDiffers =
    snowball &&
    (snowball.months !== avalanche.months || Math.abs(snowball.totalInterest - avalanche.totalInterest) >= 1);

  return (
    <article className={`card tool-card payoff-card ${className}`.trim()} aria-label="Payoff plan">
      <header className="tool-card-head">
        <span className="eyebrow">
          <CalendarCheck size={14} aria-hidden="true" />
          Payoff plan
        </span>
        {extraPayment > 0 && <span className="chip chip-accent tabular">+{money(extraPayment)}/mo</span>}
      </header>

      {clears ? (
        <div className="tool-card-hero">
          <span className="tool-card-label">Debt-free by</span>
          <span className="figure" data-anim="month" data-months={avalanche.months}>
            {monthLabel(avalanche.months, today)}
          </span>
        </div>
      ) : (
        <div className="notice notice-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <strong>Not cleared within 50 years at this payment.</strong>
            Anything above the minimums goes straight to shrinking it.
          </div>
        </div>
      )}

      {clears && monthsSaved > 0 && (
        <div className="stat-pair">
          <div className="stat">
            <span className="stat-value tabular" data-anim="count" data-value={monthsSaved}>
              {monthsSaved}
            </span>
            <span className="stat-label">months sooner</span>
          </div>
          <div className="stat">
            <span className="stat-value tabular" data-anim="money" data-value={Math.round(saved.interestSaved)}>
              {money(saved.interestSaved)}
            </span>
            <span className="stat-label">less interest</span>
          </div>
        </div>
      )}

      {clears && (
        <div className="timeline-compare">
          {monthsSaved > 0 ? (
            <>
              <TimelineBar label="Minimums only" months={baselineMonths} max={baselineMonths} muted />
              <TimelineBar label={`With ${money(extraPayment)} extra`} months={avalanche.months} max={baselineMonths} />
            </>
          ) : (
            <TimelineBar label="At this payment" months={avalanche.months} max={avalanche.months} />
          )}
        </div>
      )}

      <div className="card-rows">
        <div className="card-row">
          <span>Monthly payment</span>
          <span>{money(avalanche.monthlyPayment)}</span>
        </div>
        <div className="card-row">
          <span>Total interest</span>
          <span>{money(avalanche.totalInterest)}</span>
        </div>
        {clears && snowballDiffers && (
          <div className="card-row">
            <span>Smallest balance first</span>
            <span>
              {duration(snowball.months)} · {money(snowball.totalInterest)}
            </span>
          </div>
        )}
      </div>

      <footer className="card-foot">
        <Calculator size={13} aria-hidden="true" />
        Highest rate first · calculated from your numbers
      </footer>
    </article>
  );
};

export default PayoffCard;
