import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';
import { taxTemplateCache } from '@/lib/cache';

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
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    // console.log('=== GET TAX TEMPLATES ===');
    
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

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Determine DocType based on type
    const docType = type === 'Sales' 
      ? 'Sales Taxes and Charges Template' 
      : 'Purchase Taxes and Charges Template';

    // Build cache key: siteId-type-company
    const cacheKey = `${siteId}-${type}-${company}`;

    // Use cache to reduce API calls
    const templates = await taxTemplateCache.get(cacheKey, async () => {
      // Build filters
      // Filter: company = company AND disabled = 0 (active only)
      const filters = [
        ["company", "=", company],
        ["disabled", "=", 0]
      ];

      // Fetch list of tax templates using client
      const templateNames = await client.getList(docType, { 
        filters,
        fields: ['name']
      }) as any[];

      console.log(`[Tax Templates] Found ${templateNames.length} templates from getList`);
      console.log(`[Tax Templates] Template names:`, templateNames.map((t: any) => t.name));

      // Fetch full details for each template to get child table data
      const fetchedTemplates = [];

      for (const templateName of templateNames) {
        try {
          console.log(`[Tax Templates] Fetching detail for: ${templateName.name}`);
          
          const template = await client.get(docType, templateName.name) as any;
          
          console.log(`[Tax Templates] Fetched ${templateName.name} - Company: ${template.company}, Taxes: ${(template.taxes || []).length}`);
          
          // Verify template company matches requested company
          // Skip templates with mismatched company (e.g., from restored database)
          if (template.company !== company) {
            console.log(`[Tax Templates] Skipping template ${templateName.name} - company mismatch (${template.company} != ${company})`);
            continue;
          }
          
          fetchedTemplates.push({
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
          
          console.log(`[Tax Templates] Added template ${templateName.name} to result`);
        } catch (err) {
          console.error(`[Tax Templates] Error fetching template ${templateName.name}:`, err);
          // Continue with other templates even if one fails
          continue;
        }
      }
      
      console.log(`[Tax Templates] Total templates in response: ${fetchedTemplates.length}`);
      return fetchedTemplates;
    });

    // console.log(`Found ${templates.length} active tax templates for ${type}`);
    // console.log('Templates with taxes:', JSON.stringify(templates, null, 2));

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/setup/tax-templates', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
