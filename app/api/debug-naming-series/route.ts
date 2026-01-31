import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    console.log('=== DEBUG NAMING SERIES ===');
    
    const authString = Buffer.from(`${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`).toString('base64');
    
    // 1. Get existing DN untuk melihat naming pattern
    console.log('1. Getting existing DN with MAT-DN prefix...');
    const dnResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Delivery Note?fields=["name","naming_series"]&filters=[["name","like","MAT-DN%"]]&limit_page_length=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // 2. Get naming series configuration
    console.log('2. Getting naming series configuration...');
    const seriesResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Naming Series?fields=["name","prefix","options"]&filters=[["document_type","=","Delivery Note"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    // 3. Get company-specific settings
    console.log('3. Getting company settings...');
    const companyResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Company?fields=["name","abbr","default_naming_series"]&filters=[["name","=","Entitas 1 (Demo)"]]`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
    });

    const dnData = dnResponse.ok ? await dnResponse.json() : { data: [] };
    const seriesData = seriesResponse.ok ? await seriesResponse.json() : { data: [] };
    const companyData = companyResponse.ok ? await companyResponse.json() : { data: [] };
    
    console.log('DN Data:', dnData);
    console.log('Series Data:', seriesData);
    console.log('Company Data:', companyData);
    
    return NextResponse.json({
      success: true,
      analysis: {
        existing_dn: dnData.data || [],
        naming_series: seriesData.data || [],
        company_info: companyData.data || []
      },
      findings: {
        current_prefix: dnData.data?.[0]?.naming_series || 'DN-.YYYY.-',
        company_abbr: companyData.data?.[0]?.abbr || '',
        available_series: seriesData.data?.map((s: any) => s.prefix) || []
      },
      recommendations: [
        'Check company abbreviation for prefix',
        'Verify available naming series options',
        'Use correct prefix based on company settings'
      ]
    });

  } catch (error: unknown) {
    console.error('Debug naming series error:', error);
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
