import { NextRequest, NextResponse } from 'next/server';
import { handleERPNextAPIError } from '@/utils/erpnext-api-helper';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * POST /api/sales/credit-note/[name]/submit
 * Submit credit note (changes docstatus from 0 to 1)
 * 
 * This triggers:
 * - GL Entry creation for accounting transaction
 * - Stock ledger updates for returned items
 * - Update returned_qty in original Sales Invoice
 * - Commission adjustment in original Sales Invoice
 * 
 * Requirements: 3.2, 3.7, 9.8
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    // console.log('=== SUBMIT CREDIT NOTE ===');
    // console.log('Credit Note Name:', name);

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      // console.log('Using API key authentication');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      // console.log('Using session-based authentication');
      
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: { 'Cookie': `sid=${sid}` },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message?.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            // console.log('CSRF token added');
          }
        }
      } catch (csrfError) {
        console.log('Failed to get CSRF token:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'No authentication available' },
        { status: 401 }
      );
    }

    // First, verify document exists and is in Draft status
    const getResponse = await fetch(
      `${ERPNEXT_API_URL}/api/resource/Sales Invoice/${encodeURIComponent(name)}`,
      { method: 'GET', headers }
    );

    if (!getResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Gagal mengambil data dokumen' },
        { status: getResponse.status }
      );
    }

    const currentDoc = await getResponse.json();
    
    if (!currentDoc.data.is_return) {
      return NextResponse.json(
        { success: false, message: 'Dokumen ini bukan credit note (return document)' },
        { status: 400 }
      );
    }
    
    if (currentDoc.data.docstatus !== 0) {
      return NextResponse.json(
        { success: false, message: 'Hanya credit note dengan status Draft yang dapat diajukan' },
        { status: 400 }
      );
    }

    // Validate Accounting Period for posting_date (Requirement 3.7, 9.8)
    // console.log('Validating Accounting Period for posting_date:', currentDoc.data.posting_date);
    try {
      const periodCheckUrl = `${ERPNEXT_API_URL}/api/resource/Accounting Period?` + new URLSearchParams({
        fields: JSON.stringify(['name', 'period_name', 'status', 'start_date', 'end_date']),
        filters: JSON.stringify([
          ['company', '=', currentDoc.data.company],
          ['start_date', '<=', currentDoc.data.posting_date],
          ['end_date', '>=', currentDoc.data.posting_date],
        ]),
        limit_page_length: '1'
      });

      const periodResponse = await fetch(periodCheckUrl, { headers });
      
      if (periodResponse.ok) {
        const periodData = await periodResponse.json();
        if (periodData.data && periodData.data.length > 0) {
          const period = periodData.data[0];
          if (period.status === 'Closed' || period.status === 'Permanently Closed') {
            return NextResponse.json(
              { 
                success: false, 
                message: `Tidak dapat mengajukan Credit Note: Periode akuntansi ${period.period_name} sudah ditutup. Silakan pilih tanggal pada periode yang masih terbuka.` 
              },
              { status: 400 }
            );
          }
          // console.log('Accounting Period validation passed:', period.period_name);
        } else {
          console.log('No accounting period found for date, proceeding...');
        }
      }
    } catch (periodError) {
      console.warn('Failed to validate accounting period, continuing:', periodError);
      // Continue without blocking if period check fails
    }

    // Submit the document using ERPNext's submit method
    const submitUrl = `${ERPNEXT_API_URL}/api/method/frappe.client.submit`;
    
    const submitPayload = {
      doc: JSON.stringify({
        ...currentDoc.data,
        docstatus: 1, // Set to submitted
      }),
    };

    // console.log('Submitting credit note:', submitUrl);
    // console.log('Document modified timestamp:', currentDoc.data.modified);

    const response = await fetch(submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(submitPayload),
    });

    const responseText = await response.text();
    // console.log('Submit Response Status:', response.status);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.error('Response text:', responseText);
      
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    // console.log('Submit Response Data:', data);

    if (response.ok) {
      // Transform response to match frontend expectations
      const submittedDoc = data.message || data.docs?.[0];
      
      return NextResponse.json({
        success: true,
        data: {
          ...submittedDoc,
          status: 'Submitted',
          sales_invoice: submittedDoc.return_against,
          custom_notes: submittedDoc.return_notes,
        },
        message: 'Credit Note submitted successfully. GL entries created and commission adjusted.',
      });
    } else {
      return handleERPNextAPIError(response, data, 'Failed to submit credit note');
    }
  } catch (error) {
    console.error('Credit Note Submit Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
