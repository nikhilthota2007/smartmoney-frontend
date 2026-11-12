import React, { useState } from 'react';
import { Check, ExternalLink, Eye, EyeOff, KeyRound } from 'lucide-react';
import { clearAiKey, loadAiKey, maskKey, saveAiKey } from '../../lib/aiKey';
import { checkGeminiKey } from '../../lib/api';

/**
 * Optional: the user's own Gemini key. Without it, the built-in model answers
 * (shared, so it can hit rate limits). With it, questions run on their own
 * quota with Google.
 */
const AiKeyField = ({ onChange }) => {
  const [stored, setStored] = useState(loadAiKey);
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const save = async (event) => {
    event.preventDefault();
    if (!value.trim()) return;
    setChecking(true);
    setError(null);
    const result = await checkGeminiKey(value);
    setChecking(false);
    if (!result.valid) {
      setError(result.error || "Google didn't accept that key.");
      return;
    }
    const next = { key: value.trim(), model: result.model };
    saveAiKey(next);
    setStored(next);
    setValue('');
    onChange?.(next);
  };

  const remove = () => {
    clearAiKey();
    setStored(null);
    onChange?.(null);
  };

  if (stored) {
    return (
      <div className="ai-key">
        <p className="ai-key-status">
          <span className="chip chip-success">
            <Check size={13} aria-hidden="true" />
            Using your Gemini key
          </span>
          <span className="ai-key-detail tabular">
            {maskKey(stored.key)}
            {stored.model ? ` · ${stored.model}` : ''}
          </span>
        </p>
        <button className="btn btn-outline btn-small" onClick={remove}>
          Remove key
        </button>
      </div>
    );
  }

  return (
    <form className="ai-key" onSubmit={save}>
      <p className="ai-key-lede">
        SmartMoney works without one. Add your own Gemini key to ask as much as you like on your own Google quota.{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
          Get a free key
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </p>
      <div className="field">
        <label className="field-label" htmlFor="gemini-key">
          Gemini API key
        </label>
        <div className="field-control">
          <span className="field-affix">
            <KeyRound size={16} aria-hidden="true" />
          </span>
          <input
            id="gemini-key"
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="AIza…"
          />
          <button
            type="button"
            className="icon-btn ai-key-reveal"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Hide key' : 'Show key'}
          >
            {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {error && (
        <p className="ai-key-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-small" type="submit" disabled={checking || !value.trim()}>
        {checking ? 'Checking…' : 'Check and save'}
      </button>
      <p className="ai-key-note">
        Kept in this browser. It goes with each question to SmartMoney's server, which passes it to Google and doesn't
        store it. On Google's free tier, Google may use what you send to improve its products.
      </p>
    </form>
  );
};

export default AiKeyField;
