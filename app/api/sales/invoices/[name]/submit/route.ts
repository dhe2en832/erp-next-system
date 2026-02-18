import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== SUBMIT SALES INVOICE ===');
    
    const { name } = await params;
    const invoiceName = name;
    console.log('Submitting Sales Invoice:', invoiceName);
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication for submit');
    } else if (sid) {
      headers['Cookie'] = `sid=${sid}`;
      console.log('Using session-based authentication for submit');
      
      // Get CSRF token for ERPNext
      try {
        const csrfResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.core.csrf.get_token`, {
          method: 'GET',
          headers: {
            'Cookie': `sid=${sid}`,
          },
        });
        
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.message && csrfData.message.csrf_token) {
            headers['X-Frappe-CSRF-Token'] = csrfData.message.csrf_token;
            console.log('CSRF token added to headers');
          }
        } else {
          console.warn('Failed to get CSRF token, proceeding without it');
        }
      } catch (csrfError) {
        console.warn('Error getting CSRF token:', csrfError);
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Submit invoice menggunakan ERPNext API
    const submitUrl = `${ERPNEXT_API_URL}/api/resource/Sales%20Invoice/${invoiceName}`;
    console.log('Submit URL:', submitUrl);

    // Get current invoice data to verify custom fields before submit
    try {
      const getCurrentData = await fetch(`${ERPNEXT_API_URL}/api/resource/Sales%20Invoice/${invoiceName}?fields=["name","custom_total_komisi_sales","items","sales_team.sales_person","sales_team.employee"]`, {
        method: 'GET',
        headers: headers,
      });
      
      if (getCurrentData.ok) {
        const currentData = await getCurrentData.json();
        console.log('Current Invoice Data Before Submit:', {
          name: currentData.data.name,
          custom_total_komisi_sales: currentData.data.custom_total_komisi_sales,
          items_count: currentData.data.items?.length || 0,
          items_with_commission: currentData.data.items?.filter((item: any) => item.custom_komisi_sales > 0).length || 0
        });

        // Auto-fill employee for sales team if missing
        const salesTeam = currentData.data.sales_team || [];
        const missingEmployeeEntries = salesTeam.filter((st: any) => st.sales_person && !st.employee);
        if (missingEmployeeEntries.length > 0) {
          const updatedSalesTeam = await Promise.all(salesTeam.map(async (st: any) => {
            if (st.employee || !st.sales_person) return st;
            try {
              const empRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/setup/employees?sales_person=${encodeURIComponent(st.sales_person)}`, { headers });
              if (empRes.ok) {
                const empData = await empRes.json();
                const firstEmp = empData.data?.[0];
                if (empData.success && firstEmp) {
                  return { ...st, employee: firstEmp.name };
                }
              }
            } catch (empErr) {
              console.warn('Employee lookup failed for sales person', st.sales_person, empErr);
            }
            return st;
          }));

          const hasNewEmployee = updatedSalesTeam.some((st: any, idx: number) => st.employee && !salesTeam[idx]?.employee);
          if (hasNewEmployee) {
            try {
              const updateRes = await fetch(submitUrl, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ sales_team: updatedSalesTeam }),
              });
              const updateData = await updateRes.json();
              console.log('Updated sales_team with employee mapping before submit:', { status: updateRes.status, data: updateData });
            } catch (updateErr) {
              console.warn('Failed to update sales_team before submit:', updateErr);
            }
          }
        }
      }
    } catch (getDataError) {
      console.warn('Failed to get current invoice data:', getDataError);
    }

    const response = await fetch(submitUrl, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify({
        docstatus: 1,
        status: 'Unpaid'
      })
    });

    const result = await response.json();
    console.log('Submit Response Status:', response.status);
    console.log('Submit Response Data:', result);

    if (response.ok) {
      return NextResponse.json({ success: true, message: `Sales Invoice ${invoiceName} berhasil diajukan`, data: result });
    } else {
      const errorMessage = parseErpError(result, 'Gagal mengajukan Sales Invoice');
      console.error('Submit SI error:', { status: response.status, errorMessage });
      return NextResponse.json({ success: false, message: errorMessage }, { status: response.status });
    }

  } catch (error: any) {
    console.error('Submit Sales Invoice Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      error: error
    }, { status: 500 });
  }
}
