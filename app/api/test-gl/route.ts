import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

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

export async function GET() {
  try {
    console.log('Testing GL Entry API...');
    
    // Test 1: Get all GL entries (limit 10)
    const allGL = await erpFetch('/api/resource/GL Entry?limit_page_length=10&fields=["name","account","debit","credit","posting_date"]');
    console.log('All GL Entries:', JSON.stringify(allGL, null, 2));
    
    // Test 2: Get GL entries for a specific account
    const testAccount = '1111.001 - Kas Kecil - BAC';
    const specificGL = await erpFetch(`/api/resource/GL Entry?filters=[["account","=","${testAccount}"]]&fields=["debit","credit","posting_date"]&limit_page_length=10`);
    console.log(`GL Entries for ${testAccount}:`, JSON.stringify(specificGL, null, 2));
    
    // Test 3: Check what accounts exist
    const accounts = await erpFetch('/api/resource/Account?limit_page_length=5&fields=["name","account_name"]');
    console.log('Sample Accounts:', JSON.stringify(accounts, null, 2));
    
    return NextResponse.json({
      success: true,
      allGL: allGL,
      specificGL: specificGL,
      accounts: accounts
    });
    
  } catch (error: unknown) {
    console.error('GL Test Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
