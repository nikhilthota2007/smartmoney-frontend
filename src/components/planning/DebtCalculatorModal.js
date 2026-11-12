import React from 'react';
import { Calculator, Plus } from 'lucide-react';
import Sheet from '../common/Sheet';
import DebtRow from './DebtRow';
import StrategyCard from './StrategyCard';
import DebtWarnings from './DebtWarnings';
import { calculateMultipleDebts } from '../../lib/planner/debt';
import { findUnpayableDebts, hitsPayoffHorizon } from '../../lib/planner/debtWarnings';
import { formatCurrency } from '../../lib/format';
import { useProfile } from '../../context/ProfileContext';

const percentWidth = (months, slowestMonths) => `${(months / slowestMonths) * 100}%`;

const DebtCalculatorModal = ({ onClose, extraPayment, onExtraPaymentChange }) => {
  const { financialData, debts, addDebt, removeDebt, updateDebt } = useProfile();

  const results = calculateMultipleDebts(debts, extraPayment, financialData);

  const current = results?.scenarios[0];
  const recommended = results?.recommended;
  const unpayable = findUnpayableDebts(debts);

  return (
    <Sheet onClose={onClose} labelledBy="calculator-title" wide>
      <header className="sheet-head">
        <span className="eyebrow">
          <Calculator size={14} aria-hidden="true" />
          Debt payoff
        </span>
        <h2 className="sheet-title" id="calculator-title">
          Debt Payoff Calculator
        </h2>
        <p className="sheet-lede">The same list as My Finances. Change it here and it changes there.</p>
      </header>

      <div className="sheet-body">
        <section className="calc-debts" aria-labelledby="debts-heading">
          <div className="calc-debts-head">
            <h3 className="sheet-section-title" id="debts-heading">
              Your debts
            </h3>
            <button className="add-row" onClick={addDebt}>
              <Plus size={16} aria-hidden="true" />
              Add Debt
            </button>
          </div>

          {debts.map((debt, index) => (
            <DebtRow
              key={debt.id}
              debt={debt}
              index={index}
              onUpdate={updateDebt}
              onRemove={removeDebt}
              canRemove={debts.length > 1}
            />
          ))}
        </section>

        <DebtWarnings unpayable={unpayable} hitsHorizon={hitsPayoffHorizon(current?.avalanche)} />

        {results ? (
          <>
            <div className="calc-controls">
              <div className="field field-lg calc-extra">
                <label className="field-label" htmlFor="extra-payment">
                  Extra monthly payment (goes to the target debt)
                </label>
                <div className="field-control">
                  <span className="field-affix">$</span>
                  <input
                    id="extra-payment"
                    type="number"
                    inputMode="decimal"
                    value={extraPayment}
                    onChange={(e) => onExtraPaymentChange(e.target.value)}
                    placeholder="1000"
                  />
                </div>
              </div>

              <div className="stat-pair calc-totals">
                <div className="stat">
                  <span className="stat-value tabular">{formatCurrency(results.totalDebt)}</span>
                  <span className="stat-label">Total debt</span>
                </div>
                <div className="stat">
                  <span className="stat-value tabular">{formatCurrency(results.totalMinPayment)}/mo</span>
                  <span className="stat-label">Total minimums</span>
                </div>
              </div>
            </div>

            <div className="calc-strategies">
              <StrategyCard
                variant="avalanche"
                badge="Least interest"
                title="Debt Avalanche"
                description="Highest interest rate first"
                result={current.avalanche}
                timelineWidth="100%"
              />
              <StrategyCard
                variant="snowball"
                badge="Quickest wins"
                title="Debt Snowball"
                description="Smallest balance first"
                result={current.snowball}
                timelineWidth={percentWidth(
                  current.snowball.months,
                  Math.max(current.avalanche.months, current.snowball.months)
                )}
              />
              <StrategyCard
                variant="recommended"
                badge="Recommended"
                title="Smart Payment Plan"
                description={`An extra ${formatCurrency(results.recommendedExtra)}/mo, sized to your budget`}
                result={recommended.avalanche}
                timelineWidth={percentWidth(
                  recommended.avalanche.months,
                  Math.max(current.avalanche.months, recommended.avalanche.months)
                )}
              />
            </div>
          </>
        ) : (
          <p className="sheet-empty">Add your debts above to see payoff strategies</p>
        )}
      </div>
    </Sheet>
  );
};

export default DebtCalculatorModal;
