import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../../../App';

const openAdvisor = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /skip the rest and start asking questions/i }));
};

beforeEach(() => window.localStorage.clear());

describe('sheets', () => {
  it('open as labelled dialogs', () => {
    openAdvisor();
    fireEvent.click(screen.getByRole('button', { name: /Debt Payoff Calculator/i }));
    expect(screen.getByRole('dialog', { name: 'Debt Payoff Calculator' })).toBeInTheDocument();
  });

  it('close on Escape and hand focus back to what opened them', () => {
    openAdvisor();
    const opener = screen.getByRole('button', { name: /Financial Health Score/i });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Your Financial Health Score' });
    expect(dialog).toHaveFocus();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('offer a way to add figures when there is no score yet', () => {
    openAdvisor();
    fireEvent.click(screen.getByRole('button', { name: /Financial Health Score/i }));
    fireEvent.click(screen.getByRole('button', { name: /add my numbers/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/% complete/)).toBeInTheDocument();
  });
});
