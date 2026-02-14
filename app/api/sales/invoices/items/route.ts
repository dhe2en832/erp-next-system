import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  
  const AUTH = `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`;
  const ERP_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

  try {
    // Get all submitted DN
    const allDNRes = await fetch(`${ERP_URL}/api/resource/Delivery Note?` + new URLSearchParams({
        fields: '["name","customer","customer_name","grand_total","status"]',
        filters: JSON.stringify([
            ["docstatus", "=", 1],
            ["company", "=", company || ""],
            ["status", "!=", "Closed"]
        ]),
        limit_page_length: 'None'
    }), { headers: { 'Authorization': AUTH } });

    if (!allDNRes.ok) {
      const errorText = await allDNRes.text();
      throw new Error(`Failed to fetch delivery notes: ${errorText}`);
    }

    const allData = await allDNRes.json();
    const allDNs = allData.data || [];

    // Get all Sales Invoice
    const invoiceRes = await fetch(`${ERP_URL}/api/resource/Sales Invoice?` + new URLSearchParams({
        fields: '["name","docstatus"]',
        filters: JSON.stringify([
            ["docstatus", "!=", 2]
        ]),
        limit_page_length: 'None'
    }), { headers: { 'Authorization': AUTH } });

    if (!invoiceRes.ok) {
      const errorText = await invoiceRes.text();
      throw new Error(`Failed to fetch sales invoices: ${errorText}`);
    }

    const invoiceData = await invoiceRes.json();
    const invoices = invoiceData.data || [];

    // Extract DN numbers from each invoice items
    const usedDNs: string[] = [];
    
    for (const invoice of invoices) {
      try {
        const invoiceItemsRes = await fetch(`${ERP_URL}/api/resource/Sales Invoice/${invoice.name}?fields=["items"]`, {
          headers: { 'Authorization': AUTH }
        });

        if (invoiceItemsRes.ok) {
          const invoiceItemsData = await invoiceItemsRes.json();
          const items = invoiceItemsData.data?.items || [];
          
          const dnInItems = items
            .map((item: any) => item.delivery_note)
            .filter(Boolean);
          
          usedDNs.push(...dnInItems);
        }
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

  } catch (error: any) {
    console.error("DN Fetch Error:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: "Failed to fetch delivery notes" 
    }, { status: 500 });
  }
}
