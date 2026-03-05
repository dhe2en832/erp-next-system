import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Get all submitted DN (exclude returns)
    const filters: any[][] = [
      ["docstatus", "=", 1],
      ["status", "!=", "Closed"],
      ["is_return", "=", 0]
    ];
    
    if (company) {
      filters.push(["company", "=", company]);
    }

    const allDNs = await client.getList('Delivery Note', {
      fields: ['name', 'customer', 'customer_name', 'grand_total', 'status'],
      filters,
      limit_page_length: 0 // Get all
    });

    // Get all Sales Invoice
    const invoices = await client.getList('Sales Invoice', {
      fields: ['name', 'docstatus'],
      filters: [["docstatus", "!=", 2]],
      limit_page_length: 0 // Get all
    });

    // Extract DN numbers from each invoice items
    const usedDNs: string[] = [];
    
    for (const invoice of invoices) {
      try {
        const invoiceData = await client.get('Sales Invoice', invoice.name);
        const items = invoiceData.items || [];
        
        const dnInItems = items
          .map((item: any) => item.delivery_note)
          .filter(Boolean);
        
        usedDNs.push(...dnInItems);
      } catch (itemError) {
        // Continue with other invoices
      }
    }

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
