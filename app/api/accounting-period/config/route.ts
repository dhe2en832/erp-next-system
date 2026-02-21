import { NextRequest, NextResponse } from 'next/server';
import { getERPNextClient } from '@/lib/erpnext';
import { requirePermission, canModifyConfig } from '@/lib/accounting-period-permissions';
import type { GetConfigResponse, UpdateConfigRequest, UpdateConfigResponse, PeriodClosingConfig } from '@/types/accounting-period';

export async function GET(request: NextRequest) {
  try {
    const client = await getERPNextClient();

    // Get the singleton Period Closing Config document
    const config = await client.getDoc('Period Closing Config', 'Period Closing Config');

    const response: GetConfigResponse = {
      success: true,
      data: config as PeriodClosingConfig
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching config:', error);
    
    // If config doesn't exist, return default values
    if (error.message?.includes('does not exist')) {
      const defaultConfig: PeriodClosingConfig = {
        name: 'Period Closing Config',
        retained_earnings_account: '',
        enable_bank_reconciliation_check: true,
        enable_draft_transaction_check: true,
        enable_unposted_transaction_check: true,
        enable_sales_invoice_check: true,
        enable_purchase_invoice_check: true,
        enable_inventory_check: true,
        enable_payroll_check: true,
        closing_role: 'Accounts Manager',
        reopen_role: 'Accounts Manager',
        reminder_days_before_end: 3,
        escalation_days_after_end: 7,
        enable_email_notifications: true
      };

      return NextResponse.json({
        success: true,
        data: defaultConfig
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch configuration'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check user permissions for modifying configuration
    const user = await requirePermission(request, canModifyConfig);

    const body: UpdateConfigRequest = await request.json();
    const client = await getERPNextClient();

    // Validate retained_earnings_account if provided
    if (body.retained_earnings_account) {
      const account = await client.getDoc('Account', body.retained_earnings_account);
      
      if (account.root_type !== 'Equity') {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Retained earnings account must be an Equity account',
            details: {
              field: 'retained_earnings_account',
              value: body.retained_earnings_account,
              actual_root_type: account.root_type,
              required_root_type: 'Equity'
            }
          },
          { status: 400 }
        );
      }
    }

    // Validate role assignments if provided
    if (body.closing_role) {
      try {
        await client.getDoc('Role', body.closing_role);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Role '${body.closing_role}' does not exist`,
            details: {
              field: 'closing_role',
              value: body.closing_role
            }
          },
          { status: 400 }
        );
      }
    }

    if (body.reopen_role) {
      try {
        await client.getDoc('Role', body.reopen_role);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: `Role '${body.reopen_role}' does not exist`,
            details: {
              field: 'reopen_role',
              value: body.reopen_role
            }
          },
          { status: 400 }
        );
      }
    }

    // Get current config or create if doesn't exist
    let config: any;
    try {
      config = await client.getDoc('Period Closing Config', 'Period Closing Config');
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        // Create new config
        config = await client.insert('Period Closing Config', {
          doctype: 'Period Closing Config',
          ...body
        });
      } else {
        throw error;
      }
    }

    // Update config
    const updatedConfig = await client.update('Period Closing Config', 'Period Closing Config', body);

    // Create audit log entry
    try {
      await client.insert('Period Closing Log', {
        doctype: 'Period Closing Log',
        accounting_period: '',
        action_type: 'Configuration Changed',
        action_by: user.name,
        action_date: new Date().toISOString(),
        reason: 'Configuration updated',
        before_snapshot: JSON.stringify(config),
        after_snapshot: JSON.stringify(updatedConfig)
      });
    } catch (logError) {
      console.error('Failed to create audit log:', logError);
      // Don't fail the request if audit log fails
    }

    const response: UpdateConfigResponse = {
      success: true,
      data: updatedConfig as PeriodClosingConfig,
      message: 'Configuration updated successfully'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error updating config:', error);
    
    // Handle permission errors
    if (error.statusCode === 403) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AUTHORIZATION_ERROR',
          message: error.message,
          details: error.details
        },
        { status: 403 }
      );
    }

    // Handle authentication errors
    if (error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to update configuration'
      },
      { status: 500 }
    );
  }
}
