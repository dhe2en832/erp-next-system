import { NextRequest, NextResponse } from 'next/server';
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
  client: { getList: <T>(doctype: string, options: Record<string, unknown>) => Promise<T[]> }
): Promise<Map<string, string>> {
  if (itemCodes.length === 0) return new Map();
  
  const uniqueItemCodes = [...new Set(itemCodes)];
  const itemNameMap = new Map<string, string>();
  
  try {
    const filters = [['item_code', 'in', uniqueItemCodes]];
    const fields = ['item_code', 'item_name'];
    
    interface ItemSummary {
      item_code: string;
      item_name?: string;
    }
    const items = await client.getList<ItemSummary>('Item', {
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
 * Fetch party information (customer/supplier) for vouchers
 * Requirements: 9.3, 9.4
 */
async function fetchPartyInfo(
  vouchers: Array<{ voucher_type: string; voucher_no: string }>,
  client: { getList: <T>(doctype: string, options: Record<string, unknown>) => Promise<T[]> }
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
      
      interface SalesInvoiceSummary {
        name: string;
        customer?: string;
        customer_name?: string;
      }
      const invoices = await client.getList<SalesInvoiceSummary>('Sales Invoice', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const invoice of (invoices || [])) {
        partyInfoMap.set(invoice.name, {
          party_type: 'Customer',
          party_name: invoice.customer_name || invoice.customer || ''
        });
      }
    }
    
    // Fetch Delivery Note customer info
    if (deliveryNotes.length > 0) {
      const filters = [['name', 'in', [...new Set(deliveryNotes)]]];
      const fields = ['name', 'customer', 'customer_name'];
      
      interface DeliveryNoteSummary {
        name: string;
        customer?: string;
        customer_name?: string;
      }
      const notes = await client.getList<DeliveryNoteSummary>('Delivery Note', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const note of (notes || [])) {
        partyInfoMap.set(note.name, {
          party_type: 'Customer',
          party_name: note.customer_name || note.customer || ''
        });
      }
    }
    
    // Fetch Purchase Receipt supplier info
    if (purchaseReceipts.length > 0) {
      const filters = [['name', 'in', [...new Set(purchaseReceipts)]]];
      const fields = ['name', 'supplier', 'supplier_name'];
      
      interface PurchaseReceiptSummary {
        name: string;
        supplier?: string;
        supplier_name?: string;
      }
      const receipts = await client.getList<PurchaseReceiptSummary>('Purchase Receipt', {
        fields,
        filters,
        limit_page_length: 0
      });
      
      for (const receipt of (receipts || [])) {
        partyInfoMap.set(receipt.name, {
          party_type: 'Supplier',
          party_name: receipt.supplier_name || receipt.supplier || ''
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
  client: { getList: <T>(doctype: string, options: Record<string, unknown>) => Promise<T[]> }
): Promise<Map<string, { source_warehouse?: string; target_warehouse?: string }>> {
  if (stockEntryVouchers.length === 0) return new Map();
  
  const warehouseMap = new Map<string, { source_warehouse?: string; target_warehouse?: string }>();
  
  try {
    const filters = [['name', 'in', [...new Set(stockEntryVouchers)]]];
    const fields = ['name', 'from_warehouse', 'to_warehouse'];
    
    interface StockEntrySummary {
      name: string;
      from_warehouse?: string;
      to_warehouse?: string;
    }
    const entries = await client.getList<StockEntrySummary>('Stock Entry', {
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
  entries: Record<string, unknown>[],
  client: { getList: <T>(doctype: string, options: Record<string, unknown>) => Promise<T[]> }
): Promise<StockLedgerEntry[]> {
  if (entries.length === 0) return [];
  
  // Collect unique item codes
  const itemCodes = entries.map(e => e.item_code as string);
  
  // Collect vouchers that need party info
  const vouchersNeedingPartyInfo = entries
    .filter(e => ['Sales Invoice', 'Delivery Note', 'Purchase Receipt'].includes(e.voucher_type as string))
    .map(e => ({ voucher_type: e.voucher_type as string, voucher_no: e.voucher_no as string }));
  
  // Collect Stock Entry vouchers
  const stockEntryVouchers = entries
    .filter(e => e.voucher_type === 'Stock Entry')
    .map(e => e.voucher_no as string);
  
  // Batch fetch all related data
  const [itemNameMap, partyInfoMap, warehouseMap] = await Promise.all([
    fetchItemNames(itemCodes, client),
    fetchPartyInfo(vouchersNeedingPartyInfo, client),
    fetchStockEntryWarehouses(stockEntryVouchers, client)
  ]);
  
  // Enrich entries with fetched data
  const enrichedEntries: StockLedgerEntry[] = entries.map(entry => {
    const enriched: StockLedgerEntry = {
      ...(entry as unknown as StockLedgerEntry),
      item_name: itemNameMap.get(entry.item_code as string) || (entry.item_code as string)
    };
    
    // Add party information for sales and purchase transactions
    const partyInfo = partyInfoMap.get(entry.voucher_no as string);
    if (partyInfo) {
      enriched.party_type = partyInfo.party_type;
      enriched.party_name = partyInfo.party_name;
    }
    
    // Add warehouse information for Stock Entry transfers
    if (entry.voucher_type === 'Stock Entry') {
      const warehouseInfo = warehouseMap.get(entry.voucher_no as string);
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
 * @param item_code - Item code (can be null for "All Items")
 * @param from_date - Start date for the report (optional)
 * @param client - ERPNext client
 * @returns Summary data including opening balance, closing balance, totals
 */
async function calculateSummary(
  entries: StockLedgerEntry[],
  company: string,
  item_code: string | null,
  from_date: string | null,
  client: { 
    getList: <T>(doctype: string, options: Record<string, unknown>) => Promise<T[]>;
    get: <T>(doctype: string, name: string) => Promise<T>;
  }
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
  console.log('calculateSummary called with:', {
    entries_count: entries.length,
    company,
    item_code: item_code || 'All Items',
    from_date,
    sample_entries: entries.slice(0, 3).map(e => ({
      item_code: e.item_code,
      actual_qty: e.actual_qty,
      qty_after_transaction: e.qty_after_transaction
    }))
  });
  
  // Get item name and UOM
  let item_name = item_code || 'All Items';
  let uom = '';
  
  // Only fetch item details if specific item is selected
  if (item_code) {
    try {
      interface ItemDoc {
        item_name?: string;
        stock_uom?: string;
      }
      const itemData = await client.get<ItemDoc>('Item', item_code);
      item_name = itemData.item_name || item_code;
      uom = itemData.stock_uom || '';
    } catch (error) {
      console.error('Error fetching item details:', error);
    }
  }
  
  // Calculate total in, total out, and transaction count (Requirement 1.6)
  // This works for both specific item and "All Items"
  let total_in = 0;
  let total_out = 0;
  const transaction_count = entries.length;
  
  for (const entry of entries) {
    const qty = Number(entry.actual_qty) || 0;
    if (qty > 0) {
      total_in += qty;
    } else if (qty < 0) {
      total_out += Math.abs(qty);
    }
  }
  
  // Calculate opening balance (Requirement 1.5)
  // Opening balance = stock balance at the START of the period (beginning of from_date)
  let opening_balance = 0;
  
  if (from_date && item_code) {
    // For specific item: get qty_after_transaction before from_date
    try {
      const openingFilters: (string | number | boolean | null | string[])[][] = [
        ['company', '=', company],
        ['item_code', '=', item_code],
        ['posting_date', '<', from_date]
      ];
      
      interface OpeningEntry {
        qty_after_transaction: number;
      }
      const openingEntries = await client.getList<OpeningEntry>('Stock Ledger Entry', {
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
  } else if (from_date && !item_code) {
    // For "All Items": Get the earliest balance in the period for each item
    // Then subtract the movements in the period to get opening balance
    // Opening Balance = Earliest Balance in Period - Total In + Total Out
    
    if (entries.length > 0) {
      // Get the first transaction for each item in the period
      const itemFirstBalances = new Map<string, number>();
      
      // Process entries to find the first occurrence of each item
      for (const entry of entries) {
        if (!itemFirstBalances.has(entry.item_code)) {
          // This is the first transaction for this item in the period
          // The opening balance for this item = qty_after_transaction - actual_qty
          const itemOpeningBalance = (Number(entry.qty_after_transaction) || 0) - (Number(entry.actual_qty) || 0);
          itemFirstBalances.set(entry.item_code, itemOpeningBalance);
        }
      }
      
      // Sum all item opening balances
      opening_balance = Array.from(itemFirstBalances.values()).reduce((sum, qty) => sum + qty, 0);
      
      console.log('Opening balance calculation for All Items (from first transactions):', {
        unique_items_in_period: itemFirstBalances.size,
        sample_balances: Array.from(itemFirstBalances.entries()).slice(0, 5),
        total_opening_balance: opening_balance,
        total_in,
        total_out
      });
    }
  }
  
  // Calculate closing balance (Requirement 1.6)
  // For specific item: use qty_after_transaction from last entry
  // For "All Items": sum all qty_after_transaction from last entries up to to_date
  let closing_balance = opening_balance;
  
  if (item_code && entries.length > 0) {
    // Specific item: use the actual qty_after_transaction from last entry
    const lastEntry = entries[entries.length - 1];
    closing_balance = lastEntry.qty_after_transaction;
  } else if (!item_code) {
    // All Items: Need to get the latest balance for ALL items up to the end of period
    // We cannot use the paginated entries because they only show a subset
    // We need to query for the latest balance of each item up to to_date (or now if no to_date)
    
    // Calculate from opening balance + movements
    closing_balance = opening_balance + total_in - total_out;
    
    console.log('Closing balance calculation for All Items (from movements):', {
      opening_balance,
      total_in,
      total_out,
      calculated_closing_balance: closing_balance
    });
  } else {
    // Fallback: calculate based on movements
    closing_balance = opening_balance + total_in - total_out;
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
    const order_by = searchParams.get('order_by') || 'posting_date desc, posting_time desc';
    
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
    
    // Get site-aware client
    const client = await getERPNextClientForRequest(request);
    
    // Build ERPNext API filters (Requirement 8.2)
    const filters: (string | number | boolean | null | string[])[][] = [
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
    
    // Fetch Stock Ledger Entries from ERPNext with pagination (Requirement 8.1)
    // Use ERPNext's built-in pagination for better performance
    const start = (page - 1) * limit;
    
    // ✅ STEP 1: Get total count using getCount (like Item List)
    let total_records = 0;
    try {
      console.log('Stock Card API: Fetching total count with filters:', filters);
      
      total_records = await client.getCount('Stock Ledger Entry', {
        filters
      });
      
      console.log('Stock Card API: Total count from ERPNext:', total_records);
    } catch (countError) {
      console.error('Error getting total count:', countError);
    }
    
    // ✅ STEP 2: Get paginated data
    let stockLedgerEntries = await client.getList<Record<string, unknown>>('Stock Ledger Entry', {
      fields,
      filters,
      order_by: order_by,
      limit_page_length: limit,
      start: start
    });
    
    console.log('Stock Card API: Fetched entries with pagination', { 
      count: stockLedgerEntries?.length,
      page,
      limit,
      start,
      total_records,
      company,
      item_code: item_code || 'All Items',
      filters: { warehouse, from_date, to_date, customer, supplier, transaction_type }
    });
    
    stockLedgerEntries = stockLedgerEntries || [];
    
    console.log('Stock Card API: Paginated fetch result', {
      fetched_count: stockLedgerEntries.length,
      page,
      limit,
      start,
      total_records
    });
    
    // Enrich entries with item names, party info, and warehouse info (Requirement 9.1-9.6)
    let enrichedEntries: StockLedgerEntry[] = [];
    try {
      enrichedEntries = await enrichStockLedgerEntries(stockLedgerEntries, client);
    } catch (enrichError) {
      // Log enrichment error but continue with basic data (graceful degradation)
      console.error('Stock Card API: Error enriching entries', enrichError);
      // Entries will have basic data without enrichment
      enrichedEntries = stockLedgerEntries as unknown as StockLedgerEntry[];
    }
    
    // Apply customer/supplier filters after enrichment (since they're not direct fields)
    if (customer) {
      enrichedEntries = enrichedEntries.filter((entry: StockLedgerEntry) => 
        entry.party_type === 'Customer' && entry.party_name === customer
      );
    }
    
    if (supplier) {
      enrichedEntries = enrichedEntries.filter((entry: StockLedgerEntry) => 
        entry.party_type === 'Supplier' && entry.party_name === supplier
      );
    }
    
    // Calculate summary statistics (Requirements 1.5, 1.6)
    // We need TWO summaries:
    // 1. Page summary - for current page entries (paginated)
    // 2. Period summary - for ALL entries in the selected date range
    
    let pageSummary;
    let periodSummary;
    
    try {
      console.log('Stock Card API: Calculating page summary from paginated entries');
      
      // Calculate page summary from paginated entries
      pageSummary = await calculateSummary(
        enrichedEntries,
        company,
        item_code,
        from_date,
        client
      );
      
      console.log('Stock Card API: Page summary calculated', { 
        pageSummary,
        entries_count: enrichedEntries.length
      });
      
      // Now fetch ALL entries for period summary
      console.log('Stock Card API: Fetching ALL entries for period summary calculation');
      console.log('Stock Card API: Filters for ALL entries:', JSON.stringify(filters));
      console.log('Stock Card API: Total records to fetch:', total_records);
      
      // IMPORTANT: ERPNext getList without limit_page_length defaults to 20 records
      // We MUST specify a high limit to get all records
      const allEntries = await client.getList<Record<string, unknown>>('Stock Ledger Entry', {
        fields,
        filters,
        order_by: 'posting_date asc,posting_time asc',
        limit_page_length: Math.max(total_records, 99999) // Use the higher of total_records or 99999
      });
      
      console.log('Stock Card API: Successfully fetched ALL entries', { 
        allEntries_count: allEntries?.length,
        expected_count: total_records,
        sample_entry: allEntries?.[0]
      });
      
      // Enrich all entries for period summary
      const enrichedAllEntries = await enrichStockLedgerEntries(allEntries || [], client);
      
      console.log('Stock Card API: Enriched entries for period summary', { 
        enrichedAllEntries_count: enrichedAllEntries.length 
      });
      
      // Apply customer/supplier filters
      let filteredAllEntries = enrichedAllEntries;
      if (customer) {
        filteredAllEntries = filteredAllEntries.filter((entry: StockLedgerEntry) => 
          entry.party_type === 'Customer' && entry.party_name === customer
        );
      }
      if (supplier) {
        filteredAllEntries = filteredAllEntries.filter((entry: StockLedgerEntry) => 
          entry.party_type === 'Supplier' && entry.party_name === supplier
        );
      }
      
      console.log('Stock Card API: Filtered entries for period summary', { 
        filteredAllEntries_count: filteredAllEntries.length 
      });
      
      // Calculate period summary from ALL entries
      periodSummary = await calculateSummary(
        filteredAllEntries,
        company,
        item_code,
        from_date,
        client
      );
      
      console.log('Stock Card API: Period summary calculated', { 
        periodSummary,
        filteredAllEntries_count: filteredAllEntries.length
      });
      
      // ✅ If customer/supplier filters are applied, update total_records
      // because these filters are applied after fetching from ERPNext
      if (customer || supplier) {
        total_records = filteredAllEntries.length;
        console.log('Stock Card API: Updated total_records after customer/supplier filter', { total_records });
      }
    } catch (summaryError) {
      // Log summary calculation error but continue with default values (graceful degradation)
      console.error('Stock Card API: Error calculating summary', summaryError);
      
      const defaultSummary = {
        opening_balance: 0,
        closing_balance: enrichedEntries.length > 0 ? enrichedEntries[enrichedEntries.length - 1].qty_after_transaction : 0,
        total_in: 0,
        total_out: 0,
        transaction_count: enrichedEntries.length,
        item_code: item_code || 'All',
        item_name: item_code || 'All Items',
        uom: ''
      };
      
      pageSummary = defaultSummary;
      periodSummary = defaultSummary;
    }
    
    // Calculate pagination metadata (Requirement 11.1)
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
    
    // Return the enriched data with BOTH summaries and pagination
    return NextResponse.json({
      success: true,
      data: enrichedEntries,
      summary: periodSummary, // Main summary for the entire period
      page_summary: pageSummary, // Summary for current page only
      pagination: {
        current_page: page,
        page_size: limit,
        total_records,
        total_pages
      },
      message: total_records === 0 
        ? 'Tidak ada data untuk filter yang dipilih' 
        : `Menampilkan ${enrichedEntries.length} dari ${total_records} transaksi`
    });
    
  } catch (error: unknown) {
    // Log detailed error for debugging (Requirement 12.3)
    logSiteError(error, 'GET /api/inventory/reports/stock-card', siteId);
    
    // Return user-friendly error message in Indonesian (Requirement 12.3)
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
