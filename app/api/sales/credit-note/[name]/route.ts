/**
 * Credit Note Detail API Routes
 * 
 * Handles get, update, and delete operations for individual Credit Notes
 * Requirements: 4.7, 4.8
 */

import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY || '';
const ERP_API_SECRET = process.env.ERP_API_SECRET || '';

/**
 * GET /api/sales/credit-note/[name]
 * Get Credit Note detail with all child tables
 * Requirements: 4.7, 4.8
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Nama Credit Note diperlukan' },
        { status: 400 }
      );
    }

    console.log('=== Credit Note Detail API Called ===');
    console.log('Credit Note Name:', name);

    // Use frappe.desk.form.load.getdoc for complete document with child tables
    const erpnextUrl = `${ERPNEXT_API_URL}/api/method/frappe.desk.form.load.getdoc`;
    
    console.log('ERPNext URL:', erpnextUrl);
    console.log('Request body:', JSON.stringify({ doctype: 'Sales Invoice', name: name }));

    const response = await fetch(erpnextUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctype: 'Sales Invoice',
        name: name,
      }),
    });

    console.log('ERPNext Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ERPNext API error:', errorText);
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil detail Credit Note' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('ERPNext Response:', JSON.stringify(data).substring(0, 200));

    if (data.message && data.message.docs && data.message.docs.length > 0) {
      const creditNote = data.message.docs[0];
      
      // Verify this is actually a Credit Note (is_return=1)
      if (creditNote.is_return !== 1) {
        console.log('Document is not a Credit Note (is_return !== 1)');
        return NextResponse.json(
          { success: false, message: 'Dokumen bukan Credit Note' },
          { status: 400 }
        );
      }
      
      console.log('Credit Note Found:', creditNote.name);
      console.log('Credit Note Items count:', creditNote.items?.length || 0);
      console.log('Return Against:', creditNote.return_against);

      // Transform field names for frontend compatibility
      const transformedCreditNote = {
        ...creditNote,
        // Transform return_against to sales_invoice for frontend
        sales_invoice: creditNote.return_against,
      };

      return NextResponse.json({
        success: true,
        data: transformedCreditNote,
      });
    } else {
      // Fallback: Try using resource API
      console.log('Trying fallback: resource API');
      const resourceUrl = `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${name}?fields=["*"]`;
      
      const resourceResponse = await fetch(resourceUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      if (resourceResponse.ok) {
        const resourceData = await resourceResponse.json();
        
        // Verify this is a Credit Note
        if (resourceData.data?.is_return !== 1) {
          console.log('Document is not a Credit Note (is_return !== 1)');
          return NextResponse.json(
            { success: false, message: 'Dokumen bukan Credit Note' },
            { status: 400 }
          );
        }
        
        console.log('Resource API success, items count:', resourceData.data?.items?.length || 0);
        
        // Transform field names
        const transformedCreditNote = {
          ...resourceData.data,
          sales_invoice: resourceData.data.return_against,
        };
        
        return NextResponse.json({
          success: true,
          data: transformedCreditNote,
        });
      }

      console.log('Credit Note not found in both APIs');
      return NextResponse.json(
        { success: false, message: 'Credit Note tidak ditemukan' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error fetching Credit Note detail:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengambil detail Credit Note' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales/credit-note/[name]
 * Update Credit Note (Draft only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  
  return NextResponse.json({
    success: false,
    message: 'Not implemented yet',
    name
  }, { status: 501 });
}

/**
 * DELETE /api/sales/credit-note/[name]
 * Delete Credit Note (Draft only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  
  return NextResponse.json({
    success: false,
    message: 'Not implemented yet',
    name
  }, { status: 501 });
}
