/**
 * The verdict chip on a goal card, read from an evaluate_goal result.
 *
 * A display rule, not financial logic: it only sorts fields the tool already
 * returned. The one judgement call is STRETCH_SHARE, how much of the required
 * monthly amount free cash has to cover before a goal that is out of reach
 * still counts as close.
 */
export const STRETCH_SHARE = 0.75;

export const VERDICTS = {
  done: { key: 'done', label: 'Already there', tone: 'success' },
  onTrack: { key: 'onTrack', label: 'On track', tone: 'success' },
  stretch: { key: 'stretch', label: 'Stretch', tone: 'warning' },
  offTrack: { key: 'offTrack', label: 'Off track', tone: 'danger' },
};

export const goalVerdict = (result) => {
  if (!result || result.error) return null;
  if (result.remaining === 0) return VERDICTS.done;
  if (result.achievable) return VERDICTS.onTrack;

  const { requiredMonthly, monthlySurplus } = result;
  if (requiredMonthly > 0 && monthlySurplus > 0 && monthlySurplus >= requiredMonthly * STRETCH_SHARE) {
    return VERDICTS.stretch;
  }
  return VERDICTS.offTrack;
};
