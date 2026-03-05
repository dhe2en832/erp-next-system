import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClientForRequest, getSiteIdFromRequest, buildSiteAwareErrorResponse, logSiteError } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  let siteId: string | null = null;
  
  try {
    // Extract site ID from request for error context
    siteId = await getSiteIdFromRequest(request);
    
    // Get site-aware ERPNext client
    const client = await getERPNextClientForRequest(request);
    
    const body = await request.json();
    const { company, fiscal_year } = body;

    if (!company || !fiscal_year) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Company and fiscal year are required' },
        { status: 400 }
      );
    }

    // Get fiscal year details
    const fiscalYearDoc = await client.get('Fiscal Year', fiscal_year);
    const yearStartDate = new Date(fiscalYearDoc.year_start_date);
    const yearEndDate = new Date(fiscalYearDoc.year_end_date);

    // Generate monthly periods
    const createdPeriods: unknown[] = [];
    const skippedPeriods: unknown[] = [];
    const errors: unknown[] = [];

    let currentDate = new Date(yearStartDate);
    let monthIndex = 0;

    while (currentDate <= yearEndDate && monthIndex < 12) {
      const periodStartDate = new Date(currentDate);
      
      // Calculate end date (last day of month)
      const periodEndDate = new Date(
        periodStartDate.getFullYear(),
        periodStartDate.getMonth() + 1,
        0 // Last day of month
      );

      // Don't exceed fiscal year end date
      if (periodEndDate > yearEndDate) {
        periodEndDate.setTime(yearEndDate.getTime());
      }

      // Format dates as YYYY-MM-DD
      const startDateStr = periodStartDate.toISOString().split('T')[0];
      const endDateStr = periodEndDate.toISOString().split('T')[0];

      // Generate period name (e.g., "Jan 2026 - BAC", "Feb 2026 - BAC")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[periodStartDate.getMonth()];
      const year = periodStartDate.getFullYear();
      const companyAbbr = company.split(' ').map((w: string) => w[0]).join('').toUpperCase();
      const periodName = `${monthName} ${year} - ${companyAbbr}`;

      try {
        // Check if period already exists
        const existing = await client.getList('Accounting Period', {
          filters: [
            ['company', '=', company],
            ['start_date', '=', startDateStr],
            ['end_date', '=', endDateStr],
          ],
          fields: ['name'],
          limit: 1,
        });

        if (existing.length > 0) {
          skippedPeriods.push({
            period_name: periodName,
            reason: 'Period already exists',
            existing_name: existing[0].name,
          });
        } else {
          // Create period
          const period = await client.insert('Accounting Period', {
            period_name: periodName,
            company: company,
            start_date: startDateStr,
            end_date: endDateStr,
            period_type: 'Monthly',
            fiscal_year: fiscal_year,
            status: 'Open',
          });

          createdPeriods.push(period);
        }
      } catch (error: unknown) {
        logSiteError(error, `Create accounting period: ${periodName}`, siteId);
        errors.push({
          period_name: periodName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Move to next month
      currentDate = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, 1);
      monthIndex++;
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdPeriods.length} monthly periods`,
      data: {
        created: createdPeriods,
        skipped: skippedPeriods,
        errors: errors,
        summary: {
          total_created: createdPeriods.length,
          total_skipped: skippedPeriods.length,
          total_errors: errors.length,
        },
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'Generate monthly periods', siteId);
    
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    
    // Provide specific guidance based on error type
    if (errorResponse.errorType === 'authentication') {
      errorResponse.message = `Authentication failed${siteId ? ` for site ${siteId}` : ''}. Please check your API credentials.`;
    } else if (errorResponse.errorType === 'network') {
      errorResponse.message = `Cannot connect to ERPNext${siteId ? ` (Site: ${siteId})` : ''}. Please check your network connection.`;
    } else if (errorResponse.errorType === 'configuration') {
      errorResponse.message = `Site configuration error${siteId ? ` (Site: ${siteId})` : ''}. Please verify your site settings.`;
    }
    
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}
