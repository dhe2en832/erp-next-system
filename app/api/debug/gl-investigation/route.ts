import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClientForRequest, getSiteIdFromRequest, buildSiteAwareErrorResponse, logSiteError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const client = await getERPNextClientForRequest(request);
    const { searchParams } = new URL(request.url);
    
    const company = searchParams.get('company') || 'Cirebon';
    const period_name = searchParams.get('period_name');

    if (!period_name) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'period_name is required' },
        { status: 400 }
      );
    }

    // Get period details
    const period = await client.get('Accounting Period', period_name);

    // 1. Check Sales Invoice
    const salesInvoices = await client.getList('Sales Invoice', {
      filters: [
        ['company', '=', company],
        ['docstatus', '=', 1],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
      ],
      fields: ['name', 'total', 'grand_total', 'posting_date'],
      limit: 500,
    });

    // 2. Check GL Entry for Income Account (4xxx)
    const incomeGLEntries = await client.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
        ['account', 'like', '4%'], // Income accounts start with 4
      ],
      fields: ['account', 'debit', 'credit', 'voucher_type', 'voucher_no'],
      limit: 500,
    });

    // 3. Check GL Entry for Beban (5xxx)
    const expenseGLEntries = await client.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
        ['account', 'like', '5%'], // Expense accounts start with 5
      ],
      fields: ['account', 'debit', 'credit', 'voucher_type', 'voucher_no'],
      limit: 500,
    });

    // 4. Check GL Entry for Penyesuaian Stock (5110.020)
    const adjustmentGLEntries = await client.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
        ['account', '=', '5110.020 - Penyesuaian Stock - C'],
      ],
      fields: ['account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'posting_date'],
      limit: 500,
    });

    // 5. Check GL Entry for Persediaan Barang (1141.000)
    const inventoryGLEntries = await client.getList('GL Entry', {
      filters: [
        ['company', '=', company],
        ['posting_date', '>=', period.start_date],
        ['posting_date', '<=', period.end_date],
        ['account', '=', '1141.000 - Persediaan Barang - C'],
      ],
      fields: ['account', 'debit', 'credit', 'voucher_type', 'voucher_no', 'posting_date'],
      limit: 500,
    });

    // Calculate totals
    const totalIncome = incomeGLEntries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
    const totalExpenseDebit = expenseGLEntries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
    const totalExpenseCredit = expenseGLEntries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
    const totalAdjustmentDebit = adjustmentGLEntries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
    const totalAdjustmentCredit = adjustmentGLEntries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          name: period.name,
          start_date: period.start_date,
          end_date: period.end_date,
        },
        sales_invoices: {
          count: salesInvoices.length,
          total_amount: salesInvoices.reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0),
          invoices: salesInvoices,
        },
        income_gl_entries: {
          count: incomeGLEntries.length,
          total_credit: totalIncome,
          entries: incomeGLEntries,
        },
        expense_gl_entries: {
          count: expenseGLEntries.length,
          total_debit: totalExpenseDebit,
          total_credit: totalExpenseCredit,
          entries: expenseGLEntries,
        },
        adjustment_stock_gl_entries: {
          count: adjustmentGLEntries.length,
          total_debit: totalAdjustmentDebit,
          total_credit: totalAdjustmentCredit,
          entries: adjustmentGLEntries,
        },
        inventory_gl_entries: {
          count: inventoryGLEntries.length,
          entries: inventoryGLEntries,
        },
      },
    });
  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/gl-investigation', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
