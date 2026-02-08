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
    const testAccount = '1111.001 - Kas Kecil - BAC';
    
    // Test balance calculation for one account
    const response = await erpFetch(`/api/resource/GL Entry?filters=[["account","=","${testAccount}"]]&fields=["debit","credit"]&limit_page_length=1000`);
    
    // Handle different response structures
    let glEntries = [];
    if (response.data && Array.isArray(response.data)) {
      glEntries = response.data;
    } else if (Array.isArray(response)) {
      glEntries = response;
    }
    
    if (glEntries.length === 0) {
      return NextResponse.json({
        account: testAccount,
        balance: 0,
        message: 'No GL entries found',
        responseStructure: typeof response,
        glData: glEntries
      });
    }
    
    const totalDebit = glEntries.reduce((sum: number, entry: { debit?: number }) => sum + (entry.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum: number, entry: { credit?: number }) => sum + (entry.credit || 0), 0);
    const balance = totalDebit - totalCredit;
    
    return NextResponse.json({
      account: testAccount,
      balance: balance,
      totalDebit: totalDebit,
      totalCredit: totalCredit,
      entryCount: glEntries.length,
      entries: glEntries.slice(0, 3) // Show first 3 entries
    });
    
  } catch (error: unknown) {
    console.error('Balance test error:', error);
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
