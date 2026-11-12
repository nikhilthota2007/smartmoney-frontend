import React, { useRef, useState } from 'react';
import { Activity, CreditCard, FileText, Settings2, SlidersHorizontal } from 'lucide-react';
import AppBrand from '../common/AppBrand';
import Sheet from '../common/Sheet';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import HealthScoreModal from '../dashboard/HealthScoreModal';
import DebtCalculatorModal from '../planning/DebtCalculatorModal';
import SettingsSheet from '../settings/SettingsSheet';
import StatementFlow from '../statement/StatementFlow';
import StatementInsights from '../statement/StatementInsights';
import { useStatement } from '../../app/StatementContext';
import { useProfile } from '../../context/ProfileContext';
import { loadAiKey } from '../../lib/aiKey';

/** The goal set during setup (or the first one entered), for the plan's header. */
const planGoal = (goals) => goals.find((goal) => goal.source === 'onboarding') || goals.find((goal) => goal.name);

/**
 * The plan: one screen. What the statement showed, then a conversation about
 * it. Everything else (numbers, score, calculator, settings) is one tap away
 * and comes back here.
 */
const ChatWindow = ({ chat, onEditFinances }) => {
  const { messages, visible, input, setInput, loading, runningTool, sendMessage, clearChat } = chat;
  const { profile } = useProfile();
  const { saved, reset } = useStatement();
  const [sheet, setSheet] = useState(null);
  const [hasOwnKey, setHasOwnKey] = useState(() => Boolean(loadAiKey()));
  // Kept here so the figure survives closing and reopening the calculator.
  const [extraPayment, setExtraPayment] = useState('');
  const inputRef = useRef(null);

  const goal = planGoal(profile.goals);
  const close = () => setSheet(null);
  const askExample = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };
  const openStatement = () => {
    reset();
    setSheet('statement');
  };

  return (
    <div className="home">
      <span className="advisor-glow" aria-hidden="true" />

      <header className="home-bar">
        <AppBrand />
        <div className="home-bar-actions">
          <button className="btn btn-outline btn-small" onClick={onEditFinances}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            My finances
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setSheet('settings')}>
            <Settings2 size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-intro">
          <h2 className="home-title">{saved ? "Here's your plan." : "Let's find your extra money."}</h2>
          <p className="home-sub">
            {goal ? (
              <>
                Working toward: <strong>{goal.name}</strong>
              </>
            ) : (
              'Ask anything below, or add a statement to see where it goes.'
            )}
          </p>
        </section>

        {saved ? (
          <StatementInsights />
        ) : (
          <section className="card home-upload" aria-labelledby="upload-title">
            <h2 className="section-title" id="upload-title">
              Add a statement
            </h2>
            <p className="home-upload-sub">See where your money went and three ways to keep more of it.</p>
            <StatementFlow />
          </section>
        )}

        <section className="home-chat" aria-labelledby="chat-title">
          <h2 className="section-title" id="chat-title">
            Ask about your money
          </h2>
          <MessageList
            messages={messages}
            loading={loading}
            runningTool={runningTool}
            showExamples={visible.length === 1}
            onExampleClick={askExample}
          />
        </section>
      </main>

      <div className="home-dock">
        <div className="quick-actions">
          <button className="chip-button quick" onClick={openStatement}>
            <FileText size={15} aria-hidden="true" />
            {saved ? 'New statement' : 'Add statement'}
          </button>
          <button className="chip-button quick" onClick={() => setSheet('score')} aria-label="Financial Health Score">
            <Activity size={15} aria-hidden="true" />
            Health score
          </button>
          <button className="chip-button quick" onClick={() => setSheet('payoff')} aria-label="Debt Payoff Calculator">
            <CreditCard size={15} aria-hidden="true" />
            Payoff calculator
          </button>
        </div>
        <ChatInput value={input} onChange={setInput} onSend={() => sendMessage()} loading={loading} inputRef={inputRef} />
        {!hasOwnKey && (
          <p className="dock-note">
            Using the built-in AI.{' '}
            <button className="link-button" onClick={() => setSheet('settings')}>
              Add your own Gemini key
            </button>{' '}
            for unlimited questions.
          </p>
        )}
      </div>

      {sheet === 'statement' && (
        <Sheet onClose={close} labelledBy="statement-sheet-title">
          <header className="sheet-head">
            <h2 className="sheet-title" id="statement-sheet-title">
              {saved ? 'A new statement' : 'Add a statement'}
            </h2>
            <p className="sheet-lede">The newest statement replaces the last one in your plan.</p>
          </header>
          <div className="sheet-body">
            <StatementFlow onDone={close} />
          </div>
        </Sheet>
      )}

      {sheet === 'score' && <HealthScoreModal onClose={close} onAddFigures={onEditFinances} />}

      {sheet === 'payoff' && (
        <DebtCalculatorModal onClose={close} extraPayment={extraPayment} onExtraPaymentChange={setExtraPayment} />
      )}

      {sheet === 'settings' && (
        <SettingsSheet onClose={close} onClearChat={clearChat} onKeyChange={(next) => setHasOwnKey(Boolean(next))} />
      )}
    </div>
  );
};

export default ChatWindow;
