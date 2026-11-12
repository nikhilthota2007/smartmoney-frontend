/**
 * POST /api/key — check a pasted Gemini key and choose a model for it.
 *
 * The key arrives in the X-Gemini-Key header, is used once to list the models
 * it can reach, and is not stored. Returns { valid, model } or { valid: false, error }.
 */
const { GeminiError, checkKey } = require('./_lib/gemini.js');
const { geminiFromRequest } = require('./_lib/userKey.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ valid: false, error: 'Method not allowed' });
  }
  const gemini = geminiFromRequest(req);
  if (!gemini) {
    return res.status(200).json({ valid: false, error: "That doesn't look like a Gemini API key." });
  }
  try {
    const { model } = await checkKey(gemini.key);
    return res.status(200).json({ valid: true, model });
  } catch (error) {
    if (error instanceof GeminiError && [400, 401, 403].includes(error.status)) {
      return res.status(200).json({ valid: false, error: "Google didn't accept that key." });
    }
    console.error('Key check failed', error instanceof GeminiError ? { status: error.status } : error);
    return res.status(200).json({ valid: false, error: "Couldn't reach Google to check the key. Try again in a moment." });
  }
};
