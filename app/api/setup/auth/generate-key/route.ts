import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { usr, pwd } = await request.json();

    console.log('=== Generate API Key ===');

    // Step 1: Login to ERPNext
    const loginResponse = await fetch(`${ERPNEXT_API_URL}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr,
        pwd,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Login failed' },
        { status: 401 }
      );
    }

    // Step 2: Generate API Key using console command
    const sessionCookie = loginResponse.headers.get('set-cookie') || '';
    
    // Use frappe.generate_api_keys via API
    const generateKeyResponse = await fetch(`${ERPNEXT_API_URL}/api/method/frappe.generate_api_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        user: usr
      }),
    });

    let apiKeyData = {};
    if (generateKeyResponse.ok) {
      apiKeyData = await generateKeyResponse.json();
      console.log('API Key generated:', apiKeyData);
    }

    // Step 3: Get the generated API keys from user document
    const userResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/User/${usr}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
    });

    let apiCredentials = {};
    if (userResponse.ok) {
      const userData = await userResponse.json();
      apiCredentials = {
        api_key: userData.data?.api_key,
        api_secret: userData.data?.api_secret,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'API Key generation attempted',
      api_credentials: apiCredentials,
      generation_response: apiKeyData,
    });

  } catch (error) {
    console.error('Generate API Key Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
