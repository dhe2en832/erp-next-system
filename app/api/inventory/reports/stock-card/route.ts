import { NextRequest, NextResponse } from 'next/server';
import { getErpAuthHeaders } from '@/utils/erpnext-auth';
import { StockLedgerEntry } from '@/types/stock-card';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError 
} from '@/lib/api-helpers';

/**
 * Validate date format (YYYY-MM-DD)
 * Requirements: 12.2, 12.6
 */
function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return true; // Empty is valid (optional parameter)
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate date range (end date must be after or equal to start date)
 * Requirements: 12.2, 12.6
 */
function isValidDateRange(from_date: string | null, to_date: string | null): boolean {
  if (!from_date || !to_date) return true; // If either is missing, skip validation
  
  const fromDate = new Date(from_date);
  const toDate = new Date(to_date);
  
  return toDate >= fromDate;
}

/**
 * Fetch item names for a list of item codes
 * Requirements: 9.1-9.6
 */
async function fetchItemNames(
  itemCodes: string[],
  client: any
): Promise<Map<string, string>> {
  if (itemCodes.length === 0) return new Map();
  
  const uniqueItemCodes = [...new Set(itemCodes)];
  const itemNameMap = new Map<string, string>();
  
  try {
    const filters = [['item_code', 'in', uniqueItemCodes]];
    const fields = ['item_code', 'item_name'];
    
    const items = await client.getList('Item', {
      fields,
      filters,
      limit_page_length: 0
    });
    
    for (const item of (items || [])) {
      itemNameMap.set(item.item_code, item.item_name || item.item_code);
    }
  } catch (error) {
    console.error('Error fetching item names:', error);
  }
  
  return itemNameMap;
}

/**
 * Fetch customer names for a list of customer IDs
 * Requirements: 9.3
 */
async function fetchCustomerNames(
  customerIds: string[],
  client: any
): Promise<Map<string, string>> {
  if (customerIds.length === 0) return new Map();
  
  const uniqueCustomerIds = [...new Set(customerIds)];
  const customerNameMap = new Map<string, string>();
  
  try {
    const filters = [['name', 'in', uniqueCustomerIds]];
    const fields = ['name', 'customer_name'];
    
    const customers = await client.getList('Customer', {
      fields,
      filters,
      limit_page_length: 0
    });
    
    for (const customer of (customers || [])) {
      customerNameMap.set(customer.name, customer.customer_name || customer.name);
    }
  } catch (error) {
    console.error('Error fetching customer names:', error);
  }
  
  return customerNameMap;
}

/**
 * Fetch supplier names for a list of supplier IDs
 * Requirements: 9.4
 */
async function fetchSupplierNames(
  supplierIds: string[],
  client: any
): Promise<Map<string, string>> {
  if (supplierIds.length === 0) return new Map();
  
  const uniqueSupplierIds = [...new Set(supplierIds)];
  const supplierNameMap = new Map<string, string>();
  
  try {
    const filters = [['name', 'in', uniqueSupplierIds]];
    const fields = ['name', 'supplier_name'];
    
    const suppliers = await client.getList('Supplier', {
      fields,
      filters,
      limit_page_length: 0
    });
    
    for (const supplier of (suppliers || [])) {
      supplierNameMap.set(supplier.name, supplier.supplier_name || supplier.name);
    }
  } catch (error) {
    console.error('Error fetching supplier names:', error);
  }
  
  return supplierNameMap;
}

/**
 * Fetch party information (customer/supplier) for vouchers
 * Requirements: 9.3, 9.4
 */
async function fetchPartyInfo(
  vouchers: Array<{ voucher_type: string; voucher_no: string }>,
  client: any
): Promise<Map<string, { party_type: 'Customer' | 'Supplier'; party_name: string }>> {
  const partyInfoMap = new Map<string, { party_type: 'Customer' | 'Supplier'; party_name: string }>();
  
  // Group vouchers by type
  const salesInvoices = vouchers.filter(v => v.voucher_type === 'Sales Invoice').map(v => v.voucher_no);
  const deliveryNotes = vouchers.filter(v => v.voucher_type === 'Delivery Note').map(v => v.voucher_no);
  const purchaseReceipts = vouchers.filter(v => v.voucher_type === 'Purchase Receipt').map(v => v.voucher_no);
  
  try {
    // Fetch Sales Invoice customer info
    if (salesInvoices.length > 0) {
      const filters = [['name', 'in', [...new Set(salesInvoices)]]];
      const fields = ['name', 'customer', 'customer_name'];
      
      const invoices = await client.getList('Sales Invoice', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const invoice of (invoices || [])) {
        partyInfoMap.set(invoice.name, {
          party_type: 'Customer',
          party_name: invoice.customer_name || invoice.customer
        });
      }
    }
    
    // Fetch Delivery Note customer info
    if (deliveryNotes.length > 0) {
      const filters = [['name', 'in', [...new Set(deliveryNotes)]]];
      const fields = ['name', 'customer', 'customer_name'];
      
      const notes = await client.getList('Delivery Note', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const note of (notes || [])) {
        partyInfoMap.set(note.name, {
          party_type: 'Customer',
          party_name: note.customer_name || note.customer
        });
      }
    }
    
    // Fetch Purchase Receipt supplier info
    if (purchaseReceipts.length > 0) {
      const filters = [['name', 'in', [...new Set(purchaseReceipts)]]];
      const fields = ['name', 'supplier', 'supplier_name'];
      
      const receipts = await client.getList('Purchase Receipt', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const receipt of (receipts || [])) {
        partyInfoMap.set(receipt.name, {
          party_type: 'Supplier',
          party_name: receipt.supplier_name || receipt.supplier
        });
      }
    }
  } catch (error) {
    console.error('Error fetching party info:', error);
  }
  
  return partyInfoMap;
}

/**
 * Fetch warehouse information for Stock Entry transfers
 * Requirements: 9.1, 9.2, 9.5
 */
async function fetchStockEntryWarehouses(
  stockEntryVouchers: string[],
  client: any
): Promise<Map<string, { source_warehouse?: string; target_warehouse?: string }>> {
  if (stockEntryVouchers.length === 0) return new Map();
  
  const warehouseMap = new Map<string, { source_warehouse?: string; target_warehouse?: string }>();
  
  try {
    const filters = [['name', 'in', [...new Set(stockEntryVouchers)]]];
    const fields = ['name', 'from_warehouse', 'to_warehouse'];
    
    const entries = await client.getList('Stock Entry', {
      fields,
      filters,
      limit_page_length: 0
    });
    
    for (const entry of (entries || [])) {
      warehouseMap.set(entry.name, {
        source_warehouse: entry.from_warehouse || undefined,
        target_warehouse: entry.to_warehouse || undefined
      });
    }
  } catch (error) {
    console.error('Error fetching stock entry warehouses:', error);
  }
  
  return warehouseMap;
}

/**
 * Enrich stock ledger entries with additional information
 * Requirements: 9.1-9.6
 */
async function enrichStockLedgerEntries(
  entries: any[],
  client: any
): Promise<StockLedgerEntry[]> {
  if (entries.length === 0) return [];
  
  // Collect unique item codes
  const itemCodes = entries.map(e => e.item_code);
  
  // Collect vouchers that need party info
  const vouchersNeedingPartyInfo = entries
    .filter(e => ['Sales Invoice', 'Delivery Note', 'Purchase Receipt'].includes(e.voucher_type))
    .map(e => ({ voucher_type: e.voucher_type, voucher_no: e.voucher_no }));
  
  // Collect Stock Entry vouchers
  const stockEntryVouchers = entries
    .filter(e => e.voucher_type === 'Stock Entry')
    .map(e => e.voucher_no);
  
  // Batch fetch all related data
  const [itemNameMap, partyInfoMap, warehouseMap] = await Promise.all([
    fetchItemNames(itemCodes, client),
    fetchPartyInfo(vouchersNeedingPartyInfo, client),
    fetchStockEntryWarehouses(stockEntryVouchers, client)
  ]);
  
  // Enrich entries with fetched data
  const enrichedEntries: StockLedgerEntry[] = entries.map(entry => {
    const enriched: StockLedgerEntry = {
      ...entry,
      item_name: itemNameMap.get(entry.item_code) || entry.item_code
    };
    
    // Add party information for sales and purchase transactions
    const partyInfo = partyInfoMap.get(entry.voucher_no);
    if (partyInfo) {
      enriched.party_type = partyInfo.party_type;
      enriched.party_name = partyInfo.party_name;
    }
    
    // Add warehouse information for Stock Entry transfers
    if (entry.voucher_type === 'Stock Entry') {
      const warehouseInfo = warehouseMap.get(entry.voucher_no);
      if (warehouseInfo) {
        enriched.source_warehouse = warehouseInfo.source_warehouse;
        enriched.target_warehouse = warehouseInfo.target_warehouse;
      }
    }
    
    return enriched;
  });
  
  return enrichedEntries;
}

/**
 * Calculate summary statistics for the stock card report
 * Requirements: 1.5, 1.6
 * 
 * @param entries - Filtered stock ledger entries
 * @param company - Company name
 * @param item_code - Item code
 * @param from_date - Start date for the report (optional)
 * @param client - ERPNext client
 * @returns Summary data including opening balance, closing balance, totals
 */
async function calculateSummary(
  entries: StockLedgerEntry[],
  company: string,
  item_code: string | null,
  from_date: string | null,
  client: any
): Promise<{
  opening_balance: number;
  closing_balance: number;
  total_in: number;
  total_out: number;
  transaction_count: number;
  item_code: string;
  item_name: string;
  uom: string;
}> {
  // Get item name and UOM
  let item_name = item_code || 'All Items';
  let uom = '';
  
  // Only fetch item details if specific item is selected
  if (item_code) {
    try {
      const itemData = await client.get('Item', item_code) as any;
      item_name = itemData.item_name || item_code;
      uom = itemData.stock_uom || '';
    } catch (error) {
      console.error('Error fetching item details:', error);
    }
  }
  
  // Calculate opening balance (Requirement 1.5)
  // Opening balance is the qty_after_transaction of the last transaction before from_date
  // Note: Opening balance only makes sense when filtering by specific item
  let opening_balance = 0;
  
  if (from_date && item_code) {
    try {
      const openingFilters = [
        ['company', '=', company],
        ['item_code', '=', item_code],
        ['posting_date', '<', from_date]
      ];
      
      const openingEntries = await client.getList('Stock Ledger Entry', {
        fields: ['qty_after_transaction'],
        filters: openingFilters,
        order_by: 'posting_date desc,posting_time desc',
        limit_page_length: 1
      });
      
      if (openingEntries && openingEntries.length > 0) {
        opening_balance = openingEntries[0].qty_after_transaction || 0;
      }
    } catch (error) {
      console.error('Error fetching opening balance:', error);
    }
  }
  
  // Calculate total in, total out, and transaction count (Requirement 1.6)
  let total_in = 0;
  let total_out = 0;
  const transaction_count = entries.length;
  
  for (const entry of entries) {
    if (entry.actual_qty > 0) {
      total_in += entry.actual_qty;
    } else if (entry.actual_qty < 0) {
      total_out += Math.abs(entry.actual_qty);
    }
  }
  
  // Calculate closing balance (Requirement 1.6)
  // Closing balance is the qty_after_transaction of the last entry in chronological order
  // If no transactions, closing balance equals opening balance
  let closing_balance = opening_balance;
  
  if (entries.length > 0) {
    // Entries are already sorted by posting_date and posting_time in ascending order
    const lastEntry = entries[entries.length - 1];
    closing_balance = lastEntry.qty_after_transaction;
  }
  
  return {
    opening_balance,
    closing_balance,
    total_in,
    total_out,
    transaction_count,
    item_code: item_code || 'All',
    item_name,
    uom
  };
}

/**
 * GET /api/inventory/reports/stock-card
 * 
 * Fetches Stock Ledger Entries from ERPNext for the Stock Card Report
 * 
 * Query Parameters:
 * - company (required): Company name
 * - item_code (optional): Item code to fetch stock movements for (if empty, fetches all items)
 * - warehouse (optional): Filter by specific warehouse
 * - from_date (optional): Start date in YYYY-MM-DD format
 * - to_date (optional): End date in YYYY-MM-DD format
 * - customer (optional): Filter by customer
 * - supplier (optional): Filter by supplier
 * - transaction_type (optional): Filter by transaction type
 * - page (optional): Page number for pagination (default: 1)
 * - limit (optional): Records per page (default: 20)
 * 
 * Requirements: 8.1, 8.2, 8.5
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract and validate required parameters
    const company = searchParams.get('company');
    const item_code = searchParams.get('item_code'); // Now optional - can be empty for "All"
    
    // Validate required parameters (Requirement 12.3, 12.6)
    if (!company) {
      console.error('Stock Card API: Missing required parameter company', { company });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Parameter company wajib diisi' 
        },
        { status: 400 }
      );
    }
    
    // Extract optional filter parameters
    const warehouse = searchParams.get('warehouse');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const customer = searchParams.get('customer');
    const supplier = searchParams.get('supplier');
    const transaction_type = searchParams.get('transaction_type');
    
    // Validate date formats (Requirement 12.2, 12.6)
    if (from_date && !isValidDateFormat(from_date)) {
      console.error('Stock Card API: Invalid from_date format', { from_date });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format tanggal mulai tidak valid. Gunakan format YYYY-MM-DD' 
        },
        { status: 400 }
      );
    }
    
    if (to_date && !isValidDateFormat(to_date)) {
      console.error('Stock Card API: Invalid to_date format', { to_date });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Format tanggal akhir tidak valid. Gunakan format YYYY-MM-DD' 
        },
        { status: 400 }
      );
    }
    
    // Validate date range (Requirement 12.2, 12.6)
    if (!isValidDateRange(from_date, to_date)) {
      console.error('Stock Card API: Invalid date range', { from_date, to_date });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tanggal akhir harus setelah atau sama dengan tanggal mulai' 
        },
        { status: 400 }
      );
    }
    
    // Extract and validate pagination parameters (Requirement 11.1)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    if (page < 1) {
      console.error('Stock Card API: Invalid page number', { page });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Nomor halaman harus lebih besar dari 0' 
        },
        { status: 400 }
      );
    }
    
    if (limit < 1 || limit > 1000) {
      console.error('Stock Card API: Invalid limit', { limit });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Batas data per halaman harus antara 1 dan 1000' 
        },
        { status: 400 }
      );
    }
    
    // Get authentication headers (Requirement 8.5)
    const headers = getErpAuthHeaders(request);
    if (!headers['Authorization'] && !headers['Cookie']) {
      console.error('Stock Card API: Missing authentication headers');
      return NextResponse.json(
        { success: false, message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Build ERPNext API filters (Requirement 8.2)
    const filters: any[] = [
      ['company', '=', company]
    ];
    
    // Add item_code filter only if provided (support "All" items)
    if (item_code) {
      filters.push(['item_code', '=', item_code]);
    }
    
    // Add optional filters
    if (warehouse) {
      filters.push(['warehouse', '=', warehouse]);
    }
    
    if (from_date) {
      filters.push(['posting_date', '>=', from_date]);
    }
    
    if (to_date) {
      filters.push(['posting_date', '<=', to_date]);
    }
    
    if (transaction_type) {
      filters.push(['voucher_type', '=', transaction_type]);
    }
    
    // Note: Customer and supplier filters will be applied after enrichment
    // since they're not direct fields in Stock Ledger Entry
    
    // Define fields to fetch from Stock Ledger Entry
    const fields = [
      'name',
      'posting_date',
      'posting_time',
      'item_code',
      'warehouse',
      'actual_qty',
      'qty_after_transaction',
      'voucher_type',
      'voucher_no',
      'stock_uom',
      'valuation_rate',
      'stock_value_difference',
      'company'
    ];
    
    // Fetch Stock Ledger Entries from ERPNext (Requirement 8.1)
    let stockLedgerEntries = await client.getList('Stock Ledger Entry', {
      fields,
      filters,
      order_by: 'posting_date asc,posting_time asc',
      limit_page_length: 0 // Fetch all records, we'll paginate in memory
    });
    
    // console.log('Stock Card API: Fetched entries', { 
    //   count: stockLedgerEntries?.length,
    //   company,
    //   item_code,
    //   filters: { warehouse, from_date, to_date, customer, supplier, transaction_type }
    // });
    
    stockLedgerEntries = stockLedgerEntries || [];
    
    // Enrich entries with item names, party info, and warehouse info (Requirement 9.1-9.6)
    try {
      stockLedgerEntries = await enrichStockLedgerEntries(stockLedgerEntries, client);
    } catch (enrichError) {
      // Log enrichment error but continue with basic data (graceful degradation)
      console.error('Stock Card API: Error enriching entries', enrichError);
      // Entries will have basic data without enrichment
    }
    
    // Apply customer/supplier filters after enrichment (since they're not direct fields)
    if (customer) {
      stockLedgerEntries = (stockLedgerEntries as any[]).filter((entry: StockLedgerEntry) => 
        entry.party_type === 'Customer' && entry.party_name === customer
      );
    }
    
    if (supplier) {
      stockLedgerEntries = (stockLedgerEntries as any[]).filter((entry: StockLedgerEntry) => 
        entry.party_type === 'Supplier' && entry.party_name === supplier
      );
    }
    
    // Calculate summary statistics (Requirements 1.5, 1.6)
    let summary;
    try {
      summary = await calculateSummary(
        stockLedgerEntries as StockLedgerEntry[],
        company,
        item_code,
        from_date,
        client
      );
    } catch (summaryError) {
      // Log summary calculation error but continue with default values (graceful degradation)
      console.error('Stock Card API: Error calculating summary', summaryError);
      summary = {
        opening_balance: 0,
        closing_balance: stockLedgerEntries.length > 0 ? (stockLedgerEntries[stockLedgerEntries.length - 1] as any).qty_after_transaction : 0,
        total_in: 0,
        total_out: 0,
        transaction_count: stockLedgerEntries.length,
        item_code,
        item_name: item_code,
        uom: ''
      };
    }
    
    // Calculate pagination metadata (Requirement 11.1)
    const total_records = stockLedgerEntries.length;
    const total_pages = Math.ceil(total_records / limit);
    
    // Validate page number against total pages
    if (page > total_pages && total_pages > 0) {
      console.error('Stock Card API: Page number exceeds total pages', { page, total_pages });
      return NextResponse.json(
        { 
          success: false, 
          message: `Halaman ${page} tidak tersedia. Total halaman: ${total_pages}` 
        },
        { status: 400 }
      );
    }
    
    // Apply pagination - slice the array based on page and limit
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEntries = stockLedgerEntries.slice(startIndex, endIndex);
    
    // console.log('Stock Card API: Returning paginated results', {
    //   page,
    //   limit,
    //   total_records,
    //   total_pages,
    //   returned_records: paginatedEntries.length
    // });
    
    // Return the enriched data with summary and pagination
    return NextResponse.json({
      success: true,
      data: paginatedEntries,
      summary,
      pagination: {
        current_page: page,
        page_size: limit,
        total_records,
        total_pages
      },
      message: total_records === 0 
        ? 'Tidak ada data untuk filter yang dipilih' 
        : `Menampilkan ${paginatedEntries.length} dari ${total_records} transaksi`
    });
    
  } catch (error: unknown) {
    // Log detailed error for debugging (Requirement 12.3)
    logSiteError(error, 'GET /api/inventory/reports/stock-card', siteId);
    
    // Return user-friendly error message in Indonesian (Requirement 12.3)
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
