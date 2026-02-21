import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  validateTransactionAgainstClosedPeriod,
  getTransactionRestrictionInfo,
  type TransactionValidationParams 
} from '@/lib/accounting-period-restrictions';

/**
 * POST /api/accounting-period/check-restriction
 * 
 * Endpoint to validate if a transaction can be created/modified
 * Returns restriction info and reason
 * 
 * Validates: Requirements 5.1, 5.2, 5.3
 */

const checkRestrictionSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  posting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  doctype: z.string().min(1, 'Document type is required'),
  docname: z.string().optional(),
  user: z.string().optional().default('Administrator'),
  userRoles: z.array(z.string()).optional().default(['System Manager']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = checkRestrictionSchema.parse(body);

    // Validate transaction against closed periods
    const validationResult = await validateTransactionAgainstClosedPeriod(
      validatedData as TransactionValidationParams
    );

    // Get detailed restriction info
    const restrictionInfo = await getTransactionRestrictionInfo(
      validatedData as TransactionValidationParams
    );

    return NextResponse.json({
      success: true,
      data: {
        allowed: validationResult.allowed,
        restricted: restrictionInfo.restricted,
        period: validationResult.period ? {
          name: validationResult.period.name,
          period_name: validationResult.period.period_name,
          status: validationResult.period.status,
          start_date: validationResult.period.start_date,
          end_date: validationResult.period.end_date,
        } : null,
        reason: validationResult.reason || restrictionInfo.reason,
        requiresLogging: validationResult.requiresLogging,
        canOverride: restrictionInfo.canOverride,
      },
    });
  } catch (error: any) {
    console.error('Check restriction error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
