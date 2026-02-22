import { NextRequest, NextResponse } from 'next/server';
import { erpnextClient } from '@/lib/erpnext';
import type { AccountingPeriod } from '@/types/accounting-period';

// GET /api/accounting-period/periods/[name]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const params = await context.params;
    
    // Decode the period name (handle double encoding)
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }

    console.log('Fetching period:', periodName);

    // Fetch period details from ERPNext
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);

    return NextResponse.json({
      success: true,
      data: period,
    });
  } catch (error: any) {
    console.error('Error fetching accounting period:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch accounting period',
        debug: {
          errorDetails: error.toString()
        }
      },
      { status: 500 }
    );
  }
}

// PUT /api/accounting-period/periods/[name]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const params = await context.params;
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }
    
    const body = await request.json();

    // Only allow updating certain fields
    const allowedFields = ['remarks', 'fiscal_year'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Check if period is permanently closed
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);
    
    if (period.status === 'Permanently Closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot update a permanently closed period',
        },
        { status: 422 }
      );
    }

    // Update period in ERPNext
    const updatedPeriod = await erpnextClient.update<AccountingPeriod>(
      'Accounting Period',
      periodName,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
      message: 'Period updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating accounting period:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'UPDATE_ERROR',
        message: error.message || 'Failed to update accounting period',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/accounting-period/periods/[name]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const params = await context.params;
    let periodName = params.name;
    
    // Decode multiple times if needed
    while (periodName !== decodeURIComponent(periodName)) {
      periodName = decodeURIComponent(periodName);
    }

    // Check if period is closed
    const period = await erpnextClient.get<AccountingPeriod>('Accounting Period', periodName);
    
    if (period.status === 'Closed' || period.status === 'Permanently Closed') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot delete a closed period. Please reopen it first.',
        },
        { status: 422 }
      );
    }

    // Delete period from ERPNext
    await erpnextClient.delete('Accounting Period', periodName);

    return NextResponse.json({
      success: true,
      message: 'Period deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting accounting period:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'DELETE_ERROR',
        message: error.message || 'Failed to delete accounting period',
      },
      { status: 500 }
    );
  }
}
