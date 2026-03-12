import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const siteId = await getSiteIdFromRequest(request);

  try {
    const { name } = await params;

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

    if (!apiKey && !apiSecret && !sid) {
      return NextResponse.json(
        { success: false, message: 'API keys not configured. Please set ERP_API_KEY and ERP_API_SECRET environment variables.' },
        { status: 401 }
      );
    }

    // Get site-aware client
    const client = await getERPNextClientForRequest(request);

    try {
      // Submit the delivery note using client method
      const result = await client.submit('Delivery Note', name) as any;

      const deliveryNote = result.docs?.[0] || result.doc || result;

      return NextResponse.json({
        success: true,
        data: deliveryNote,
        message: 'Delivery Note submitted successfully'
      });

    } catch (submitError: any) {
      // Handle ERPNext-specific errors with detailed stock information
      let errorMessage = 'Failed to submit delivery note';

      const errorData = submitError.response || submitError;

      if (errorData && typeof errorData === 'object') {
        // Handle ERPNext exception format
        if ('exception' in errorData) {
          const exceptionStr = String(errorData.exception);

          // Check for NegativeStockError specifically
          if (exceptionStr.includes('NegativeStockError')) {
            // Extract item and warehouse info from error message
            const stockErrorMatch = exceptionStr.match(/([\d.]+)\s+unit\s+([^:]+):\s*([^:]+)\s+dibutuhkan\s+dalam\s+Gudang\s+([^\s]+)/);

            if (stockErrorMatch) {
              const [, qtyNeeded, itemCode, itemName, warehouse] = stockErrorMatch;

              try {
                // Fetch real-time stock information using Bin endpoint
                const bins = await client.getList('Bin', {
                  fields: ['actual_qty'],
                  filters: [
                    ['item_code', '=', itemCode.trim()],
                    ['warehouse', '=', warehouse.trim()]
                  ],
                  limit: 1
                }) as any[];

                if (bins && bins.length > 0) {
                  const currentStock = bins[0].actual_qty || 0;

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
        } else if ('exc' in errorData) {
          try {
            const excData = JSON.parse(String(errorData.exc));
            errorMessage = `❌ ${excData.exc_type}: ${excData.message}`;
          } catch {
            errorMessage = String(errorData.exc || 'Gagal submit delivery note');
          }
        } else if ('message' in errorData) {
          errorMessage = `❌ ${String(errorData.message)}`;
        } else if ('_server_messages' in errorData) {
          try {
            const serverMessages = JSON.parse(String(errorData._server_messages));
            if (Array.isArray(serverMessages) && serverMessages.length > 0) {
              const firstMessage = typeof serverMessages[0] === 'string' ? JSON.parse(serverMessages[0]) : serverMessages[0];
              errorMessage = `❌ ${firstMessage.message || firstMessage.title || String(serverMessages[0])}`;
            }
          } catch {
            errorMessage = `❌ ${String(errorData._server_messages)}`;
          }
        }
      }

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    logSiteError(error, 'POST /api/sales/delivery-notes/[name]/submit', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
