import { NextRequest, NextResponse } from 'next/server';

// ERPNext Configuration - Use existing environment variables
const ERPNEXT_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY || '';
const API_SECRET = process.env.ERP_API_SECRET || '';

// Type definitions
interface Warehouse {
  name: string;
  warehouse_name: string;
  company: string;
  parent_warehouse: string | null;
}

interface ERPNextResponse {
  data: Warehouse[];
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json(
        { error: 'Company parameter is required' },
        { status: 400 }
      );
    }

    // Build ERPNext API URL
    const fields = JSON.stringify(["name", "warehouse_name", "company", "parent_warehouse"]);
    const filters = JSON.stringify([["company", "=", company]]);
    const erpNextUrl = `${ERPNEXT_URL}/api/resource/Warehouse?fields=${fields}&filters=${filters}`;

    console.log('Fetching warehouses from ERPNext:', erpNextUrl);

    // Make request to ERPNext
    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && API_SECRET && {
          'Authorization': `token ${API_KEY}:${API_SECRET}`
        })
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', response.status, errorText);
      throw new Error(`ERPNext API error: ${response.status} - ${errorText}`);
    }

    const data: ERPNextResponse = await response.json();
    console.log('ERPNext response:', data);

    // Filter out group warehouses (parent_warehouse is null for root groups)
    // Only show actual warehouses, not group warehouses
    const actualWarehouses = data.data?.filter((warehouse: Warehouse) => 
      warehouse.parent_warehouse !== null && 
      warehouse.name !== warehouse.parent_warehouse
    ) || [];

    return NextResponse.json({
      data: actualWarehouses,
      message: 'Warehouses fetched successfully from ERPNext'
    });

  } catch (error) {
    console.error('Error fetching warehouses from ERPNext:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch warehouses from ERPNext',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
