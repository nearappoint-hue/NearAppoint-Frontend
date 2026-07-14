import { describe, it, expect } from 'vitest';
import { normalizeCurrency, formatPKR, CURRENCY } from '../money';

/**
 * These tests exist because this exact bug shipped in Muddarris.
 * They are not ceremony.
 */
describe('currency', () => {
  it('is PKR, and only PKR', () => {
    expect(CURRENCY).toBe('PKR');
  });

  it('normalises every casing to ONE value — THE MUDDARRIS BUG', () => {
    const forms = ['PKR', 'pkr', 'Pkr', 'pKr', ' PKR ', 'pKR '];
    const out = new Set(forms.map(normalizeCurrency));
    // If this is ever 2, money starts silently disappearing across modules.
    expect(out.size).toBe(1);
    expect([...out][0]).toBe('PKR');
  });

  it('REJECTS USD — we are PKR-only until we deliberately are not', () => {
    expect(() => normalizeCurrency('USD')).toThrow();
    expect(() => normalizeCurrency('usd')).toThrow();
  });

  it('rejects anything unsupported rather than passing it through', () => {
    expect(() => normalizeCurrency('EUR')).toThrow();
    expect(() => normalizeCurrency('')).toThrow();
    expect(() => normalizeCurrency('PK')).toThrow();
  });
});

describe('formatPKR', () => {
  it('has no decimals — nobody prices a haircut at Rs 1,500.50', () => {
    expect(formatPKR(1500)).not.toContain('.');
  });

  it('formats plan prices correctly', () => {
    expect(formatPKR(2999)).toContain('2,999');
    expect(formatPKR(5999)).toContain('5,999');
  });
});
