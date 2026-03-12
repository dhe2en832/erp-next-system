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
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Check if Sales Team is a child table
    const salesOrderData = await client.getList('Sales Order', {
      fields: ['name', 'sales_team'],
      limit_page_length: 1
    });

    console.log('Sales Team Debug Response:', { 
      status: 200, 
      data: { data: salesOrderData } 
    });

    // Also check Sales Team doctype - use frappe.client.get_list to bypass permission check
    let salesTeamData = [];
    try {
      const salesTeamResult = await client.call('frappe.client.get_list', {
        doctype: 'Sales Team',
        fields: ['*'],
        limit_page_length: 1
      }) as any;
      salesTeamData = salesTeamResult?.data || salesTeamResult || [];
    } catch (error) {
      console.error('Sales Team fetch failed:', error);
      salesTeamData = [];
    }

    return NextResponse.json({
      success: true,
      salesOrderData: { data: salesOrderData },
      salesTeamData: { data: salesTeamData },
    });
  } catch (error) {
    logSiteError(error, 'GET /api/utils/test', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
