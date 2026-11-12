// Copies pdf.js's worker into public/ so it is served exactly as published.
// Letting the bundler process it injects imports that break it in the browser.
// Runs before `npm start` and `npm run build` (see package.json).
const fs = require('fs');
const path = require('path');

const source = require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
const target = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs');
fs.copyFileSync(source, target);
console.log(`pdf.js worker copied to ${path.relative(process.cwd(), target)}`);
