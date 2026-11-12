import React, { useEffect, useRef, useState } from 'react';
import formatMessage from './formatMessage';
import ToolCard from './ToolCard';
import { buildThread, wordCount, WORD_REVEAL_LIMIT } from './thread';
import SplitWords from '../common/SplitWords';
import { canAnimate } from '../common/motion';

export const EXAMPLE_QUESTIONS = [
  'Should I finance a new car or buy a used one with cash?',
  "I have $5,000 in credit card debt. What's the best way to pay it off?",
  'How much should I save for an emergency fund?',
  'Is it better to invest or pay off my student loans first?',
  'Should I buy or rent a home given my current financial situation?',
  "What's the smartest way to save for retirement?",
];

/** What to show while a tool runs, so the pause is explained rather than blank. */
const TOOL_LABELS = {
  simulate_debt_payoff: 'Running your payoff numbers',
  evaluate_goal: 'Checking whether that goal is reachable',
  project_savings: 'Projecting your savings',
};

/**
 * Which items arrived after the list mounted. Those animate in; whatever was
 * already there (coming back from editing finances) is shown as it was.
 */
const useNewItems = (items) => {
  const state = useRef(null);
  const lastKey = items.length ? items[items.length - 1].key : -1;

  // First render, or a cleared conversation (keys restart at 0): what is
  // there now is the baseline.
  if (state.current === null || lastKey < state.current.lastKey) {
    state.current = { known: new Set(items.map((item) => item.key)), fresh: new Set(), lastKey };
  }
  // Once new, always new for this mount, so a re-render mid-reveal (a
  // keystroke) never cuts the animation short. Idempotent across renders.
  items.forEach((item) => {
    if (!state.current.known.has(item.key)) {
      state.current.known.add(item.key);
      state.current.fresh.add(item.key);
    }
  });
  state.current.lastKey = lastKey;
  return state.current.fresh;
};

/** An advisor reply. New, short replies arrive word by word, from blur. */
const AdvisorText = ({ text, isNew }) => {
  if (!isNew || wordCount(text) > WORD_REVEAL_LIMIT) {
    return <div className={`msg-advisor${isNew ? ' msg-enter' : ''}`}>{formatMessage(text)}</div>;
  }
  let index = 0;
  const renderWords = (content) => {
    const start = index;
    index += content.split(' ').length;
    return <SplitWords text={content} className="rw" start={start} />;
  };
  return <div className="msg-advisor msg-words">{formatMessage(text, renderWords)}</div>;
};

const MessageList = ({ messages, loading, runningTool, showExamples, onExampleClick }) => {
  const items = buildThread(messages);
  const seen = useNewItems(items);
  // Without motion (reduced motion, tests) everything renders finished.
  const [motion] = useState(canAnimate);
  const fresh = motion ? seen : new Set();
  const endRef = useRef(null);
  const count = items.length;

  useEffect(() => {
    if (count > 1 || loading) endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [count, loading]);

  return (
    <div className="thread" aria-live="polite" aria-relevant="additions">
      {items.map((item) => {
        const isNew = fresh.has(item.key);
        if (item.kind === 'user') {
          return (
            <div key={item.key} className={`msg-user${isNew ? ' msg-pop' : ''}`}>
              <p className="msg-bubble">{item.text}</p>
            </div>
          );
        }
        if (item.kind === 'card') {
          return (
            <div key={item.key} className={`msg-card${isNew ? ' msg-enter' : ''}`}>
              <ToolCard tool={item.tool} result={item.result} />
            </div>
          );
        }
        if (item.kind === 'error') {
          return (
            <p key={item.key} className="msg-error notice notice-danger" role="alert">
              {item.text}
            </p>
          );
        }
        return <AdvisorText key={item.key} text={item.text} isNew={isNew} />;
      })}

      {showExamples && !loading && (
        <section className="examples" aria-labelledby="examples-heading">
          <h2 className="examples-heading" id="examples-heading">
            Try asking:
          </h2>
          <div className="examples-list">
            {EXAMPLE_QUESTIONS.map((question) => (
              <button key={question} className="chip-button" onClick={() => onExampleClick(question)}>
                {question}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="msg-thinking" role="status">
          <span className="thinking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className={runningTool ? 'thinking-label' : 'visually-hidden'}>
            {runningTool ? TOOL_LABELS[runningTool] || 'Calculating' : 'Thinking'}
          </span>
        </div>
      )}

      <div ref={endRef} className="thread-end" />
    </div>
  );
};

export default MessageList;
