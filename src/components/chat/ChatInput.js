import React from 'react';
import { Activity, Send } from 'lucide-react';

const ChatInput = ({ value, onChange, onSend, loading, onShowHealthScore }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-area">
      <button className="health-score-btn" onClick={onShowHealthScore}>
        <Activity size={18} />
        Want to know your Financial Health Score? Click here
      </button>

      <div className="input-row">
        <input
          type="text"
          className="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about saving money, budgeting, or your financial goals..."
          disabled={loading}
        />
        <button
          className="send-btn"
          aria-label="Send message"
          onClick={onSend}
          disabled={loading || !value.trim()}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
