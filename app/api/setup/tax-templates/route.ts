import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

/**
 * GET /api/setup/tax-templates
 * 
 * Fetch Tax Templates from ERPNext
 * 
 * Query Parameters:
 * - type: "Sales" or "Purchase" (required)
 * - company: Company name (required)
 * 
 * Response:
 * {
 *   success: boolean;
 *   data?: TaxTemplate[];
 *   message?: string;
 * }
 * 
 * Requirements: 1.6
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== GET TAX TEMPLATES ===');
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const company = searchParams.get('company');
    
    // Validate required parameters
    if (!type) {
      return NextResponse.json({
        success: false,
        message: 'Query parameter "type" is required (Sales or Purchase)'
      }, { status: 400 });
    }
    
    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Query parameter "company" is required'
      }, { status: 400 });
    }
    
    // Validate type parameter
    if (type !== 'Sales' && type !== 'Purchase') {
      return NextResponse.json({
        success: false,
        message: 'Query parameter "type" must be either "Sales" or "Purchase"'
      }, { status: 400 });
    }

    // Get API credentials
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('Missing API credentials');
      return NextResponse.json({
        success: false,
        message: 'API credentials not configured'
      }, { status: 500 });
    }

    // Determine DocType based on type
    const docType = type === 'Sales' 
      ? 'Sales Taxes and Charges Template' 
      : 'Purchase Taxes and Charges Template';

    // Build filters
    // Filter: company = company AND disabled = 0 (active only)
    const filters = [
      ["company", "=", company],
      ["disabled", "=", 0]
    ];

    // Build ERPNext API URL
    // Note: We need to fetch full documents to get child table data
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/${encodeURIComponent(docType)}?filters=${encodeURIComponent(JSON.stringify(filters))}`;
    
    console.log('Tax Template ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Tax Template Response Status:', response.status);

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: data.exc || data.message || 'Failed to fetch tax templates'
      }, { status: response.status });
    }

    // Fetch full details for each template to get child table data
    const templateNames = data.data || [];
    const templates = [];

    console.log(`Fetching details for ${templateNames.length} templates...`);

    for (const templateName of templateNames) {
      try {
        const detailUrl = `${ERPNEXT_API_URL}/api/resource/${encodeURIComponent(docType)}/${encodeURIComponent(templateName.name)}`;
        console.log(`Fetching template detail: ${detailUrl}`);
        
        const detailResponse = await fetch(detailUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          const template = detailData.data;
          
          console.log(`Template ${template.name} has ${(template.taxes || []).length} tax rows`);
          
          templates.push({
            name: template.name,
            title: template.title,
            company: template.company,
            is_default: template.is_default || 0,
            taxes: (template.taxes || []).map((tax: any) => ({
              charge_type: tax.charge_type,
              account_head: tax.account_head,
              description: tax.description || tax.charge_type,
              rate: tax.rate || 0,
            }))
          });
        } else {
          console.error(`Failed to fetch template ${templateName.name}: ${detailResponse.status}`);
        }
      } catch (err) {
        console.error(`Error fetching details for template ${templateName.name}:`, err);
      }
    }

    console.log(`Found ${templates.length} active tax templates for ${type}`);
    console.log('Templates with taxes:', JSON.stringify(templates, null, 2));

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error: any) {
    console.error('Tax Template API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.toString()
    }, { status: 500 });
  }
}
