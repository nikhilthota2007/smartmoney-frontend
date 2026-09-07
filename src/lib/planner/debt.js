import { toNumber } from '../derive';

/** Simulation stops here; a debt whose minimum payment never covers its
 *  interest would otherwise loop forever. See PAYOFF_HORIZON_MONTHS below. */
export const PAYOFF_HORIZON_MONTHS = 600;

/**
 * How much extra the user can realistically put toward debt each month,
 * based on their surplus and how much of an emergency cushion they have.
 * Falls back to a percentage of the balance when income data is missing.
 */
export const calculateRecommendedPayment = (financialData, totalDebt, totalMinPayment) => {
  const income = toNumber(financialData.monthlyIncome);
  const expenses = toNumber(financialData.monthlyExpenses);
  const savings = toNumber(financialData.savings);

  if (income === 0 || expenses === 0) {
    return Math.round(totalDebt * 0.03);
  }

  const surplus = income - expenses - totalMinPayment;
  const monthsOfSavings = expenses > 0 ? savings / expenses : 0;

  // A thicker cushion frees up more of the surplus for debt.
  let recommendedPercentage = 0.5;
  if (monthsOfSavings >= 6) {
    recommendedPercentage = 0.7;
  } else if (monthsOfSavings >= 3) {
    recommendedPercentage = 0.5;
  } else {
    recommendedPercentage = 0.3;
  }

  const recommended = Math.max(0, Math.round(surplus * recommendedPercentage));

  if (recommended < 100) {
    return Math.round(totalDebt * 0.03);
  }

  return Math.round(recommended / 50) * 50;
};

/**
 * Month-by-month amortization of a set of debts under one payoff strategy.
 *
 * Every debt receives its minimum each month; the extra payment goes entirely
 * to the target debt ('avalanche' = highest rate, 'snowball' = lowest balance).
 * When a debt clears, its minimum rolls into the extra payment.
 */
export const calculateStrategy = (debts, extraPayment, strategy) => {
  let debtsList = debts.map((d) => ({
    name: d.name,
    balance: parseFloat(d.balance),
    rate: parseFloat(d.interestRate) / 100 / 12,
    minPayment: parseFloat(d.minPayment),
    originalBalance: parseFloat(d.balance),
  }));

  const totalMinPayment = debts.reduce((sum, d) => sum + parseFloat(d.minPayment), 0);
  const fixedMonthlyPayment = totalMinPayment + extraPayment;

  let months = 0;
  let totalPaid = 0;
  let currentExtraPayment = extraPayment;

  while (debtsList.some((d) => d.balance > 0.01) && months < PAYOFF_HORIZON_MONTHS) {
    months++;

    for (const debt of debtsList) {
      if (debt.balance > 0) {
        const interest = debt.balance * debt.rate;
        const minPayment = debt.minPayment;
        totalPaid += minPayment;
        debt.balance = debt.balance + interest - minPayment;
        if (debt.balance < 0) debt.balance = 0;
      }
    }

    let activeDebts = debtsList.filter((d) => d.balance > 0);

    if (activeDebts.length > 0) {
      if (strategy === 'avalanche') {
        activeDebts.sort((a, b) => b.rate - a.rate);
      } else {
        activeDebts.sort((a, b) => a.balance - b.balance);
      }

      const targetDebt = activeDebts[0];
      const extraApplied = Math.min(currentExtraPayment, targetDebt.balance);

      targetDebt.balance -= extraApplied;
      totalPaid += extraApplied;

      if (targetDebt.balance <= 0.01) {
        targetDebt.balance = 0;
        currentExtraPayment += targetDebt.minPayment;
      }
    }
  }

  const totalOriginal = debts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
  const totalInterest = totalPaid - totalOriginal;

  return {
    months,
    years: Math.floor(months / 12),
    remainingMonths: months % 12,
    totalPaid,
    totalInterest,
    monthlyPayment: fixedMonthlyPayment,
  };
};

/** Keep only rows the user has filled in well enough to simulate. */
export const filterValidDebts = (debts) =>
  debts.filter(
    (d) =>
      parseFloat(d.balance) > 0 &&
      parseFloat(d.interestRate) >= 0 &&
      parseFloat(d.minPayment) > 0
  );

/**
 * Compare payoff strategies at the user's chosen extra payment and at the
 * payment we recommend for them. Returns null when there is nothing to model.
 */
export const calculateMultipleDebts = (debts, customExtra = null, financialData = null) => {
  if (!debts || debts.length === 0) return null;

  const validDebts = filterValidDebts(debts);
  if (validDebts.length === 0) return null;

  const totalDebt = validDebts.reduce((sum, d) => sum + parseFloat(d.balance), 0);
  const totalMinPayment = validDebts.reduce((sum, d) => sum + parseFloat(d.minPayment), 0);

  const extraPayment =
    customExtra !== null && customExtra !== '' ? parseFloat(customExtra) : Math.round(totalDebt * 0.02);
  const recommendedExtra = financialData
    ? calculateRecommendedPayment(financialData, totalDebt, totalMinPayment)
    : Math.round(totalDebt * 0.05);

  return {
    totalDebt,
    totalMinPayment,
    recommendedExtra,
    scenarios: [
      {
        name: 'Current',
        extraPayment,
        avalanche: calculateStrategy([...validDebts], extraPayment, 'avalanche'),
        snowball: calculateStrategy([...validDebts], extraPayment, 'snowball'),
      },
    ],
    recommended: {
      extraPayment: recommendedExtra,
      avalanche: calculateStrategy([...validDebts], recommendedExtra, 'avalanche'),
      snowball: calculateStrategy([...validDebts], recommendedExtra, 'snowball'),
    },
    debts: validDebts,
  };
};
