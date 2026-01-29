import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const itemCode = searchParams.get('item_code');

    if (!itemCode) return NextResponse.json({ error: "item_code is required" }, { status: 400 });

    console.log('Stock check request for item:', itemCode);
    console.log('ERP_URL:', process.env.ERPNEXT_API_URL);
    console.log('API Key exists:', !!process.env.ERP_API_KEY);
    console.log('API Secret exists:', !!process.env.ERP_API_SECRET);

    try {
        // Query ke DocType Bin untuk mendapatkan stok per gudang
        const erpUrl = `${process.env.ERPNEXT_API_URL}/api/resource/Bin?fields=["warehouse","actual_qty","reserved_qty"]&filters=[["item_code","=","${itemCode}"]]`;
        console.log('ERPNext URL:', erpUrl);
        
        const response = await fetch(erpUrl, {
            headers: {
                'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('ERPNext response status:', response.status);
        console.log('ERPNext response headers:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('ERPNext error response:', errorText);
            return NextResponse.json({ 
                error: `ERPNext API Error: ${response.status} - ${errorText}` 
            }, { status: response.status });
        }

        const result = await response.json();
        console.log('ERPNext data result:', result);
        
        if (!result.data) {
            console.log('No data found in ERPNext response');
            return NextResponse.json([]);
        }

        // Format data agar mudah dibaca oleh UI
        const stockData = result.data.map((bin: any) => ({
            warehouse: bin.warehouse,
            available: bin.actual_qty - bin.reserved_qty, // Stok yang benar-benar bisa dijual
            actual: bin.actual_qty,
            reserved: bin.reserved_qty
        }));

        console.log('Formatted stock data:', stockData);

        // Filter hanya warehouse yang ada stok (available > 0)
        const availableStock = stockData.filter((stock: any) => stock.available > 0);
        
        if (availableStock.length === 0) {
            console.log('No available stock, returning all warehouses');
            // Jika tidak ada stok tersedia, kirim semua warehouse dengan available = 0
            const zeroStockData = stockData.map((stock: any) => ({
                ...stock,
                available: 0
            }));
            return NextResponse.json(zeroStockData);
        }

        return NextResponse.json(availableStock);
    } catch (error) {
        console.error('Stock check error details:', error);
        return NextResponse.json({ 
            error: `Failed to fetch stock: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}
