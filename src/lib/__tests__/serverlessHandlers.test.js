/**
 * The two HTTP handlers the deployed site exposes: api/chat.js and
 * api/health.js, ports of FinancialAdvisorController.
 *
 * The contract these hold up is the one src/lib/api.js reads, so a change here
 * that the client does not expect breaks the chat without failing to build.
 */
import chat, { GENERIC_ERROR } from '../../../api/chat.js';
import health from '../../../api/health.js';
import { DEFAULT_MODEL } from '../../../api/_lib/advisor.js';

/** Just enough of Vercel's response object to record what a handler sent. */
const mockResponse = () => {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.send = (body) => { res.body = body; return res; };
  return res;
};

const post = (body) => ({ method: 'POST', body });

describe('POST /api/chat', () => {
  const originalKey = process.env.GROQ_API_KEY;
  let errorLog;

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'gsk_test_key_value';
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    errorLog.mockRestore();
    global.fetch = undefined;
  });

  const groqReplies = (message) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message }] }),
    });
  };

  it('returns the answer', async () => {
    groqReplies({ content: 'Pay the card first.' });
    const res = mockResponse();

    await chat(post({ message: 'What first?' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ response: 'Pay the card first.', success: true });
  });

  it('relays the calculations the model asks for', async () => {
    groqReplies({
      tool_calls: [{ id: 'fc_1', type: 'function', function: { name: 'simulate_debt_payoff', arguments: '{"extraPayment":300}' } }],
    });
    const res = mockResponse();

    await chat(post({ message: 'What if I pay $300 more?' }), res);

    expect(res.body.success).toBe(true);
    expect(res.body.toolCalls).toEqual([
      { id: 'fc_1', name: 'simulate_debt_payoff', arguments: '{"extraPayment":300}' },
    ]);
  });

  /** The client reads `toolCalls || []`, so an answer must not carry an empty one. */
  it('omits toolCalls from a plain answer', async () => {
    groqReplies({ content: 'Here you go.' });
    const res = mockResponse();

    await chat(post({ message: 'hi' }), res);

    expect(res.body).not.toHaveProperty('toolCalls');
  });

  it('parses a body that arrives as a string', async () => {
    groqReplies({ content: 'ok' });
    const res = mockResponse();

    await chat({ method: 'POST', body: JSON.stringify({ message: 'hi' }) }, res);

    expect(res.body.success).toBe(true);
  });

  it('accepts a request with no body at all', async () => {
    groqReplies({ content: 'ok' });
    const res = mockResponse();

    await chat({ method: 'POST' }, res);

    expect(res.body.success).toBe(true);
  });

  it('reports failure without leaking the key or the upstream URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'The model `llama-3.3-70b-versatile` does not exist',
    });
    const res = mockResponse();

    await chat(post({ message: 'hi' }), res);

    expect(res.body).toEqual({ response: null, success: false, error: GENERIC_ERROR });
    expect(JSON.stringify(res.body)).not.toContain('gsk_');
    expect(JSON.stringify(res.body)).not.toContain('api.groq.com');
  });

  /**
   * The reason a chat fails is only ever visible in the logs, so a rejection
   * from Groq must record the status and body that say which failure it was.
   */
  it('logs the upstream status and body so a retired model is diagnosable', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '{"error":{"code":"model_not_found"}}',
    });

    await chat(post({ message: 'hi' }), mockResponse());

    expect(errorLog).toHaveBeenCalledWith('Groq rejected the request',
      expect.objectContaining({ status: 404, body: expect.stringContaining('model_not_found') }));
  });

  it('reports failure when the deployment has no key', async () => {
    delete process.env.GROQ_API_KEY;
    const res = mockResponse();

    await chat(post({ message: 'hi' }), res);

    expect(res.body).toEqual({ response: null, success: false, error: GENERIC_ERROR });
  });

  it('refuses anything but POST', async () => {
    const res = mockResponse();

    await chat({ method: 'GET' }, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });
});

describe('GET /api/health', () => {
  const originalKey = process.env.GROQ_API_KEY;

  afterEach(() => { process.env.GROQ_API_KEY = originalKey; });

  it('names the model, the versions and the tools this deployment carries', () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    const res = mockResponse();

    health({ method: 'GET' }, res);

    expect(res.body).toContain(`model=${DEFAULT_MODEL}`);
    expect(res.body).toContain('prompt=v5');
    expect(res.body).toContain('tools=v1');
    expect(res.body).toContain('simulate_debt_payoff');
    expect(res.body).toContain('evaluate_goal');
    expect(res.body).toContain('project_savings');
  });

  /** A missing environment variable looks identical from the browser. */
  it('says whether a key is configured, never what it is', () => {
    process.env.GROQ_API_KEY = 'gsk_super_secret';
    const configured = mockResponse();
    health({ method: 'GET' }, configured);

    expect(configured.body).toContain('key=configured');
    expect(configured.body).not.toContain('gsk_super_secret');

    delete process.env.GROQ_API_KEY;
    const missing = mockResponse();
    health({ method: 'GET' }, missing);

    expect(missing.body).toContain('key=missing');
  });
});
