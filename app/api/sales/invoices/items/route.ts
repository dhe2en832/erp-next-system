import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  console.log('[Sales Invoice Items] Site ID:', siteId);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    console.log('[Sales Invoice Items] Company:', company);

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    console.log('[Sales Invoice Items] Client created for site:', siteId);

    // Get all submitted DN (exclude returns)
    const filters: any[][] = [
      ["docstatus", "=", 1],
      ["status", "!=", "Closed"],
      ["is_return", "=", 0]
    ];
    
    if (company) {
      filters.push(["company", "=", company]);
    }

    console.log('[Sales Invoice Items] Fetching Delivery Notes with filters:', JSON.stringify(filters));
    const allDNs = await client.getList('Delivery Note', {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'status'],
      filters,
      limit_page_length: 0 // Get all
    });
    console.log('[Sales Invoice Items] Found DNs:', allDNs.length);

    // Get all Sales Invoice
    console.log('[Sales Invoice Items] Fetching Sales Invoices...');
    const invoices = await client.getList('Sales Invoice', {
      fields: ['name', 'docstatus'],
      filters: [["docstatus", "!=", 2]],
      limit_page_length: 0 // Get all
    });
    console.log('[Sales Invoice Items] Found Invoices:', invoices.length);

    // Extract DN numbers from each invoice items
    // Fallback approach: fetch each invoice and extract items
    // Child table queries require special permissions, so we use parent document approach
    console.log('[Sales Invoice Items] Extracting DNs from invoices...');
    const results = await Promise.all(invoices.map(async (invoice: any) => {
      try {
        const invoiceData = await client.get('Sales Invoice', invoice.name) as any;
        
        return (invoiceData.items || []).map((item: any) => ({
          ...item,
          customer: invoice.customer,
          customer_name: invoice.customer_name,
          posting_date: invoice.posting_date,
          invoice_name: invoice.name,
          status: invoice.status
        }));
      } catch (itemError) {
        console.error(`[Sales Invoice Items] Error fetching invoice ${invoice.name}:`, itemError);
        return [];
      }
    }));

    const usedDNs = results.flat().map((item: any) => item.delivery_note).filter(Boolean);
    console.log('[Sales Invoice Items] Total DNs found in invoices:', usedDNs.length);

    const uniqueUsedDNs = [...new Set(usedDNs)];

    return NextResponse.json({ 
      success: true, 
      data: allDNs,
      meta: {
        total_dn: allDNs.length,
        used_dn: uniqueUsedDNs.length,
        available_dn: allDNs.length - uniqueUsedDNs.length,
        method: 'frontend_filtering',
        used_dn_list: uniqueUsedDNs
      }
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/sales/invoices/items', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    const statusCode = errorResponse.errorType === 'authentication' ? 401 : 500;
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
