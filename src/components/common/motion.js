/**
 * The motion gate.
 *
 * Every screen renders its finished state first; motion is layered on only
 * when the browser can run it and the user has not asked for less of it.
 * jsdom has neither matchMedia nor IntersectionObserver, so tests always see
 * finished states and need no timers.
 */
export const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  typeof window.IntersectionObserver === 'function' &&
  typeof window.ResizeObserver === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
