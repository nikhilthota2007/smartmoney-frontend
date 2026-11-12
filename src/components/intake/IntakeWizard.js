import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MessageCircle } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import ListEditor from '../common/ListEditor';
import AppBrand from '../common/AppBrand';
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

/**
 * Five steps, one question in focus. On a wide screen the steps, the meter
 * and the file controls sit in a rail on the left; on a phone they stack
 * above and below the question, with the step actions pinned to the bottom.
 */
const IntakeWizard = ({ onFinish }) => {
  const { profile } = useProfile();
  const completeness = profileCompleteness(profile);
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStep(completeness));
  const questionRef = useRef(null);
  const firstRender = useRef(true);

  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const isDone = (key) => completeness.sections.some((section) => section.key === key && section.complete);

  // A new step starts at its question, not wherever the last one was scrolled to.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    questionRef.current?.scrollIntoView?.({ block: 'start' });
  }, [stepIndex]);

  return (
    <div className="wizard-shell">
      <aside className="wizard-rail">
        <div className="wizard-rail-top">
          <AppBrand />
          <DarkModeToggle className="icon-btn" />
        </div>

        <CompletenessMeter completeness={completeness} />

        <nav className="wizard-steps" aria-label="Intake steps">
          {WIZARD_STEPS.map((wizardStep, index) => (
            <button
              key={wizardStep.key}
              className={`wizard-step${index === stepIndex ? ' is-current' : ''}${isDone(wizardStep.key) ? ' is-done' : ''}`}
              onClick={() => setStepIndex(index)}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span className="wizard-step-marker" aria-hidden="true">
                {isDone(wizardStep.key) ? <Check size={13} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className="wizard-step-title">{wizardStep.title}</span>
            </button>
          ))}
        </nav>

        <div className="wizard-rail-foot">
          <ProfileFileControls />
          <p className="wizard-disclaimer">
            Educational information, not licensed financial advice. For big decisions, talk to a professional.
          </p>
        </div>
      </aside>

      <main className="wizard-main">
        <section className="wizard-question" key={step.key} ref={questionRef} aria-labelledby="wizard-title">
          <p className="wizard-count">
            Step {stepIndex + 1} of {WIZARD_STEPS.length}
          </p>
          <h2 className="wizard-title" id="wizard-title">
            {step.title}
          </h2>
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
        </section>

        <div className="wizard-actions">
          <button
            className="btn btn-quiet"
            onClick={() => setStepIndex(stepIndex - 1)}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>

          <div className="wizard-actions-end">
            {!isLastStep && (
              <button className="btn btn-quiet" onClick={() => setStepIndex(stepIndex + 1)}>
                Skip for now
              </button>
            )}
            {isLastStep ? (
              <button className="btn btn-primary btn-lg wizard-next" onClick={onFinish}>
                Ask my advisor
                <MessageCircle size={16} aria-hidden="true" />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg wizard-next" onClick={() => setStepIndex(stepIndex + 1)}>
                Next
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <button className="wizard-skip-all" onClick={onFinish}>
          Skip the rest and start asking questions
        </button>
      </main>
    </div>
  );
};

export default IntakeWizard;
