import { describe, it, expect } from 'vitest';
import { compareWithTolerance, validateBenchmarkResult } from './tolerance.js';

describe('Tolerance Logic', () => {
  it('compares exact numbers correctly', () => {
    const res = compareWithTolerance(5, 5);
    expect(res.passed).toBe(true);
  });

  it('compares numbers within default tolerance correctly', () => {
    const res = compareWithTolerance(5.0000001, 5);
    expect(res.passed).toBe(true);
  });

  it('fails numbers outside tolerance', () => {
    const res = compareWithTolerance(5.1, 5, 0.05);
    expect(res.passed).toBe(false);
    expect(res.delta).toBeCloseTo(0.1);
  });

  it('compares arrays correctly', () => {
    const res = compareWithTolerance([1, 2, 3.001], [1, 2, 3], 0.01);
    expect(res.passed).toBe(true);
  });

  it('fails arrays with different lengths', () => {
    const res = compareWithTolerance([1, 2], [1, 2, 3]);
    expect(res.passed).toBe(false);
  });

  it('compares objects deeply', () => {
    const actual = { a: 1, b: { c: 2.05 } };
    const expected = { a: 1, b: { c: 2.0 } };
    const res = compareWithTolerance(actual, expected, 0.1);
    expect(res.passed).toBe(true);
  });

  it('fails objects with missing keys in actual', () => {
    const actual = { a: 1 };
    const expected = { a: 1, b: 2 };
    const res = compareWithTolerance(actual, expected);
    expect(res.passed).toBe(false);
  });

  it('validates benchmark result - pending', () => {
    const fixture = { sourceStatus: 'PENDING_NUMERIC_EXTRACTION' };
    const res = validateBenchmarkResult(fixture, { some: 'value' });
    expect(res.status).toBe('PENDING');
  });

  it('validates benchmark result - passed', () => {
    const fixture = {
      sourceStatus: 'VERIFIED',
      expected: { val: 10 },
      tolerance: 0.1
    };
    const res = validateBenchmarkResult(fixture, { val: 10.05 });
    expect(res.status).toBe('PASSED');
  });

  it('validates benchmark result - failed', () => {
    const fixture = {
      sourceStatus: 'VERIFIED',
      expected: { val: 10 },
      tolerance: 0.01
    };
    const res = validateBenchmarkResult(fixture, { val: 10.05 });
    expect(res.status).toBe('FAILED');
  });
});
