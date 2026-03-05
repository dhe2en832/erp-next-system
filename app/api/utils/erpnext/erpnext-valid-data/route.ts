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

    const results: any = {};

    // Fetch Price Lists
    try {
      results.priceLists = await client.getList('Price List', { fields: ['name'] });
    } catch (error) {
      console.error('Error fetching Price Lists:', error);
      results.priceLists = [];
    }

    // Fetch Tax Categories
    try {
      results.taxCategories = await client.getList('Tax Category', { fields: ['name'] });
    } catch (error) {
      console.error('Error fetching Tax Categories:', error);
      results.taxCategories = [];
    }

    // Fetch Territories
    try {
      results.territories = await client.getList('Territory', { fields: ['name'] });
    } catch (error) {
      console.error('Error fetching Territories:', error);
      results.territories = [];
    }

    // Fetch Income Accounts (filter by Income type)
    try {
      results.incomeAccounts = await client.getList('Account', { 
        fields: ['name'], 
        filters: [['root_type', '=', 'Income']]
      });
    } catch (error) {
      console.error('Error fetching Income Accounts:', error);
      results.incomeAccounts = [];
    }

    // Fetch Warehouses
    try {
      results.warehouses = await client.getList('Warehouse', { fields: ['name'] });
    } catch (error) {
      console.error('Error fetching Warehouses:', error);
      results.warehouses = [];
    }

    // Fetch Cost Centers
    try {
      results.costCenters = await client.getList('Cost Center', { fields: ['name'] });
    } catch (error) {
      console.error('Error fetching Cost Centers:', error);
      results.costCenters = [];
    }

    return NextResponse.json({
      success: true,
      message: 'Valid ERPNext data fetched successfully',
      data: results
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/utils/erpnext/erpnext-valid-data', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
