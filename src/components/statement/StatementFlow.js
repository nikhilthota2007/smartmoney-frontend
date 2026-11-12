import React, { useRef, useState } from 'react';
import { AlertCircle, Check, FileText, Lock, RotateCcw } from 'lucide-react';
import { useStatement } from '../../app/StatementContext';
import { money } from '../cards/display';

const shortDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

/**
 * Pick or drop a statement; see what was found; send only what must be
 * sorted. Used during setup and from the plan.
 */
const StatementFlow = ({ onDone }) => {
  const { status, error, draft, analysis, read, analyze, reset } = useStatement();
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);

  const choose = (file) => {
    if (file) read(file);
  };

  if (status === 'reading' || status === 'analyzing') {
    return (
      <div className="statement-flow statement-busy" role="status">
        <span className="thinking-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {status === 'reading' ? 'Reading your statement on this device…' : 'Sorting your spending…'}
      </div>
    );
  }

  if (status === 'review' && draft) {
    const dates = draft.transactions.map((t) => t.date).sort();
    return (
      <div className="statement-flow statement-review">
        <p className="statement-found">
          <Check size={16} aria-hidden="true" />
          Found {draft.transactions.length} transactions, {shortDate(dates[0])} to {shortDate(dates[dates.length - 1])}.
        </p>
        <p className="statement-explain">
          We recognised the rest on your device.{' '}
          {draft.unknown.length === 1 ? 'This one needs' : `These ${draft.unknown.length} need`} the AI to sort them,
          and this is exactly what gets sent: no dates, names or account numbers.
        </p>
        <ul className="statement-sent" aria-label="What will be sent">
          {draft.unknown.map((item) => (
            <li key={item.id}>
              <span>{item.description}</span>
              <span className="tabular">{money(item.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="statement-actions">
          <button className="btn btn-primary" onClick={analyze}>
            Sort and analyze
          </button>
          <button className="btn btn-quiet" onClick={reset}>
            Use a different file
          </button>
        </div>
      </div>
    );
  }

  if (status === 'done' && analysis) {
    return (
      <div className="statement-flow statement-done">
        <p className="statement-found">
          <Check size={16} aria-hidden="true" />
          Analyzed {money(analysis.total)} of spending across {analysis.categories.length} categories.
        </p>
        {onDone && (
          <button className="btn btn-primary" onClick={onDone}>
            See what it means
          </button>
        )}
        <button className="btn btn-quiet btn-small" onClick={reset}>
          <RotateCcw size={14} aria-hidden="true" />
          Add another
        </button>
      </div>
    );
  }

  return (
    <div className="statement-flow">
      {status === 'error' && (
        <p className="notice notice-danger" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <label
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={input}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          className="visually-hidden"
          aria-label="Choose a statement"
          onChange={(event) => {
            choose(event.target.files[0]);
            event.target.value = '';
          }}
        />
        <span className="dropzone-icon" aria-hidden="true">
          <FileText size={26} />
        </span>
        <span className="dropzone-title">Drop a statement here</span>
        <span className="dropzone-sub">A credit card or bank statement, as a PDF or a CSV export</span>
        <span className="btn btn-outline btn-small dropzone-button" aria-hidden="true">
          Choose a file
        </span>
      </label>
      <p className="statement-privacy">
        <Lock size={14} aria-hidden="true" />
        Read on this device. Your name, address and account numbers never leave it.
      </p>
    </div>
  );
};

export default StatementFlow;
