/**
 * The distribution is the product. If it is wrong, partners are paid the wrong
 * amount and nothing in the app will say so — which is exactly what was
 * happening before these tests existed.
 */
const { calculateDistribution, validateShares, splitByWeight } = require('./distribution');

const P = (name, share_percentage, is_priority = false, id = name) =>
  ({ id, name, share_percentage, is_priority, is_active: true });

const sum = (d) => +d.distributions.reduce((s, r) => s + r.net_profit_share, 0).toFixed(2);
const paid = (d, name) => d.distributions.find((r) => r.shareholder_name === name)?.net_profit_share;

describe('the allocated total always equals the net profit', () => {
  // This is the property that was broken: money could vanish or be invented.
  test('a straightforward split balances to the cent', () => {
    const d = calculateDistribution(100000, [P('Alice', 20, true), P('Bob', 50), P('Cara', 50)]);
    expect(paid(d, 'Alice')).toBe(20000);
    expect(paid(d, 'Bob')).toBe(40000);
    expect(paid(d, 'Cara')).toBe(40000);
    expect(sum(d)).toBe(100000);
    expect(d.residual).toBe(0);
  });

  test('non-priority shares under 100 no longer leak money', () => {
    // Was: 45+45 paid 92,000 of 100,000 and 8,000 vanished.
    const d = calculateDistribution(100000, [P('Alice', 20, true), P('Bob', 45), P('Cara', 45)]);
    expect(sum(d)).toBe(100000);
    expect(paid(d, 'Bob')).toBe(40000);
    expect(paid(d, 'Cara')).toBe(40000);
  });

  test('non-priority shares over 100 no longer invent money', () => {
    // Was: 60+60 paid 116,000 of a 100,000 profit.
    const d = calculateDistribution(100000, [P('Alice', 20, true), P('Bob', 60), P('Cara', 60)]);
    expect(sum(d)).toBe(100000);
    expect(paid(d, 'Bob')).toBe(40000);
  });

  test('an uneven split still sums exactly — no lost cent', () => {
    // 100/3 cannot divide evenly; the parts must still make the whole.
    const d = calculateDistribution(100, [P('A', 33.333), P('B', 33.333), P('C', 33.334)]);
    expect(sum(d)).toBe(100);
  });

  test('a stress sweep of awkward amounts always balances', () => {
    for (const amount of [0.01, 0.05, 1, 7.77, 999.99, 1000.01, 1247748.33, 88888.88]) {
      const d = calculateDistribution(amount, [P('A', 20, true), P('B', 30), P('C', 30), P('D', 40)]);
      expect(sum(d)).toBeCloseTo(Number(amount), 2);
    }
  });
});

describe('losses', () => {
  test('a loss is fully allocated, not left hanging', () => {
    // Was: priority took -10,000 of a -50,000 month and -40,000 went nowhere.
    const d = calculateDistribution(-50000, [P('Alice', 20, true), P('Bob', 50), P('Cara', 50)]);
    expect(paid(d, 'Alice')).toBe(-10000);
    expect(paid(d, 'Bob')).toBe(-20000);
    expect(paid(d, 'Cara')).toBe(-20000);
    expect(sum(d)).toBe(-50000);
    expect(d.residual).toBe(0);
  });

  test('a loss that divides unevenly still balances', () => {
    const d = calculateDistribution(-100, [P('A', 33.333), P('B', 33.333), P('C', 33.334)]);
    expect(sum(d)).toBe(-100);
  });
});

describe('edge cases that must not produce nonsense', () => {
  test('a zero-profit month pays everyone nothing', () => {
    const d = calculateDistribution(0, [P('Alice', 20, true), P('Bob', 100)]);
    expect(sum(d)).toBe(0);
    expect(d.distributions).toHaveLength(2);
  });

  test('pg NUMERIC strings are coerced, not concatenated', () => {
    const d = calculateDistribution('100000.00', [P('Alice', '20', true), P('Bob', '100')]);
    expect(paid(d, 'Alice')).toBe(20000);
    expect(paid(d, 'Bob')).toBe(80000);
  });

  test('priority partners alone taking 100% leaves nothing residual', () => {
    const d = calculateDistribution(50000, [P('Alice', 60, true), P('Ben', 40, true)]);
    expect(sum(d)).toBe(50000);
    expect(d.residual).toBe(0);
  });

  test('priority under 100 with nobody to absorb the rest reports a residual', () => {
    // Not silently swallowed — the caller can refuse to close on this.
    const d = calculateDistribution(50000, [P('Alice', 60, true)]);
    expect(paid(d, 'Alice')).toBe(30000);
    expect(d.residual).toBe(20000);
  });

  test('inactive shareholders are excluded', () => {
    const gone = { ...P('Gone', 50), is_active: false };
    const d = calculateDistribution(1000, [P('Bob', 100), gone]);
    expect(d.distributions).toHaveLength(1);
    expect(paid(d, 'Bob')).toBe(1000);
  });

  test('a zero-percentage shareholder is not given a row', () => {
    const d = calculateDistribution(1000, [P('Bob', 100), P('Zero', 0)]);
    expect(d.distributions.map((r) => r.shareholder_name)).toEqual(['Bob']);
  });
});

describe('validation catches misconfiguration before a ledger closes', () => {
  test('accepts a well-formed set', () => {
    expect(validateShares([P('Alice', 20, true), P('Bob', 50), P('Cara', 50)]).ok).toBe(true);
  });

  test('rejects non-priority shares that do not total 100', () => {
    const v = validateShares([P('Alice', 20, true), P('Bob', 45), P('Cara', 45)]);
    expect(v.ok).toBe(false);
    expect(v.nonPriorityTotal).toBe(90);
    expect(v.errors.join(' ')).toMatch(/must total 100/);
  });

  test('rejects priority shares totalling more than the whole profit', () => {
    const v = validateShares([P('A', 60, true), P('B', 60, true), P('C', 100)]);
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/cannot exceed 100/);
  });

  test('rejects out-of-range and non-numeric percentages', () => {
    expect(validateShares([P('A', -5), P('B', 105)]).ok).toBe(false);
    expect(validateShares([P('A', 'abc')]).ok).toBe(false);
  });

  test('rejects a set with nobody to pay', () => {
    const v = validateShares([P('A', 0), P('B', 0)]);
    expect(v.ok).toBe(false);
    expect(v.errors.join(' ')).toMatch(/No active shareholders/);
  });

  test('priority-only sets are allowed when they total 100', () => {
    expect(validateShares([P('A', 70, true), P('B', 30, true)]).ok).toBe(true);
  });

  test('floating-point totals within a cent are accepted', () => {
    // 33.33 * 3 = 99.99 — refusing that would be pedantry, not safety.
    expect(validateShares([P('A', 33.34), P('B', 33.33), P('C', 33.33)]).ok).toBe(true);
  });
});

describe('splitByWeight', () => {
  test('parts always sum to the whole', () => {
    for (const total of [100, 101, 9999, 1, -100, -7]) {
      const parts = splitByWeight(total, [1, 1, 1]);
      expect(parts.reduce((s, p) => s + p, 0)).toBe(total);
    }
  });

  test('zero weights split nothing rather than dividing by zero', () => {
    expect(splitByWeight(1000, [0, 0])).toEqual([0, 0]);
  });
});
