import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import useRevealOnce from './useRevealOnce';

const STEPS = [
  { title: 'Tell us where you are', body: 'What comes in, what goes out, what you owe. Rough is fine.' },
  { title: 'Add a statement, if you like', body: 'We read it on your device and strip out names and account numbers first.' },
  { title: 'Get one plan', body: 'Sized to your real numbers, with an advisor to ask anything, any time.' },
];

/** The close: slow down, three small steps, one button. Fills the screen. */
const CalmSection = ({ motion }) => {
  const ref = useRef(null);
  const revealed = useRevealOnce(ref, motion, 0.25);

  return (
    <section className={`calm${revealed ? ' is-revealed' : ''}`} ref={ref} aria-labelledby="calm-title">
      <div className="calm-breath" aria-hidden="true">
        <span className="calm-ring" />
        <span className="calm-ring calm-ring-2" />
        <span className="calm-core">
          <span className="calm-in">Breathe in</span>
          <span className="calm-out">Breathe out</span>
        </span>
      </div>
      <div className="calm-copy">
        <h2 className="calm-title" id="calm-title">
          You don’t have to figure it all out today.
        </h2>
        <p className="calm-body">
          SmartMoney is your personal money advisor. Bring the mess; we’ll find the next step, in plain numbers.
        </p>
        <ol className="calm-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} style={{ '--i': index }}>
              <span className="calm-step-num" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <span className="calm-step-body">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link to="/start" className="btn calm-cta">
          Get my plan
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="calm-note">No account needed. Saved on this device.</p>
      </div>
    </section>
  );
};

export default CalmSection;
