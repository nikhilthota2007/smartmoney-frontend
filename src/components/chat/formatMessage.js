import React from 'react';

/** **bold** and *italic*, the two the model actually uses. */
const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/g;

const renderInline = (content, renderText) =>
  content
    .split(INLINE)
    .filter(Boolean)
    .map((part, index) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{renderText(part.slice(2, -2))}</strong>;
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{renderText(part.slice(1, -1))}</em>;
      }
      return <React.Fragment key={index}>{renderText(part)}</React.Fragment>;
    });

/**
 * Render the assistant's markdown-ish reply: paragraphs, bullet lists
 * written with '*' or '-', and **bold** / *italic* inside them.
 *
 * `renderText` receives each run of plain text and returns what to render
 * for it; the chat uses it to split new replies into words for the reveal.
 */
const formatMessage = (text, renderText = (content) => content) => {
  const paragraphs = text.split('\n\n');

  return paragraphs.map((para, idx) => {
    if (para.includes('\n*') || para.includes('\n-')) {
      const lines = para.split('\n').filter((line) => line.trim());
      const listItems = [];
      let currentText = [];

      lines.forEach((line) => {
        if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
          if (currentText.length > 0) {
            listItems.push({ type: 'text', content: currentText.join(' ') });
            currentText = [];
          }
          listItems.push({ type: 'bullet', content: line.replace(/^[*-]\s*/, '').trim() });
        } else {
          currentText.push(line.trim());
        }
      });

      if (currentText.length > 0) {
        listItems.push({ type: 'text', content: currentText.join(' ') });
      }

      return (
        <div key={idx} className="formatted-section">
          {listItems.map((item, itemIdx) =>
            item.type === 'bullet' ? (
              <div key={itemIdx} className="bullet-item">
                <span className="bullet" aria-hidden="true" />
                <span>{renderInline(item.content, renderText)}</span>
              </div>
            ) : (
              <p key={itemIdx} className="formatted-text">
                {renderInline(item.content, renderText)}
              </p>
            )
          )}
        </div>
      );
    }

    return (
      <p key={idx} className="formatted-paragraph">
        {renderInline(para, renderText)}
      </p>
    );
  });
};

export default formatMessage;
