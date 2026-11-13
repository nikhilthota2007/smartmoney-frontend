import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CreditCard, ShieldCheck, Sparkles, Target } from 'lucide-react';
import AppBrand from '../common/AppBrand';
import ScreenLink from '../common/ScreenLink';
import StatementFlow from '../statement/StatementFlow';
import { useProfile } from '../../context/ProfileContext';
import { useStatement } from '../../app/StatementContext';

export const GOAL_CHOICES = [
  { key: 'debt', type: 'debt', title: 'Get out of debt', sub: 'Pay cards and loans down faster', icon: CreditCard },
  { key: 'safety', type: 'emergency', title: 'Build a safety net', sub: 'Money set aside for surprises', icon: ShieldCheck, amount: true },
  { key: 'save', type: 'purchase', title: 'Save for something', sub: 'A trip, a car, a deposit', icon: Target, amount: true, name: true },
  { key: 'smarter', type: 'custom', title: 'Spend smarter', sub: 'See where it all goes', icon: Sparkles },
];

/**
 * Bills that usually are not on a card statement. Without them the surplus,
 * and every plan sized from it, is overstated. Saved as fixed expense rows,
 * one per field, so coming back here shows what was entered.
 */
export const BILLS = [
  { key: 'housing', label: 'Rent or mortgage', category: 'housing', placeholder: '1200' },
  { key: 'utilities', label: 'Utilities', category: 'utilities', placeholder: '120' },
  { key: 'phone', label: 'Phone and internet', category: 'utilities', placeholder: '90' },
  { key: 'insurance', label: 'Insurance', category: 'insurance', placeholder: '150' },
];
const billSource = (key) => `bills:${key}`;

const choiceFor = (goal) => (goal ? GOAL_CHOICES.find((choice) => choice.type === goal.type) || null : null);

/**
 * Setup, one question at a time: what you are working toward, what comes in,
 * the bills that go out before anything else, and a statement. Every step can
 * be skipped; all of it can be changed later from My finances.
 */
const Onboarding = ({ onFinish, numbersPath = '/numbers' }) => {
  const { profile, addItem, updateItem, removeItem } = useProfile();
  const { saved } = useStatement();
  const existingGoal = profile.goals.find((goal) => goal.source === 'onboarding');
  const existingIncome = profile.income[0];

  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState(() => choiceFor(existingGoal));
  const [goalName, setGoalName] = useState(existingGoal && choiceFor(existingGoal)?.name ? existingGoal.name : '');
  const [goalAmount, setGoalAmount] = useState(existingGoal ? existingGoal.targetAmount || '' : '');
  const [goalDate, setGoalDate] = useState(existingGoal ? existingGoal.targetDate || '' : '');
  const [income, setIncome] = useState(existingIncome ? existingIncome.netMonthly || '' : '');
  const [bills, setBills] = useState(() =>
    Object.fromEntries(
      BILLS.map((bill) => {
        const row = profile.expenses.fixed.find((item) => item.source === billSource(bill.key));
        return [bill.key, row ? row.amount : ''];
      })
    )
  );

  const saveGoal = () => {
    if (!choice) return;
    if (existingGoal) removeItem('goals', existingGoal.id);
    addItem('goals', {
      source: 'onboarding',
      type: choice.type,
      name: (choice.name && goalName.trim()) || choice.title,
      targetAmount: choice.amount ? goalAmount : '',
      targetDate: choice.amount ? goalDate : '',
    });
  };

  const saveIncome = () => {
    if (!income) return;
    if (existingIncome) updateItem('income', existingIncome.id, 'netMonthly', income);
    else addItem('income', { source: 'Take-home pay', netMonthly: income, stability: 'stable' });
  };

  const saveBills = () => {
    BILLS.forEach((bill) => {
      const row = profile.expenses.fixed.find((item) => item.source === billSource(bill.key));
      const amount = String(bills[bill.key] || '').trim();
      if (row && amount) updateItem('fixedExpenses', row.id, 'amount', amount);
      else if (row) removeItem('fixedExpenses', row.id);
      else if (amount) addItem('fixedExpenses', { category: bill.category, amount, source: billSource(bill.key) });
    });
  };

  const next = () => {
    if (step === 0) saveGoal();
    if (step === 1) saveIncome();
    if (step === 2) saveBills();
    if (step < steps.length - 1) setStep(step + 1);
    else onFinish();
  };

  const steps = [
    {
      title: 'What would make money feel lighter?',
      sub: 'Pick the one that matters most right now. You can change it any time.',
      body: (
        <>
          <div className="choices" role="radiogroup" aria-label="Your goal">
            {GOAL_CHOICES.map((option) => {
              const Icon = option.icon;
              const selected = choice && choice.key === option.key;
              return (
                <label key={option.key} className={`choice${selected ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="goal"
                    className="visually-hidden"
                    checked={Boolean(selected)}
                    onChange={() => setChoice(option)}
                  />
                  <span className="choice-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="choice-text">
                    <span className="choice-title">{option.title}</span>
                    <span className="choice-sub">{option.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {choice && choice.amount && (
            <div className="goal-details">
              {choice.name && (
                <div className="field">
                  <label className="field-label" htmlFor="goal-name">
                    What for?
                  </label>
                  <div className="field-control">
                    <input id="goal-name" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="A trip to Japan" />
                  </div>
                </div>
              )}
              <div className="field field-amount">
                <label className="field-label" htmlFor="goal-amount">
                  How much?
                </label>
                <div className="field-control">
                  <span className="field-affix">$</span>
                  <input
                    id="goal-amount"
                    type="number"
                    inputMode="decimal"
                    value={goalAmount}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    placeholder={choice.key === 'safety' ? '3000' : '5000'}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="goal-date">
                  By when? (optional)
                </label>
                <div className="field-control">
                  <input id="goal-date" type="month" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </>
      ),
    },
    {
      title: 'What lands in your account each month?',
      sub: 'After tax. A rough number is fine.',
      body: (
        <div className="field field-hero">
          <label className="visually-hidden" htmlFor="income">
            Monthly take-home pay
          </label>
          <div className="field-control">
            <span className="field-affix">$</span>
            <input
              id="income"
              type="number"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="3,400"
              autoFocus
            />
            <span className="field-affix field-affix-end">a month</span>
          </div>
        </div>
      ),
    },
    {
      title: 'What bills go out each month?',
      sub: 'The ones that are not on your card: rent, utilities, phone, insurance. Rough is fine, and you can skip this.',
      body: (
        <div className="bills">
          {BILLS.map((bill) => (
            <div className="field field-amount" key={bill.key}>
              <label className="field-label" htmlFor={`bill-${bill.key}`}>
                {bill.label}
              </label>
              <div className="field-control">
                <span className="field-affix">$</span>
                <input
                  id={`bill-${bill.key}`}
                  type="number"
                  inputMode="decimal"
                  value={bills[bill.key]}
                  onChange={(e) => setBills({ ...bills, [bill.key]: e.target.value })}
                  placeholder={bill.placeholder}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Show me where it goes.',
      sub: 'Add your latest credit card or bank statement. You will get the spending breakdown, the fixes and what they mean for your goal.',
      body: (
        <>
          <StatementFlow onDone={onFinish} />
          <p className="onboard-alt">
            No statement handy?{' '}
            <ScreenLink to={numbersPath} fallback="span" className="link-button">
              Type my numbers instead
            </ScreenLink>
          </p>
        </>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="onboard">
      <span className="advisor-glow" aria-hidden="true" />
      <header className="onboard-bar">
        <AppBrand />
        <button className="btn btn-quiet btn-small" onClick={onFinish}>
          Skip to my plan
        </button>
      </header>
      <div
        className="onboard-progress"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step + 1}
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((_, index) => (
          <span key={index} className={index <= step ? 'is-done' : ''} />
        ))}
      </div>

      <main className="onboard-main">
        <section className="onboard-step" key={step} aria-labelledby="onboard-title">
          <p className="onboard-count">
            {step + 1} of {steps.length}
          </p>
          <h2 className="onboard-title" id="onboard-title">
            {current.title}
          </h2>
          <p className="onboard-sub">{current.sub}</p>
          <div className="onboard-body">{current.body}</div>
        </section>
      </main>

      <footer className="onboard-actions">
        <button className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <button className="btn btn-primary btn-lg" onClick={next}>
          {isLast
            ? saved
              ? 'See my plan'
              : 'Skip for now'
            : (step === 0 && !choice) || (step === 2 && !Object.values(bills).some(Boolean))
              ? 'Skip'
              : 'Continue'}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
};

export default Onboarding;
