import React from 'react';
import { Trash2 } from 'lucide-react';

const DebtRow = ({ debt, index, onUpdate, onRemove, canRemove }) => (
  <div className="debt-row">
    <div className="debt-row-number">{index + 1}</div>
    <input
      type="text"
      placeholder="Name (e.g., Credit Card)"
      value={debt.name}
      onChange={(e) => onUpdate(debt.id, 'name', e.target.value)}
      className="debt-input debt-name"
    />
    <div className="debt-input-group">
      <span className="input-prefix">$</span>
      <input
        type="number"
        placeholder="Balance"
        value={debt.balance}
        onChange={(e) => onUpdate(debt.id, 'balance', e.target.value)}
        className="debt-input"
      />
    </div>
    <div className="debt-input-group">
      <input
        type="number"
        placeholder="Rate"
        value={debt.interestRate}
        onChange={(e) => onUpdate(debt.id, 'interestRate', e.target.value)}
        className="debt-input"
      />
      <span className="input-suffix">%</span>
    </div>
    <div className="debt-input-group">
      <span className="input-prefix">$</span>
      <input
        type="number"
        placeholder="Min Payment"
        value={debt.minPayment}
        onChange={(e) => onUpdate(debt.id, 'minPayment', e.target.value)}
        className="debt-input"
      />
    </div>
    <button className="remove-debt-btn" onClick={() => onRemove(debt.id)} disabled={!canRemove}>
      <Trash2 size={18} />
    </button>
  </div>
);

export default DebtRow;
