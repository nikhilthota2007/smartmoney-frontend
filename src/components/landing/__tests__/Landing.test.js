import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../Landing';
import { buildDemo, DEMO_EXTRA } from '../demo';
import { buildFacts, CARD_EXAMPLE, SURVEY_FACTS } from '../facts';
import { DOORS } from '../StartHere';
import { duration, money, monthLabel } from '../../cards/display';
import { AppProviders, ROUTER_FUTURE } from '../../../Root';
import { PROFILE_KEY } from '../../../lib/storage';

const renderLanding = () =>
  render(
    <AppProviders>
      <MemoryRouter future={ROUTER_FUTURE}>
        <Landing />
      </MemoryRouter>
    </AppProviders>
  );

beforeEach(() => window.localStorage.clear());

describe('landing page, finished state', () => {
  it('renders without motion when the browser cannot animate', () => {
    renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'off');
  });

  it('has the hero headline and the section 2 claim', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: 'Your personal money advisor.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Honest math. Zero judgment.' })).toBeInTheDocument();
  });

  it('says it is an advisor, and offers help to anyone unsure where to start', () => {
    renderLanding();
    expect(screen.getByText(/not sure where to start\? that’s fine\. we’ll help you find the first step\./i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /not sure where to begin\?/i })).toBeInTheDocument();
  });

  it('opens setup with the goal each door names', () => {
    renderLanding();
    DOORS.forEach((door) => {
      expect(screen.getByRole('link', { name: new RegExp(door.title) })).toHaveAttribute('href', `/start?goal=${door.goal}`);
    });
  });

  it('quotes each survey figure with its source', () => {
    renderLanding();
    SURVEY_FACTS.forEach((fact) => {
      expect(screen.getByText(fact.label)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: fact.source })).toHaveAttribute('href', fact.href);
    });
    expect(screen.getByText('37%', { selector: '.visually-hidden' })).toBeInTheDocument();
  });

  it('works the payoff example out with the planner', () => {
    const { slow, fast } = buildFacts();
    // Paying more clears it sooner and cheaper, or the example says nothing.
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
    renderLanding();
    expect(screen.getByText(`${slow.months - fast.months} months`, { selector: '.visually-hidden' })).toBeInTheDocument();
    expect(screen.getByText('$1.29 trillion', { selector: '.visually-hidden' })).toBeInTheDocument();
    expect(screen.getByText(`Worked out with our payoff calculator: ${duration(slow.months)} versus ${duration(fast.months)}.`)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`paying ${money(CARD_EXAMPLE.fast).replace('$', '\\$')}`, 'i')).length).toBeGreaterThan(0);
  });

  it('flips a myth card to the truth and back', () => {
    renderLanding();
    const front = screen.getByRole('button', { name: /checking my credit score will lower it/i });
    expect(front).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(front);
    expect(front).toHaveAttribute('aria-expanded', 'true');
    const truth = screen.getByRole('region', { name: /checking my credit score/i });
    expect(within(truth).getByRole('link', { name: 'AnnualCreditReport.com' })).toBeInTheDocument();
    fireEvent.click(within(truth).getByRole('button', { name: /flip back/i }));
    expect(front).toHaveAttribute('aria-expanded', 'false');
  });

  it('quotes figures the planner calculated for the demo profile', () => {
    const demo = buildDemo();
    renderLanding();

    expect(demo.script.question).toBe('I owe $6,400 on two cards. Help.');
    expect(screen.getByText(/someone with \$6,400 on two cards/)).toHaveTextContent(
      `debt-free by ${monthLabel(demo.payoff.avalanche.months)}, ${demo.payoff.comparedToMinimumsOnly.monthsSaved} months sooner, with ${money(demo.payoff.comparedToMinimumsOnly.interestSaved)} less interest`
    );
    expect(demo.payoff.extraPayment).toBe(DEMO_EXTRA);
  });

  it('shows the finished payoff card on the phone', () => {
    const demo = buildDemo();
    renderLanding();
    // The phone is decorative to assistive tech, hence hidden: true.
    const card = within(screen.getByRole('article', { name: 'Payoff plan', hidden: true }));

    expect(card.getByText(monthLabel(demo.payoff.avalanche.months))).toBeInTheDocument();
    expect(card.getByText(money(demo.payoff.comparedToMinimumsOnly.interestSaved))).toBeInTheDocument();
  });

  it('sends new visitors to the wizard', () => {
    renderLanding();
    screen.getAllByRole('link', { name: /get my plan/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/start');
    });
  });

  it('sends returning visitors straight to their plan', () => {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ schemaVersion: 2, income: [{ id: 1, source: 'Pay', netMonthly: '3000', stability: 'stable' }] })
    );
    renderLanding();
    expect(screen.getByRole('link', { name: /open my plan/i })).toHaveAttribute('href', '/plan');
  });
});

describe('landing page, animated', () => {
  const originals = {};

  beforeEach(() => {
    originals.matchMedia = window.matchMedia;
    originals.IntersectionObserver = window.IntersectionObserver;
    originals.ResizeObserver = window.ResizeObserver;
    window.matchMedia = (query) => ({
      matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    });
    window.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    window.ResizeObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };
  });

  afterEach(() => {
    Object.assign(window, originals);
  });

  it('turns motion on and tears it down cleanly', () => {
    const { unmount } = renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'on');
    // The phone's words start hidden until the sequence plays.
    expect(screen.getByText('Okay.')).toHaveStyle({ opacity: '0' });
    unmount();
  });

  it('respects a reduced-motion preference', () => {
    window.matchMedia = (query) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} });
    renderLanding();
    expect(screen.getByTestId('landing')).toHaveAttribute('data-motion', 'off');
  });
});
