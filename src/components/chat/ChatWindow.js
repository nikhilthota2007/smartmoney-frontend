import React, { useState } from 'react';
import { Calculator, DollarSign, RotateCcw, Sparkles } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import HealthScoreModal from '../dashboard/HealthScoreModal';
import DebtCalculatorModal from '../planning/DebtCalculatorModal';

const ChatWindow = ({ chat }) => {
  const { messages, input, setInput, loading, sendMessage, clearChat } = chat;
  const [showHealthScore, setShowHealthScore] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  // Kept here so the figure survives closing and reopening the calculator.
  const [extraPayment, setExtraPayment] = useState('');

  return (
    <div className="app-container">
      <DarkModeToggle />

      <button
        className="calculator-btn"
        onClick={() => setShowCalculator(true)}
        title="Debt Payoff Calculator"
      >
        <Calculator size={24} />
        <span>Debt Payoff Calculator</span>
      </button>

      <div className="chat-container-large">
        <div className="chat-header">
          <div className="chat-header-content">
            <h1>
              <DollarSign size={32} />
              SmartMoney
            </h1>
            <button className="clear-chat-btn" onClick={clearChat} title="Clear Chat">
              <RotateCcw size={18} />
              <span>Clear Chat</span>
            </button>
          </div>
          <p className="ai-badge">
            <Sparkles size={16} />
            Powered by AI
          </p>
        </div>

        <MessageList
          messages={messages}
          loading={loading}
          showExamples={messages.length === 1}
          onExampleClick={setInput}
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          loading={loading}
          onShowHealthScore={() => setShowHealthScore(true)}
        />
      </div>

      {showHealthScore && <HealthScoreModal onClose={() => setShowHealthScore(false)} />}

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
