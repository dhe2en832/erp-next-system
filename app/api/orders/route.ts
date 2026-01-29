import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();

  // Validasi input
  if (!body.customer_name || !body.cart_items || !body.cart_items.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const erpPayload = {
    "docstatus": 1, // Langsung submit agar komisi & reservasi stok aktif
    "company": "Batasku (Demo)",
    "customer": body.customer_name,
    "transaction_date": new Date().toISOString().split('T')[0],
    "delivery_date": body.requested_delivery_date || new Date().toISOString().split('T')[0],
    "items": body.cart_items.map((item: any) => ({
      "item_code": item.sku,
      "qty": item.quantity,
      "rate": item.price,
      "delivery_date": body.requested_delivery_date || new Date().toISOString().split('T')[0],
      "warehouse": item.warehouse || "" // Kosongkan agar ERPNext auto-fill dari default
    })),
    "sales_team": [
      {
        "sales_person": body.sales_name || "Deden",
        "allocated_percentage": 100
      }
    ]
  };

  try {
    const res = await fetch(`${process.env.ERP_URL}/api/resource/Sales Order`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(erpPayload)
    });

    const result = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: result.message || "Failed to create Sales Order" }, { status: res.status });
    }

    return NextResponse.json({ 
      success: true, 
      data: result.data,
      message: "Sales Order created successfully" 
    });

  } catch (error) {
    console.error('Sales Order creation error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
