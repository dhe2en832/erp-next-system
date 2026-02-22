/**
 * Get default posting date from open accounting periods
 * Returns the start date of the latest open accounting period for the current company
 */
export async function getDefaultPostingDate(): Promise<string> {
  try {
    // Get selected company from localStorage
    const selectedCompany = localStorage.getItem('selected_company');
    if (!selectedCompany) {
      throw new Error('No company selected');
    }

    // Fetch open accounting periods for the company
    const response = await fetch(`/api/accounting-period/periods?company=${encodeURIComponent(selectedCompany)}&status=Open&limit=1`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounting periods: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      // Return the start date of the latest open period (they are ordered by start_date desc)
      return data.data[0].start_date;
    }

    // Fallback to today's date if no open periods found
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Error getting default posting date:', error);
    // Fallback to today's date
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get default due date based on posting date and payment terms
 */
export async function getDefaultDueDate(postingDate: string, salesOrderName?: string): Promise<string> {
  const defaultDays = 30;

  if (!salesOrderName) {
    return addDays(postingDate, defaultDays);
  }

  try {
    // Fetch SO to get payment terms
    const soRes = await fetch(`/api/sales/orders/${encodeURIComponent(salesOrderName)}`, { credentials: 'include' });
    const soData = await soRes.json();

    if (!soData.success || !soData.data?.payment_terms_template) {
      return addDays(postingDate, defaultDays);
    }

    // Fetch payment terms detail
    const ptRes = await fetch(`/api/setup/payment-terms/detail?name=${encodeURIComponent(soData.data.payment_terms_template)}`, { credentials: 'include' });
    const ptData = await ptRes.json();

    if (ptData.success && ptData.data?.terms && ptData.data.terms.length > 0) {
      const creditDays = ptData.data.terms[0].credit_days || defaultDays;
      return addDays(postingDate, creditDays);
    }
  } catch {
    // Ignore errors, use default
  }

  return addDays(postingDate, defaultDays);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
