/**
 * The optional Gemini path (the user's own key) and the two endpoints that
 * came with statements: api/statement.js and api/key.js.
 */
import chat from '../../../api/chat.js';
import statement from '../../../api/statement.js';
import key from '../../../api/key.js';
import {
  buildRequest,
  extractReply,
  pickModel,
  sanitizeSchema,
  toContents,
} from '../../../api/_lib/gemini.js';
import { cleanItems, readAnswer } from '../../../api/_lib/categorize.js';

const USER_KEY = 'AIzaSyTEST_user_key_0123456789abcdef';

const mockResponse = () => {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

const post = (body, headers = {}) => ({ method: 'POST', body, headers });

const ok = (json) => ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) });

let errorLog;
beforeEach(() => {
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorLog.mockRestore();
  global.fetch = undefined;
});

describe('toContents', () => {
  it('maps a tool round trip, keeping ids and thought signatures', () => {
    const contents = toContents(
      [
        { role: 'assistant', content: 'Hey.' },
        { role: 'user', content: 'What if I add $150?' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'c1', name: 'simulate_debt_payoff', arguments: '{"extraPayment":150}', geminiId: 'g1', thoughtSignature: 'sig==' }],
        },
        { role: 'tool', toolCallId: 'c1', name: 'simulate_debt_payoff', content: '{"months":25}', geminiId: 'g1' },
      ],
      null
    );

    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'What if I add $150?' }] },
      {
        role: 'model',
        parts: [{ functionCall: { name: 'simulate_debt_payoff', args: { extraPayment: 150 }, id: 'g1' }, thoughtSignature: 'sig==' }],
      },
      { role: 'user', parts: [{ functionResponse: { name: 'simulate_debt_payoff', response: { months: 25 }, id: 'g1' } }] },
    ]);
  });

  it('puts parallel tool results in one user turn', () => {
    const contents = toContents([
      { role: 'user', content: 'Both please' },
      { role: 'assistant', toolCalls: [{ id: 'a', name: 'evaluate_goal', arguments: '{}' }, { id: 'b', name: 'project_savings', arguments: '{}' }] },
      { role: 'tool', toolCallId: 'a', name: 'evaluate_goal', content: '{"achievable":true}' },
      { role: 'tool', toolCallId: 'b', name: 'project_savings', content: '[1,2]' },
    ]);
    expect(contents[2].parts.map((part) => part.functionResponse.response)).toEqual([{ achievable: true }, { result: [1, 2] }]);
  });
});

describe('buildRequest', () => {
  it('sends the same system prompt and tools as the Groq path', () => {
    const request = buildRequest({ message: 'hi', financialData: { monthlyIncome: '3400' } });
    expect(request.systemInstruction.parts[0].text).toMatch(/3,400|3400/);
    expect(request.tools[0].functionDeclarations.map((fn) => fn.name)).toEqual([
      'simulate_debt_payoff',
      'evaluate_goal',
      'project_savings',
    ]);
  });

  it('strips schema keywords Gemini does not read', () => {
    expect(sanitizeSchema({ type: ['number', 'null'], additionalProperties: false, $schema: 'x', description: 'd' })).toEqual({
      type: 'number',
      nullable: true,
      description: 'd',
    });
  });
});

describe('extractReply', () => {
  it('returns text, skipping thought parts', () => {
    const reply = extractReply({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: 'Pay the Visa first.' }] } }] });
    expect(reply).toEqual({ content: 'Pay the Visa first.', toolCalls: [] });
  });

  it('returns tool calls with what must be echoed back', () => {
    const reply = extractReply({
      candidates: [{ content: { parts: [{ functionCall: { id: 'g9', name: 'evaluate_goal', args: { targetAmount: 3000 } }, thoughtSignature: 'abc' }] } }],
    });
    expect(reply.toolCalls).toEqual([
      { id: 'g9', name: 'evaluate_goal', arguments: '{"targetAmount":3000}', geminiId: 'g9', thoughtSignature: 'abc' },
    ]);
  });

  it('explains an empty or blocked reply', () => {
    expect(() => extractReply({ promptFeedback: { blockReason: 'SAFETY' } })).toThrow(/blocked: SAFETY/);
  });
});

describe('pickModel', () => {
  const model = (name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] });

  it('picks the newest stable Flash model the key can use', () => {
    expect(pickModel([model('gemini-2.5-flash'), model('gemini-3.5-flash'), model('gemini-3.5-flash-lite'), model('gemini-3.6-flash-preview'), model('gemini-3.5-pro')])).toBe('gemini-3.5-flash');
  });

  it('falls back to a preview when nothing stable is listed', () => {
    expect(pickModel([model('gemini-4.0-flash-preview')])).toBe('gemini-4.0-flash-preview');
  });

  it('returns null when there is no Flash model', () => {
    expect(pickModel([model('gemini-3.5-pro')])).toBeNull();
  });
});

describe('POST /api/chat with a Gemini key', () => {
  it('runs the turn on Gemini with the key in a header, never in the URL', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ candidates: [{ content: { parts: [{ text: 'Start with the Visa.' }] } }] }));
    const res = mockResponse();

    await chat(post({ message: 'What first?' }, { 'x-gemini-key': USER_KEY, 'x-gemini-model': 'gemini-3.5-flash' }), res);

    expect(res.body).toEqual({ response: 'Start with the Visa.', success: true });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent');
    expect(url).not.toContain(USER_KEY);
    expect(options.headers['x-goog-api-key']).toBe(USER_KEY);
  });

  it('explains a refused key without logging it', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'API key not valid' });
    const res = mockResponse();

    await chat(post({ message: 'hi' }, { 'x-gemini-key': USER_KEY }), res);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/didn't accept your Gemini key/);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(USER_KEY);
  });

  it('ignores a header that is not a key and uses the deployment model', async () => {
    const originalKey = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = 'gsk_test';
    global.fetch = jest.fn().mockResolvedValue(ok({ choices: [{ message: { content: 'Hi.' } }] }));

    await chat(post({ message: 'hi' }, { 'x-gemini-key': 'nope' }), mockResponse());

    expect(global.fetch.mock.calls[0][0]).toMatch(/groq/);
    process.env.GROQ_API_KEY = originalKey;
  });
});

describe('POST /api/statement', () => {
  it('accepts only small, clean batches', () => {
    expect(cleanItems({ items: [] })).toBeNull();
    expect(cleanItems({ items: Array.from({ length: 151 }, (_, i) => ({ id: i })) })).toBeNull();
    expect(cleanItems({ items: [{ id: 1, description: 'REF 12345678 me@x.com SHOP', amount: '9.5' }] })).toEqual([
      { id: 1, description: 'REF # SHOP', amount: 9.5 },
    ]);
  });

  it('keeps only known categories for ids that were asked about', () => {
    expect(readAnswer({ 1: 'coffee', 2: 'made-up', 3: 'dining' }, [{ id: 1 }, { id: 2 }])).toEqual({ 1: 'coffee', 2: 'other' });
  });

  it('sorts with the user key when one is sent', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ candidates: [{ content: { parts: [{ text: '{"1":"dining"}' }] } }] }));
    const res = mockResponse();

    await statement(post({ items: [{ id: 1, description: 'NEIGHBOURHOOD THING', amount: 19 }] }, { 'x-gemini-key': USER_KEY }), res);

    expect(res.body).toEqual({ success: true, categories: { 1: 'dining' } });
    const sent = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.contents[0].parts[0].text).toContain('1: NEIGHBOURHOOD THING ($19)');
  });

  it('rejects a bad body', async () => {
    const res = mockResponse();
    await statement(post({ items: 'nope' }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/key', () => {
  it('validates a key and picks a model', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ok({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] })
    );
    const res = mockResponse();
    await key(post({}, { 'x-gemini-key': USER_KEY }), res);
    expect(res.body).toEqual({ valid: true, model: 'gemini-3.5-flash' });
  });

  it('reports a refused key', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });
    const res = mockResponse();
    await key(post({}, { 'x-gemini-key': USER_KEY }), res);
    expect(res.body).toEqual({ valid: false, error: "Google didn't accept that key." });
  });

  it('does not call Google for something that is not a key', async () => {
    global.fetch = jest.fn();
    const res = mockResponse();
    await key(post({}, { 'x-gemini-key': 'short' }), res);
    expect(res.body.valid).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
