import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== TEST DIRECT ERPNext CONNECTION ===');
    
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    const baseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }
    
    // Test 1: Get DocTypes
    console.log('Testing DocTypes...');
    const docTypesUrl = `${baseUrl}/api/v1/doctype?limit_page_length=50`;
    
    const docTypesResponse = await fetch(docTypesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('DocTypes Response Status:', docTypesResponse.status);
    
    if (!docTypesResponse.ok) {
      const errorText = await docTypesResponse.text();
      console.error('DocTypes Error:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch DocTypes',
        error: errorText,
        status: docTypesResponse.status
      }, { status: 500 });
    }
    
    const docTypesData = await docTypesResponse.json();
    const docTypes = docTypesData.docs || [];
    
    console.log('DocTypes found:', docTypes.length);
    
    // Find Delivery Note DocType
    const deliveryNoteDoc = docTypes.find((doc: any) => 
      doc.name === 'Delivery Note' || doc.name === 'DeliveryNote'
    );
    
    console.log('Delivery Note DocType:', deliveryNoteDoc?.name);
    
    // Test 2: Get Delivery Notes with correct DocType name
    if (deliveryNoteDoc) {
      const dnUrl = `${baseUrl}/api/resource/${encodeURIComponent(deliveryNoteDoc.name)}?fields=["name","customer","posting_date","grand_total","status"]&filters=${encodeURIComponent(JSON.stringify([["company", "=", "Entitas 1 (Demo)"]]))}&limit_page_length=10`;
      
      console.log('DN URL:', dnUrl);
      
      const dnResponse = await fetch(dnUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('DN Response Status:', dnResponse.status);
      
      if (!dnResponse.ok) {
        const dnErrorText = await dnResponse.text();
        console.error('DN Error:', dnErrorText);
        
        return NextResponse.json({
          success: false,
          message: 'Failed to fetch Delivery Notes',
          error: dnErrorText,
          status: dnResponse.status,
          docTypes: docTypes.map((doc: any) => ({ name: doc.name, module: doc.module }))
        }, { status: 500 });
      }
      
      const dnData = await dnResponse.json();
      const deliveryNotes = dnData.data || [];
      
      // Group by status
      const statusGroups = deliveryNotes.reduce((acc: any, dn: any) => {
        if (!acc[dn.status]) acc[dn.status] = [];
        acc[dn.status].push(dn);
        return acc;
      }, {});
      
      return NextResponse.json({
        success: true,
        message: `Found ${deliveryNotes.length} delivery notes`,
        docType: deliveryNoteDoc.name,
        statusGroups: Object.keys(statusGroups).reduce((acc: any, status: string) => {
          acc[status] = statusGroups[status].length;
          return acc;
        }, {}),
        deliveryNotes: deliveryNotes.map((dn: any) => ({
          name: dn.name,
          customer: dn.customer,
          status: dn.status,
          posting_date: dn.posting_date,
          grand_total: dn.grand_total
        }))
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Delivery Note DocType not found',
        availableDocTypes: docTypes.map((doc: any) => ({ name: doc.name, module: doc.module }))
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test API failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
