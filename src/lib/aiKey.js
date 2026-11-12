/**
 * The user's own Gemini key, if they pasted one. Optional: without it the
 * deployment's built-in model answers.
 *
 * Kept in this browser's storage only, alongside the model chosen for it. It
 * is sent with each AI request, in a header, to SmartMoney's own API, which
 * uses it for that request and never stores it.
 */
export const AI_KEY_STORAGE = 'smartmoney.gemini';

export const loadAiKey = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(AI_KEY_STORAGE));
    return stored && typeof stored.key === 'string' ? stored : null;
  } catch {
    return null;
  }
};

export const saveAiKey = ({ key, model }) => {
  try {
    window.localStorage.setItem(AI_KEY_STORAGE, JSON.stringify({ key, model: model || null }));
    return true;
  } catch {
    return false;
  }
};

export const clearAiKey = () => {
  try {
    window.localStorage.removeItem(AI_KEY_STORAGE);
  } catch {
    /* nothing to do */
  }
};

/** "AIza…9f2c": enough to recognise a key without showing it. */
export const maskKey = (key) => (key && key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••');

/** Headers that route a request through the user's key, when there is one. */
export const aiHeaders = () => {
  const stored = loadAiKey();
  if (!stored) return {};
  return stored.model ? { 'X-Gemini-Key': stored.key, 'X-Gemini-Model': stored.model } : { 'X-Gemini-Key': stored.key };
};
