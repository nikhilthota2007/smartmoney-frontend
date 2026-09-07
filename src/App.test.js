import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { PROFILE_KEY } from './lib/storage';

const fillField = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const startChat = () => fireEvent.click(screen.getByRole('button', { name: /start getting financial advice/i }));

beforeEach(() => {
  window.localStorage.clear();
  document.body.className = '';
});

describe('intake', () => {
  it('opens on the intake form', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SmartMoney' })).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly Income')).toHaveValue(null);
  });

  it('persists what the user types to localStorage', () => {
    render(<App />);
    fillField('Monthly Income', '5000');
    fillField('Current Savings', '10000');

    const stored = JSON.parse(window.localStorage.getItem(PROFILE_KEY));
    expect(stored.summary.monthlyIncome).toBe('5000');
    expect(stored.summary.savings).toBe('10000');
  });

  it('restores a saved profile on reload', () => {
    const { unmount } = render(<App />);
    fillField('Monthly Income', '4200');
    unmount();

    render(<App />);
    expect(screen.getByLabelText('Monthly Income')).toHaveValue(4200);
  });

  it('migrates a v1 record left by the previous version', () => {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ monthlyIncome: '3000', monthlyExpenses: '2000', savings: '', debts: '', goals: '' })
    );

    render(<App />);
    expect(screen.getByLabelText('Monthly Income')).toHaveValue(3000);
    expect(screen.getByLabelText('Monthly Expenses')).toHaveValue(2000);
  });

  it('survives a corrupt stored profile', () => {
    window.localStorage.setItem(PROFILE_KEY, '{not json');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'SmartMoney' })).toBeInTheDocument();
  });
});

describe('chat', () => {
  it('greets the user and offers example questions', () => {
    render(<App />);
    startChat();

    expect(screen.getByText(/I'm your AI financial advisor/)).toBeInTheDocument();
    expect(screen.getByText('Try asking:')).toBeInTheDocument();
  });

  it('loads an example question into the input instead of sending it', () => {
    render(<App />);
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /How much should I save for an emergency fund/i }));

    expect(screen.getByPlaceholderText(/Ask me about saving money/)).toHaveValue(
      'How much should I save for an emergency fund?'
    );
  });

  it('disables send until there is something to send', () => {
    render(<App />);
    startChat();
    const input = screen.getByPlaceholderText(/Ask me about saving money/);
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    expect(sendButton).toBeDisabled();
    fireEvent.change(input, { target: { value: 'How do I budget?' } });
    expect(sendButton).not.toBeDisabled();
  });
});

describe('health score modal', () => {
  it('scores the figures entered on the intake form', () => {
    render(<App />);
    fillField('Monthly Income', '5000');
    fillField('Monthly Expenses', '3500');
    fillField('Current Savings', '10000');
    fillField('Outstanding Debts', '5000');
    startChat();

    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));

    expect(screen.getByText('Your Financial Health Score')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument(); // pinned by the characterization fixtures
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('asks for figures when none were entered', () => {
    render(<App />);
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));

    expect(
      screen.getByText('Enter your financial information to see your health score')
    ).toBeInTheDocument();
  });
});

describe('debt payoff calculator', () => {
  it('prompts for debts, then shows all three strategies once one is entered', () => {
    render(<App />);
    startChat();
    fireEvent.click(screen.getByRole('button', { name: /Debt Payoff Calculator/i }));

    expect(screen.getByText('Add your debts above to see payoff strategies')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '5000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '22.99' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '150' } });

    expect(screen.getByText('Debt Avalanche')).toBeInTheDocument();
    expect(screen.getByText('Debt Snowball')).toBeInTheDocument();
    expect(screen.getByText('Smart Payment Plan')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
  });

  it('keeps the extra payment when the calculator is closed and reopened', () => {
    render(<App />);
    startChat();
    const openCalculator = () =>
      fireEvent.click(screen.getByRole('button', { name: /Debt Payoff Calculator/i }));

    openCalculator();
    fireEvent.change(screen.getByPlaceholderText('Balance'), { target: { value: '5000' } });
    fireEvent.change(screen.getByPlaceholderText('Rate'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText('Min Payment'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/Extra Monthly Payment/i), { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    openCalculator();

    expect(screen.getByLabelText(/Extra Monthly Payment/i)).toHaveValue(250);
  });
});

describe('dark mode', () => {
  it('toggles the body class and remembers the choice', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByTitle('Switch to Dark Mode'));
    expect(document.body).toHaveClass('dark-mode');

    unmount();
    render(<App />);
    expect(document.body).toHaveClass('dark-mode');
  });
});
