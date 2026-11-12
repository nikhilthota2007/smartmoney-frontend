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

const choiceFor = (goal) => (goal ? GOAL_CHOICES.find((choice) => choice.type === goal.type) || null : null);

/**
 * Setup, three questions, one at a time: what you are working toward, what
 * comes in, and a statement. Every step can be skipped; all of it can be
 * changed later from My finances.
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

  const next = () => {
    if (step === 0) saveGoal();
    if (step === 1) saveIncome();
    if (step < 2) setStep(step + 1);
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
          {isLast ? (saved ? 'See my plan' : 'Skip for now') : step === 0 && !choice ? 'Skip' : 'Continue'}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
};

export default Onboarding;
