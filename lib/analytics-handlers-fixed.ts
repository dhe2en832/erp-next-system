/**
 * Fixed Analytics Data Handlers
 * 
 * Alternative implementations that avoid permission errors
 */

import type { ERPNextClient } from './erpnext';
import type { ERPNextMultiClient } from './erpnext-multi';
import type { TopProduct } from '@/types/dashboard-analytics';

type ERPNextClientType = ERPNextClient | ERPNextMultiClient;

/**
 * Fetch top 10 products by sales amount - Fixed version that avoids permission errors
 * Requirement: 1.1, 1.2, 9.2
 */
export async function fetchTopProductsFixed(
  client: ERPNextClientType,
  company: string | null
): Promise<TopProduct[]> {
  try {
    console.log('[fetchTopProductsFixed] Starting with company:', company);
    
    // Alternative approach: Get Sales Invoices and fetch items individually to avoid permission error
    const invoiceFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      invoiceFilters.push(['company', '=', company]);
    }
    
    console.log('[fetchTopProductsFixed] Fetching invoices with filters:', JSON.stringify(invoiceFilters));
    
    const invoices = await client.getList<{
      name: string;
      posting_date: string;
      customer: string;
    }>('Sales Invoice', {
      filters: invoiceFilters,
      fields: ['name', 'posting_date', 'customer'],
      limit: 100, // Limit to avoid timeout
    });
    
    console.log('[fetchTopProductsFixed] Fetched invoices count:', invoices.length);
    
    if (invoices.length === 0) {
      console.log('[fetchTopProductsFixed] No submitted Sales Invoices found, returning empty array');
      return [];
    }
    
    // Get detailed invoice data one by one to access items
    const productMap = new Map<string, TopProduct>();
    let processedCount = 0;
    let errorCount = 0;
    
    // Process invoices in small batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      
      for (const invoice of batch) {
        try {
          const invoiceDetail = await client.get<{
            items?: Array<{
              item_code: string;
              item_name: string;
              qty: number;
              amount: number;
            }>;
          }>('Sales Invoice', invoice.name);
          
          processedCount++;
          
          if (invoiceDetail.items && invoiceDetail.items.length > 0) {
            for (const item of invoiceDetail.items) {
              if (item.amount > 0) { // Only include items with positive amount
                const existing = productMap.get(item.item_code);
                if (existing) {
                  existing.total_qty += item.qty || 0;
                  existing.total_amount += item.amount || 0;
                } else {
                  productMap.set(item.item_code, {
                    item_code: item.item_code,
                    item_name: item.item_name || item.item_code,
                    total_qty: item.qty || 0,
                    total_amount: item.amount || 0,
                  });
                }
              }
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`[fetchTopProductsFixed] Failed to fetch invoice details for ${invoice.name}:`, error);
          // Continue processing other invoices
        }
      }
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`[fetchTopProductsFixed] Processed ${processedCount} invoices, ${errorCount} errors`);
    console.log(`[fetchTopProductsFixed] Found ${productMap.size} unique products`);
    
    if (productMap.size === 0) {
      console.log('[fetchTopProductsFixed] No products found, returning empty array');
      return [];
    }
    
    // Sort by total_amount descending and take top 10
    const result = Array.from(productMap.values())
      .filter(product => product.total_amount > 0) // Only include products with positive sales
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);
    
    console.log('[fetchTopProductsFixed] Returning top products count:', result.length);
    if (result.length > 0) {
      console.log('[fetchTopProductsFixed] Top 3 products:', result.slice(0, 3));
    }
    
    return result;
    
  } catch (error) {
    console.error('[fetchTopProductsFixed] Error:', error);
    // Return empty array instead of throwing to prevent breaking the dashboard
    return [];
  }
}

/**
 * Fetch top 10 suppliers with highest paid amounts - Fixed version
 * Requirement: 20.1, 20.2, 9.15
 */
export async function fetchPaidSuppliersFixed(
  client: ERPNextClientType,
  company: string | null
): Promise<any[]> {
  try {
    console.log('[fetchPaidSuppliersFixed] Starting with company:', company);
    
    // Get Purchase Invoices that are submitted and paid (outstanding_amount = 0)
    const invoiceFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1], // Submitted
      ['outstanding_amount', '=', 0], // Fully paid
    ];
    
    if (company) {
      invoiceFilters.push(['company', '=', company]);
    }
    
    console.log('[fetchPaidSuppliersFixed] Fetching Purchase Invoices with filters:', JSON.stringify(invoiceFilters));
    
    const invoices = await client.getList<{
      name: string;
      supplier: string;
      supplier_name: string;
      grand_total: number;
      outstanding_amount: number;
      posting_date: string;
      status: string;
    }>('Purchase Invoice', {
      filters: invoiceFilters,
      fields: ['name', 'supplier', 'supplier_name', 'grand_total', 'outstanding_amount', 'posting_date', 'status'],
      limit: 1000,
    });
    
    console.log('[fetchPaidSuppliersFixed] Fetched invoices count:', invoices.length);
    
    if (invoices.length > 0) {
      console.log('[fetchPaidSuppliersFixed] Sample invoices:', invoices.slice(0, 3));
    }
    
    if (invoices.length === 0) {
      console.log('[fetchPaidSuppliersFixed] No paid Purchase Invoices found, returning empty array');
      return [];
    }
    
    // Aggregate by supplier - use grand_total for paid invoices (since outstanding_amount = 0)
    const supplierMap = new Map<string, {
      supplier_name: string;
      invoice_count: number;
      total_paid: number;
      last_payment_date: string;
    }>();
    
    for (const invoice of invoices) {
      // For fully paid invoices, the paid amount equals grand_total
      const paidAmount = Math.abs(invoice.grand_total || 0); // Use absolute value to handle returns
      
      if (paidAmount > 0) { // Only include invoices with positive amount
        const existing = supplierMap.get(invoice.supplier);
        if (existing) {
          existing.invoice_count += 1;
          existing.total_paid += paidAmount;
          if (invoice.posting_date > existing.last_payment_date) {
            existing.last_payment_date = invoice.posting_date;
          }
        } else {
          supplierMap.set(invoice.supplier, {
            supplier_name: invoice.supplier_name || invoice.supplier,
            invoice_count: 1,
            total_paid: paidAmount,
            last_payment_date: invoice.posting_date,
          });
        }
      }
    }
    
    console.log(`[fetchPaidSuppliersFixed] Found ${supplierMap.size} suppliers with payments`);
    
    if (supplierMap.size === 0) {
      console.log('[fetchPaidSuppliersFixed] No suppliers with payments found, returning empty array');
      return [];
    }
    
    // Convert to PaidSupplier[] and sort by total paid
    const result = Array.from(supplierMap.values())
      .map(supplier => ({
        supplier_name: supplier.supplier_name,
        paid_invoices_count: supplier.invoice_count,
        total_paid_amount: supplier.total_paid,
        last_payment_date: supplier.last_payment_date,
      }))
      .sort((a, b) => b.total_paid_amount - a.total_paid_amount)
      .slice(0, 10);
    
    console.log('[fetchPaidSuppliersFixed] Returning suppliers count:', result.length);
    if (result.length > 0) {
      console.log('[fetchPaidSuppliersFixed] Top suppliers:', result);
    }
    
    return result;
    
  } catch (error) {
    console.error('[fetchPaidSuppliersFixed] Error:', error);
    // Return empty array instead of throwing to prevent breaking the dashboard
    return [];
  }
}