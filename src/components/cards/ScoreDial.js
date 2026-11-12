import React from 'react';

/** A ring that fills to score/max, with the score in the middle. */
const ScoreDial = ({ score, max = 100, tone = 'var(--color-primary)', size = 176, label = 'out of 100' }) => {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, score / max)) * circumference;

  return (
    <div className="score-dial" style={{ width: size, height: size, '--dial-tone': tone }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="score-dial-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="score-dial-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-dial-center">
        <span className="score-dial-number tabular">{score}</span>
        <span className="score-dial-label">{label}</span>
      </div>
    </div>
  );
};

export default ScoreDial;
