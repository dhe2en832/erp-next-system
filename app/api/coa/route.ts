import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

// Helper fetch ERPNext dengan API Key authentication
async function erpFetch(path: string) {
  const ERP_API_KEY = process.env.ERP_API_KEY;
  const ERP_API_SECRET = process.env.ERP_API_SECRET;
  
  const authString = Buffer.from(`${ERP_API_KEY}:${ERP_API_SECRET}`).toString('base64');
  
  const res = await fetch(`${ERPNEXT_API_URL}${path}`, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ERPNext API Error: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  return data;
}

// Helper to calculate account balance from GL entries
async function getAccountBalance(account: string): Promise<number> {
  try {
    console.log(`Calculating balance for account: ${account}`);
    const response = await erpFetch(`/api/resource/GL Entry?filters=[["account","=","${account}"]]&fields=["debit","credit"]&limit_page_length=1000`);
    
    // Handle different response structures
    // GL entries might be directly in response or in response.data
    let glEntries = [];
    if (response.data && Array.isArray(response.data)) {
      glEntries = response.data;
    } else if (Array.isArray(response)) {
      glEntries = response;
    }
    
    console.log(`GL Data response for ${account}:`, JSON.stringify(glEntries.slice(0, 3), null, 2));
    
    if (glEntries.length === 0) {
      console.log(`No GL entries found for account ${account}, returning 0`);
      return 0;
    }
    
    console.log(`Found ${glEntries.length} GL entries for account ${account}`);
    
    const totalDebit = glEntries.reduce((sum: number, entry: { debit?: number }) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum: number, entry: { credit?: number }) => sum + (entry.credit || 0), 0);
    
    const balance = totalDebit - totalCredit;
    console.log(`Balance for ${account}: Debit=${totalDebit}, Credit=${totalCredit}, Balance=${balance}`);
    
    return balance;
  } catch (error) {
    console.error(`Error calculating balance for account ${account}:`, error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account') || '';

    console.log('COA API - Account param:', account);

    if (account) {
      // Fetch Journal for specific account - fix the filter syntax
      try {
        // Use GL Entry API instead since it has the correct structure
        const response = await erpFetch(`/api/resource/GL Entry?filters=[["account","=","${account}"]]&fields=["posting_date","voucher_type","voucher_no","debit","credit"]&limit_page_length=100&order_by=posting_date desc`);
        
        // Handle different response structures
        let glEntries = [];
        if (response.data && Array.isArray(response.data)) {
          glEntries = response.data;
        } else if (Array.isArray(response)) {
          glEntries = response;
        }
        
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
        console.error('Journal fetch error:', err);
        return NextResponse.json([]);
      }
    } else {
      // Fetch COA REAL dari ERPNext - TANPA MOCK DATA
      console.log('Fetching REAL COA from ERPNext...');
      
      try {
        // Fetch semua accounts dengan limit yang lebih besar dan field yang lengkap
        const response = await erpFetch(`/api/resource/Account?limit_page_length=1000&fields=["name","account_name","account_type","parent_account","is_group"]`);
        
        // Handle different response structures
        const accounts = response.data || response || [];
        if (!Array.isArray(accounts)) {
          console.error('Unexpected response structure:', response);
          throw new Error('Invalid response format from ERPNext');
        }
        
        console.log('Successfully fetched REAL COA from ERPNext:', accounts.length, 'accounts');
        
        // Filter accounts untuk company yang aktif (BAC)
        const filteredAccounts = accounts.filter((acc: Record<string, unknown>) => 
          (acc.name as string).includes(' - BAC')
        );
        
        console.log('Filtered accounts for company:', filteredAccounts.length, 'accounts');
        
        // Only calculate balance for detail accounts (is_group = 0) to improve performance
        const detailAccounts = filteredAccounts.filter((acc: Record<string, unknown>) => 
          (acc.is_group as number) === 0
        );
        
        console.log('Calculating balance for detail accounts only:', detailAccounts.length, 'accounts');
        
        // Calculate real balance for each detail account from GL entries
        const accountsWithBalance = await Promise.all(
          filteredAccounts.map(async (acc: { name: string; is_group: number; [key: string]: unknown }) => {
            if (acc.is_group === 0) {
              // Only calculate balance for detail accounts
              const balance = await getAccountBalance(acc.name);
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
        
        console.log('Successfully calculated balances for all accounts');
        
        return NextResponse.json({ success: true, accounts: accountsWithBalance });
        
      } catch (err) {
        console.error('FAILED to fetch REAL COA from ERPNext:', err);
        
        // JIKA ERPNEXT TIDAK BISA DIAKSES, jangan pakai mock data!
        return NextResponse.json({ 
          success: false, 
          message: 'Tidak dapat mengakses ERPNext. Pastikan Anda sudah login dengan session yang valid.',
          error: err instanceof Error ? err.message : 'Unknown error',
          accounts: [] 
        }, { status: 401 });
      }
    }
  } catch (err: unknown) {
    console.error('COA API Error:', err);
    return NextResponse.json({ 
      success: false, 
      message: err instanceof Error ? err.message : 'Server error',
      accounts: [] 
    }, { status: 500 });
  }
}
