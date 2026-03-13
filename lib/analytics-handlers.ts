/**
 * Analytics Data Handlers
 * 
 * Functions to fetch and transform analytics data from ERPNext API
 * 
 * Requirements: 9.2-9.16
 */

import type { ERPNextClient } from './erpnext';
import type { ERPNextMultiClient } from './erpnext-multi';
import type {
  TopProduct,
  BestCustomer,
  WorstCustomer,
  BadDebtCustomer,
  SalesPerformance,
  SalesCommission,
  OutstandingCommission,
  PaidCommission,
  HighestStockItem,
  LowestStockItem,
  MostPurchasedItem,
  TopSupplierByFrequency,
  PaidSupplier,
  UnpaidSupplier,
  CommissionBreakdown,
  MonthlyCommission
} from '@/types/dashboard-analytics';

type ERPNextClientType = ERPNextClient | ERPNextMultiClient;

/**
 * Fetch top 10 products by sales amount
 * Requirement: 1.1, 1.2, 9.2
 */
export async function fetchTopProducts(
  client: ERPNextClientType,
  company: string | null
): Promise<TopProduct[]> {
  try {
    console.log('[fetchTopProducts] Starting with company:', company);
    
    // First, get submitted Sales Invoices with item details directly
    const invoiceFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      invoiceFilters.push(['company', '=', company]);
    }
    
    console.log('[fetchTopProducts] Fetching invoices with filters:', JSON.stringify(invoiceFilters));
    
    const invoices = await client.getList<{
      name: string;
      posting_date: string;
    }>('Sales Invoice', {
      filters: invoiceFilters,
      fields: ['name', 'posting_date'],
      limit: 1000, // Reduced for better performance
    });
    
    console.log('[fetchTopProducts] Fetched invoices count:', invoices.length);
    
    if (invoices.length === 0) {
      console.log('[fetchTopProducts] No submitted Sales Invoices found, returning empty array');
      return [];
    }
    
    // Aggregate by item_code using individual invoice details
    const aggregated = new Map<string, TopProduct>();
    let processedCount = 0;
    let errorCount = 0;
    
    // Process invoices in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      
      for (const invoice of batch) {
        try {
          // Get individual invoice with items
          const invoiceDetail = await client.get<{
            items?: Array<{
              item_code: string;
              item_name: string;
              qty: number;
              amount: number;
            }>;
          }>('Sales Invoice', invoice.name);
          
          processedCount++;
          
          if (invoiceDetail.items && invoiceDetail.items.length > 0) {
            for (const item of invoiceDetail.items) {
              const existing = aggregated.get(item.item_code);
              if (existing) {
                existing.total_qty += item.qty || 0;
                existing.total_amount += item.amount || 0;
              } else {
                aggregated.set(item.item_code, {
                  item_code: item.item_code,
                  item_name: item.item_name || item.item_code,
                  total_qty: item.qty || 0,
                  total_amount: item.amount || 0,
                });
              }
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`[fetchTopProducts] Failed to fetch invoice details for ${invoice.name}:`, error);
          // Continue processing other invoices
        }
      }
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[fetchTopProducts] Processed ${processedCount} invoices, ${errorCount} errors`);
    console.log('[fetchTopProducts] Aggregated products count:', aggregated.size);
    
    if (aggregated.size === 0) {
      console.log('[fetchTopProducts] No items found after processing invoices, returning empty array');
      return [];
    }
    
    // Sort by total_amount descending and take top 10
    const result = Array.from(aggregated.values())
      .filter(item => item.total_amount > 0) // Only include items with positive sales
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);
    
    console.log('[fetchTopProducts] Returning top products count:', result.length);
    if (result.length > 0) {
      console.log('[fetchTopProducts] Top 3 products:', result.slice(0, 3));
    }
    
    return result;
  } catch (error) {
    console.error('[fetchTopProducts] Error:', error);
    // Return empty array instead of throwing to prevent breaking the dashboard
    return [];
  }
}


/**
 * Fetch top 10 customers with best payment behavior
 * Requirement: 2.1, 2.2, 2.3, 9.3
 */
export async function fetchBestCustomers(
  client: ERPNextClientType,
  company: string | null
): Promise<BestCustomer[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch Sales Invoices
  const invoices = await client.getList<{
    customer: string;
    customer_name: string;
    posting_date: string;
    due_date: string;
    grand_total: number;
    outstanding_amount: number;
  }>('Sales Invoice', {
    filters,
    fields: ['customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount'],
    limit: 5000,
  });
  
  // Group by customer and calculate payment behavior
  const customerMap = new Map<string, {
    customer_name: string;
    paid_invoices: number;
    on_time_payments: number;
    total_paid: number;
  }>();
  
  for (const invoice of invoices) {
    if (invoice.outstanding_amount === 0) { // Fully paid
      const existing = customerMap.get(invoice.customer);
      const isOnTime = new Date(invoice.posting_date) <= new Date(invoice.due_date);
      
      if (existing) {
        existing.paid_invoices += 1;
        existing.on_time_payments += isOnTime ? 1 : 0;
        existing.total_paid += invoice.grand_total; // Use grand_total instead of paid_amount
      } else {
        customerMap.set(invoice.customer, {
          customer_name: invoice.customer_name,
          paid_invoices: 1,
          on_time_payments: isOnTime ? 1 : 0,
          total_paid: invoice.grand_total, // Use grand_total instead of paid_amount
        });
      }
    }
  }
  
  // Calculate on_time_percentage and convert to BestCustomer[]
  const bestCustomers: BestCustomer[] = Array.from(customerMap.values())
    .map(customer => ({
      customer_name: customer.customer_name,
      paid_invoices: customer.paid_invoices,
      on_time_percentage: customer.paid_invoices > 0 
        ? (customer.on_time_payments / customer.paid_invoices) * 100 
        : 0,
      total_paid: customer.total_paid,
    }))
    .sort((a, b) => {
      // Sort by on_time_percentage first, then by total_paid
      if (b.on_time_percentage !== a.on_time_percentage) {
        return b.on_time_percentage - a.on_time_percentage;
      }
      return b.total_paid - a.total_paid;
    })
    .slice(0, 10);
  
  return bestCustomers;
}


/**
 * Fetch top 10 customers with worst payment behavior (overdue invoices)
 * Requirement: 3.1, 3.2, 3.3, 9.4
 */
export async function fetchWorstCustomers(
  client: ERPNextClientType,
  company: string | null
): Promise<WorstCustomer[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0],
    ['due_date', '<', today],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch overdue invoices
  const invoices = await client.getList<{
    customer: string;
    customer_name: string;
    outstanding_amount: number;
  }>('Sales Invoice', {
    filters,
    fields: ['customer', 'customer_name', 'outstanding_amount'],
    limit: 5000,
  });
  
  // Group by customer
  const customerMap = new Map<string, {
    customer_name: string;
    overdue_invoices: number;
    outstanding_amount: number;
  }>();
  
  for (const invoice of invoices) {
    const existing = customerMap.get(invoice.customer);
    if (existing) {
      existing.overdue_invoices += 1;
      existing.outstanding_amount += invoice.outstanding_amount;
    } else {
      customerMap.set(invoice.customer, {
        customer_name: invoice.customer_name,
        overdue_invoices: 1,
        outstanding_amount: invoice.outstanding_amount,
      });
    }
  }
  
  // Sort by outstanding_amount descending and take top 10
  return Array.from(customerMap.values())
    .sort((a, b) => b.outstanding_amount - a.outstanding_amount)
    .slice(0, 10);
}


/**
 * Fetch top 10 customers with bad debt (>90 days overdue)
 * Requirement: 3.1.1, 3.1.2, 3.1.3, 9.5
 */
export async function fetchBadDebtCustomers(
  client: ERPNextClientType,
  company: string | null
): Promise<BadDebtCustomer[]> {
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];
  
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0],
    ['due_date', '<', ninetyDaysAgoStr],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch bad debt invoices
  const invoices = await client.getList<{
    customer: string;
    customer_name: string;
    outstanding_amount: number;
    due_date: string;
  }>('Sales Invoice', {
    filters,
    fields: ['customer', 'customer_name', 'outstanding_amount', 'due_date'],
    limit: 5000,
  });
  
  // Group by customer
  const customerMap = new Map<string, {
    customer_name: string;
    bad_debt_invoices: number;
    bad_debt_amount: number;
    total_overdue_days: number;
  }>();
  
  for (const invoice of invoices) {
    const dueDate = new Date(invoice.due_date);
    const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const existing = customerMap.get(invoice.customer);
    if (existing) {
      existing.bad_debt_invoices += 1;
      existing.bad_debt_amount += invoice.outstanding_amount;
      existing.total_overdue_days += overdueDays;
    } else {
      customerMap.set(invoice.customer, {
        customer_name: invoice.customer_name,
        bad_debt_invoices: 1,
        bad_debt_amount: invoice.outstanding_amount,
        total_overdue_days: overdueDays,
      });
    }
  }
  
  // Calculate average_overdue_days and convert to BadDebtCustomer[]
  const badDebtCustomers: BadDebtCustomer[] = Array.from(customerMap.values())
    .map(customer => ({
      customer_name: customer.customer_name,
      bad_debt_invoices: customer.bad_debt_invoices,
      bad_debt_amount: customer.bad_debt_amount,
      average_overdue_days: Math.round(customer.total_overdue_days / customer.bad_debt_invoices),
    }))
    .sort((a, b) => b.bad_debt_amount - a.bad_debt_amount)
    .slice(0, 10);
  
  return badDebtCustomers;
}


/**
 * Fetch top 10 sales persons by revenue
 * Requirement: 4.1, 4.2, 9.6
 */
export async function fetchTopSalesByRevenue(
  client: ERPNextClientType,
  company: string | null
): Promise<SalesPerformance[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch Sales Invoices
  const invoices = await client.getList<{
    name: string;
    grand_total: number;
  }>('Sales Invoice', {
    filters,
    fields: ['name', 'grand_total'],
    limit: 5000,
  });
  
  // Fetch sales team data for each invoice
  const salesMap = new Map<string, {
    transaction_count: number;
    total_revenue: number;
  }>();
  
  for (const invoice of invoices) {
    try {
      // Get sales team from invoice
      const invoiceDetail = await client.get<{
        sales_team?: Array<{
          sales_person: string;
          allocated_percentage: number;
        }>;
      }>('Sales Invoice', invoice.name);
      
      if (invoiceDetail.sales_team && invoiceDetail.sales_team.length > 0) {
        for (const teamMember of invoiceDetail.sales_team) {
          const allocatedRevenue = (invoice.grand_total * teamMember.allocated_percentage) / 100;
          const existing = salesMap.get(teamMember.sales_person);
          
          if (existing) {
            existing.transaction_count += 1;
            existing.total_revenue += allocatedRevenue;
          } else {
            salesMap.set(teamMember.sales_person, {
              transaction_count: 1,
              total_revenue: allocatedRevenue,
            });
          }
        }
      }
    } catch (error) {
      // Skip invoices that fail to fetch details
      console.error(`Failed to fetch sales team for ${invoice.name}:`, error);
    }
  }
  
  // Convert to SalesPerformance[] and sort
  return Array.from(salesMap.entries())
    .map(([sales_person, data]) => ({
      sales_person,
      transaction_count: data.transaction_count,
      total_revenue: data.total_revenue,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);
}


/**
 * Fetch top 10 sales persons by commission
 * Requirement: 5.1, 5.2, 9.7
 */
export async function fetchTopSalesByCommission(
  client: ERPNextClientType,
  company: string | null
): Promise<SalesCommission[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch Sales Invoices with commission field
  const invoices = await client.getList<{
    name: string;
    custom_total_komisi_sales: number;
  }>('Sales Invoice', {
    filters,
    fields: ['name', 'custom_total_komisi_sales'],
    limit: 5000,
  });
  
  // Fetch sales team data with commission
  const salesMap = new Map<string, {
    transaction_count: number;
    total_commission: number;
  }>();
  
  for (const invoice of invoices) {
    try {
      const invoiceDetail = await client.get<{
        sales_team?: Array<{
          sales_person: string;
          allocated_percentage: number;
        }>;
      }>('Sales Invoice', invoice.name);
      
      if (invoiceDetail.sales_team && invoiceDetail.sales_team.length > 0) {
        const totalCommission = invoice.custom_total_komisi_sales || 0;
        
        for (const teamMember of invoiceDetail.sales_team) {
          // Allocate commission based on allocated_percentage
          const allocatedCommission = (totalCommission * (teamMember.allocated_percentage || 100)) / 100;
          const existing = salesMap.get(teamMember.sales_person);
          
          if (existing) {
            existing.transaction_count += 1;
            existing.total_commission += allocatedCommission;
          } else {
            salesMap.set(teamMember.sales_person, {
              transaction_count: 1,
              total_commission: allocatedCommission,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch sales team for ${invoice.name}:`, error);
    }
  }
  
  // Convert to SalesCommission[] and sort
  return Array.from(salesMap.entries())
    .map(([sales_person, data]) => ({
      sales_person,
      transaction_count: data.transaction_count,
      total_commission: data.total_commission,
    }))
    .sort((a, b) => b.total_commission - a.total_commission)
    .slice(0, 10);
}


/**
 * Fetch bottom 10 sales persons by commission
 * Requirement: 6.1, 6.2, 9.8
 */
export async function fetchWorstSalesByCommission(
  client: ERPNextClientType,
  company: string | null
): Promise<SalesCommission[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch Sales Invoices with commission field
  const invoices = await client.getList<{
    name: string;
    custom_total_komisi_sales: number;
  }>('Sales Invoice', {
    filters,
    fields: ['name', 'custom_total_komisi_sales'],
    limit: 5000,
  });
  
  const salesMap = new Map<string, {
    transaction_count: number;
    total_commission: number;
  }>();
  
  for (const invoice of invoices) {
    try {
      const invoiceDetail = await client.get<{
        sales_team?: Array<{
          sales_person: string;
          allocated_percentage: number;
        }>;
      }>('Sales Invoice', invoice.name);
      
      if (invoiceDetail.sales_team && invoiceDetail.sales_team.length > 0) {
        const totalCommission = invoice.custom_total_komisi_sales || 0;
        
        for (const teamMember of invoiceDetail.sales_team) {
          // Allocate commission based on allocated_percentage
          const allocatedCommission = (totalCommission * (teamMember.allocated_percentage || 100)) / 100;
          const existing = salesMap.get(teamMember.sales_person);
          
          if (existing) {
            existing.transaction_count += 1;
            existing.total_commission += allocatedCommission;
          } else {
            salesMap.set(teamMember.sales_person, {
              transaction_count: 1,
              total_commission: allocatedCommission,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch sales team for ${invoice.name}:`, error);
    }
  }
  
  // Convert to SalesCommission[] and sort ASCENDING (worst first)
  return Array.from(salesMap.entries())
    .map(([sales_person, data]) => ({
      sales_person,
      transaction_count: data.transaction_count,
      total_commission: data.total_commission,
    }))
    .sort((a, b) => a.total_commission - b.total_commission)
    .slice(0, 10);
}


/**
 * Fetch outstanding commission (unpaid)
 * Requirement: 7.1, 7.2, 9.9
 */
export async function fetchOutstandingCommission(
  client: ERPNextClientType,
  company: string | null
): Promise<OutstandingCommission> {
  try {
    const filters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      filters.push(['company', '=', company]);
    }
    
    console.log('[fetchOutstandingCommission] Fetching Sales Invoices with filters:', filters);
    
    // Fetch Sales Invoices
    const invoices = await client.getList<{
      name: string;
    }>('Sales Invoice', {
      filters,
      fields: ['name'],
      limit: 1000, // Reduced limit for better performance
    });
    
    console.log(`[fetchOutstandingCommission] Found ${invoices.length} invoices`);
    
    if (invoices.length === 0) {
      console.log('[fetchOutstandingCommission] No invoices found, returning empty result');
      return {
        total_outstanding: 0,
        sales_count: 0,
        breakdown: [],
      };
    }
    
    const salesMap = new Map<string, number>();
    let processedCount = 0;
    let errorCount = 0;
    
    // Process invoices in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      
      for (const invoice of batch) {
        try {
          const invoiceDetail = await client.get<{
            sales_team?: Array<{
              sales_person: string;
              incentives: number;
            }>;
          }>('Sales Invoice', invoice.name);
          
          processedCount++;
          
          if (invoiceDetail.sales_team && invoiceDetail.sales_team.length > 0) {
            for (const teamMember of invoiceDetail.sales_team) {
              const commission = teamMember.incentives || 0;
              if (commission > 0) {
                // Assume all commissions are outstanding unless marked as paid
                // In a real system, you'd check a payment status field
                const existing = salesMap.get(teamMember.sales_person) || 0;
                salesMap.set(teamMember.sales_person, existing + commission);
              }
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`[fetchOutstandingCommission] Failed to fetch sales team for ${invoice.name}:`, error);
          // Continue processing other invoices
        }
      }
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`[fetchOutstandingCommission] Processed ${processedCount} invoices, ${errorCount} errors`);
    
    const breakdown: CommissionBreakdown[] = Array.from(salesMap.entries())
      .map(([sales_person, outstanding_amount]) => ({
        sales_person,
        outstanding_amount,
      }))
      .filter(item => item.outstanding_amount > 0)
      .sort((a, b) => b.outstanding_amount - a.outstanding_amount);
    
    const total_outstanding = breakdown.reduce((sum, item) => sum + item.outstanding_amount, 0);
    
    console.log(`[fetchOutstandingCommission] Result: ${breakdown.length} sales people, total outstanding: ${total_outstanding}`);
    
    return {
      total_outstanding,
      sales_count: breakdown.length,
      breakdown,
    };
    
  } catch (error) {
    console.error('[fetchOutstandingCommission] Error:', error);
    // Return empty result instead of throwing to prevent breaking the dashboard
    return {
      total_outstanding: 0,
      sales_count: 0,
      breakdown: [],
    };
  }
}


/**
 * Fetch paid commission with monthly trend
 * Requirement: 8.1, 8.2, 9.10
 */
export async function fetchPaidCommission(
  client: ERPNextClientType,
  company: string | null
): Promise<PaidCommission> {
  try {
    console.log('[fetchPaidCommission] Starting to fetch paid commission data');
    
    // Fetch Sales Invoices with commission payment status
    const invoiceFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
      ['custom_commission_paid', '=', 1], // Only invoices where commission is marked as paid
    ];
    
    if (company) {
      invoiceFilters.push(['company', '=', company]);
    }
    
    console.log('[fetchPaidCommission] Fetching Sales Invoices with paid commission status');
    
    const paidInvoices = await client.getList<{
      name: string;
      posting_date: string;
      custom_total_komisi_sales: number;
    }>('Sales Invoice', {
      filters: invoiceFilters,
      fields: ['name', 'posting_date', 'custom_total_komisi_sales'],
      limit: 1000,
    });
    
    console.log(`[fetchPaidCommission] Found ${paidInvoices.length} invoices with paid commission`);
    
    if (paidInvoices.length === 0) {
      return {
        total_paid: 0,
        period: new Date().toISOString().slice(0, 7),
        monthly_trend: [],
      };
    }
    
    const monthlyMap = new Map<string, number>();
    let totalPaid = 0;
    
    // Process paid commission invoices
    for (const invoice of paidInvoices) {
      const commission = invoice.custom_total_komisi_sales || 0;
      if (commission > 0) {
        const month = invoice.posting_date.slice(0, 7); // YYYY-MM format
        
        totalPaid += commission;
        const existing = monthlyMap.get(month) || 0;
        monthlyMap.set(month, existing + commission);
      }
    }
    
    console.log(`[fetchPaidCommission] Total paid commission: ${totalPaid}`);
    
    // Convert to monthly trend array and sort by month
    const monthly_trend: MonthlyCommission[] = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total }))
      .filter(item => item.total > 0) // Only include months with actual commission
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log(`[fetchPaidCommission] Final result: total_paid=${totalPaid}, monthly_trend=${monthly_trend.length} months`);
    
    return {
      total_paid: totalPaid,
      period: currentMonth,
      monthly_trend,
    };
    
  } catch (error) {
    console.error('[fetchPaidCommission] Error:', error);
    // Return empty result instead of throwing to prevent breaking the dashboard
    return {
      total_paid: 0,
      period: new Date().toISOString().slice(0, 7),
      monthly_trend: [],
    };
  }
}


/**
 * Fetch top 10 items with highest stock levels
 * Requirement: 16.1, 16.2, 9.11
 */
export async function fetchHighestStockItems(
  client: ERPNextClientType,
  company: string | null
): Promise<HighestStockItem[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['actual_qty', '>', 0],
  ];
  
  // Note: Bin doctype doesn't have company field directly
  // We'd need to filter by warehouse if company filtering is needed
  
  // Fetch Bin records (stock ledger)
  const bins = await client.getList<{
    item_code: string;
    warehouse: string;
    actual_qty: number;
  }>('Bin', {
    filters,
    fields: ['item_code', 'warehouse', 'actual_qty'],
    limit: 10000,
  });
  
  // Aggregate by item_code
  const itemMap = new Map<string, {
    total_stock: number;
    warehouses: Set<string>;
  }>();
  
  for (const bin of bins) {
    const existing = itemMap.get(bin.item_code);
    if (existing) {
      existing.total_stock += bin.actual_qty;
      existing.warehouses.add(bin.warehouse);
    } else {
      itemMap.set(bin.item_code, {
        total_stock: bin.actual_qty,
        warehouses: new Set([bin.warehouse]),
      });
    }
  }
  
  // Get item names
  const topItems = Array.from(itemMap.entries())
    .sort((a, b) => b[1].total_stock - a[1].total_stock)
    .slice(0, 10);
  
  const result: HighestStockItem[] = [];
  
  for (const [item_code, data] of topItems) {
    try {
      const item = await client.get<{ item_name: string }>('Item', item_code);
      result.push({
        item_code,
        item_name: item.item_name,
        total_stock: data.total_stock,
        warehouse_count: data.warehouses.size,
      });
    } catch (error) {
      // If item not found, use item_code as name
      result.push({
        item_code,
        item_name: item_code,
        total_stock: data.total_stock,
        warehouse_count: data.warehouses.size,
      });
    }
  }
  
  return result;
}


/**
 * Fetch top 10 items with lowest stock levels (excluding zero stock)
 * Requirement: 17.1, 17.2, 9.12
 */
export async function fetchLowestStockItems(
  client: ERPNextClientType,
  company: string | null
): Promise<LowestStockItem[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['actual_qty', '>', 0],
  ];
  
  // Fetch Bin records
  const bins = await client.getList<{
    item_code: string;
    warehouse: string;
    actual_qty: number;
  }>('Bin', {
    filters,
    fields: ['item_code', 'warehouse', 'actual_qty'],
    limit: 10000,
  });
  
  // Aggregate by item_code
  const itemMap = new Map<string, number>();
  
  for (const bin of bins) {
    const existing = itemMap.get(bin.item_code) || 0;
    itemMap.set(bin.item_code, existing + bin.actual_qty);
  }
  
  // Sort ascending and take bottom 10
  const lowestItems = Array.from(itemMap.entries())
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10);
  
  const result: LowestStockItem[] = [];
  
  for (const [item_code, total_stock] of lowestItems) {
    try {
      const item = await client.get<{ 
        item_name: string;
        reorder_level?: number;
      }>('Item', item_code);
      
      result.push({
        item_code,
        item_name: item.item_name,
        total_stock,
        reorder_level: item.reorder_level || 0,
      });
    } catch (error) {
      result.push({
        item_code,
        item_name: item_code,
        total_stock,
        reorder_level: 0,
      });
    }
  }
  
  return result;
}


/**
 * Fetch top 10 most purchased items by frequency
 * Requirement: 18.1, 18.2, 18.3, 9.13
 */
export async function fetchMostPurchasedItems(
  client: ERPNextClientType,
  company: string | null
): Promise<MostPurchasedItem[]> {
  try {
    // First, get submitted Purchase Orders
    const orderFilters: (string | number | boolean | null | string[])[][] = [
      ['docstatus', '=', 1],
    ];
    
    if (company) {
      orderFilters.push(['company', '=', company]);
    }
    
    const orders = await client.getList<{
      name: string;
    }>('Purchase Order', {
      filters: orderFilters,
      fields: ['name'],
      limit: 5000,
    });
    
    if (orders.length === 0) {
      return [];
    }
    
    // Get order names for filtering items
    const orderNames = orders.map(order => order.name);
    
    // Fetch items for these orders - handle permission errors gracefully
    let items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      parent: string;
    }> = [];
    
    try {
      const itemFilters: (string | number | boolean | null | string[])[][] = [
        ['parent', 'in', orderNames],
      ];
      
      items = await client.getList<{
        item_code: string;
        item_name: string;
        qty: number;
        parent: string;
      }>('Purchase Order Item', {
        filters: itemFilters,
        fields: ['item_code', 'item_name', 'qty', 'parent'],
        limit: 10000,
      });
    } catch (itemError) {
      // If permission error on child table, return empty array
      console.warn('[fetchMostPurchasedItems] Permission error fetching items, returning empty:', itemError);
      return [];
    }
    
    // Aggregate by item_code
    const itemMap = new Map<string, {
      item_name: string;
      purchase_orders: Set<string>;
      total_qty: number;
    }>();
    
    for (const item of items) {
      const existing = itemMap.get(item.item_code);
      if (existing) {
        existing.purchase_orders.add(item.parent);
        existing.total_qty += item.qty;
      } else {
        itemMap.set(item.item_code, {
          item_name: item.item_name,
          purchase_orders: new Set([item.parent]),
          total_qty: item.qty,
        });
      }
    }
    
    // Convert to MostPurchasedItem[] and sort by frequency
    return Array.from(itemMap.entries())
      .map(([item_code, data]) => ({
        item_code,
        item_name: data.item_name,
        purchase_frequency: data.purchase_orders.size,
        total_purchased_qty: data.total_qty,
      }))
      .sort((a, b) => b.purchase_frequency - a.purchase_frequency)
      .slice(0, 10);
  } catch (error) {
    console.error('[fetchMostPurchasedItems] Error:', error);
    throw new Error(`Failed to fetch most purchased items: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch top 10 suppliers by purchase frequency
 * Requirement: 19.1, 19.2, 9.14
 */
export async function fetchTopSuppliersByFrequency(
  client: ERPNextClientType,
  company: string | null
): Promise<TopSupplierByFrequency[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch Purchase Orders
  const orders = await client.getList<{
    supplier: string;
    supplier_name: string;
    grand_total: number;
  }>('Purchase Order', {
    filters,
    fields: ['supplier', 'supplier_name', 'grand_total'],
    limit: 5000,
  });
  
  // Aggregate by supplier
  const supplierMap = new Map<string, {
    supplier_name: string;
    order_count: number;
    total_amount: number;
  }>();
  
  for (const order of orders) {
    const existing = supplierMap.get(order.supplier);
    if (existing) {
      existing.order_count += 1;
      existing.total_amount += order.grand_total;
    } else {
      supplierMap.set(order.supplier, {
        supplier_name: order.supplier_name,
        order_count: 1,
        total_amount: order.grand_total,
      });
    }
  }
  
  // Convert to TopSupplierByFrequency[] and sort by frequency
  return Array.from(supplierMap.values())
    .map(supplier => ({
      supplier_name: supplier.supplier_name,
      purchase_order_count: supplier.order_count,
      total_purchase_amount: supplier.total_amount,
      average_order_value: supplier.total_amount / supplier.order_count,
    }))
    .sort((a, b) => b.purchase_order_count - a.purchase_order_count)
    .slice(0, 10);
}


/**
 * Fetch top 10 suppliers with highest paid amounts
 * Requirement: 20.1, 20.2, 9.15
 */
export async function fetchPaidSuppliers(
  client: ERPNextClientType,
  company: string | null
): Promise<PaidSupplier[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
    ['outstanding_amount', '=', 0],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch fully paid Purchase Invoices
  const invoices = await client.getList<{
    supplier: string;
    supplier_name: string;
    paid_amount: number;
    posting_date: string;
  }>('Purchase Invoice', {
    filters,
    fields: ['supplier', 'supplier_name', 'paid_amount', 'posting_date'],
    limit: 5000,
  });
  
  // Aggregate by supplier
  const supplierMap = new Map<string, {
    supplier_name: string;
    invoice_count: number;
    total_paid: number;
    last_payment_date: string;
  }>();
  
  for (const invoice of invoices) {
    const existing = supplierMap.get(invoice.supplier);
    if (existing) {
      existing.invoice_count += 1;
      existing.total_paid += invoice.paid_amount;
      if (invoice.posting_date > existing.last_payment_date) {
        existing.last_payment_date = invoice.posting_date;
      }
    } else {
      supplierMap.set(invoice.supplier, {
        supplier_name: invoice.supplier_name,
        invoice_count: 1,
        total_paid: invoice.paid_amount,
        last_payment_date: invoice.posting_date,
      });
    }
  }
  
  // Convert to PaidSupplier[] and sort by total paid
  return Array.from(supplierMap.values())
    .map(supplier => ({
      supplier_name: supplier.supplier_name,
      paid_invoices_count: supplier.invoice_count,
      total_paid_amount: supplier.total_paid,
      last_payment_date: supplier.last_payment_date,
    }))
    .sort((a, b) => b.total_paid_amount - a.total_paid_amount)
    .slice(0, 10);
}


/**
 * Fetch top 10 suppliers with highest outstanding amounts
 * Requirement: 21.1, 21.2, 9.16
 */
export async function fetchUnpaidSuppliers(
  client: ERPNextClientType,
  company: string | null
): Promise<UnpaidSupplier[]> {
  const filters: (string | number | boolean | null | string[])[][] = [
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0],
  ];
  
  if (company) {
    filters.push(['company', '=', company]);
  }
  
  // Fetch unpaid Purchase Invoices
  const invoices = await client.getList<{
    supplier: string;
    supplier_name: string;
    outstanding_amount: number;
    due_date: string;
  }>('Purchase Invoice', {
    filters,
    fields: ['supplier', 'supplier_name', 'outstanding_amount', 'due_date'],
    limit: 5000,
  });
  
  // Aggregate by supplier
  const supplierMap = new Map<string, {
    supplier_name: string;
    invoice_count: number;
    total_outstanding: number;
    oldest_due_date: string;
  }>();
  
  for (const invoice of invoices) {
    const existing = supplierMap.get(invoice.supplier);
    if (existing) {
      existing.invoice_count += 1;
      existing.total_outstanding += invoice.outstanding_amount;
      if (invoice.due_date < existing.oldest_due_date) {
        existing.oldest_due_date = invoice.due_date;
      }
    } else {
      supplierMap.set(invoice.supplier, {
        supplier_name: invoice.supplier_name,
        invoice_count: 1,
        total_outstanding: invoice.outstanding_amount,
        oldest_due_date: invoice.due_date,
      });
    }
  }
  
  // Convert to UnpaidSupplier[] and sort by outstanding amount
  return Array.from(supplierMap.values())
    .map(supplier => ({
      supplier_name: supplier.supplier_name,
      outstanding_invoices_count: supplier.invoice_count,
      outstanding_amount: supplier.total_outstanding,
      oldest_due_date: supplier.oldest_due_date,
    }))
    .sort((a, b) => b.outstanding_amount - a.outstanding_amount)
    .slice(0, 10);
}
