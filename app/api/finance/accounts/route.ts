import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * GET /api/finance/accounts?company=CompanyName
 * Returns all accounts with their balances from GL Entry.
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    // Build filters based on whether company is provided
    const filters: Array<[string, string, string | number]> = [];
    
    if (company) {
      filters.push(['company', '=', company]);
    }
    
    // Always exclude Stock accounts for journal entry selection
    filters.push(['account_type', '!=', 'Stock']);

    const fields = [
      'name', 
      'account_name', 
      'account_type', 
      'parent_account', 
      'is_group',
      'company'
    ];

    const accounts = await client.getList('Account', {
      fields,
      filters,
      limit_page_length: 9999,
      order_by: 'name asc'
    });

    // Fetch balances from GL Entry for each account
    interface AccountWithBasicInfo {
      name: string;
      account_name: string;
      account_type: string;
      parent_account: string;
      is_group: number;
      company: string;
    }
    const accountsWithBalance = await Promise.all(
      (accounts as AccountWithBasicInfo[] || []).map(async (account) => {
        try {
          // Get GL Entry balance for this account
          const glFilters: Array<[string, string, string]> = [
            ['account', '=', account.name]
          ];
          
          if (company) {
            glFilters.push(['company', '=', company]);
          }

          const glEntries = await client.getList<{ debit: number; credit: number }>('GL Entry', {
            fields: ['debit', 'credit'],
            filters: glFilters,
            limit_page_length: 99999
          });

          // Calculate balance (debit - credit)
          let balance = 0;
          if (glEntries && Array.isArray(glEntries)) {
            balance = glEntries.reduce((sum: number, entry) => {
              return sum + (entry.debit || 0) - (entry.credit || 0);
            }, 0);
          }

          return {
            ...account,
            balance
          };
        } catch (err) {
          console.error(`[COA] Error fetching balance for ${account.name}:`, err);
          return {
            ...account,
            balance: 0
          };
        }
      })
    );

    return NextResponse.json({ success: true, accounts: accountsWithBalance });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/finance/accounts', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
