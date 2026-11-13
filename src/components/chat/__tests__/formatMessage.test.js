import React from 'react';
import { render, screen } from '@testing-library/react';
import formatMessage from '../formatMessage';

const show = (text) => render(<div>{formatMessage(text)}</div>);

describe('formatMessage', () => {
  it('renders **bold** and *italic* instead of printing the asterisks', () => {
    show("Clear both cards in **25 months** and save **$3,460**.\n\n*(I'm not a licensed advisor.)*");

    expect(screen.getByText('25 months').tagName).toBe('STRONG');
    expect(screen.getByText('$3,460').tagName).toBe('STRONG');
    expect(screen.getByText("(I'm not a licensed advisor.)").tagName).toBe('EM');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('still reads lines starting with * or - as bullets', () => {
    show('Two options:\n* Pay the **Visa** first\n- Then the store card');

    expect(screen.getByText('Two options:')).toBeInTheDocument();
    expect(screen.getByText('Visa').tagName).toBe('STRONG');
    expect(screen.getByText('Then the store card')).toBeInTheDocument();
  });

  it('reads ***bold italic*** as bold, not as a bullet and a stray asterisk', () => {
    show('Here is the order.\n***Why this order?***\nBiggest first.');
    expect(screen.getByText('Why this order?').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*/)).not.toBeInTheDocument();
  });

  it('leaves a lone asterisk alone', () => {
    show('Rates * vary');
    expect(screen.getByText('Rates * vary')).toBeInTheDocument();
  });
});
