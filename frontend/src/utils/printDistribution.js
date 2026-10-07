/**
 * printDistribution — renders a clean, professional profit-distribution
 * statement and opens the browser print dialog (the user can "Save as PDF").
 *
 * Dependency-free: writes styled HTML into a hidden iframe and calls print(),
 * which avoids popup blockers and doesn't disturb the current page.
 *
 * @param {object}   opts
 * @param {string}   opts.title          Heading (e.g. "Profit Distribution Statement")
 * @param {string}   opts.periodLabel    Period name (e.g. "March 2026")
 * @param {string}   [opts.currencySymbol='$']
 * @param {object}   [opts.summary]      Optional { income, expense, net }
 * @param {Array}    opts.rows           [{ name, percentage, amount }]
 * @param {string}   [opts.generatedBy]  Optional name shown in the footer
 */
export function printDistribution({
  title = 'Profit Distribution Statement',
  periodLabel = '',
  currencySymbol = '$',
  summary = null,
  rows = [],
  generatedBy = '',
}) {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (n) =>
    `${currencySymbol}${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const total = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const now = new Date();
  const generatedAt = now.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const summaryHtml = summary
    ? `
      <div class="summary">
        <div class="sum-item">
          <span class="sum-label">Total Income</span>
          <span class="sum-val income">${money(summary.income)}</span>
        </div>
        <div class="sum-item">
          <span class="sum-label">Total Expense</span>
          <span class="sum-val expense">${money(summary.expense)}</span>
        </div>
        <div class="sum-item net">
          <span class="sum-label">Net Profit</span>
          <span class="sum-val">${money(summary.net)}</span>
        </div>
      </div>`
    : '';

  const rowsHtml = rows.length
    ? rows
        .map(
          (r, i) => `
        <tr>
          <td class="c-idx">${i + 1}</td>
          <td class="c-name">${esc(r.name)}</td>
          <td class="c-pct">${parseFloat(r.percentage || 0).toFixed(2)}%</td>
          <td class="c-amt">${money(r.amount)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="empty">No shareholder payouts recorded.</td></tr>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)} — ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a; font-size: 13px; line-height: 1.5;
    padding: 32px 36px;
  }
  .doc { max-width: 720px; margin: 0 auto; }

  .head {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 20px;
  }
  .brand h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
  .brand p { margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .period { text-align: right; }
  .period .lbl { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .period .val { font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 2px; }

  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .sum-item {
    flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px;
    background: #f8fafc;
  }
  .sum-item.net { background: #eef2ff; border-color: #c7d2fe; }
  .sum-label { display: block; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .sum-val { display: block; font-size: 17px; font-weight: 800; margin-top: 4px; color: #1e293b; }
  .sum-val.income { color: #059669; }
  .sum-val.expense { color: #e11d48; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead th {
    text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em;
    color: #64748b; font-weight: 700; padding: 10px 12px; border-bottom: 2px solid #e2e8f0;
  }
  tbody td { padding: 11px 12px; border-bottom: 1px solid #f1f5f9; }
  .c-idx { color: #94a3b8; width: 36px; font-variant-numeric: tabular-nums; }
  .c-name { font-weight: 700; }
  .c-pct, th.t-pct { text-align: right; color: #475569; font-variant-numeric: tabular-nums; }
  .c-amt, th.t-amt { text-align: right; font-weight: 800; color: #059669; font-variant-numeric: tabular-nums; }
  .empty { text-align: center; color: #94a3b8; padding: 28px; font-style: italic; }
  tfoot td {
    padding: 14px 12px; border-top: 2px solid #c7d2fe;
    font-weight: 800; background: #eef2ff;
  }
  tfoot .t-label { text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; color: #3730a3; }
  tfoot .t-amt { text-align: right; font-size: 16px; color: #4338ca; }

  .foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }

  @media print {
    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc { max-width: none; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div class="brand">
        <div class="logo">%</div>
        <div>
          <h1>Profit Distribution</h1>
          <p>${esc(title)}</p>
        </div>
      </div>
      <div class="period">
        <div class="lbl">Period</div>
        <div class="val">${esc(periodLabel || '—')}</div>
      </div>
    </div>

    ${summaryHtml}

    <table>
      <thead>
        <tr>
          <th class="t-idx">#</th>
          <th>Shareholder</th>
          <th class="t-pct">Share %</th>
          <th class="t-amt">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="t-label">Total Distributed</td>
          <td class="t-amt">${money(total)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="foot">
      <span>Generated ${esc(generatedAt)}${generatedBy ? ' · by ' + esc(generatedBy) : ''}</span>
      <span>${rows.length} payout${rows.length !== 1 ? 's' : ''}</span>
    </div>
  </div>
</body>
</html>`;

  // Render into a hidden iframe (avoids popup blockers) and print.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => { setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 500); };

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      /* ignore */
    }
    // Remove after the print dialog interaction.
    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
    }
    setTimeout(cleanup, 60000); // safety net
  };
}
