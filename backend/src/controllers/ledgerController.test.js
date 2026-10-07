// The amount rule. "abc" used to pass ("abc" <= 0 is false), be stored as NaN, and turn the
// month's totals and profit split into NaN.
jest.mock('../config/database', () => ({}));
const { readAmount } = require('./ledgerController');

test('a real positive amount is kept, rounded to cents', () => {
  expect(readAmount('12.345')).toEqual({ value: 12.35 });
  expect(readAmount(100)).toEqual({ value: 100 });
  expect(readAmount(' 7.1 ')).toEqual({ value: 7.1 });
});

test('anything that is not a real positive amount is refused', () => {
  for (const bad of ['abc', 'NaN', '', '   ', null, undefined, '1e999', Infinity, NaN]) {
    expect(readAmount(bad).error).toMatch(/number/);
  }
  expect(readAmount(0).error).toMatch(/positive/);
  expect(readAmount(-5).error).toMatch(/positive/);
  expect(readAmount(10000000000).error).toMatch(/too large/);
});
