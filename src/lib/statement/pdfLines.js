/**
 * Rebuild lines of text from the positioned fragments a PDF's text layer holds.
 *
 * PDFs store text as runs placed at x/y coordinates, not as lines. Fragments
 * whose baselines sit within a fraction of the font height are one line;
 * a wide horizontal gap between fragments becomes a double space, which is
 * how statement columns (date | description | amount) stay apart.
 *
 * Pure: takes `{ str, x, y, width, height }` items, one page at a time.
 */
export const itemsToLines = (items) => {
  const rows = [];
  items
    .filter((item) => item.str && item.str.trim())
    .forEach((item) => {
      const tolerance = Math.max(2, (item.height || 10) * 0.45);
      let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    });

  // PDF y grows upwards: the top of the page has the largest y.
  rows.sort((a, b) => b.y - a.y);

  return rows.map((row) => {
    const sorted = row.items.sort((a, b) => a.x - b.x);
    let line = '';
    let lastEnd = null;
    sorted.forEach((item) => {
      const text = item.str.replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (lastEnd !== null) {
        const gap = item.x - lastEnd;
        const charWidth = (item.height || 10) * 0.5;
        line += gap > charWidth * 1.5 ? '  ' : gap > charWidth * 0.15 ? ' ' : '';
      }
      line += text;
      lastEnd = item.x + (item.width || text.length * (item.height || 10) * 0.5);
    });
    return line;
  });
};
