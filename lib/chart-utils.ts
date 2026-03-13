/**
 * Chart Configuration Utilities for Dashboard Analytics
 * 
 * Provides shared utilities for chart components including:
 * - Color palette constants
 * - Currency formatting
 * - Date formatting
 * - Tooltip formatters
 * 
 * Requirements: 10.5, 11.1
 */

import dayjs from 'dayjs';
import 'dayjs/locale/id';

// ============================================================================
// Color Palette Constants
// ============================================================================

/**
 * Chart color palette following design system
 * Requirement: 10.5
 * 
 * All colors meet WCAG AA contrast ratio (4.5:1) when used on white backgrounds
 * or with white text on colored backgrounds.
 */
export const CHART_COLORS = {
  // Primary colors
  indigo: '#4F46E5',      // Primary brand color (6.29:1 on white)
  indigoDark: '#3730A3',  // Darker shade for hover/active
  indigoLight: '#818CF8', // Lighter shade for backgrounds
  
  // Success colors
  green: '#047857',       // Success/positive indicators (5.37:1 on white) - WCAG AA compliant
  greenDark: '#065F46',   // Darker shade (6.78:1 on white)
  greenLight: '#6EE7B7',  // Lighter shade for backgrounds
  
  // Warning colors
  orange: '#B45309',      // Warning/attention needed (5.89:1 on white) - WCAG AA compliant
  orangeDark: '#92400E',  // Darker shade (7.48:1 on white)
  orangeLight: '#FCD34D', // Lighter shade for backgrounds
  
  // Danger colors
  red: '#DC2626',         // Danger/critical/negative (4.83:1 on white) - WCAG AA compliant
  redDark: '#B91C1C',     // Darker shade for bad debt (5.94:1 on white)
  redLight: '#FCA5A5',    // Lighter shade for backgrounds
  
  // Neutral colors
  gray: '#6B7280',        // Neutral/secondary (4.83:1 on white)
  grayLight: '#D1D5DB',   // Light gray for borders
  grayDark: '#374151',    // Dark gray for text
  
  // Background colors
  bgLight: '#F9FAFB',     // Light background
  bgWhite: '#FFFFFF',     // White background
} as const;

/**
 * Chart color arrays for multi-series charts
 */
export const CHART_COLOR_ARRAYS = {
  primary: [CHART_COLORS.indigo, CHART_COLORS.indigoLight, CHART_COLORS.indigoDark],
  success: [CHART_COLORS.green, CHART_COLORS.greenLight, CHART_COLORS.greenDark],
  warning: [CHART_COLORS.orange, CHART_COLORS.orangeLight, CHART_COLORS.orangeDark],
  danger: [CHART_COLORS.red, CHART_COLORS.redLight, CHART_COLORS.redDark],
  mixed: [CHART_COLORS.indigo, CHART_COLORS.green, CHART_COLORS.orange, CHART_COLORS.red],
} as const;

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format currency for Indonesian Rupiah
 * Consistent format: "Rp 1.000.000,00"
 * 
 * @param amount - Numeric amount to format
 * @returns Formatted currency string
 * 
 * Requirement: 11.1
 */
export function formatChartCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);
  
  return `Rp ${formatted}`;
}

/**
 * Format currency for chart display (shorter format for space constraints)
 * Uses K for thousands, M for millions, B for billions
 * 
 * @param amount - Numeric amount to format
 * @returns Shortened currency string
 * 
 * Example: 1500000 -> "Rp 1,5M"
 */
export function formatChartCurrencyShort(amount: number): string {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 1_000_000_000) {
    return `Rp ${(absAmount / 1_000_000_000).toFixed(1)}B`;
  } else if (absAmount >= 1_000_000) {
    return `Rp ${(absAmount / 1_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    return `Rp ${(absAmount / 1_000).toFixed(1)}K`;
  }
  
  return formatChartCurrency(absAmount);
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format month-year for chart labels
 * Format: "Jan 2024"
 * 
 * @param monthString - Month string in YYYY-MM format
 * @returns Formatted month-year string
 * 
 * Requirement: 11.1
 */
export function formatMonthYear(monthString: string): string {
  return dayjs(monthString).locale('id').format('MMM YYYY');
}

/**
 * Format date for chart tooltips
 * Format: "15 Januari 2024"
 * 
 * @param dateString - Date string or Date object
 * @returns Formatted date string
 */
export function formatChartDate(dateString: string | Date): string {
  return dayjs(dateString).locale('id').format('DD MMMM YYYY');
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format number with Indonesian locale
 * 
 * @param value - Numeric value to format
 * @returns Formatted number string
 */
export function formatChartNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

/**
 * Format percentage
 * 
 * @param value - Percentage value (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============================================================================
// Tooltip Formatters
// ============================================================================

/**
 * Custom tooltip formatter for currency charts
 * 
 * @param value - Tooltip value
 * @param name - Data series name
 * @returns Formatted tooltip content
 * 
 * Requirement: 10.6
 */
export function currencyTooltipFormatter(value: number, name: string): [string, string] {
  return [formatChartCurrency(value), name];
}

/**
 * Custom tooltip formatter for percentage charts
 * 
 * @param value - Tooltip value
 * @param name - Data series name
 * @returns Formatted tooltip content
 */
export function percentageTooltipFormatter(value: number, name: string): [string, string] {
  return [formatPercentage(value), name];
}

/**
 * Custom tooltip formatter for number charts
 * 
 * @param value - Tooltip value
 * @param name - Data series name
 * @returns Formatted tooltip content
 */
export function numberTooltipFormatter(value: number, name: string): [string, string] {
  return [formatChartNumber(value), name];
}

// ============================================================================
// Chart Configuration Helpers
// ============================================================================

/**
 * Get responsive chart height based on viewport
 * 
 * @param isMobile - Whether viewport is mobile
 * @returns Chart height in pixels
 */
export function getResponsiveChartHeight(isMobile: boolean): number {
  return isMobile ? 250 : 300;
}

/**
 * Get chart margin configuration
 * 
 * @returns Margin object for Recharts
 */
export function getChartMargin() {
  return { top: 5, right: 30, left: 20, bottom: 5 };
}

/**
 * Truncate long labels for chart display
 * 
 * @param label - Label text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated label
 */
export function truncateLabel(label: string, maxLength: number = 20): string {
  if (label.length <= maxLength) return label;
  return `${label.substring(0, maxLength)}...`;
}
