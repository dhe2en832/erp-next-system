import { NextRequest, NextResponse } from 'next/server';
import { parseErpError } from '../../../../../../utils/erp-error';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { name } = await params;
    const invoiceName = name;
    
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Prioritize API Key authentication to avoid CSRF issues
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No session or API key found' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Get current invoice data to verify custom fields before submit
    try {
      const currentData = await client.get('Sales Invoice', invoiceName);

      // Auto-fill employee for sales team if missing
      const salesTeam = currentData.sales_team || [];
      const missingEmployeeEntries = salesTeam.filter((st: any) => st.sales_person && !st.employee);
      
      if (missingEmployeeEntries.length > 0) {
        const updatedSalesTeam = await Promise.all(salesTeam.map(async (st: any) => {
          if (st.employee || !st.sales_person) return st;
          
          try {
            // Fetch employee for sales person
            const employees = await client.getList('Employee', {
              filters: [['sales_person', '=', st.sales_person]],
              limit: 1
            });
            
            if (employees && employees.length > 0) {
              return { ...st, employee: employees[0].name };
            }
          } catch (empErr) {
            console.warn('Employee lookup failed for sales person', st.sales_person, empErr);
          }
          return st;
        }));

        const hasNewEmployee = updatedSalesTeam.some((st: any, idx: number) => 
          st.employee && !salesTeam[idx]?.employee
        );
        
        if (hasNewEmployee) {
          try {
            await client.update('Sales Invoice', invoiceName, { sales_team: updatedSalesTeam });
          } catch (updateErr) {
            console.warn('Failed to update sales_team before submit:', updateErr);
          }
        }
      }
    } catch (getDataError) {
      console.warn('Failed to get current invoice data:', getDataError);
    }

    // Submit invoice using client method
    const result = await client.submit('Sales Invoice', invoiceName);

    return NextResponse.json({ 
      success: true, 
      message: `Sales Invoice ${invoiceName} berhasil diajukan`, 
      data: result 
    });

  } catch (error: any) {
    logSiteError(error, 'POST /api/sales/invoices/[name]/submit', siteId);
    const errorMessage = parseErpError({ message: error.message }, 'Gagal mengajukan Sales Invoice');
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
