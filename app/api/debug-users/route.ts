import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'API credentials not configured' },
        { status: 500 }
      );
    }

    // Get all users to see what's available
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/User?fields=["name","full_name","email"]&limit_page_length=50`;

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();
    console.log('All Users Response:', { status: response.status, data });

    if (response.ok && data.data) {
      // Filter users that contain our keywords
      const filteredUsers = data.data.filter((user: any) => {
        const fullName = (user.full_name || '').toLowerCase();
        return fullName.includes('deden') || 
               fullName.includes('kantor') || 
               fullName.includes('tim penjualan');
      });

      return NextResponse.json({
        success: true,
        totalUsers: data.data.length,
        filteredUsers: filteredUsers,
        allUsers: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch users' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Debug Users Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
