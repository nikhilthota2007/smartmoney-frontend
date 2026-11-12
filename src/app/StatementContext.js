import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { analyzeSpending, applyCategories, CATEGORIES, readStatementFile } from '../lib/statement';
import { categorizeTransactions } from '../lib/api';
import { deriveSummary, getSectionList } from '../lib/profile';
import { toNumber } from '../lib/derive';

/**
 * The latest statement: reading it, sorting it, and what it says.
 *
 *   idle → reading → (review →) analyzing → done
 *
 * Review only appears when some merchants were not recognised on the device:
 * it shows exactly what would be sent to be sorted, before it is sent.
 *
 * The result is kept in this browser (redacted descriptions only) and its
 * monthly totals are written into the profile as expense rows marked
 * source: 'statement', with a card statement's balance, APR and minimum as a
 * debt. Rows the user typed are never touched.
 */
export const STATEMENT_KEY = 'smartmoney.statement';

const load = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STATEMENT_KEY));
    return saved && Array.isArray(saved.transactions) ? saved : null;
  } catch {
    return null;
  }
};

const persist = (saved) => {
  try {
    if (saved) window.localStorage.setItem(STATEMENT_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(STATEMENT_KEY);
  } catch {
    /* best effort, like the profile */
  }
};

const STATEMENT_SECTIONS = ['fixedExpenses', 'variableExpenses', 'debts'];

/** Monthly totals per profile expense row, from an analysis. */
const expenseRows = (analysis) => {
  const rows = {};
  analysis.categories.forEach((entry) => {
    const target = CATEGORIES[entry.category] && CATEGORIES[entry.category].profile;
    if (!target) return;
    const [kind, category] = target;
    const key = `${kind}:${category}`;
    rows[key] = { kind, category, amount: (rows[key] ? rows[key].amount : 0) + entry.monthly };
  });
  return Object.values(rows).filter((row) => row.amount >= 1);
};

const StatementContext = createContext(null);

export const StatementProvider = ({ children }) => {
  const { profile, addItem, removeItem } = useProfile();
  const [saved, setSaved] = useState(load);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  const clearStatementRows = useCallback(() => {
    STATEMENT_SECTIONS.forEach((section) => {
      getSectionList(profile, section)
        .filter((item) => item.source === 'statement')
        .forEach((item) => removeItem(section, item.id));
    });
  }, [profile, removeItem]);

  const applyToProfile = useCallback(
    (result) => {
      clearStatementRows();
      const analysis = analyzeSpending(result);
      expenseRows(analysis).forEach(({ kind, category, amount }) => {
        addItem(kind === 'fixed' ? 'fixedExpenses' : 'variableExpenses', {
          category,
          amount: String(Math.round(amount)),
          source: 'statement',
        });
      });

      const { summary } = result;
      const balance = summary && summary.kind === 'card' ? summary.newBalance : null;
      // Skip the card if the user already typed one with the same balance.
      const typedSame = profile.debts.some(
        (debt) => debt.source !== 'statement' && balance && Math.abs(toNumber(debt.balance) - balance) <= balance * 0.02
      );
      if (balance > 0 && !typedSame) {
        addItem('debts', {
          name: summary.issuer ? summary.issuer.replace(/\s+(card|credit card)$/i, '') : 'Credit card',
          type: 'card',
          balance: String(balance),
          interestRate: summary.apr ? String(summary.apr) : '',
          minPayment: summary.minimumPayment ? String(summary.minimumPayment) : '',
          source: 'statement',
        });
      }
    },
    [addItem, clearStatementRows, profile.debts]
  );

  const finish = useCallback(
    (prepared, categories, { aiFailed = false } = {}) => {
      const result = {
        fileName: prepared.fileName,
        summary: prepared.summary,
        transactions: applyCategories(prepared.transactions, categories),
        aiSorted: prepared.unknown.length,
        aiFailed,
        analyzedAt: new Date().toISOString(),
      };
      persist(result);
      setSaved(result);
      applyToProfile(result);
      setDraft(null);
      setStatus('done');
    },
    [applyToProfile]
  );

  const read = useCallback(
    async (file) => {
      setError(null);
      setStatus('reading');
      try {
        const prepared = await readStatementFile(file);
        if (prepared.transactions.length < 3) {
          throw new Error(
            "We couldn't find transactions in that file. Statement PDFs from your bank's website and CSV exports work best."
          );
        }
        const withName = { ...prepared, fileName: file.name || 'statement' };
        if (prepared.unknown.length === 0) {
          finish(withName, {});
        } else {
          setDraft(withName);
          setStatus('review');
        }
      } catch (readError) {
        setError(readError.message || "That file couldn't be read.");
        setStatus('error');
      }
    },
    [finish]
  );

  const analyze = useCallback(async () => {
    if (!draft) return;
    setStatus('analyzing');
    try {
      finish(draft, await categorizeTransactions(draft.unknown));
    } catch {
      // Still useful without the AI: the rest are marked Other.
      finish(draft, {}, { aiFailed: true });
    }
  }, [draft, finish]);

  const reset = useCallback(() => {
    setDraft(null);
    setError(null);
    setStatus('idle');
  }, []);

  const remove = useCallback(() => {
    clearStatementRows();
    persist(null);
    setSaved(null);
    reset();
  }, [clearStatementRows, reset]);

  const monthlyIncome = toNumber(deriveSummary(profile).monthlyIncome);
  const analysis = useMemo(() => (saved ? analyzeSpending(saved, { monthlyIncome }) : null), [saved, monthlyIncome]);

  const value = { status, error, draft, saved, analysis, read, analyze, reset, remove };
  return <StatementContext.Provider value={value}>{children}</StatementContext.Provider>;
};

export const useStatement = () => {
  const context = useContext(StatementContext);
  if (!context) throw new Error('useStatement must be used inside a StatementProvider');
  return context;
};
