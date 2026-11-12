import React from 'react';
import { Activity, CreditCard, MessageCircle, SlidersHorizontal, ArrowUp } from 'lucide-react';
import PayoffCard from '../cards/PayoffCard';
import SplitWords from '../common/SplitWords';

const TABS = [
  { label: 'Ask', Icon: MessageCircle, current: true },
  { label: 'Finances', Icon: SlidersHorizontal },
  { label: 'Score', Icon: Activity },
  { label: 'Payoff', Icon: CreditCard },
];

const SignalIcons = () => (
  <span className="ps-status-icons">
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
    <svg viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .5 3.4l1.3 1.3A8.7 8.7 0 0 1 8 2.2Zm0 3.7c1.4 0 2.7.5 3.6 1.4l1.3-1.3A7 7 0 0 0 8 4a7 7 0 0 0-4.9 2l1.3 1.3c.9-.9 2.2-1.4 3.6-1.4Zm0 3.6c.5 0 .9.2 1.1.5L8 11.2 6.9 10c.2-.3.6-.5 1.1-.5Z" />
    </svg>
    <svg viewBox="0 0 27 12" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.45" />
      <rect x="2" y="2" width="17" height="8" rx="2" />
      <rect x="24.8" y="4" width="1.6" height="4" rx="0.8" opacity="0.45" />
    </svg>
  </span>
);

/**
 * What plays on the landing phone: a short real exchange ending on a real
 * payoff card. Rendered in its finished state; the hero hides and reveals the
 * pieces (.sw words, .ps-bubble, .ps-card) on its own timeline.
 */
const PhoneScreen = ({ demo }) => {
  const { script, payoff } = demo;

  return (
    <div className="ps theme-light">
      <span className="ps-glow ambient" />

      <div className="ps-status">
        <span className="ps-time">9:41</span>
        <SignalIcons />
      </div>

      <div className="ps-thread">
        <p className="ps-greeting">
          <SplitWords text={script.greeting} className="sw sw-greeting" />
        </p>

        <div className="ps-user">
          <p className="ps-bubble">
            <SplitWords text={script.question} className="sw sw-user" />
          </p>
        </div>

        {script.replies.map((line, index) => (
          <p className="ps-reply" key={line}>
            <SplitWords text={line} className={`sw sw-reply-${index}`} />
          </p>
        ))}

        <div className="ps-card">
          <PayoffCard result={payoff} />
        </div>
      </div>

      <div className="ps-dock">
        <div className="ps-input">
          <span>Ask about your money…</span>
          <span className="ps-send">
            <ArrowUp aria-hidden="true" />
          </span>
        </div>
        <nav className="ps-tabs" aria-hidden="true">
          {TABS.map(({ label, Icon, current }) => (
            <span key={label} className={`ps-tab${current ? ' is-current' : ''}`}>
              <Icon aria-hidden="true" />
              {label}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default PhoneScreen;
