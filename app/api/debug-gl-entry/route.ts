import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    console.log('Debug GL Entry - Company:', company);

    if (!process.env.ERP_API_KEY || !process.env.ERP_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured'
      });
    }

    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');

    // Test 1: Get ALL GL entries without any filters
    console.log('Test 1: Getting all GL entries...');
    const allResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/GL Entry?limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('All GL Entries Response Status:', allResponse.status);
    
    let allData = null;
    if (allResponse.ok) {
      allData = await allResponse.json();
      console.log('All GL Entries Data:', allData);
    }

    // Test 2: Get GL entries for specific company
    console.log('Test 2: Getting company-specific GL entries...');
    const companyResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/GL Entry?filters=${encodeURIComponent(JSON.stringify([["company", "=", company]]))}&limit_page_length=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Company GL Entries Response Status:', companyResponse.status);
    
    let companyData = null;
    if (companyResponse.ok) {
      companyData = await companyResponse.json();
      console.log('Company GL Entries Data:', companyData);
    }

    // Test 3: Check if GL Entry doctype exists
    console.log('Test 3: Checking GL Entry doctype...');
    const doctypeResponse = await fetch(`${ERPNEXT_API_URL}/api/v1/method/frappe.desk.form.load.getdoctype?doctype=GL%20Entry`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    console.log('Doctype Response Status:', doctypeResponse.status);
    
    let doctypeData = null;
    if (doctypeResponse.ok) {
      doctypeData = await doctypeResponse.json();
      console.log('Doctype Data:', doctypeData);
    }

    return NextResponse.json({
      success: true,
      message: 'Debug GL Entry complete',
      results: {
        all_gl_entries: {
          status: allResponse.status,
          data: allData
        },
        company_gl_entries: {
          status: companyResponse.status,
          data: companyData
        },
        doctype_check: {
          status: doctypeResponse.status,
          data: doctypeData
        }
      }
    });

  } catch (error: any) {
    console.error('Debug GL Entry error:', error);
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
