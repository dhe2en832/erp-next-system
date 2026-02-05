import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  
  const AUTH = `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`;
  const ERP_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

  try {
    console.log('=== SIMPLE APPROACH - GET ALL DN + INVOICE DETAILS ===');
    
    // LANGKAH 1: Get semua submitted DN
    const allDNRes = await fetch(`${ERP_URL}/api/resource/Delivery Note?` + new URLSearchParams({
        fields: '["name","customer","customer_name","grand_total","status"]',
        filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["company", "=", company || ""],
            ["status", "!=", "Closed"]
        ]),
        limit_page_length: 'None'
    }), { headers: { 'Authorization': AUTH } });

    console.log('All DN API Status:', allDNRes.status);

    if (!allDNRes.ok) {
      const errorText = await allDNRes.text();
      console.error('All DN API failed:', errorText);
      throw new Error(`Failed to fetch delivery notes: ${errorText}`);
    }

    const allData = await allDNRes.json();
    const allDNs = allData.data || [];
    console.log('All DNs fetched:', allDNs.length);

    // LANGKAH 2: Get semua Sales Invoice (tanpa filter dulu)
    const invoiceRes = await fetch(`${ERP_URL}/api/resource/Sales Invoice?` + new URLSearchParams({
        fields: '["name","docstatus"]',
        filters: JSON.stringify([
            ["docstatus", "!=", 2] // Bukan yang cancelled
        ]),
        limit_page_length: 'None'
    }), { headers: { 'Authorization': AUTH } });

    console.log('Sales Invoice API Status:', invoiceRes.status);

    if (!invoiceRes.ok) {
      const errorText = await invoiceRes.text();
      console.error('Sales Invoice API failed:', errorText);
      throw new Error(`Failed to fetch sales invoices: ${errorText}`);
    }

    const invoiceData = await invoiceRes.json();
    const invoices = invoiceData.data || [];
    console.log('Sales Invoices fetched:', invoices.length);

    // LANGKAH 3: Extract DN numbers dari setiap invoice items
    const usedDNs: string[] = [];
    
    for (const invoice of invoices) {
      try {
        // Get detail items untuk setiap invoice
        const invoiceItemsRes = await fetch(`${ERP_URL}/api/resource/Sales Invoice/${invoice.name}?fields=["items"]`, {
          headers: { 'Authorization': AUTH }
        });

        if (invoiceItemsRes.ok) {
          const invoiceItemsData = await invoiceItemsRes.json();
          const items = invoiceItemsData.data?.items || [];
          
          // Extract DN dari items
          const dnInItems = items
            .map((item: any) => item.delivery_note)
            .filter(Boolean);
          
          usedDNs.push(...dnInItems);
          console.log(`Invoice ${invoice.name}: Found ${dnInItems.length} DN references`);
        }
      } catch (itemError) {
        console.error(`Failed to fetch items for invoice ${invoice.name}:`, itemError);
        // Continue dengan invoice lainnya
      }
    }

    // Remove duplicates
    const uniqueUsedDNs = [...new Set(usedDNs)];
    console.log('Total unique used DNs:', uniqueUsedDNs);

    // LANGKAH 4: Return semua DN + used DN list (filtering di frontend)
    return NextResponse.json({ 
      success: true, 
      data: allDNs, // Return semua DN
      meta: {
        total_dn: allDNs.length,
        used_dn: uniqueUsedDNs.length,
        available_dn: allDNs.length - uniqueUsedDNs.length,
        method: 'frontend_filtering',
        used_dn_list: uniqueUsedDNs
      }
    });

  } catch (error: any) {
    console.error("DN Fetch Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: "Failed to fetch delivery notes" 
    }, { status: 500 });
  }
}
