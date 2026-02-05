import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

// Helper fetch ERPNext dengan API Key authentication
async function erpFetch(path: string) {
  const ERP_API_KEY = process.env.ERP_API_KEY;
  const ERP_API_SECRET = process.env.ERP_API_SECRET;
  
  const res = await fetch(`${ERPNEXT_API_URL}${path}`, {
    headers: {
      'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ERPNext API Error: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  return data.data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account') || '';

    console.log('COA API - Account param:', account);

    if (account) {
      // Fetch Journal for specific account
      try {
        const journal = await erpFetch(`/api/resource/Journal Entry?filters=[["accounts.account","=","${account}"]]&fields=["posting_date","voucher_type","voucher_no","accounts.debit","accounts.credit"]&limit_page_length=100`);
        return NextResponse.json(journal);
      } catch (err) {
        console.error('Journal fetch error:', err);
        return NextResponse.json([]);
      }
    } else {
      // Fetch COA REAL dari ERPNext - TANPA MOCK DATA
      console.log('Fetching REAL COA from ERPNext...');
      
      try {
        // Fetch semua accounts dengan limit yang lebih besar dan field yang lengkap
        const accounts = await erpFetch(`/api/resource/Account?limit_page_length=1000&fields=["name","account_name","account_type","parent_account","is_group"]`);
        console.log('Successfully fetched REAL COA from ERPNext:', accounts.length, 'accounts');
        
        // Filter accounts untuk company yang aktif (BAC)
        const filteredAccounts = accounts.filter((acc: Record<string, unknown>) => 
          (acc.name as string).includes(' - BAC')
        );
        
        console.log('Filtered accounts for company:', filteredAccounts.length, 'accounts');
        
        // Add balance: 0 untuk semua accounts (nanti akan dihitung dari GL)
        const accountsWithBalance = filteredAccounts.map((acc: unknown) => ({ 
          ...(acc as Record<string, unknown>), 
          balance: 0 
        }));
        
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
