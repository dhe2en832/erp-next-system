import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const po = searchParams.get("po");

  if (!po) {
    return NextResponse.json(
      { success: false, message: "Missing PO parameter" },
      { status: 400 }
    );
  }

  const url = `${process.env.ERPNEXT_API_URL}/api/method/fetch_po_detail_for_pr?po=${encodeURIComponent(po)}`;

  try {
    const erpRes = await fetch(url, {
      headers: {
        Authorization: `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!erpRes.ok) {
      const errorText = await erpRes.text();
      console.error('ERPNext API error:', erpRes.status, errorText);
      return NextResponse.json(
        { success: false, message: 'ERPNext API error', error: errorText },
        { status: erpRes.status }
      );
    }

    const text = await erpRes.text();
    
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON response', raw: text },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Proxy API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
