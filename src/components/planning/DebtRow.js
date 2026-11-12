import React from 'react';
import { Trash2 } from 'lucide-react';

/** One debt in the calculator: labelled fields in a soft card. */
const DebtRow = ({ debt, index, onUpdate, onRemove, canRemove }) => {
  const id = (field) => `calc-${debt.id}-${field}`;
  const amount = (field, placeholder, prefix, suffix) => (
    <div className="field field-amount">
      <label className="field-label" htmlFor={id(field)}>
        {{ balance: 'Balance', interestRate: 'APR', minPayment: 'Minimum' }[field]}
      </label>
      <div className="field-control">
        {prefix && <span className="field-affix">{prefix}</span>}
        <input
          id={id(field)}
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={debt[field]}
          onChange={(e) => onUpdate(debt.id, field, e.target.value)}
        />
        {suffix && <span className="field-affix field-affix-end">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="list-row debt-row">
      <div className="list-row-fields">
        <div className="field debt-row-name">
          <label className="field-label" htmlFor={id('name')}>
            Debt {index + 1}
          </label>
          <div className="field-control">
            <input
              id={id('name')}
              type="text"
              placeholder="Name (e.g., Credit Card)"
              value={debt.name}
              onChange={(e) => onUpdate(debt.id, 'name', e.target.value)}
            />
          </div>
        </div>
        {amount('balance', 'Balance', '$')}
        {amount('interestRate', 'Rate', null, '%')}
        {amount('minPayment', 'Min Payment', '$')}
      </div>
      <button
        className="icon-btn list-row-remove"
        onClick={() => onRemove(debt.id)}
        disabled={!canRemove}
        aria-label={`Remove debt ${index + 1}`}
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
};

export default DebtRow;
