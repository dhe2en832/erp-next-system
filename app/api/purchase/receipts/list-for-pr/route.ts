import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const supplier = searchParams.get('supplier');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
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

    console.log('Fetching PO list for PR for company:', company, 'supplier:', supplier);

    // Try ERPNext custom method first
    try {
      const erpNextUrl = supplier 
        ? `${ERPNEXT_API_URL}/api/method/fetch_po_list_for_pr?company=${encodeURIComponent(company)}&supplier=${encodeURIComponent(supplier)}`
        : `${ERPNEXT_API_URL}/api/method/fetch_po_list_for_pr?company=${encodeURIComponent(company)}`;
      console.log('Trying custom method:', erpNextUrl);
      
      const response = await fetch(erpNextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
        credentials: 'include',
      });

      console.log('ERPNext Custom Method Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('ERPNext Custom Method Response:', data);
        console.log('Custom method returned items:', data.message?.data?.length || 0);
        
        // Add debug info to response
        const debuggedData = {
          ...data,
          debug: {
            method: 'custom',
            source: 'fetch_po_list_for_pr',
            items_count: data.message?.data?.length || 0,
            erpNext_url: erpNextUrl,
            supplier_filter: supplier || 'none'
          }
        };
        
        return NextResponse.json(debuggedData);
      } else {
        const errorData = await response.text();
        console.log('Custom method failed:', errorData);
      }
    } catch (customMethodError) {
      console.log('Custom method not available, using standard API...', customMethodError);
    }

    // Fallback to standard ERPNext API - filter POs that don't have PRs yet
    console.log('Using standard ERPNext API for Purchase Orders...');
    
    // Build filters array
    let filtersArray = [
      ["company", "=", company],
      ["docstatus", "=", 1], // Submitted
      ["status", "in", ["Submitted", "Partially Delivered"]] // Not fully delivered
    ];

    // Add supplier filter if provided
    if (supplier) {
      filtersArray.push(["supplier", "=", supplier]);
      console.log('Adding supplier filter:', supplier);
    } else {
      console.log('No supplier filter - fetching all suppliers');
    }
    
    const filters = JSON.stringify(filtersArray);
    
    const standardUrl = `${ERPNEXT_API_URL}/api/resource/Purchase Order?fields=["name","supplier","supplier_name","transaction_date","company","grand_total","status","per_received"]&filters=${encodeURIComponent(filters)}&order_by=transaction_date desc&limit_page_length=100`;
    
    console.log('Standard API URL:', standardUrl);
    console.log('Filters being used:', filters);
    
    const response = await fetch(standardUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`,
      },
      credentials: 'include',
    });

    console.log('Standard API Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API Error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch purchase orders list' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Standard API Response:', data);
    console.log('Standard API returned items:', data.data?.length || 0);

    // Filter out POs that are already fully received (per_received >= 100)
    const filteredPOs = (data.data || []).filter((po: any) => {
      const perReceived = po.per_received || 0;
      return perReceived < 100; // Only show POs that are not fully received
    });

    console.log('Filtered POs after removing fully received:', filteredPOs.length);

    // Transform to expected format
    const transformedData = {
      message: {
        success: true,
        data: filteredPOs.map((po: any) => ({
          name: po.name,
          supplier: po.supplier,
          supplier_name: po.supplier_name,
          transaction_date: po.transaction_date,
          company: po.company,
          grand_total: po.grand_total,
          status: po.status,
          per_received: po.per_received || 0
        }))
      }
    };

    console.log('Transformed data items:', transformedData.message.data.length);
    console.log('Final transformed data:', JSON.stringify(transformedData, null, 2));

    // Add debug info to response
    const debuggedData = {
      ...transformedData,
      debug: {
        method: 'standard',
        source: 'standard_api',
        items_count: transformedData.message.data.length,
        erpNext_url: standardUrl,
        filters: filters,
        filtered_count: filteredPOs.length,
        original_count: data.data?.length || 0,
        supplier_filter: supplier || 'none'
      }
    };

    return NextResponse.json(debuggedData);

  } catch (error) {
    console.error('PO List for PR API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
