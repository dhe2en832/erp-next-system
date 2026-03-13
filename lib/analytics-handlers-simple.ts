/**
 * Simplified Analytics Handlers (Fallback)
 * 
 * These handlers return empty arrays instead of throwing errors
 * Use these if the main handlers are timing out or failing
 */

import type { ERPNextClient } from './erpnext';
import type { ERPNextMultiClient } from './erpnext-multi';
import type { TopProduct } from '@/types/dashboard-analytics';

type ERPNextClientType = ERPNextClient | ERPNextMultiClient;

/**
 * Simplified fetchTopProducts - returns empty array on error
 */
export async function fetchTopProductsSimple(
  client: ERPNextClientType,
  company: string | null
): Promise<TopProduct[]> {
  try {
    const filters: (string | number | boolean | null | string[])[][] = [
      ['parenttype', '=', 'Sales Invoice'],
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      filters.push(['parent', 'Sales Invoice', 'company', '=', company]);
    }
    
    // Fetch with smaller limit
    const items = await client.getList<{
      item_code: string;
      item_name: string;
      qty: number;
      amount: number;
    }>('Sales Invoice Item', {
      filters,
      fields: ['item_code', 'item_name', 'qty', 'amount'],
      limit: 1000, // Reduced from 10000
    });
    
    if (!items || items.length === 0) {
      console.log('[fetchTopProductsSimple] No items found');
      return [];
    }
    
    // Aggregate by item_code
    const aggregated = new Map<string, TopProduct>();
    
    for (const item of items) {
      if (!item.item_code || !item.item_name) {
        continue; // Skip invalid items
      }
      
      const existing = aggregated.get(item.item_code);
      if (existing) {
        existing.total_qty += item.qty || 0;
        existing.total_amount += item.amount || 0;
      } else {
        aggregated.set(item.item_code, {
          item_code: item.item_code,
          item_name: item.item_name,
          total_qty: item.qty || 0,
          total_amount: item.amount || 0,
        });
      }
    }
    
    // Sort and return top 10
    return Array.from(aggregated.values())
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);
      
  } catch (error) {
    console.error('[fetchTopProductsSimple] Error (returning empty array):', error);
    return []; // Return empty array instead of throwing
  }
}
