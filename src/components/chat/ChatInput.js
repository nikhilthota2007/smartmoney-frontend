import React from 'react';
import { ArrowUp } from 'lucide-react';

/** The composer: one pill, the send button inside it. */
const ChatInput = ({ value, onChange, onSend, loading, inputRef }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="composer">
      <div className="composer-pill">
        <label htmlFor="chat-input" className="visually-hidden">
          Your question
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          className="composer-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about saving money…"
          autoComplete="off"
          disabled={loading}
        />
        <button
          className="composer-send"
          aria-label="Send message"
          onClick={onSend}
          disabled={loading || !value.trim()}
        >
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
