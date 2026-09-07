import React from 'react';
import { TrendingUp, PiggyBank, Sparkles } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import CurrencyField from '../common/CurrencyField';
import { useProfile } from '../../context/ProfileContext';

const MONEY_FIELDS = [
  { name: 'monthlyIncome', label: 'Monthly Income', placeholder: '5000' },
  { name: 'monthlyExpenses', label: 'Monthly Expenses', placeholder: '3500' },
  { name: 'savings', label: 'Current Savings', placeholder: '10000' },
  { name: 'debts', label: 'Outstanding Debts', placeholder: '5000' },
];

/**
 * Landing screen: collects the five headline figures.
 * Phase 1 replaces this with the multi-step wizard.
 */
const IntakeForm = ({ onStart }) => {
  const { financialData, setSummaryField } = useProfile();

  const handleChange = (e) => setSummaryField(e.target.name, e.target.value);

  return (
    <div className="app-container">
      <DarkModeToggle />

      <div className="form-container-centered">
        <div className="header">
          <div className="icon-circle">
            <TrendingUp size={40} />
          </div>
          <h1>SmartMoney</h1>
          <p className="subtitle">Get personalized advice to save money and achieve your financial goals</p>
          <div className="status-badge">
            <Sparkles size={14} />
            Powered by AI
          </div>
        </div>

        <div className="section-header">
          <PiggyBank size={20} />
          Your Financial Information
        </div>

        {MONEY_FIELDS.map((field) => (
          <CurrencyField
            key={field.name}
            label={field.label}
            name={field.name}
            value={financialData[field.name]}
            onChange={handleChange}
            placeholder={field.placeholder}
          />
        ))}

        <div className="form-group">
          <label className="form-label" htmlFor="goals">Financial Goals</label>
          <textarea
            id="goals"
            name="goals"
            value={financialData.goals}
            onChange={handleChange}
            placeholder="E.g., Save for a house down payment, pay off credit card debt, build emergency fund..."
            rows="3"
          />
        </div>

        <button className="submit-btn" onClick={onStart}>
          Start Getting Financial Advice
        </button>

        <div className="disclaimer-inline">
          This is for educational purposes. Always consult with a licensed financial advisor for important decisions.
        </div>
      </div>
    </div>
  );
};

export default IntakeForm;
