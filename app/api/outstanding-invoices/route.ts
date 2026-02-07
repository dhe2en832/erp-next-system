import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET OUTSTANDING INVOICES ===');
    
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer');
    const company = searchParams.get('company');
    
    if (!customer || !company) {
      return NextResponse.json(
        { success: false, message: 'Customer and company are required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for outstanding invoices');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for outstanding invoices');
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Fetch outstanding invoices from ERPNext
    // Try multiple approaches to get partially paid invoices
    console.log('🔍 Customer:', customer);
    console.log('🏢 Company:', company);
    
    // Approach 1: Filter by status and outstanding amount
    const filters = JSON.stringify([
      ["customer", "=", customer],
      ["company", "=", company],
      ["docstatus", "=", 1],
      ["outstanding_amount", ">", 0]
    ]);
    
    // Alternative: Try without status filter to see all invoices
    // const filters = JSON.stringify([
    //   ["customer", "=", customer],
    //   ["company", "=", company],
    //   ["docstatus", "=", 1]
    // ]);

    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice?fields=["name","customer","posting_date","due_date","grand_total","outstanding_amount","status","paid_amount"]&filters=${encodeURIComponent(filters)}&order_by=due_date asc&limit_page_length=100`;
    
    console.log('🌐 Outstanding Invoices ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: headers,
    });

    const data = await response.json();
    console.log('Outstanding Invoices Response Status:', response.status);
    console.log('Outstanding Invoices Count:', data.data?.length || 0);
    
    // Log all invoices for debugging
    if (data.data && Array.isArray(data.data)) {
      console.log('📋 All Invoices from ERPNext:');
      data.data.forEach((invoice: any, index: number) => {
        console.log(`  ${index + 1}. ${invoice.name}: Status=${invoice.status}, Outstanding=${invoice.outstanding_amount}, Total=${invoice.grand_total}`);
      });
    }

    if (response.ok) {
      // Return all invoices for this customer (both outstanding and partially paid)
      // The frontend will handle the allocation logic
      const allInvoices = data.data || [];
      
      console.log('🔍 All Invoices for Customer:', allInvoices.length);
      allInvoices.forEach((invoice: any, index: number) => {
        console.log(`  ${index + 1}. ${invoice.name}: Outstanding=${invoice.outstanding_amount}, Status=${invoice.status}`);
      });

      return NextResponse.json({
        success: true,
        data: allInvoices,
        message: `Found ${allInvoices.length} invoices for customer`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: data.exc_type || data.message || 'Failed to fetch outstanding invoices',
        error: data
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Outstanding Invoices Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
