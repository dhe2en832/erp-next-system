import { NextRequest, NextResponse } from 'next/server';
import {
  getERPNextClientForRequest,
  getSiteIdFromRequest,
  buildSiteAwareErrorResponse,
  logSiteError
} from '@/lib/api-helpers';

/**
 * Debug endpoint to view detailed GL Entry transactions for a specific account
 * GET /api/debug/account-ledger?account=5110.020 - Penyesuaian Stock - C&company=Cirebon&from_date=2026-03-01&to_date=2026-03-31
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const account = searchParams.get('account');
    const company = searchParams.get('company');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!account || !company) {
      return NextResponse.json(
        { success: false, message: 'Account and company are required' },
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

    // Build filters
    const filters: (string | number | boolean | null | string[])[][] = [
      ['account', '=', account],
      ['company', '=', company],
      ['is_cancelled', '=', 0]
    ];

    if (fromDate) {
      filters.push(['posting_date', '>=', fromDate]);
    }
    if (toDate) {
      filters.push(['posting_date', '<=', toDate]);
    }

    interface GLEntrySummary {
      name: string;
      posting_date: string;
      account: string;
      party_type?: string;
      party?: string;
      debit: number;
      credit: number;
      against?: string;
      against_voucher_type?: string;
      against_voucher?: string;
      voucher_type?: string;
      voucher_no?: string;
      remarks?: string;
      is_cancelled: number;
      creation: string;
      modified: string;
      [key: string]: unknown;
    }
    // Fetch GL Entries with detailed information
    const glEntries = await client.getList<GLEntrySummary>('GL Entry', {
      fields: [
        'name',
        'posting_date',
        'account',
        'party_type',
        'party',
        'debit',
        'credit',
        'against',
        'against_voucher_type',
        'against_voucher',
        'voucher_type',
        'voucher_no',
        'remarks',
        'is_cancelled',
        'creation',
        'modified'
      ],
      filters: filters,
      order_by: 'posting_date asc, creation asc',
      limit_page_length: 1000
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = glEntries.map((entry: GLEntrySummary) => {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;
      const amount = debit - credit;
      runningBalance += amount;
      
      return {
        ...entry,
        amount,
        balance: runningBalance
      };
    });

    // Calculate totals
    const totalDebit = glEntries.reduce((sum: number, e: GLEntrySummary) => sum + (e.debit || 0), 0);
    const totalCredit = glEntries.reduce((sum: number, e: GLEntrySummary) => sum + (e.credit || 0), 0);
    const netBalance = totalDebit - totalCredit;

    return NextResponse.json({
      success: true,
      data: {
        account,
        company,
        period: {
          from_date: fromDate,
          to_date: toDate
        },
        summary: {
          total_entries: glEntries.length,
          total_debit: totalDebit,
          total_credit: totalCredit,
          net_balance: netBalance
        },
        entries: entriesWithBalance
      }
    });

  } catch (error: unknown) {
    logSiteError(error, 'GET /api/debug/account-ledger', siteId);
    const errorResponse = buildSiteAwareErrorResponse(error, siteId);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
