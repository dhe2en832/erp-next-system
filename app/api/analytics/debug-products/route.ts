import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClientForRequest } from '@/lib/api-helpers';

/**
 * Debug endpoint for top products data
 */
export async function GET(request: NextRequest) {
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    
    // Step 1: Check Sales Invoices
    const invoiceFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      invoiceFilters.push(['company', '=', company]);
    }
    
    console.log('[DEBUG] Fetching Sales Invoices with filters:', invoiceFilters);
    
    const invoices = await client.getList<{
      name: string;
      posting_date: string;
      customer: string;
      grand_total: number;
    }>('Sales Invoice', {
      filters: invoiceFilters,
      fields: ['name', 'posting_date', 'customer', 'grand_total'],
      limit: 10, // Just get a few for debugging
    });
    
    console.log('[DEBUG] Found invoices:', invoices.length);
    
    if (invoices.length === 0) {
      return NextResponse.json({
        success: true,
        debug: {
          step: 'invoices',
          message: 'No submitted Sales Invoices found',
          invoices: [],
          company: company,
          filters: invoiceFilters
        }
      });
    }
    
    // Step 2: Check Sales Invoice Items
    const invoiceNames = invoices.map(inv => inv.name);
    
    let items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      amount: number;
      parent: string;
    }> = [];
    
    try {
      const itemFilters: (string | number | boolean | null | string[])[][] = [
        ['parent', 'in', invoiceNames],
      ];
      
      console.log('[DEBUG] Fetching Sales Invoice Items with filters:', itemFilters);
      
      items = await client.getList<{
        item_code: string;
        item_name: string;
        qty: number;
        amount: number;
        parent: string;
      }>('Sales Invoice Item', {
        filters: itemFilters,
        fields: ['item_code', 'item_name', 'qty', 'amount', 'parent'],
        limit: 50,
      });
      
      console.log('[DEBUG] Found items:', items.length);
      
    } catch (itemError) {
      console.error('[DEBUG] Error fetching items:', itemError);
      return NextResponse.json({
        success: false,
        debug: {
          step: 'items',
          message: 'Error fetching Sales Invoice Items',
          error: itemError instanceof Error ? itemError.message : String(itemError),
          invoices: invoices,
          invoiceNames: invoiceNames
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        step: 'complete',
        message: 'Debug complete',
        invoiceCount: invoices.length,
        itemCount: items.length,
        invoices: invoices,
        items: items,
        company: company
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      debug: {
        step: 'error',
        message: 'Debug failed',
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}