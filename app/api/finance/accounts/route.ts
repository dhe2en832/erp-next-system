import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClientForRequest, getSiteIdFromRequest, buildSiteAwareErrorResponse, logSiteError } from '@/lib/api-helpers';
import { ERPNextMultiClient } from '@/lib/erpnext-multi';
import { erpnextClient } from '@/lib/erpnext';

// Helper to calculate account balance from GL entries
async function getAccountBalance(client: ERPNextMultiClient | typeof erpnextClient, account: string): Promise<number> {
  try {
    // console.log(`Calculating balance for account: ${account}`);
    const response = await client.getList('GL Entry', {
      filters: [['account', '=', account]],
      fields: ['debit', 'credit'],
      limit: 1000,
    });
    
    const glEntries = response || [];
    
    // console.log(`GL Data response for ${account}:`, JSON.stringify(glEntries.slice(0, 3), null, 2));
    
    // if (glEntries.length === 0) {
    //   console.log(`No GL entries found for account ${account}, returning 0`);
    //   return 0;
    // }
    
    // console.log(`Found ${glEntries.length} GL entries for account ${account}`);
    
    const totalDebit = glEntries.reduce((sum: number, entry: { debit?: number }) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum: number, entry: { credit?: number }) => sum + (entry.credit || 0), 0);
    
    const balance = totalDebit - totalCredit;
    // console.log(`Balance for ${account}: Debit=${totalDebit}, Credit=${totalCredit}, Balance=${balance}`);
    
    return balance;
  } catch (error) {
    console.error(`Error calculating balance for account ${account}:`, error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  let siteId: string | null = null;
  
  try {
    // Extract site ID from request for error context
    siteId = await getSiteIdFromRequest(request);
    
    // Get site-aware ERPNext client
    const client = await getERPNextClientForRequest(request);
    
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account') || '';

    // console.log('COA API - Account param:', account);

    if (account) {
      // Fetch Journal for specific account
      try {
        const glEntries = await client.getList('GL Entry', {
          filters: [['account', '=', account]],
          fields: ['posting_date', 'voucher_type', 'voucher_no', 'debit', 'credit'],
          limit: 100,
          order_by: 'posting_date desc',
        });
        
        // Transform GL Entry data to match expected Journal Entry format
        const transformedJournal = glEntries.map((entry: { 
          posting_date: string; 
          voucher_type: string; 
          voucher_no: string; 
          debit?: number; 
          credit?: number 
        }) => ({
          posting_date: entry.posting_date,
          voucher_type: entry.voucher_type,
          voucher_no: entry.voucher_no,
          debit: entry.debit || 0,
          credit: entry.credit || 0
        }));
        
        return NextResponse.json(transformedJournal);
      } catch (err) {
        logSiteError(err, 'Fetch journal entries', siteId);
        return NextResponse.json([]);
      }
    } else {
      // Fetch COA from ERPNext
      // console.log('Fetching REAL COA from ERPNext...');
      
      try {
        // Get selected company from query params or use default
        const selectedCompany = searchParams.get('company');
        
        // Fetch all accounts
        const accounts = await client.getList('Account', {
          fields: ['name', 'account_name', 'account_type', 'parent_account', 'is_group', 'company'],
          limit: 1000,
        });
        
        if (!Array.isArray(accounts)) {
          console.error('Unexpected response structure:', accounts);
          throw new Error('Invalid response format from ERPNext');
        }
        
        console.log('[COA API] Fetched accounts from ERPNext:', accounts.length);
        
        // Filter accounts by selected company if specified
        let filteredAccounts = accounts;
        if (selectedCompany) {
          filteredAccounts = accounts.filter((acc: Record<string, unknown>) => 
            acc.company === selectedCompany
          );
          console.log('[COA API] Filtered for company', selectedCompany, ':', filteredAccounts.length, 'accounts');
        } else {
          console.log('[COA API] No company filter, returning all accounts');
        }
        
        // Calculate real balance for each detail account from GL entries
        const accountsWithBalance = await Promise.all(
          filteredAccounts.map(async (acc: { name: string; is_group: number; [key: string]: unknown }) => {
            if (acc.is_group === 0) {
              // Only calculate balance for detail accounts
              const balance = await getAccountBalance(client, acc.name);
              return { 
                ...acc, 
                balance 
              };
            } else {
              // Group accounts get 0 balance (will be calculated from children)
              return { 
                ...acc, 
                balance: 0 
              };
            }
          })
        );
        
        console.log('[COA API] Successfully calculated balances for', accountsWithBalance.length, 'accounts');
        
        return NextResponse.json({ success: true, accounts: accountsWithBalance });
        
      } catch (err) {
        logSiteError(err, 'Fetch COA', siteId);
        
        const errorResponse = buildSiteAwareErrorResponse(err, siteId);
        
        // Provide specific guidance based on error type
        if (errorResponse.errorType === 'authentication') {
          errorResponse.message = `Cannot access ERPNext${siteId ? ` (Site: ${siteId})` : ''}. Please ensure you are logged in with a valid session or check your API credentials.`;
        } else if (errorResponse.errorType === 'network') {
          errorResponse.message = `Cannot connect to ERPNext${siteId ? ` (Site: ${siteId})` : ''}. Please check your network connection and ensure the ERPNext server is running.`;
        } else if (errorResponse.errorType === 'configuration') {
          errorResponse.message = `ERPNext site configuration error${siteId ? ` (Site: ${siteId})` : ''}. Please check your site settings.`;
        }
        
        return NextResponse.json(
          { 
            ...errorResponse,
            accounts: [] 
          }, 
          { status: errorResponse.errorType === 'authentication' ? 401 : 500 }
        );
      }
    }
  } catch (err: unknown) {
    logSiteError(err, 'COA API', siteId);
    
    const errorResponse = buildSiteAwareErrorResponse(err, siteId);
    
    return NextResponse.json({ 
      ...errorResponse,
      accounts: [] 
    }, { status: 500 });
  }
}
