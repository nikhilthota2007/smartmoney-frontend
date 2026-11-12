import React from 'react';

/**
 * SmartMoney's mark: a coral dome (the sun coming up) over a bowl that
 * mirrors it, offset to read as an abstract S. The bowl takes currentColor,
 * so the mark works on light pages and over the dark hero alike.
 */
export const Mark = ({ size = 28, title, className = '' }) => (
  <svg
    className={`mark ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 32 32"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    focusable="false"
  >
    <path className="mark-sun" d="M10.5 15a8 8 0 0 1 16 0z" />
    <path className="mark-bowl" d="M5.5 17a8 8 0 0 0 16 0z" />
  </svg>
);

/** Mark plus the name, as one link-sized unit. */
export const Wordmark = ({ size = 28, className = '' }) => (
  <span className={`wordmark ${className}`.trim()}>
    <Mark size={size} />
    <span className="wordmark-text">SmartMoney</span>
  </span>
);

export default Mark;
