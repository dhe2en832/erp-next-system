import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    console.log('Debug All DN - Company:', company);

    if (!ERP_API_KEY || !ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');

    // Test 1: Get ALL delivery notes without any filters
    console.log('Test 1: All delivery notes...');
    const allResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('All DN Response Status:', allResponse.status);
    
    let allData = null;
    if (allResponse.ok) {
      allData = await allResponse.json();
      console.log('All DN Data:', allData);
    }

    // Test 2: Get delivery notes for specific company
    console.log('Test 2: Company-specific delivery notes...');
    const companyResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?filters=${encodeURIComponent(JSON.stringify([["company", "=", company]]))}&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Company DN Response Status:', companyResponse.status);
    
    let companyData = null;
    if (companyResponse.ok) {
      companyData = await companyResponse.json();
      console.log('Company DN Data:', companyData);
    }

    // Test 3: Search for specific delivery note MAT-DN-2026-00001
    console.log('Test 3: Search for MAT-DN-2026-00001...');
    const specificResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/MAT-DN-2026-00001`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Specific DN Response Status:', specificResponse.status);
    
    let specificData = null;
    if (specificResponse.ok) {
      specificData = await specificResponse.json();
      console.log('Specific DN Data:', specificData);
    }

    // Test 4: Get DN Items with SO references
    console.log('Test 4: Get DN Items with SO references...');
    const dnItemsResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note Item?fields=["parent","against_sales_order","item_code"]&limit_page_length=50`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('DN Items Response Status:', dnItemsResponse.status);
    
    let dnItemsData = null;
    if (dnItemsResponse.ok) {
      dnItemsData = await dnItemsResponse.json();
      console.log('DN Items Data:', dnItemsData);
    }

    // Test 5: Search for delivery notes with any sales order reference
    console.log('Test 5: Search for SO references...');
    const soResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","sales_order","against_sales_order"]&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('SO DN Response Status:', soResponse.status);
    
    let soData = null;
    if (soResponse.ok) {
      soData = await soResponse.json();
      console.log('SO DN Data:', soData);
    }

    return NextResponse.json({
      success: true,
      message: 'Debug complete',
      results: {
        all_delivery_notes: {
          status: allResponse.status,
          data: allData
        },
        company_delivery_notes: {
          status: companyResponse.status,
          data: companyData
        },
        specific_delivery_note: {
          status: specificResponse.status,
          data: specificData
        },
        dn_items_with_so: {
          status: dnItemsResponse.status,
          data: dnItemsData
        },
        sales_order_references: {
          status: soResponse.status,
          data: soData
        }
      }
    });

  } catch (error: any) {
    console.error('Debug all DN error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}
