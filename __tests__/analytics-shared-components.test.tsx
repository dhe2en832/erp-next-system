/**
 * Unit Tests for Analytics Shared Components
 * 
 * Tests the shared utilities and components used across
 * all analytics charts.
 */

import { describe, it, expect } from 'vitest';
import {
  formatChartCurrency,
  formatChartCurrencyShort,
  formatMonthYear,
  formatChartDate,
  formatChartNumber,
  formatPercentage,
  truncateLabel,
  CHART_COLORS,
} from '../lib/chart-utils';

describe('Chart Utilities', () => {
  describe('formatChartCurrency', () => {
    it('should format currency in Indonesian Rupiah format', () => {
      expect(formatChartCurrency(1000000)).toBe('Rp 1.000.000,00');
      expect(formatChartCurrency(500)).toBe('Rp 500,00');
      expect(formatChartCurrency(1234567.89)).toBe('Rp 1.234.567,89');
    });

    it('should handle zero and negative values', () => {
      expect(formatChartCurrency(0)).toBe('Rp 0,00');
      expect(formatChartCurrency(-1000)).toBe('Rp 1.000,00'); // Uses absolute value
    });
  });

  describe('formatChartCurrencyShort', () => {
    it('should format large amounts with K/M/B suffixes', () => {
      expect(formatChartCurrencyShort(1500)).toBe('Rp 1,5K');
      expect(formatChartCurrencyShort(1500000)).toBe('Rp 1,5M');
      expect(formatChartCurrencyShort(1500000000)).toBe('Rp 1,5B');
    });

    it('should format small amounts normally', () => {
      expect(formatChartCurrencyShort(500)).toBe('Rp 500,00');
    });
  });

  describe('formatMonthYear', () => {
    it('should format month-year in Indonesian locale', () => {
      const result = formatMonthYear('2024-01');
      expect(result).toContain('2024');
      // Month name will be in Indonesian
    });
  });

  describe('formatChartDate', () => {
    it('should format date in Indonesian locale', () => {
      const result = formatChartDate('2024-01-15');
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });
  });

  describe('formatChartNumber', () => {
    it('should format numbers with Indonesian locale', () => {
      expect(formatChartNumber(1000)).toBe('1.000');
      expect(formatChartNumber(1234567)).toBe('1.234.567');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with one decimal place', () => {
      expect(formatPercentage(75.5)).toBe('75.5%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(33.333)).toBe('33.3%');
    });
  });

  describe('truncateLabel', () => {
    it('should truncate long labels', () => {
      expect(truncateLabel('This is a very long label', 10)).toBe('This is a ...');
    });

    it('should not truncate short labels', () => {
      expect(truncateLabel('Short', 10)).toBe('Short');
    });
  });

  describe('CHART_COLORS', () => {
    it('should have all required color constants', () => {
      expect(CHART_COLORS.indigo).toBeDefined();
      expect(CHART_COLORS.green).toBeDefined();
      expect(CHART_COLORS.orange).toBeDefined();
      expect(CHART_COLORS.red).toBeDefined();
      expect(CHART_COLORS.gray).toBeDefined();
    });

    it('should have valid hex color values', () => {
      expect(CHART_COLORS.indigo).toMatch(/^#[0-9A-F]{6}$/i);
      expect(CHART_COLORS.green).toMatch(/^#[0-9A-F]{6}$/i);
      expect(CHART_COLORS.red).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

describe('Analytics Components', () => {
  // Component tests would require React Testing Library
  // For now, we verify that imports work correctly
  it('should export all required components', async () => {
    const components = await import('../components/analytics');
    
    expect(components.ChartLoadingSkeleton).toBeDefined();
    expect(components.CardLoadingSkeleton).toBeDefined();
    expect(components.EmptyState).toBeDefined();
    expect(components.ErrorState).toBeDefined();
  });
});
