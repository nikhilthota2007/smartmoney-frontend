import React from 'react';

/**
 * Text split into one span per word, for word-by-word reveals. Spaces stay as
 * text between the spans, so the sentence still reads (and is named) whole.
 * Each span gets --i, its index, for CSS stagger.
 */
const SplitWords = ({ text, className = 'word', start = 0 }) =>
  text.split(' ').map((word, index) => (
    <React.Fragment key={`${word}-${index}`}>
      {index > 0 && ' '}
      <span className={className} style={{ '--i': start + index }}>
        {word}
      </span>
    </React.Fragment>
  ));

export default SplitWords;
