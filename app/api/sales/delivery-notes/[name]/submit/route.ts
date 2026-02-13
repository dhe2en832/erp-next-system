import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    console.log('=== DELIVERY NOTE SUBMIT API CALLED ===');
    const { name } = await params;
    
    console.log('Delivery Note Name:', name);
    console.log('Request Method:', request.method);
    console.log('Request Headers:', Object.fromEntries(request.headers.entries()));
    
    // Validate name parameter
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Delivery Note name is required' },
        { status: 400 }
      );
    }

    const cookies = request.cookies;
    const sid = cookies.get('sid')?.value;

    // Prioritize API Key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    console.log('Submitting delivery note:', name);
    console.log('Available auth methods:', { 
      hasApiKey: !!(apiKey && apiSecret), 
      hasSession: !!sid 
    });

    let response: Response | undefined;
    let data: Record<string, unknown> | undefined;

    if (apiKey && apiSecret) {
      // Try API Key authentication first
      console.log('Using API key authentication');
      
      try {
        const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/Delivery%20Note/${encodeURIComponent(name)}`;
        const requestBody = JSON.stringify({
          docstatus: 1
        });
        
        console.log('Making ERPNext Request:');
        console.log('URL:', erpNextUrl);
        console.log('Method: PUT');
        console.log('Headers:', {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'Content-Type': 'application/json',
        });
        console.log('Body:', requestBody);
        
        response = await fetch(erpNextUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });

        data = await response.json();
        console.log('API Key Response:', { status: response.status, data });
        
        if (response.ok) {
          return NextResponse.json({
            success: true,
            data: (data as Record<string, unknown> & { docs?: unknown[]; doc?: unknown })?.docs?.[0] || (data as Record<string, unknown> & { doc?: unknown })?.doc || data,
            message: 'Delivery Note submitted successfully'
          });
        } else {
          // If API key fails, return the error immediately (no fallback)
          let errorMessage = 'Failed to submit delivery note';
          
          if (data && typeof data === 'object') {
            console.log('Error data keys:', Object.keys(data));
            console.log('Full error data:', JSON.stringify(data, null, 2));
            
            // Handle ERPNext exception format
            if ('exception' in data) {
              const exceptionStr = String((data as Record<string, unknown>).exception);
              
              // Check for NegativeStockError specifically
              if (exceptionStr.includes('NegativeStockError')) {
                // Extract item and warehouse info from error message
                // Format: "1.0 unit Barang A008: BAJARINGAN BUKIT 75 x 0.75 dibutuhkan dalam Gudang Toko - BAC untuk menyelesaikan transaksi ini."
                const stockErrorMatch = exceptionStr.match(/([\d.]+)\s+unit\s+([^:]+):\s*([^:]+)\s+dibutuhkan\s+dalam\s+Gudang\s+([^\s]+)/);
                
                if (stockErrorMatch) {
                  const [, qtyNeeded, itemCode, itemName, warehouse] = stockErrorMatch;
                  
                  try {
                    // Fetch real-time stock information using Bin endpoint
                    const stockResponse = await fetch(`${ERPNEXT_API_URL}/api/resource/Bin?fields=["actual_qty"]&filters=[["item_code","=","${itemCode.trim()}"],["warehouse","=","${warehouse.trim()}"]]&limit=1`, {
                      headers: {
                        'Authorization': `token ${apiKey}:${apiSecret}`,
                        'Content-Type': 'application/json',
                      },
                    });
                    
                    if (stockResponse.ok) {
                      const stockData = await stockResponse.json();
                      const currentStock = stockData.data?.[0]?.actual_qty || 0;
                      
                      errorMessage = `❌ Stok Tidak Mencukupi!\n\n📦 Item: ${itemName.trim()}\n🏭 Gudang: ${warehouse.trim()}\n📊 Stok Tersedia: ${currentStock} unit\n📈 Stok Dibutuhkan: ${qtyNeeded} unit\n📉 Kekurangan: ${Math.max(0, parseFloat(qtyNeeded) - parseFloat(currentStock.toString()))} unit\n\n💡 Solusi:\n• Tambah stok item di gudang ${warehouse.trim()}\n• Pindahkan stok dari gudang lain\n• Kurangi jumlah pengiriman`;
                    } else {
                      errorMessage = `❌ Stok Tidak Mencukupi!\n\n📦 Item: ${itemName.trim()}\n🏭 Gudang: ${warehouse.trim()}\n📈 Stok Dibutuhkan: ${qtyNeeded} unit\n\n⚠️ Tidak dapat memeriksa stok saat ini. Silakan periksa stok manual di ERPNext.`;
                    }
                  } catch (stockCheckError) {
                    console.error('Error checking stock:', stockCheckError);
                    errorMessage = `❌ Stok Tidak Mencukupi!\n\n📦 Item: ${itemName.trim()}\n🏭 Gudang: ${warehouse.trim()}\n📈 Stok Dibutuhkan: ${qtyNeeded} unit\n\n⚠️ Gagal memeriksa stok real-time. Silakan periksa stok manual.`;
                  }
                } else {
                  // Fallback: try to extract at least the item name and quantity
                  const fallbackMatch = exceptionStr.match(/([\d.]+)\s+unit\s+([^:]+):\s*([^.]+)/);
                  if (fallbackMatch) {
                    const [, qtyNeeded, itemCode, itemName] = fallbackMatch;
                    errorMessage = `❌ Stok Tidak Mencukupi!\n\n📦 Item: ${itemName.trim()}\n📈 Stok Dibutuhkan: ${qtyNeeded} unit\n\n⚠️ Detail gudang tidak dapat diparsing. Silakan periksa stok manual di ERPNext.`;
                  } else {
                    errorMessage = `❌ Stok Tidak Mencukupi! ${exceptionStr}`;
                  }
                }
              } else {
                // Handle other exceptions
                const match = exceptionStr.match(/([^:]+):\s*([^:]+):?\s*([^.]*)/);
                if (match) {
                  errorMessage = `❌ Error: ${match[2].trim()}: ${match[3].trim()}`;
                } else {
                  errorMessage = `❌ Error: ${exceptionStr}`;
                }
              }
            } else if ('exc' in data) {
              try {
                const excData = JSON.parse(String((data as Record<string, unknown>).exc));
                errorMessage = `❌ ${excData.exc_type}: ${excData.message}`;
              } catch {
                errorMessage = String((data as Record<string, unknown>).exc || 'Gagal submit delivery note');
              }
            } else if ('message' in data) {
              errorMessage = `❌ ${String((data as Record<string, unknown>).message)}`;
            } else if ('_server_messages' in data) {
              try {
                const serverMessages = JSON.parse(String((data as Record<string, unknown>)._server_messages));
                if (Array.isArray(serverMessages) && serverMessages.length > 0) {
                  const firstMessage = typeof serverMessages[0] === 'string' ? JSON.parse(serverMessages[0]) : serverMessages[0];
                  errorMessage = `❌ ${firstMessage.message || firstMessage.title || String(serverMessages[0])}`;
                }
              } catch {
                errorMessage = `❌ ${String((data as Record<string, unknown>)._server_messages)}`;
              }
            }
          }
          
          return NextResponse.json(
            { success: false, message: errorMessage },
            { status: response.status }
          );
        }
      } catch (apiError) {
        console.error('API Key authentication failed:', apiError);
        return NextResponse.json(
          { 
            success: false, 
            message: `API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}` 
          },
          { status: 500 }
        );
      }
    }

    // No API keys configured
    return NextResponse.json(
      { success: false, message: 'API keys not configured. Please set ERP_API_KEY and ERP_API_SECRET environment variables.' },
      { status: 401 }
    );
    
  } catch (error) {
    console.error('Delivery Note Submit Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
