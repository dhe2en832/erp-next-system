import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * Debug endpoint to view detailed Stock Entry document
 * GET /api/debug/stock-entry-detail?name=MAT-STE-2026-00011
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Stock Entry name is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const siteSpecificCookie = siteId ? `sid_${siteId.replace(/\./g, '-')}` : null;
    const sid = (siteSpecificCookie && request.cookies.get(siteSpecificCookie)?.value) || request.cookies.get('sid')?.value;
    if (!sid) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await getERPNextClientForRequest(request);

    // Fetch Stock Entry document with all details
    const stockEntry = await client.getDoc('Stock Entry', name) as any;

    // Fetch related GL Entries
    const glEntries = await client.getList('GL Entry', {
      fields: [
        'name',
        'posting_date',
        'account',
        'debit',
        'credit',
        'against',
        'remarks'
      ],
      filters: [
        ['voucher_type', '=', 'Stock Entry'],
        ['voucher_no', '=', name],
        ['is_cancelled', '=', 0]
      ],
      order_by: 'account asc',
      limit_page_length: 100
    });

    // Calculate GL totals
    const glTotalDebit = glEntries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const glTotalCredit = glEntries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    // Extract key information
    const response = {
      success: true,
      data: {
        // Header Information
        header: {
          name: stockEntry.name,
          stock_entry_type: stockEntry.stock_entry_type,
          purpose: stockEntry.purpose,
          company: stockEntry.company,
          posting_date: stockEntry.posting_date,
          posting_time: stockEntry.posting_time,
          docstatus: stockEntry.docstatus,
          is_cancelled: stockEntry.is_cancelled || 0,
          creation: stockEntry.creation,
          modified: stockEntry.modified,
          owner: stockEntry.owner,
          modified_by: stockEntry.modified_by
        },
        
        // Warehouse Information
        warehouses: {
          from_warehouse: stockEntry.from_warehouse,
          to_warehouse: stockEntry.to_warehouse,
          source_warehouse_address: stockEntry.source_warehouse_address,
          target_warehouse_address: stockEntry.target_warehouse_address
        },

        // Items
        items: (stockEntry.items || []).map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description,
          qty: item.qty,
          uom: item.uom,
          stock_uom: item.stock_uom,
          conversion_factor: item.conversion_factor,
          transfer_qty: item.transfer_qty,
          basic_rate: item.basic_rate,
          valuation_rate: item.valuation_rate,
          basic_amount: item.basic_amount,
          amount: item.amount,
          s_warehouse: item.s_warehouse,
          t_warehouse: item.t_warehouse,
          expense_account: item.expense_account,
          cost_center: item.cost_center
        })),

        // Totals
        totals: {
          total_outgoing_value: stockEntry.total_outgoing_value,
          total_incoming_value: stockEntry.total_incoming_value,
          value_difference: stockEntry.value_difference,
          total_amount: stockEntry.total_amount,
          total_additional_costs: stockEntry.total_additional_costs
        },

        // Additional Costs
        additional_costs: (stockEntry.additional_costs || []).map((cost: any) => ({
          expense_account: cost.expense_account,
          description: cost.description,
          amount: cost.amount
        })),

        // Accounting Entries (GL Entries)
        gl_entries: {
          entries: glEntries,
          summary: {
            total_entries: glEntries.length,
            total_debit: glTotalDebit,
            total_credit: glTotalCredit,
            difference: glTotalDebit - glTotalCredit
          }
        },

        // Other Information
        other: {
          remarks: stockEntry.remarks,
          per_transferred: stockEntry.per_transferred,
          is_opening: stockEntry.is_opening,
          inspection_required: stockEntry.inspection_required,
          apply_putaway_rule: stockEntry.apply_putaway_rule
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/stock-entry-detail', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
