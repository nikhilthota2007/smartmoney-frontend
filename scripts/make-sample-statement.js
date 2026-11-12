// Builds a fictional statement PDF (run: node scripts/make-sample-statement.js; needs Playwright).
// Its pdf.js text is src/lib/statement/__fixtures__/northwind-statement.txt. Every name, address and number is invented.
const { chromium } = require('playwright');
const path = require('path');

const tx = [
  ['03/02', '03/03', 'SPOTIFY USA 877-778-1161 NY', '11.99'],
  ['03/03', '03/04', 'UBER   *EATS PENDING SAN FRANCISCO CA', '34.18'],
  ['03/04', '03/05', 'TRADER JOE S #552 AUSTIN TX', '86.42'],
  ['03/05', '03/06', 'STARBUCKS STORE 10392 AUSTIN TX', '6.45'],
  ['03/06', '03/06', 'NETFLIX.COM 866-579-7172 CA', '15.49'],
  ['03/07', '03/08', 'DOORDASH*CHIPOTLE 855-973-1040 CA', '27.30'],
  ['03/08', '03/09', 'SHELL OIL 57444 AUSTIN TX', '41.07'],
  ['03/09', '03/10', 'AMAZON MKTPL*2K4LQ8ZR0 AMZN.COM/BILL WA', '63.88'],
  ['03/10', '03/10', 'STARBUCKS STORE 10392 AUSTIN TX', '5.95'],
  ['03/11', '03/12', 'ZELLE TO MARIA GONZALEZ', '120.00'],
  ['03/12', '03/13', 'HEB #418 AUSTIN TX', '112.65'],
  ['03/13', '03/14', 'UBER   *EATS PENDING SAN FRANCISCO CA', '41.62'],
  ['03/14', '03/15', 'HULU 877-8244858 CA', '7.99'],
  ['03/15', '03/15', 'PAYMENT THANK YOU - WEB', '-250.00'],
  ['03/16', '03/17', 'TARGET 00023 AUSTIN TX', '54.21'],
  ['03/17', '03/18', 'STARBUCKS STORE 10392 AUSTIN TX', '6.45'],
  ['03/18', '03/19', 'DOORDASH*THAI KITCHEN 855-973-1040 CA', '31.84'],
  ['03/19', '03/20', 'PLANET FITNESS CLUB FEES 844-880-7180 NH', '24.99'],
  ['03/20', '03/21', 'SEPHORA.COM 877-737-4672 CA', '48.00'],
  ['03/21', '03/22', 'CHEVRON 0204512 AUSTIN TX', '38.66'],
  ['03/22', '03/23', 'LOCAL BREWS COFFEE AUSTIN TX', '4.75'],
  ['03/23', '03/24', 'AMAZON.COM*2Q91B0K32 AMZN.COM/BILL WA', '29.99'],
  ['03/24', '03/25', 'UBER   *TRIP HELP.UBER.COM CA', '18.40'],
  ['03/25', '03/26', 'STARBUCKS STORE 10392 AUSTIN TX', '6.45'],
  ['03/26', '03/27', 'TRADER JOE S #552 AUSTIN TX', '74.13'],
  ['03/27', '03/28', 'APPLE.COM/BILL 866-712-7753 CA', '2.99'],
  ['03/28', '03/29', 'DOORDASH*SWEETGREEN 855-973-1040 CA', '22.70'],
  ['03/29', '03/30', 'AMC THEATRES 4412 AUSTIN TX', '31.50'],
  ['03/30', '03/31', 'GRUBHUB*PIZZAPALACE GRUBHUB.COM IL', '26.15'],
  ['03/31', '03/31', 'LATE FEE', '29.00'],
  ['04/01', '04/01', 'PURCHASE INTEREST CHARGE', '93.41'],
];

const rows = tx.map(([t, p, d, a]) => `<tr><td>${t}</td><td>${p}</td><td>${d}</td><td class="r">${a.startsWith('-') ? '-$' + a.slice(1) : '$' + a}</td></tr>`).join('');

const html = `<!doctype html><html><head><style>
body{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#111;margin:36px}
h1{font-size:16px;margin:0 0 4px}.r{text-align:right}table{width:100%;border-collapse:collapse}
td,th{padding:3px 4px;border-bottom:1px solid #ddd;text-align:left}.box{border:1px solid #999;padding:8px;margin:10px 0}
.cols{display:flex;gap:30px}.small{font-size:8px;color:#555}
</style></head><body>
<h1>Northwind Bank Platinum Rewards Card</h1>
<div class="cols"><div>JORDAN A. RIVERA<br>4821 MAPLEWOOD DR APT 12<br>AUSTIN TX 78745-1234<br>jordan.rivera@example.com · (512) 555-0148</div>
<div>Account Number: 4147 2023 8811 5521<br>Statement Closing Date: 04/01/2026<br>Opening/Closing Date 03/02/2026 - 04/01/2026</div></div>
<div class="box"><b>Account Summary</b><br>
Previous Balance $3,812.44<br>Payment, Credits -$250.00<br>Purchases +$1,083.82<br>Fees Charged +$29.00<br>Interest Charged +$93.41<br>
<b>New Balance $4,768.67</b><br>Minimum Payment Due: $142.00<br>Payment Due Date: 04/26/2026<br>Credit Limit $6,000.00</div>
<div class="box"><b>Late Payment Warning:</b> If we do not receive your minimum payment by the date listed above, you may have to pay a late fee of up to $41.00.</div>
<b>Transactions</b>
<table><tr><th>Trans Date</th><th>Post Date</th><th>Description</th><th class="r">Amount</th></tr>${rows}</table>
<div class="box"><b>Interest Charge Calculation</b><br>
<table><tr><th>Type of Balance</th><th>Annual Percentage Rate (APR)</th><th>Balance Subject to Interest Rate</th><th>Interest Charge</th></tr>
<tr><td>Purchases</td><td>27.49%(v)</td><td>$4,124.57</td><td>$93.41</td></tr>
<tr><td>Cash Advances</td><td>29.99%(v)</td><td>$0.00</td><td>$0.00</td></tr></table></div>
<p class="small">Customer Service 1-800-555-0199. Send payments to PO Box 6294, Sioux Falls SD 57117. Jordan A. Rivera, thank you for being a cardmember since 2021.</p>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: path.join(process.cwd(), 'sample-statement.pdf'), format: 'Letter' });
  await browser.close();
  console.log('wrote sample-statement.pdf');
})();
