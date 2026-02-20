import { useMemo } from 'react';

interface InvoiceItem {
  qty: number;
  rate: number;
  amount: number;
}

interface TaxRow {
  charge_type: string;
  account_head: string;
  description: string;
  rate: number;
}

interface DiscountInput {
  percentage: number;
  amount: number;
}

interface InvoiceCalculation {
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  net_total: number;
  total_taxes: number;
  grand_total: number;
  tax_breakdown: {
    description: string;
    rate: number;
    tax_amount: number;
    total: number;
  }[];
}

/**
 * Custom hook for real-time invoice calculation
 * Implements Algorithm 6 from design document
 */
export function useInvoiceCalculation(
  items: InvoiceItem[],
  discount: DiscountInput,
  taxes: TaxRow[]
): InvoiceCalculation {
  return useMemo(() => {
    // 1. Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.qty * item.rate);
    }, 0);

    // 2. Calculate discount
    let finalDiscountAmount = 0;
    let finalDiscountPercentage = 0;

    if (discount.amount > 0) {
      // Use discount amount as primary
      finalDiscountAmount = discount.amount;
      finalDiscountPercentage = subtotal > 0 ? (discount.amount / subtotal) * 100 : 0;
    } else if (discount.percentage > 0) {
      // Use discount percentage
      finalDiscountAmount = (discount.percentage / 100) * subtotal;
      finalDiscountPercentage = discount.percentage;
    }

    // 3. Calculate net total
    const netTotal = subtotal - finalDiscountAmount;

    // 4. Calculate taxes
    let totalTaxes = 0;
    const taxBreakdown: {
      description: string;
      rate: number;
      tax_amount: number;
      total: number;
    }[] = [];

    if (taxes && taxes.length > 0) {
      let runningTotal = netTotal;

      for (const taxRow of taxes) {
        const rate = taxRow.rate || 0;
        let taxAmount = 0;

        if (taxRow.charge_type === 'On Net Total') {
          taxAmount = (rate / 100) * netTotal;
        } else if (taxRow.charge_type === 'On Previous Row Total') {
          taxAmount = (rate / 100) * runningTotal;
        } else if (taxRow.charge_type === 'Actual') {
          // For actual type, tax amount should be provided separately
          taxAmount = 0;
        }

        runningTotal += taxAmount;
        totalTaxes += taxAmount;

        taxBreakdown.push({
          description: taxRow.description,
          rate: rate,
          tax_amount: Math.round(taxAmount * 100) / 100,
          total: Math.round(runningTotal * 100) / 100,
        });
      }
    }

    // 5. Calculate grand total
    const grandTotal = netTotal + totalTaxes;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount_amount: Math.round(finalDiscountAmount * 100) / 100,
      discount_percentage: Math.round(finalDiscountPercentage * 100) / 100,
      net_total: Math.round(netTotal * 100) / 100,
      total_taxes: Math.round(totalTaxes * 100) / 100,
      grand_total: Math.round(grandTotal * 100) / 100,
      tax_breakdown: taxBreakdown,
    };
  }, [items, discount, taxes]);
}
