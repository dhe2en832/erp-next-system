import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get('customer');

    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer parameter is required'
      }, { status: 400 });
    }

    // Environment variables
    const BASE_URL = process.env.ERPNEXT_API_URL || '';
    const API_KEY = process.env.ERP_API_KEY || '';
    const API_SECRET = process.env.ERP_API_SECRET || '';

    if (!BASE_URL || !API_KEY || !API_SECRET) {
      return NextResponse.json({
        success: false,
        message: 'Server configuration error'
      }, { status: 500 });
    }

    console.log('Fetching Customer Sales Team:', customer);

    // Get customer with sales team child table
    const customerUrl = `${BASE_URL}/api/resource/Customer/${customer}?fields=["name","customer_name","sales_team"]`;
    
    const response = await fetch(customerUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Customer Sales Team Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch customer sales team:', errorText);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch customer sales team',
        error: errorText
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('Customer Sales Team Response Data:', data);

    // Handle case when customer not found
    if (!data.success || !data.data) {
      console.warn('Customer not found or no data returned');
      return NextResponse.json({
        success: false,
        message: 'Customer not found or no data returned'
      }, { status: 404 });
    }

    // Extract sales team data from child table
    const salesTeam = data.data.sales_team || [];
    console.log('Sales Team Data:', salesTeam);

    // Get unique sales persons from sales team - look for sales_person field
    const salesPersons = [...new Set(
      salesTeam
        .map((member: any) => member.sales_person) // Extract sales_person field
        .filter(Boolean) // Remove null/undefined
    )];
    console.log('Unique Sales Persons:', salesPersons);

    return NextResponse.json({
      success: true,
      data: {
        customer: data.data,
        sales_team: salesTeam,
        sales_persons: salesPersons
      }
    });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Customer sales team API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
