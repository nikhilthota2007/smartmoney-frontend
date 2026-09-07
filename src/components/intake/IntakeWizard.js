import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, PiggyBank, Sparkles, TrendingUp } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import ListEditor from '../common/ListEditor';
import CompletenessMeter from './CompletenessMeter';
import ProfileFileControls from './ProfileFileControls';
import { WIZARD_STEPS } from './steps';
import { getSectionList, profileCompleteness } from '../../lib/profile';
import { useProfile } from '../../context/ProfileContext';

/** Open at the first section the user hasn't filled in, so returning resumes. */
const firstIncompleteStep = (completeness) => {
  const index = WIZARD_STEPS.findIndex((step) =>
    completeness.sections.some((section) => section.key === step.key && !section.complete)
  );
  return index === -1 ? 0 : index;
};

const IntakeWizard = ({ onFinish }) => {
  const { profile } = useProfile();
  const completeness = profileCompleteness(profile);
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStep(completeness));

  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  return (
    <div className="app-container">
      <DarkModeToggle />

      <div className="form-container-centered wizard">
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

        <CompletenessMeter completeness={completeness} />

        <nav className="wizard-steps" aria-label="Intake steps">
          {WIZARD_STEPS.map((wizardStep, index) => (
            <button
              key={wizardStep.key}
              className={`wizard-step-tab${index === stepIndex ? ' is-current' : ''}`}
              onClick={() => setStepIndex(index)}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              {wizardStep.title}
            </button>
          ))}
        </nav>

        <div className="section-header">
          <PiggyBank size={20} />
          {step.title}
        </div>
        <p className="wizard-subtitle">{step.subtitle}</p>

        {step.lists.map((list) => (
          <section className="wizard-list" key={list.section}>
            {list.heading && <h3 className="wizard-list-heading">{list.heading}</h3>}
            <ListEditor
              section={list.section}
              fields={list.fields}
              items={getSectionList(profile, list.section)}
              addLabel={list.addLabel}
              emptyMessage={list.emptyMessage}
            />
          </section>
        ))}

        <div className="wizard-nav">
          <button
            className="text-btn"
            onClick={() => setStepIndex(stepIndex - 1)}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {!isLastStep && (
            <button className="text-btn" onClick={() => setStepIndex(stepIndex + 1)}>
              Skip for now
            </button>
          )}

          {isLastStep ? (
            <button className="submit-btn wizard-primary" onClick={onFinish}>
              Start Getting Financial Advice
            </button>
          ) : (
            <button className="submit-btn wizard-primary" onClick={() => setStepIndex(stepIndex + 1)}>
              Next
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        <button className="text-btn wizard-skip-all" onClick={onFinish}>
          Skip the rest and start asking questions
        </button>

        <ProfileFileControls />

        <div className="disclaimer-inline">
          This is for educational purposes. Always consult with a licensed financial advisor for important decisions.
        </div>
      </div>
    </div>
  );
};

export default IntakeWizard;
