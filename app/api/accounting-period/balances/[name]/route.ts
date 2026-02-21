import { NextRequest, NextResponse } from 'next/server';
import { calculateAllAccountBalances } from '../../../../../lib/accounting-period-closing';
import type { AccountingPeriod } from '../../../../../types/accounting-period';

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'http://localhost:8000';
const API_KEY = process.env.ERPNEXT_API_KEY || '';
const API_SECRET = process.env.ERPNEXT_API_SECRET || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const periodName = decodeURIComponent(params.name);

    // Fetch period details from ERPNext
    const periodResponse = await fetch(
      `${ERPNEXT_URL}/api/resource/Accounting Period/${encodeURIComponent(periodName)}`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!periodResponse.ok) {
      if (periodResponse.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: 'NOT_FOUND',
            message: 'Periode akuntansi tidak ditemukan',
          },
          { status: 404 }
        );
      }
      throw new Error(`ERPNext API error: ${periodResponse.statusText}`);
    }

    const periodData = await periodResponse.json();
    const period: AccountingPeriod = periodData.data;

    // Calculate account balances for the period
    const accountBalances = await calculateAllAccountBalances(period);

    return NextResponse.json({
      success: true,
      data: accountBalances,
    });
  } catch (error: any) {
    console.error('Error fetching account balances:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Gagal memuat saldo akun',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
