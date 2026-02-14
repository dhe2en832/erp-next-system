import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pr: string }> }
) {
  try {
    // For Next.js 16 app router, params is a Promise
    const resolvedParams = await params;
    const { pr } = resolvedParams;

    console.log('PR Detail API - Params:', resolvedParams);

    if (!pr) {
      return NextResponse.json(
        { success: false, message: 'Purchase Receipt name is required' },
        { status: 400 }
      );
    }

    // Get session cookie for authentication
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    console.log('Fetching PR detail for:', pr);

    // Try ERPNext custom method first
    try {
      const erpNextUrl = `${ERPNEXT_API_URL}/api/method/fetch_pr_detail_for_pi?pr=${encodeURIComponent(pr)}`;
      
      const response = await fetch(erpNextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
        credentials: 'include',
      });

      console.log('ERPNext Custom Method Detail Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('ERPNext Custom Method Detail Response:', data);
        return NextResponse.json(data);
      }
    } catch (customMethodError) {
      console.log('Custom method not available, using standard API...');
    }

    // Fallback to standard ERPNext API
    console.log('Using standard ERPNext API for Purchase Receipt detail...');
    
    // Get Purchase Receipt with items
    const prUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Receipt/${pr}?fields=["name","supplier","supplier_name","posting_date","company","currency","items"]`;
    
    const response = await fetch(prUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
    });

    console.log('Standard API Detail Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API Detail Error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch purchase receipt detail' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Standard API Detail Response:', data);

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: {
          name: data.data.name,
          supplier: data.data.supplier,
          supplier_name: data.data.supplier_name,
          posting_date: data.data.posting_date,
          company: data.data.company,
          currency: data.data.currency || 'IDR',
          custom_notes_pr: '', // Not available in standard API
          items: (data.data.items || []).map((item: any) => {
            console.log('Mapping PR item:', {
              name: item.name,
              purchase_order: item.purchase_order,
              purchase_order_item: item.purchase_order_item
            });
            
            return {
              item_code: item.item_code,
              item_name: item.item_name,
              qty: item.qty, // Original PR qty
              received_qty: item.received_qty || item.qty, // Actual received quantity
              rejected_qty: item.rejected_qty || 0, // Actual rejected quantity
              accepted_qty: (item.received_qty || item.qty) - (item.rejected_qty || 0), // Calculated accepted
              billed_qty: item.billed_qty || 0, // Already billed quantity
              outstanding_qty: (item.received_qty || item.qty) - (item.rejected_qty || 0) - (item.billed_qty || 0), // Available for billing
              uom: item.uom || 'Nos',
              rate: item.rate,
              warehouse: item.warehouse || 'Stores - EN',
              purchase_receipt: data.data.name,
              purchase_receipt_item: item.name, // This should be the PR item name
              purchase_order: item.purchase_order || '',
              purchase_order_item: item.purchase_order_item || ''
            };
          })
        }
      }
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('PR Detail API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
