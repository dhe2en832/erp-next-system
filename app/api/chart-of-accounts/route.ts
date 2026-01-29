import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const accountType = searchParams.get('account_type');

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      filters += `,"or",["account_name","like","%${search}%"],["name","like","%${search}%"]`;
    }
    
    if (accountType) {
      filters += `,"and",["account_type","=","${accountType}"]`;
    }
    
    filters += ']';

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Account?filters=${encodeURIComponent(filters)}&fields=["name","account_name","account_type","parent_account","is_group","root_type","company"]&order_by=account_name asc`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sid}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch chart of accounts' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Chart of Accounts API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { account_name, account_type, parent_account, is_group, root_type } = body;

    if (!account_name || !account_type) {
      return NextResponse.json(
        { success: false, message: 'Account name and type are required' },
        { status: 400 }
      );
    }

    const accountData = {
      doctype: 'Account',
      account_name,
      account_type,
      parent_account: parent_account || '',
      is_group: is_group || false,
      root_type: root_type || account_type,
      company: body.company || 'Batasku (Demo)'
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
      body: JSON.stringify(accountData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create account' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Account creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, account_name, account_type, parent_account, is_group, root_type } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Account name is required' },
        { status: 400 }
      );
    }

    const accountData = {
      account_name,
      account_type,
      parent_account: parent_account || '',
      is_group: is_group || false,
      root_type: root_type || account_type,
    };

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Account/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
      body: JSON.stringify(accountData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to update account' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Account update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    if (!sid) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Account name is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Account/${name}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sid}`
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to delete account' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
