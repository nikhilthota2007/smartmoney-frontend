import React from 'react';
import { Calculator, Plus } from 'lucide-react';
import Modal from '../common/Modal';
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
    <Modal onClose={onClose} wide>
      <div className="calculator-card">
        <div className="calculator-header">
          <Calculator size={24} />
          <h2>Debt Payoff Calculator</h2>
        </div>

        <div className="debts-list">
          <div className="debts-list-header">
            <h3>Your Debts</h3>
            <button className="add-debt-btn" onClick={addDebt}>
              <Plus size={16} />
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
        </div>

        <DebtWarnings unpayable={unpayable} hitsHorizon={hitsPayoffHorizon(current?.avalanche)} />

        {results ? (
          <>
            <div className="extra-payment-section-single">
              <label htmlFor="extra-payment">Extra Monthly Payment (Applied to Target Debt)</label>
              <div className="debt-input-group">
                <span className="input-prefix">$</span>
                <input
                  id="extra-payment"
                  type="number"
                  value={extraPayment}
                  onChange={(e) => onExtraPaymentChange(e.target.value)}
                  className="debt-input"
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="total-summary">
              <div className="summary-item">
                <span className="summary-label">Total Debt:</span>
                <span className="summary-value">{formatCurrency(results.totalDebt)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Min Payment:</span>
                <span className="summary-value">{formatCurrency(results.totalMinPayment)}/mo</span>
              </div>
            </div>

            <div className="strategies-grid-three">
              <StrategyCard
                variant="avalanche"
                badge="💰 Best for Savings"
                title="Debt Avalanche"
                description="Highest interest rate first"
                result={current.avalanche}
                timelineWidth="100%"
              />
              <StrategyCard
                variant="snowball"
                badge="🎯 Best for Motivation"
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
                badge="💡 Recommended"
                title="Smart Payment Plan"
                description={`Recommended extra payment of $${results.recommendedExtra}/mo`}
                result={recommended.avalanche}
                timelineWidth={percentWidth(
                  recommended.avalanche.months,
                  Math.max(current.avalanche.months, recommended.avalanche.months)
                )}
              />
            </div>
          </>
        ) : (
          <div className="calculator-prompt">Add your debts above to see payoff strategies</div>
        )}
      </div>
    </Modal>
  );
};

export default DebtCalculatorModal;
