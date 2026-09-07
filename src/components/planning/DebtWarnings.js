import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/format';

/**
 * A debt whose minimum payment is smaller than its monthly interest never gets
 * paid off. The simulation used to report this as a 50-year payoff, which reads
 * as a long wait rather than an impossibility.
 */
const DebtWarnings = ({ unpayable, hitsHorizon }) => {
  if (unpayable.length === 0 && !hitsHorizon) return null;

  return (
    <div className="debt-warnings" role="alert">
      {unpayable.map((debt) => (
        <div className="debt-warning" key={debt.name}>
          <AlertTriangle size={18} />
          <div>
            <strong>{debt.name} never gets paid off at its minimum payment.</strong>
            <p>
              It accrues about {formatCurrency(debt.interest)} of interest a month against a{' '}
              {formatCurrency(debt.minPayment)} minimum, so the balance grows by{' '}
              {formatCurrency(debt.shortfall)} a month. Paying anything above the minimum goes
              entirely to shrinking it.
            </p>
          </div>
        </div>
      ))}

      {hitsHorizon && unpayable.length === 0 && (
        <div className="debt-warning">
          <AlertTriangle size={18} />
          <div>
            <strong>These debts are not cleared within 50 years.</strong>
            <p>
              The projection stops there. Increasing the extra payment, or lowering a rate, will
              bring it back into range.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtWarnings;
