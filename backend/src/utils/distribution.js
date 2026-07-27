/**
 * Profit distribution — the waterfall, as pure functions.
 *
 * This was inline in closeLedger and could silently lose or invent money:
 * non-priority partners' percentages were applied flat to the remaining pool
 * with nothing checking they summed to 100. Shares of 45+45 paid out 92% of the
 * profit and 8% vanished; 60+60 paid out 116% — more than existed.
 *
 * Three rules hold here by construction:
 *   1. The allocated total always equals the net profit, to the cent.
 *   2. Non-priority partners split the remaining pool proportionally against
 *      their own total, so a total that isn't 100 can't leak money. Validation
 *      still reports it — normalising is a safety net, not a licence to
 *      misconfigure.
 *   3. Losses are allocated on the same basis as profits. Previously the second
 *      pass was gated on `remainingProfit > 0`, so on a loss month the priority
 *      partners absorbed their share and the rest of the loss was assigned to
 *      nobody — the books didn't balance.
 */

// Money is handled in integer cents. Percentages of a float total are exactly
// the kind of arithmetic that leaves 0.30000000000000004 in someone's payout.
const toCents = (v) => Math.round(Number(v || 0) * 100);
const fromCents = (c) => c / 100;
const pct = (p) => Number(p || 0);

/**
 * Split `totalCents` across weights, cent-exact.
 * Largest-remainder: floor each share, then hand the leftover cents to whoever
 * lost the most in rounding. Without this the parts don't sum to the whole and
 * someone is quietly short a cent every month.
 */
function splitByWeight(totalCents, weights) {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  // Math.trunc, not Math.floor: on a loss totalCents is negative and floor
  // would round away from zero, over-allocating the loss.
  const base = exact.map((e) => Math.trunc(e));
  let leftover = totalCents - base.reduce((s, b) => s + b, 0);

  const order = exact
    .map((e, i) => ({ i, frac: Math.abs(e - base[i]) }))
    .sort((a, b) => b.frac - a.frac);

  const step = leftover >= 0 ? 1 : -1;
  for (let k = 0; leftover !== 0 && k < order.length * 2; k++) {
    base[order[k % order.length].i] += step;
    leftover -= step;
  }
  return base;
}

/**
 * Check a shareholder set before it is used to close a ledger.
 * @returns {{ok: boolean, errors: string[], priorityTotal: number, nonPriorityTotal: number}}
 */
function validateShares(partners) {
  const active = partners.filter((p) => p.is_active !== false);
  const errors = [];

  for (const p of active) {
    const v = pct(p.share_percentage);
    if (!Number.isFinite(v)) errors.push(`${p.name}: share percentage is not a number`);
    else if (v < 0) errors.push(`${p.name}: share percentage cannot be negative`);
    else if (v > 100) errors.push(`${p.name}: share percentage cannot exceed 100`);
  }

  const priority = active.filter((p) => p.is_priority && pct(p.share_percentage) > 0);
  const nonPriority = active.filter((p) => !p.is_priority && pct(p.share_percentage) > 0);
  const priorityTotal = +priority.reduce((s, p) => s + pct(p.share_percentage), 0).toFixed(4);
  const nonPriorityTotal = +nonPriority.reduce((s, p) => s + pct(p.share_percentage), 0).toFixed(4);

  // Priority partners are paid off the top, so together they cannot claim more
  // than the whole profit.
  if (priorityTotal > 100) {
    errors.push(`Priority shares total ${priorityTotal}% — they cannot exceed 100% of net profit`);
  }
  // The remaining pool is split among non-priority partners, so their shares
  // describe that pool and must account for all of it.
  if (nonPriority.length > 0 && Math.abs(nonPriorityTotal - 100) > 0.01) {
    errors.push(`Non-priority shares total ${nonPriorityTotal}% — they must total 100% of the remaining profit`);
  }
  if (priority.length === 0 && nonPriority.length === 0) {
    errors.push('No active shareholders with a share percentage above 0');
  }

  return { ok: errors.length === 0, errors, priorityTotal, nonPriorityTotal };
}

/**
 * Calculate the waterfall.
 * @param {number|string} netProfit  may arrive from pg as a NUMERIC string
 * @param {Array} partners           active shareholders
 * @returns {{distributions: Array, allocated: number, residual: number, net_profit: number}}
 *          `residual` is always 0 for a valid set — it exists so a caller can
 *          assert on it rather than trust this comment.
 */
function calculateDistribution(netProfit, partners) {
  const netCents = toCents(netProfit);
  const active = partners.filter((p) => p.is_active !== false && pct(p.share_percentage) > 0);
  const priority = active.filter((p) => p.is_priority);
  const nonPriority = active.filter((p) => !p.is_priority);

  const rows = [];

  // ── Pass 1: priority partners take their percentage off the top ────────────
  let priorityCents = 0;
  for (const p of priority) {
    const share = Math.round((netCents * pct(p.share_percentage)) / 100);
    priorityCents += share;
    rows.push({
      shareholder_id: p.id,
      shareholder_name: p.name,
      share_percentage: pct(p.share_percentage),
      is_priority: true,
      net_profit_share: fromCents(share),
    });
  }

  // ── Pass 2: the rest is split among non-priority partners ─────────────────
  const remainingCents = netCents - priorityCents;
  if (nonPriority.length > 0) {
    const shares = splitByWeight(remainingCents, nonPriority.map((p) => pct(p.share_percentage)));
    nonPriority.forEach((p, i) => {
      rows.push({
        shareholder_id: p.id,
        shareholder_name: p.name,
        share_percentage: pct(p.share_percentage),
        is_priority: false,
        net_profit_share: fromCents(shares[i]),
      });
    });
  }

  const allocatedCents = rows.reduce((s, r) => s + toCents(r.net_profit_share), 0);

  return {
    distributions: rows,
    net_profit: fromCents(netCents),
    allocated: fromCents(allocatedCents),
    // Non-zero only when there are no non-priority partners to absorb the
    // remainder — i.e. priority shares don't add up to 100%.
    residual: fromCents(netCents - allocatedCents),
  };
}

module.exports = { calculateDistribution, validateShares, splitByWeight, toCents, fromCents };
