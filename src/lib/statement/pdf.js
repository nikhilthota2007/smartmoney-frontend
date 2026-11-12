/**
 * Read a PDF's text layer in the browser with pdf.js.
 *
 * pdf.js is imported on demand, so it only loads when someone picks a PDF. Its
 * worker is served untouched from public/ (scripts/copy-pdf-worker.js puts it
 * there before start and build); letting the bundler process it breaks it.
 * Nothing here leaves the device.
 */
import { itemsToLines } from './pdfLines';

export class StatementReadError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StatementReadError';
    this.code = code;
  }
}

/** Most statements are 2-8 pages; anything far longer is probably not one. */
const MAX_PAGES = 40;

export const readPdfLines = async (file) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;

  let doc;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  } catch (error) {
    if (error && error.name === 'PasswordException') {
      throw new StatementReadError('password', 'This PDF is password-protected. Download an unlocked copy from your bank and try again.');
    }
    throw new StatementReadError('unreadable', "That file couldn't be opened as a PDF.");
  }

  const lines = [];
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PAGES); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height || Math.abs(item.transform[3]),
      }));
      lines.push(...itemsToLines(items));
    }
  } finally {
    doc.destroy();
  }

  if (lines.join('').trim().length < 40) {
    throw new StatementReadError(
      'scanned',
      "This PDF is a scan, so there's no text in it to read. The PDF from your bank's website, or a CSV export, will work."
    );
  }
  return lines;
};
