/**
 * The advisor as it runs on Vercel: api/_lib/.
 *
 * These live under src/ because create-react-app's jest only collects tests
 * from there, but everything under test is the serverless function's code.
 *
 * The picture and message expectations were taken from the Java originals
 * (FinancialPictureRendererTest, AdvisorServiceTest) and verified against them
 * byte for byte before this port replaced the Spring service — the two render
 * the same prompt file, so a drift here is a drift in what the model is told.
 */
/*
 * renderFinancialPicture builds a string of prompt text, not a React tree, but
 * testing-library's naming rule matches on the `render` prefix and insists the
 * result be called `view` or `utils`.
 */
/* eslint-disable testing-library/render-result-naming-convention */
import { renderFinancialPicture } from '../../../api/_lib/picture.js';
import { PROMPT_VERSION, PROMPT_TEMPLATE, buildSystemPrompt } from '../../../api/_lib/prompt.js';
import { TOOLS_VERSION, TOOL_DECLARATIONS, toolNames } from '../../../api/_lib/tools.js';
import {
  DEFAULT_MODEL,
  GroqError,
  buildMessages,
  extractReply,
  getChatResponse,
  modelName,
} from '../../../api/_lib/advisor.js';
import { TOOL_MANIFEST } from '../tools';
import contract from '../__fixtures__/advisorContext.contract.json';

const metrics = () => ({
  monthlyIncome: 5000,
  monthlyExpenses: 3500,
  monthlySurplus: 1500,
  savingsRatePct: 30,
  debtToIncomePct: 8.3,
  emergencyFundMonths: 2.9,
  liquidSavings: 10000,
  totalDebt: 5000,
  netWorth: 5000,
});

const fullContext = () => ({
  metrics: metrics(),
  healthScore: {
    total: 75,
    rating: 'Good',
    components: [
      { name: 'Savings rate', score: 40, max: 40 },
      { name: 'Debt to income', score: 25, max: 30 },
    ],
  },
  debts: [{ name: 'Card', type: 'card', balance: 5000, aprPct: 23, minPayment: 150, neverPaidOffAtMinimum: false }],
  debtPayoff: {
    extraPayment: 100,
    recommendedExtraPayment: 500,
    avalanche: { months: 38, totalInterest: 1234.56, totalPaid: 6234.56, monthlyPayment: 250, clearsWithinProjection: true },
    snowball: { months: 40, totalInterest: 1300, totalPaid: 6300, monthlyPayment: 250, clearsWithinProjection: true },
    atRecommendedPayment: { months: 9, totalInterest: 500, totalPaid: 5500, monthlyPayment: 650, clearsWithinProjection: true },
  },
  goals: [{ name: 'House', type: 'purchase', targetAmount: 60000, targetDate: '2029-06' }],
  protectionGaps: ['Health insurance', 'Disability insurance'],
  missing: ['Goals'],
  completenessPct: 80,
});

describe('financial picture', () => {
  it('renders the cash flow and position figures', () => {
    const picture = renderFinancialPicture(fullContext(), null);

    expect(picture).toContain('Income: $5,000.00');
    expect(picture).toContain('Surplus: $1,500.00');
    expect(picture).toContain('Savings rate: 30%');
    expect(picture).toContain('Total debt: $5,000.00');
    expect(picture).toContain('Emergency fund: 2.9 months');
  });

  it('renders the health score with its components', () => {
    const picture = renderFinancialPicture(fullContext(), null);

    expect(picture).toContain('FINANCIAL HEALTH SCORE: 75/100 (Good)');
    expect(picture).toContain('Savings rate: 40/40');
  });

  it('itemizes debts with their terms', () => {
    expect(renderFinancialPicture(fullContext(), null))
      .toContain('Card (card): $5,000.00 at 23% APR, minimum $150.00');
  });

  it('calls out a debt that is never paid off', () => {
    const context = {
      metrics: metrics(),
      debts: [{ name: 'Runaway', type: 'card', balance: 20000, aprPct: 29.99, minPayment: 50, neverPaidOffAtMinimum: true }],
    };

    expect(renderFinancialPicture(context, null)).toContain('never gets paid off');
  });

  it('supplies payoff timelines so the model need not compute them', () => {
    const picture = renderFinancialPicture(fullContext(), null);

    expect(picture).toContain('avalanche: 38 months, $1,234.56 total interest');
    expect(picture).toContain('snowball: 40 months');
    expect(picture).toContain('recommended $500.00/mo');
  });

  it('says so rather than guessing when a payoff never clears', () => {
    const context = {
      debtPayoff: {
        extraPayment: 0,
        recommendedExtraPayment: 250,
        avalanche: { months: 600, totalInterest: 99999, totalPaid: 1, monthlyPayment: 1, clearsWithinProjection: false },
      },
    };

    expect(renderFinancialPicture(context, null)).toContain('not cleared within the 50-year projection');
  });

  it('writes a negative net worth as -$15,000.00', () => {
    expect(renderFinancialPicture({ metrics: { ...metrics(), netWorth: -15000 } }, null))
      .toContain('Net worth: -$15,000.00');
  });

  it('marks absent figures as not provided rather than as zero', () => {
    expect(renderFinancialPicture({ metrics: { monthlyIncome: null } }, null))
      .toContain('Income: Not provided');
  });

  it('falls back to the headline figures when an older client sends no context', () => {
    const picture = renderFinancialPicture(null, {
      monthlyIncome: '5000', monthlyExpenses: '3500', savings: '10000', debts: '5000', goals: 'House',
    });

    expect(picture).toContain('Monthly Income: $5000');
    expect(picture).toContain('do not quote figures beyond them');
  });

  it('falls back when the context carries nothing at all', () => {
    expect(renderFinancialPicture({}, null)).toContain('Monthly Income: $Not provided');
  });

  it('renders the payload the cross-repo contract fixture describes', () => {
    const picture = renderFinancialPicture(contract.context, null);

    expect(picture).toContain('MONTHLY CASH FLOW');
    expect(picture).toContain('DEBT PAYOFF, ALREADY CALCULATED');
    expect(picture).toContain('COVERAGE GAPS');
  });
});

describe('system prompt', () => {
  it('drops the authoring notes above the marker', () => {
    expect(PROMPT_TEMPLATE).not.toContain('When editing:');
    expect(PROMPT_TEMPLATE.startsWith('You are an expert personal financial advisor')).toBe(true);
  });

  it('substitutes the picture for the placeholder', () => {
    const prompt = buildSystemPrompt(renderFinancialPicture(fullContext(), null));

    expect(prompt).not.toContain('{{financialPicture}}');
    expect(prompt).toContain('FINANCIAL HEALTH SCORE: 75/100 (Good)');
  });

  /**
   * Every money figure starts with a $, which JavaScript's string replace reads
   * as a substitution pattern. $& in particular would splice the placeholder
   * back in. The picture must land in the prompt exactly as rendered.
   */
  it('inserts dollar figures literally rather than as replacement patterns', () => {
    expect(buildSystemPrompt('Income: $1,500.00 and $& and $` and $\' and $1'))
      .toContain("Income: $1,500.00 and $& and $` and $' and $1");
  });

  it('keeps the guardrails that make the advice safe to ship', () => {
    expect(PROMPT_TEMPLATE).toContain('EDUCATIONAL INFORMATION, NOT LICENSED ADVICE');
    expect(PROMPT_VERSION).toBe('v6');
  });

  /**
   * v6. A live answer to "should I finance a car" hit the token cap and was cut
   * off mid-sentence, after two markdown tables the client cannot render and
   * three section headers, before it reached a recommendation.
   */
  it('bans markdown tables, which the client cannot render', () => {
    expect(PROMPT_TEMPLATE).toContain('NEVER USE MARKDOWN TABLES');
    expect(PROMPT_TEMPLATE).toContain('paragraphs and bullet lists');
  });

  it('requires the answer first and keeps it short', () => {
    expect(PROMPT_TEMPLATE).toContain('Lead with the answer');
    expect(PROMPT_TEMPLATE).toContain('Keep it short');
    expect(PROMPT_TEMPLATE).toContain('cut off mid-sentence');
  });

  it('stops it answering with a list of questions', () => {
    expect(PROMPT_TEMPLATE).toContain('Ask at most two clarifying questions');
  });

  /**
   * v5. A live run against Groq produced both of these failures in one answer:
   * a fabricated "roughly 2 months" for a gap that really takes 10 to 13, and
   * "The tool can recalculate that" said straight to the user.
   */
  it('forbids working out a timeline in prose', () => {
    expect(PROMPT_TEMPLATE).toContain('HOW LONG until a target is reached');
    expect(PROMPT_TEMPLATE).toContain('how much is needed each month to reach a target by a date');
    expect(PROMPT_TEMPLATE).toContain('is a timeline');
  });

  it('narrows what counts as simple arithmetic to one showable line', () => {
    expect(PROMPT_TEMPLATE).toContain('SINGLE step you can show in');
    expect(PROMPT_TEMPLATE).toContain('this licence does not cover it');
  });

  it('sends emergency-fund timelines to evaluate_goal', () => {
    expect(PROMPT_TEMPLATE).toContain('An emergency-fund target is a goal like any other');
    expect(PROMPT_TEMPLATE).toContain('how long until I have');
  });

  it('forbids referring to the tools at all, not merely naming them', () => {
    expect(PROMPT_TEMPLATE).toContain('NEVER REFER TO THESE TOOLS IN YOUR ANSWER');
    expect(PROMPT_TEMPLATE).toContain('"the tool"');
    expect(PROMPT_TEMPLATE).toContain('tell me another amount and I will work');
  });
});

describe('tool declarations', () => {
  it('declares exactly the tools the browser implements', () => {
    expect(toolNames()).toEqual(TOOL_MANIFEST.map((tool) => tool.name));
    expect(TOOLS_VERSION).toBe('v1');
  });

  it('declares each tool in OpenAI function-calling shape', () => {
    TOOL_DECLARATIONS.forEach((tool) => {
      expect(tool.type).toBe('function');
      expect(typeof tool.function.name).toBe('string');
      expect(typeof tool.function.description).toBe('string');
      expect(tool.function.parameters.type).toBe('object');
    });
  });

  /** A parameter the model can send but no handler reads is a silent no-op. */
  it('declares no parameter the browser handlers do not accept', () => {
    TOOL_DECLARATIONS.forEach((tool) => {
      const accepted = TOOL_MANIFEST.find((entry) => entry.name === tool.function.name).parameters;
      expect(Object.keys(tool.function.parameters.properties).sort()).toEqual([...accepted].sort());
    });
  });
});

describe('message building', () => {
  const ask = (message, history) => buildMessages({ message, history, financialData: null, financialContext: null });

  it('puts the system prompt first and the question last', () => {
    const messages = ask('What should I do?');

    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'What should I do?' });
  });

  it('maps the legacy model role onto assistant', () => {
    const messages = ask('And then?', [{ role: 'model', content: 'an older reply' }]);

    expect(messages[1]).toEqual({ role: 'assistant', content: 'an older reply' });
  });

  /** A continuation carries no question: it is already in the history. */
  it('omits a blank message', () => {
    expect(ask('   ')).toHaveLength(1);
    expect(ask(null)).toHaveLength(1);
  });

  it('sends an assistant tool call back in OpenAI wire format', () => {
    const messages = ask(null, [
      { role: 'assistant', content: '', toolCalls: [{ id: 'call_1', name: 'simulate_debt_payoff', arguments: '{"extraPayment":300}' }] },
    ]);

    expect(messages[1].tool_calls).toEqual([
      { id: 'call_1', type: 'function', function: { name: 'simulate_debt_payoff', arguments: '{"extraPayment":300}' } },
    ]);
  });

  it('sends a tool result under the id the model asked with', () => {
    const messages = ask(null, [{ role: 'tool', toolCallId: 'call_1', content: '{"months":38}' }]);

    expect(messages[1]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"months":38}' });
  });

  it('defaults absent content and arguments rather than sending null', () => {
    const messages = ask(null, [
      { role: 'assistant', content: null, toolCalls: [{ id: 'c2', name: 'project_savings', arguments: null }] },
      { role: 'tool', toolCallId: 'c2', content: null },
    ]);

    expect(messages[1].content).toBe('');
    expect(messages[1].tool_calls[0].function.arguments).toBe('{}');
    expect(messages[2].content).toBe('');
  });
});

describe('reply extraction', () => {
  const reply = (message) => extractReply({ choices: [{ message }] });

  it('reads an answer', () => {
    expect(reply({ content: 'Here you go.' })).toEqual({ content: 'Here you go.', toolCalls: [] });
  });

  it('reads a tool call with no content alongside it', () => {
    const result = reply({
      tool_calls: [{ id: 'fc_1', type: 'function', function: { name: 'evaluate_goal', arguments: '{"targetAmount":60000}' } }],
    });

    expect(result.content).toBeNull();
    expect(result.toolCalls).toEqual([{ id: 'fc_1', name: 'evaluate_goal', arguments: '{"targetAmount":60000}' }]);
  });

  it('falls back to the tool name when the call carries no id', () => {
    expect(reply({ tool_calls: [{ function: { name: 'project_savings' } }] }).toolCalls[0])
      .toEqual({ id: 'project_savings', name: 'project_savings', arguments: '{}' });
  });

  it('skips a malformed call rather than passing it to the browser', () => {
    expect(reply({ content: 'x', tool_calls: [{ function: {} }, 'nonsense', null] }).toolCalls).toEqual([]);
  });

  it('rejects a response with neither content nor tool calls', () => {
    expect(() => reply({})).toThrow('neither content nor tool calls');
  });

  it('rejects a response with no choices', () => {
    expect(() => extractReply({ choices: [] })).toThrow('no choices');
    expect(() => extractReply(null)).toThrow('no choices');
  });

  it('rejects a choice that carries no message', () => {
    expect(() => extractReply({ choices: [{}] })).toThrow('not in the expected shape');
  });
});

describe('the upstream call', () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;

  afterEach(() => {
    process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  });

  const ok = (body) => ({ ok: true, status: 200, json: async () => body });

  it('sends the declared tools, the model and the key', async () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    const fetchImpl = jest.fn().mockResolvedValue(ok({ choices: [{ message: { content: 'ok' } }] }));

    await getChatResponse({ message: 'hi' }, { fetchImpl });

    const [url, options] = fetchImpl.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer gsk_test');
    expect(body.model).toBe(DEFAULT_MODEL);
    expect(body.tool_choice).toBe('auto');
    expect(body.tools).toEqual(TOOL_DECLARATIONS);
    // A live answer was truncated mid-sentence at the old cap of 1000. The
    // client shows whatever arrives, so a low cap fails silently.
    expect(body.max_tokens).toBe(3000);
  });

  /**
   * Groq retires models, and a retired one 404s on every call. Overriding the
   * model must not need a redeploy of the function.
   */
  it('lets the environment name a different model', () => {
    process.env.GROQ_MODEL = 'openai/gpt-oss-20b';
    expect(modelName()).toBe('openai/gpt-oss-20b');

    delete process.env.GROQ_MODEL;
    expect(modelName()).toBe(DEFAULT_MODEL);
  });

  it('raises a GroqError carrying the status and body when Groq rejects the call', async () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '{"error":{"code":"model_not_found"}}',
    });

    const error = await getChatResponse({ message: 'hi' }, { fetchImpl }).catch((e) => e);

    expect(error).toBeInstanceOf(GroqError);
    expect(error.status).toBe(404);
    expect(error.body).toContain('model_not_found');
  });

  it('does not call Groq at all when the key is missing', async () => {
    delete process.env.GROQ_API_KEY;
    const fetchImpl = jest.fn();

    await expect(getChatResponse({ message: 'hi' }, { fetchImpl })).rejects.toThrow('GROQ_API_KEY is not set');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
