import React, { useRef, useState } from 'react';
import { Activity, CreditCard, MessageCircle, RotateCcw, SlidersHorizontal } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import AppBrand from '../common/AppBrand';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import HealthScoreModal from '../dashboard/HealthScoreModal';
import DebtCalculatorModal from '../planning/DebtCalculatorModal';

/**
 * One navigation, two layouts: a rail on wide screens, a tab bar on phones.
 * Each item carries its full name and a short label; the short one is
 * aria-hidden, so the accessible name is always the full one.
 */
const NavItem = ({ icon: Icon, label, short, current, onClick }) => (
  <button className={`advisor-nav-item${current ? ' is-current' : ''}`} onClick={onClick} aria-current={current ? 'page' : undefined}>
    <Icon size={20} aria-hidden="true" />
    <span className="nav-long">{label}</span>
    <span className="nav-short" aria-hidden="true">
      {short}
    </span>
  </button>
);

const ChatWindow = ({ chat, onEditFinances }) => {
  const { messages, visible, input, setInput, loading, runningTool, sendMessage, clearChat } = chat;
  const [showHealthScore, setShowHealthScore] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  // Kept here so the figure survives closing and reopening the calculator.
  const [extraPayment, setExtraPayment] = useState('');
  const inputRef = useRef(null);

  const focusInput = () => inputRef.current?.focus();
  const askExample = (question) => {
    setInput(question);
    focusInput();
  };

  return (
    <div className="advisor-shell">
      <span className="advisor-glow" aria-hidden="true" />

      <aside className="advisor-rail">
        <div className="advisor-rail-top">
          <AppBrand />
          <div className="advisor-rail-tools">
            <button className="icon-btn advisor-clear" onClick={clearChat} title="Clear Chat">
              <RotateCcw size={18} aria-hidden="true" />
              <span className="advisor-clear-label">Clear chat</span>
            </button>
            <DarkModeToggle className="icon-btn" />
          </div>
        </div>

        <nav className="advisor-nav" aria-label="Advisor">
          <NavItem icon={MessageCircle} label="Ask" short="Ask" current onClick={focusInput} />
          <NavItem icon={SlidersHorizontal} label="My Finances" short="Finances" onClick={onEditFinances} />
          <NavItem icon={Activity} label="Financial Health Score" short="Score" onClick={() => setShowHealthScore(true)} />
          <NavItem icon={CreditCard} label="Debt Payoff Calculator" short="Payoff" onClick={() => setShowCalculator(true)} />
        </nav>

        <p className="advisor-disclaimer">
          Every figure comes from your own numbers. Educational information, not licensed financial advice.
        </p>
      </aside>

      <main className="advisor-main">
        <MessageList
          messages={messages}
          loading={loading}
          runningTool={runningTool}
          showExamples={visible.length === 1}
          onExampleClick={askExample}
        />

        <ChatInput value={input} onChange={setInput} onSend={() => sendMessage()} loading={loading} inputRef={inputRef} />
      </main>

      {showHealthScore && (
        <HealthScoreModal onClose={() => setShowHealthScore(false)} onAddFigures={onEditFinances} />
      )}

      {showCalculator && (
        <DebtCalculatorModal
          onClose={() => setShowCalculator(false)}
          extraPayment={extraPayment}
          onExtraPaymentChange={setExtraPayment}
        />
      )}
    </div>
  );
};

export default ChatWindow;
