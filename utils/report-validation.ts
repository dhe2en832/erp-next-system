/**
 * Date validation utility for financial reports
 * Validates date ranges and formats for report queries
 */

export interface DateValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates date range for financial reports
 * @param fromDate - Start date in YYYY-MM-DD format (nullable)
 * @param toDate - End date in YYYY-MM-DD format (nullable)
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  fromDate: string | null,
  toDate: string | null
): DateValidationResult {
  // If both dates are null or undefined, validation passes
  if (!fromDate || !toDate) {
    return { valid: true };
  }

  // Validate from_date format
  const from = new Date(fromDate);
  if (isNaN(from.getTime())) {
    return {
      valid: false,
      error: 'Invalid from_date format. Use YYYY-MM-DD.',
    };
  }

  // Validate to_date format
  const to = new Date(toDate);
  if (isNaN(to.getTime())) {
    return {
      valid: false,
      error: 'Invalid to_date format. Use YYYY-MM-DD.',
    };
  }

  // Validate date range logic
  if (from > to) {
    return {
      valid: false,
      error: 'from_date must be less than or equal to to_date',
    };
  }

  return { valid: true };
}
