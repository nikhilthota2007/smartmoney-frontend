/**
 * The user's own Gemini key, when they have pasted one.
 *
 * It arrives in a header on each request and is used for that request only.
 * Never logged, stored or echoed back.
 */
const header = (req, name) => {
  const value = req.headers && (req.headers[name] || req.headers[name.toLowerCase()]);
  return Array.isArray(value) ? value[0] : value;
};

const geminiFromRequest = (req) => {
  const key = header(req, 'x-gemini-key');
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{20,120}$/.test(key.trim())) return null;
  const model = header(req, 'x-gemini-model');
  return { key: key.trim(), model: typeof model === 'string' ? model : null };
};

/**
 * What to tell someone whose own key was refused. Their key, their quota, so
 * unlike the shared model's failures these are worth explaining.
 */
const userKeyMessage = (status) => {
  if (status === 400 || status === 401 || status === 403) {
    return "Google didn't accept your Gemini key. Check it in Settings, or remove it to use the built-in AI.";
  }
  if (status === 429) {
    return "Your Gemini key hit Google's rate limit. Give it a minute and try again.";
  }
  return null;
};

module.exports = { geminiFromRequest, userKeyMessage };
