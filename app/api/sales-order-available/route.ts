import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const searchTerm = searchParams.get('search');

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company parameter is required' },
        { status: 400 }
      );
    }

    console.log('Fetching available Sales Orders for company:', company);

    // Step 1: Get all submitted sales orders
    try {
      console.log('Step 1: Fetching Sales Orders...');
      const salesOrderFilters = [
        ["company", "=", company],
        ["docstatus", "=", "1"], // Submitted
        ["status", "=", "To Deliver and Bill"]
      ];
      
      const salesOrderUrl = `${ERPNEXT_API_URL}/api/resource/Sales Order?fields=["name","customer","transaction_date","grand_total","status","docstatus","delivery_date"]&filters=${encodeURIComponent(JSON.stringify(salesOrderFilters))}&order_by=transaction_date desc`;
      
      console.log('Sales Orders URL:', salesOrderUrl);
      
      const salesOrderResponse = await fetch(salesOrderUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      });

      console.log('Sales Orders Response Status:', salesOrderResponse.status);

      if (!salesOrderResponse.ok) {
        const errorText = await salesOrderResponse.text();
        console.error('Sales Orders Response Error:', errorText);
        throw new Error(`Failed to fetch sales orders: ${salesOrderResponse.statusText} - ${errorText}`);
      }

      const salesOrderData = await salesOrderResponse.json();
      const salesOrders = salesOrderData.data || [];
      
      console.log('Total Sales Orders found:', salesOrders.length);
      console.log('Sales Orders sample:', salesOrders.slice(0, 2));

      // Step 2: Get all delivery notes to check which sales orders already have delivery notes
      console.log('Step 2: Fetching Delivery Notes...');
      const deliveryNoteFilters = [
        ["company", "=", company],
        ["docstatus", "!=", "2"] // Not cancelled
      ];
      
      const deliveryNoteUrl = `${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","sales_order"]&filters=${encodeURIComponent(JSON.stringify(deliveryNoteFilters))}`;
      
      console.log('Delivery Notes URL:', deliveryNoteUrl);
      
      const deliveryNoteResponse = await fetch(deliveryNoteUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `sid=${sid}`,
        },
      });

      console.log('Delivery Notes Response Status:', deliveryNoteResponse.status);

      if (!deliveryNoteResponse.ok) {
        const errorText = await deliveryNoteResponse.text();
        console.error('Delivery Notes Response Error:', errorText);
        throw new Error(`Failed to fetch delivery notes: ${deliveryNoteResponse.statusText} - ${errorText}`);
      }

      const deliveryNoteData = await deliveryNoteResponse.json();
      const deliveryNotes = deliveryNoteData.data || [];
      
      console.log('Total Delivery Notes found:', deliveryNotes.length);
      console.log('Delivery Notes sample:', deliveryNotes.slice(0, 2));

      // Step 3: Create a set of sales order names that already have delivery notes
      console.log('Step 3: Processing delivery notes...');
      const salesOrdersWithDeliveryNotes = new Set();
      deliveryNotes.forEach((dn: any) => {
        if (dn.sales_order) {
          salesOrdersWithDeliveryNotes.add(dn.sales_order);
          console.log(`Found delivery note ${dn.name} for sales order ${dn.sales_order}`);
        }
      });

      console.log('Sales Orders with Delivery Notes:', Array.from(salesOrdersWithDeliveryNotes));

      // Step 4: Filter sales orders that don't have delivery notes yet
      console.log('Step 4: Filtering available sales orders...');
      let availableSalesOrders = salesOrders.filter((so: any) => {
        const hasDeliveryNote = salesOrdersWithDeliveryNotes.has(so.name);
        console.log(`Checking ${so.name}: Has Delivery Note = ${hasDeliveryNote}`);
        return !hasDeliveryNote;
      });

      console.log('Available Sales Orders after filtering:', availableSalesOrders.length);
      console.log('Available Sales Orders list:', availableSalesOrders.map((so: any) => so.name));

      // Step 5: Apply search filter if provided
      if (searchTerm) {
        console.log('Step 5: Applying search filter:', searchTerm);
        availableSalesOrders = availableSalesOrders.filter((so: any) => 
          so.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          so.customer.toLowerCase().includes(searchTerm.toLowerCase())
        );
        console.log('Available Sales Orders after search:', availableSalesOrders.length);
      }

      console.log('Final Available Sales Orders:', availableSalesOrders.length);

      return NextResponse.json({
        success: true,
        data: availableSalesOrders,
        total_records: availableSalesOrders.length,
        message: `Found ${availableSalesOrders.length} available sales orders`
      });

    } catch (stepError: any) {
      console.error('Error in API steps:', stepError);
      throw stepError; // Re-throw to be caught by outer catch
    }

  } catch (error: any) {
    console.error('Available Sales Orders API error:', error);
    console.error('Error stack:', error.stack);
    
    // Return more detailed error information for debugging
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Internal server error',
        details: error.stack || 'No stack trace available',
        error_type: error.constructor.name
      },
      { status: 500 }
    );
  }
}
