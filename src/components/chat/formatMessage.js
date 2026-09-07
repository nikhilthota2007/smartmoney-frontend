import React from 'react';

/**
 * Render the assistant's markdown-ish reply: paragraphs, plus bullet lists
 * written with '*' or '-'. Phase 2 extends this to render inline plan cards.
 */
const formatMessage = (text) => {
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((para, idx) => {
    if (para.includes('\n*') || para.includes('\n-')) {
      const lines = para.split('\n').filter(line => line.trim());
      const listItems = [];
      let currentText = [];
      
      lines.forEach(line => {
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
                <span className="bullet">•</span>
                <span>{item.content}</span>
              </div>
            ) : (
              <p key={itemIdx} className="formatted-text">{item.content}</p>
            )
          )}
        </div>
      );
    }
    
    return <p key={idx} className="formatted-paragraph">{para}</p>;
  });
};

export default formatMessage;
