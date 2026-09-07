import React from 'react';
import { MessageCircle } from 'lucide-react';
import formatMessage from './formatMessage';

export const EXAMPLE_QUESTIONS = [
  'Should I finance a new car or buy a used one with cash?',
  "I have $5,000 in credit card debt. What's the best way to pay it off?",
  'How much should I save for an emergency fund?',
  'Is it better to invest or pay off my student loans first?',
  'Should I buy or rent a home given my current financial situation?',
  "What's the smartest way to save for retirement?",
];

const MessageList = ({ messages, loading, showExamples, onExampleClick }) => (
  <div className="messages-area">
    {messages.map((msg, idx) => (
      <div key={idx} className={`message ${msg.role}`}>
        <div className="message-bubble">
          {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
        </div>
      </div>
    ))}

    {showExamples && !loading && (
      <div className="example-questions">
        <div className="example-header">
          <MessageCircle size={18} />
          <span>Try asking:</span>
        </div>
        <div className="example-grid">
          {EXAMPLE_QUESTIONS.map((question, idx) => (
            <button key={idx} className="example-btn" onClick={() => onExampleClick(question)}>
              {question}
            </button>
          ))}
        </div>
      </div>
    )}

    {loading && (
      <div className="loading">
        <div className="loading-bubble">
          <div className="spinner"></div>
        </div>
      </div>
    )}
  </div>
);

export default MessageList;
