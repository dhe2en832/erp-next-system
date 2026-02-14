import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company') || 'Entitas 1 (Demo)';

    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","customer","status","grand_total"]&filters=${encodeURIComponent(JSON.stringify([["company", "=", company]]))}&limit_page_length=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    if (!dnResponse.ok) {
      return NextResponse.json({
        success: false,
        message: 'Failed to get DN list',
        status: dnResponse.status
      });
    }

    const dnData = await dnResponse.json();
    
    const soReferences = new Set();
    const dnWithSORef = [];
    
    for (const dn of dnData.data || []) {
      try {
        const dnDetailResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note/${dn.name}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
        });
        
        if (dnDetailResponse.ok) {
          const dnDetail = await dnDetailResponse.json();
          const dnSORefs = new Set();
          
          if (dnDetail.data?.items && Array.isArray(dnDetail.data.items)) {
            dnDetail.data.items.forEach((item: any) => {
              if (item.against_sales_order) {
                dnSORefs.add(item.against_sales_order);
                soReferences.add(item.against_sales_order);
              }
            });
          }
          
          if (dnSORefs.size > 0) {
            dnWithSORef.push({
              dn_name: dn.name,
              customer: dn.customer,
              status: dn.status,
              grand_total: dn.grand_total,
              so_references: Array.from(dnSORefs),
              item_count: dnDetail.data?.items?.length || 0
            });
          }
        }
      } catch (error) {
        console.log(`Error getting DN detail for ${dn.name}:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      company: company,
      summary: {
        total_dn_checked: dnData.data?.length || 0,
        dn_with_so_ref: dnWithSORef.length,
        so_references_found: Array.from(soReferences)
      },
      dn_with_so_references: dnWithSORef,
      so_references: Array.from(soReferences),
      filtering_ready: soReferences.size > 0,
      message: soReferences.size > 0 ? 
        `Found ${soReferences.size} SO references to filter` :
        'No SO references found'
    });

  } catch (error: unknown) {
    console.error('Get DN with SO references error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
