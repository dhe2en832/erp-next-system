import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

// Fetch valid data from ERPNext
async function fetchValidData(docType: string, fields: string[] = ["name"], filters?: any) {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('API credentials not configured');
  }

  let url = `${ERPNEXT_API_URL}/api/resource/${docType}?fields=${JSON.stringify(fields)}`;
  
  if (filters) {
    url += `&filters=${JSON.stringify(filters)}`;
  }

  console.log(`Fetching ${docType}:`, url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${docType}: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCH VALID ERPNEXT DATA ===');

    const results: any = {};

    // Fetch Price Lists
    try {
      results.priceLists = await fetchValidData('Price List');
      console.log('Price Lists:', results.priceLists);
    } catch (error) {
      console.error('Error fetching Price Lists:', error);
      results.priceLists = [];
    }

    // Fetch Tax Categories
    try {
      results.taxCategories = await fetchValidData('Tax Category');
      console.log('Tax Categories:', results.taxCategories);
    } catch (error) {
      console.error('Error fetching Tax Categories:', error);
      results.taxCategories = [];
    }

    // Fetch Territories
    try {
      results.territories = await fetchValidData('Territory');
      console.log('Territories:', results.territories);
    } catch (error) {
      console.error('Error fetching Territories:', error);
      results.territories = [];
    }

    // Fetch Income Accounts (filter by Income type)
    try {
      results.incomeAccounts = await fetchValidData('Account', ['name'], [['Account', 'root_type', '=', 'Income']]);
      console.log('Income Accounts:', results.incomeAccounts);
    } catch (error) {
      console.error('Error fetching Income Accounts:', error);
      results.incomeAccounts = [];
    }

    // Fetch Warehouses
    try {
      results.warehouses = await fetchValidData('Warehouse');
      console.log('Warehouses:', results.warehouses);
    } catch (error) {
      console.error('Error fetching Warehouses:', error);
      results.warehouses = [];
    }

    // Fetch Cost Centers
    try {
      results.costCenters = await fetchValidData('Cost Center');
      console.log('Cost Centers:', results.costCenters);
    } catch (error) {
      console.error('Error fetching Cost Centers:', error);
      results.costCenters = [];
    }

    return NextResponse.json({
      success: true,
      message: 'Valid ERPNext data fetched successfully',
      data: results
    });

  } catch (error: any) {
    console.error('Fetch Valid Data Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch valid ERPNext data',
      error: error.toString()
    }, { status: 500 });
  }
}
