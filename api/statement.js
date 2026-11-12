/**
 * POST /api/statement — sort the transactions the browser could not.
 *
 * Body: { items: [{ id, description, amount }] }, at most 150, already
 * redacted on the device. Returns { success, categories: { [id]: key } }.
 * Uses the user's Gemini key when one is sent, the deployment's model
 * otherwise. Nothing is stored.
 */
const { GroqError, getJsonResponse } = require('./_lib/advisor.js');
const { GeminiError, generateJson } = require('./_lib/gemini.js');
const { geminiFromRequest, userKeyMessage } = require('./_lib/userKey.js');
const { SYSTEM, cleanItems, promptFor, readAnswer } = require('./_lib/categorize.js');

const GENERIC_ERROR = "Couldn't sort those transactions right now.";

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let items;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    items = cleanItems(body);
  } catch {
    items = null;
  }
  if (!items) {
    return res.status(400).json({ success: false, error: 'Send between 1 and 150 transactions.' });
  }

  try {
    const gemini = geminiFromRequest(req);
    const request = { system: SYSTEM, prompt: promptFor(items) };
    const answer = gemini ? await generateJson({ ...request, ...gemini }) : await getJsonResponse(request);
    return res.status(200).json({ success: true, categories: readAnswer(answer, items) });
  } catch (error) {
    if (error instanceof GeminiError) {
      console.error('Gemini rejected the categorisation', { status: error.status });
      return res.status(200).json({ success: false, error: userKeyMessage(error.status) || GENERIC_ERROR });
    }
    if (error instanceof GroqError) {
      console.error('Groq rejected the categorisation', { status: error.status, body: error.body });
    } else {
      console.error('Categorisation failed', error);
    }
    return res.status(200).json({ success: false, error: GENERIC_ERROR });
  }
};
