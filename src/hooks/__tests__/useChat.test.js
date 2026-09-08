import { renderHook, act, waitFor } from '@testing-library/react';
import { MAX_TOOL_ROUNDS, useChat, visibleMessages } from '../useChat';
import { createEmptyProfile } from '../../lib/profile';
import { sendChatMessage } from '../../lib/api';

jest.mock('../../lib/api');

const profile = () => ({
  ...createEmptyProfile(),
  income: [{ id: 1, source: 'Salary', netMonthly: '5000' }],
  expenses: { fixed: [{ id: 1, category: 'housing', amount: '3500' }], variable: [] },
  debts: [{ id: 1, name: 'Card', type: 'card', balance: '5000', interestRate: '22.99', minPayment: '150' }],
});

const answer = (text) => ({ response: text, toolCalls: [] });
const toolRequest = (name, args, id = 'call_1') => ({
  response: null,
  toolCalls: [{ id, name, arguments: JSON.stringify(args) }],
});

const setup = () => {
  const view = renderHook(() => useChat(profile()));
  act(() => view.result.current.startConversation());
  return view;
};

const ask = async (view, question) => {
  await act(async () => {
    await view.result.current.sendMessage(question);
  });
};

beforeEach(() => jest.resetAllMocks());

describe('a plain answer', () => {
  it('appends the reply and asks the backend once', async () => {
    sendChatMessage.mockResolvedValue(answer('Pay the card first.'));
    const view = setup();

    await ask(view, 'What should I do?');

    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(view.result.current.visible.at(-1)).toEqual({
      role: 'assistant',
      content: 'Pay the card first.',
    });
  });

  it('sends the question and the prior history on the first call', async () => {
    sendChatMessage.mockResolvedValue(answer('Sure.'));
    const view = setup();

    await ask(view, 'Hello?');

    const [call] = sendChatMessage.mock.calls[0];
    expect(call.message).toBe('Hello?');
    expect(call.history).toHaveLength(1); // the greeting only
    expect(call.financialContext.metrics.monthlyIncome).toBe(5000);
  });
});

describe('a turn that needs a calculation', () => {
  it('runs the tool and sends the result back for the model to explain', async () => {
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('simulate_debt_payoff', { extraPayment: 500 }))
      .mockResolvedValueOnce(answer('At $500 extra you clear it much sooner.'));
    const view = setup();

    await ask(view, 'What if I paid $500 more?');

    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(view.result.current.visible.at(-1).content).toMatch(/clear it much sooner/);
  });

  it('sends real computed figures back, not an echo of the request', async () => {
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('simulate_debt_payoff', { extraPayment: 500 }))
      .mockResolvedValueOnce(answer('Done.'));
    const view = setup();

    await ask(view, 'What if I paid $500 more?');

    const [secondCall] = sendChatMessage.mock.calls[1];
    const toolTurn = secondCall.history.find((message) => message.role === 'tool');
    const result = JSON.parse(toolTurn.content);

    expect(toolTurn.toolCallId).toBe('call_1');
    expect(result.extraPayment).toBe(500);
    expect(result.avalanche.months).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('omits the question on the continuation, since it is already in the history', async () => {
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('project_savings', { months: 12 }))
      .mockResolvedValueOnce(answer('Done.'));
    const view = setup();

    await ask(view, 'How much will I have?');

    const [secondCall] = sendChatMessage.mock.calls[1];
    expect(secondCall.message).toBeNull();
    expect(secondCall.history.some((m) => m.role === 'user' && m.content === 'How much will I have?')).toBe(true);
  });

  it('keeps the tool turns out of the user\'s view but in the transcript', async () => {
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('project_savings', { months: 12 }))
      .mockResolvedValueOnce(answer('Here you go.'));
    const view = setup();

    await ask(view, 'Project it');

    const { messages, visible } = view.result.current;
    expect(messages.some((m) => m.role === 'tool')).toBe(true);
    expect(visible.some((m) => m.role === 'tool')).toBe(false);
    expect(visible.map((m) => m.content)).toEqual([
      expect.stringContaining('AI financial advisor'),
      'Project it',
      'Here you go.',
    ]);
  });

  it('runs several tools in one round', async () => {
    sendChatMessage
      .mockResolvedValueOnce({
        response: null,
        toolCalls: [
          { id: 'a', name: 'project_savings', arguments: '{"months": 12}' },
          { id: 'b', name: 'evaluate_goal', arguments: '{"targetAmount": 20000}' },
        ],
      })
      .mockResolvedValueOnce(answer('Both done.'));
    const view = setup();

    await ask(view, 'Two things');

    const [secondCall] = sendChatMessage.mock.calls[1];
    const toolTurns = secondCall.history.filter((m) => m.role === 'tool');
    expect(toolTurns.map((turn) => turn.toolCallId)).toEqual(['a', 'b']);
  });

  it('passes a failed tool back to the model rather than crashing', async () => {
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('nonexistent_tool', {}))
      .mockResolvedValueOnce(answer('I could not run that.'));
    const view = setup();

    await ask(view, 'Do something impossible');

    const [secondCall] = sendChatMessage.mock.calls[1];
    const toolTurn = secondCall.history.find((m) => m.role === 'tool');
    expect(JSON.parse(toolTurn.content).error).toMatch(/Unknown tool/);
    expect(view.result.current.visible.at(-1).content).toBe('I could not run that.');
  });

  it('names the running calculation while it waits', async () => {
    let resolveSecond;
    sendChatMessage
      .mockResolvedValueOnce(toolRequest('simulate_debt_payoff', { extraPayment: 200 }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const view = setup();

    act(() => { view.result.current.sendMessage('What if?'); });

    await waitFor(() => expect(view.result.current.runningTool).toBe('simulate_debt_payoff'));
    await act(async () => { resolveSecond(answer('Done.')); });
    expect(view.result.current.runningTool).toBeNull();
  });
});

describe('the loop is bounded', () => {
  it('gives up if the model never stops asking for calculations', async () => {
    sendChatMessage.mockResolvedValue(toolRequest('project_savings', { months: 12 }));
    const view = setup();

    await ask(view, 'Loop forever');

    expect(sendChatMessage).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS + 1);
    expect(view.result.current.visible.at(-1).content).toMatch(/kept asking for calculations/);
    expect(view.result.current.loading).toBe(false);
  });
});

describe('failures', () => {
  it('shows a readable message and stops loading', async () => {
    sendChatMessage.mockRejectedValue(new Error('network is down'));
    const view = setup();

    await ask(view, 'Hello?');

    expect(view.result.current.visible.at(-1).content).toMatch(/network is down/);
    expect(view.result.current.loading).toBe(false);
  });

  it('ignores an empty message and does not call the backend', async () => {
    const view = setup();
    await ask(view, '   ');

    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});

describe('visibleMessages', () => {
  it('hides tool turns and assistant turns that only carry tool calls', () => {
    const messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'a', name: 'x', arguments: '{}' }] },
      { role: 'tool', toolCallId: 'a', content: '{}' },
      { role: 'assistant', content: 'the answer' },
    ];

    expect(visibleMessages(messages).map((m) => m.content)).toEqual(['hi', 'the answer']);
  });
});
