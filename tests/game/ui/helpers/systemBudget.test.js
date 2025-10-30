import {
  DEFAULT_SYSTEM_BUDGET_MS,
  formatDebugSystemBudget,
  resolveDebugSystemBudget,
} from '../../../../src/game/ui/helpers/systemBudget.js';

describe('systemBudget helpers', () => {
  describe('resolveDebugSystemBudget', () => {
    it('returns fallback when value is invalid', () => {
      expect(resolveDebugSystemBudget('not-a-number', 7)).toBe(7);
      expect(resolveDebugSystemBudget(undefined)).toBe(DEFAULT_SYSTEM_BUDGET_MS);
    });

    it('clamps the value between configured bounds', () => {
      expect(resolveDebugSystemBudget(-5)).toBeCloseTo(0.5);
      expect(resolveDebugSystemBudget(0.1)).toBeCloseTo(0.5);
      expect(resolveDebugSystemBudget(200)).toBeCloseTo(50);
    });

    it('passes through valid numeric values', () => {
      expect(resolveDebugSystemBudget('6.5')).toBeCloseTo(6.5);
      expect(resolveDebugSystemBudget(12)).toBe(12);
    });
  });

  describe('formatDebugSystemBudget', () => {
    it('formats integer values without decimals', () => {
      expect(formatDebugSystemBudget(4)).toBe('4');
    });

    it('formats fractional values with trimmed trailing zeros', () => {
      expect(formatDebugSystemBudget(5.75)).toBe('5.75');
      expect(formatDebugSystemBudget('8.500')).toBe('8.5');
    });

    it('normalises invalid values before formatting', () => {
      expect(formatDebugSystemBudget('')).toBe('4');
      expect(formatDebugSystemBudget('0')).toBe('0.5');
    });
  });
});
