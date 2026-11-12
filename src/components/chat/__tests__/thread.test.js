import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../App';
import { sendChatMessage } from '../../../lib/api';
import { buildThread } from '../thread';
import { PROFILE_KEY } from '../../../lib/storage';

jest.mock('../../../lib/api', () => ({ sendChatMessage: jest.fn() }));

const payoffResult = {
  extraPayment: 150,
  totalDebt: 6400,
  totalMinimumPayment: 195,
  avalanche: { months: 25, years: 2, remainingMonths: 1, totalInterest: 1934.97, totalPaid: 8334.97, monthlyPayment: 345, clearsWithinProjection: true },
  snowball: { months: 25, years: 2, remainingMonths: 1, totalInterest: 2018.65, totalPaid: 8418.65, monthlyPayment: 345, clearsWithinProjection: true },
  comparedToMinimumsOnly: { monthsSaved: 38, interestSaved: 3460.03 },
};

describe('buildThread', () => {
  const transcript = [
    { role: 'assistant', content: 'Hey.' },
    { role: 'user', content: 'What if I add $150?' },
    { role: 'assistant', content: '', toolCalls: [{ id: 'a', name: 'simulate_debt_payoff', arguments: '{}' }] },
    { role: 'tool', toolCallId: 'a', name: 'simulate_debt_payoff', content: JSON.stringify(payoffResult) },
    { role: 'assistant', content: 'Here is the plan.' },
  ];

  it('puts the tool card between the question and the answer', () => {
    expect(buildThread(transcript).map((item) => item.kind)).toEqual(['advisor', 'user', 'card', 'advisor']);
  });

  it('keys items by transcript position', () => {
    expect(buildThread(transcript).map((item) => item.key)).toEqual([0, 1, 3, 4]);
  });

  it('shows no card for a failed or unparseable tool call', () => {
    const items = buildThread([
      { role: 'tool', name: 'simulate_debt_payoff', content: JSON.stringify({ error: 'no debts' }) },
      { role: 'tool', name: 'evaluate_goal', content: 'not json' },
      { role: 'tool', name: 'unknown_tool', content: '{}' },
    ]);
    expect(items).toEqual([]);
  });

  it('marks the hook’s error reply as an error', () => {
    const [item] = buildThread([
      { role: 'assistant', content: 'Sorry, I encountered an error: boom. Please try again in a moment.' },
    ]);
    expect(item.kind).toBe('error');
  });
});

describe('the advisor thread', () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendChatMessage.mockReset();
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        income: [{ id: 1, source: 'Pay', netMonthly: '3400', stability: 'stable' }],
        debts: [
          { id: 1, name: 'Visa', type: 'card', balance: '4100', interestRate: '27.9', minPayment: '125' },
          { id: 2, name: 'Store card', type: 'card', balance: '2300', interestRate: '24.9', minPayment: '70' },
        ],
      })
    );
  });

  it('shows a payoff card when the advisor runs the payoff tool', async () => {
    sendChatMessage
      .mockResolvedValueOnce({
        response: '',
        toolCalls: [{ id: 'c1', name: 'simulate_debt_payoff', arguments: JSON.stringify({ extraPayment: 150 }) }],
      })
      .mockResolvedValueOnce({ response: 'Send the extra $150 to the Visa first.', toolCalls: [] });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ask me about saving money/), {
      target: { value: 'What if I pay $150 extra?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const card = await screen.findByRole('article', { name: 'Payoff plan' });
    expect(within(card).getByText('+$150/mo')).toBeInTheDocument();
    expect(within(card).getByText('38')).toBeInTheDocument();
    expect(await screen.findByText(/Send the extra \$150 to the Visa first\./)).toBeInTheDocument();
  });

  it('keeps the example questions as chips that fill the input', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));

    const examples = screen.getByRole('region', { name: 'Try asking:' });
    fireEvent.click(within(examples).getByRole('button', { name: /retirement/i }));
    expect(screen.getByPlaceholderText(/Ask me about saving money/)).toHaveValue(
      "What's the smartest way to save for retirement?"
    );
  });
});
