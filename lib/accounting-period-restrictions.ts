/**
 * Accounting Period Transaction Restrictions
 * 
 * This module provides functions for:
 * - Validating transactions against closed accounting periods
 * - Enforcing transaction restrictions based on period status
 * - Logging administrator overrides
 */

import { erpnextClient } from './erpnext';
import { createAuditLog } from './accounting-period-closing';
import { getPeriodClosingConfig } from './accounting-period-permissions';
import type { AccountingPeriod } from '@/types/accounting-period';

export interface TransactionRestrictionResult {
  allowed: boolean;
  period?: AccountingPeriod;
  reason?: string;
  requiresLogging: boolean;
}

export interface TransactionValidationParams {
  company: string;
  posting_date: string;
  doctype: string;
  docname?: string;
  user: string;
  userRoles?: string[];
}

/**
 * Validate if a transaction can be created/modified against closed periods
 * 
 * Algorithm:
 * 1. Check if posting_date falls within any closed period
 * 2. If period is "Permanently Closed", reject for all users
 * 3. If period is "Closed" and user is admin, allow with logging
 * 4. If period is "Closed" and user is not admin, reject
 * 5. If no closed period found, allow
 * 
 * @param params - Transaction validation parameters
 * @returns Restriction result indicating if transaction is allowed
 */
export async function validateTransactionAgainstClosedPeriod(
  params: TransactionValidationParams
): Promise<TransactionRestrictionResult> {
  const { company, posting_date, doctype, docname, user, userRoles = [] } = params;

  // Skip validation if no posting_date
  if (!posting_date) {
    return {
      allowed: true,
      requiresLogging: false,
    };
  }

  // Get all closed periods for the company that contain this posting_date
  const filters = [
    ['company', '=', company],
    ['status', 'in', ['Closed', 'Permanently Closed']],
    ['start_date', '<=', posting_date],
    ['end_date', '>=', posting_date],
  ];

  try {
    const closedPeriods = await erpnextClient.getList('Accounting Period', {
      filters,
      fields: ['name', 'period_name', 'status', 'start_date', 'end_date'],
      limit_page_length: 1,
    });

    // No closed period found, allow transaction
    if (closedPeriods.length === 0) {
      return {
        allowed: true,
        requiresLogging: false,
      };
    }

    const period = closedPeriods[0] as AccountingPeriod;

    // Check if permanently closed
    if (period.status === 'Permanently Closed') {
      return {
        allowed: false,
        period,
        reason: `Cannot modify transaction: Period ${period.period_name} is permanently closed. No modifications are allowed.`,
        requiresLogging: false,
      };
    }

    // Get configuration to check reopen_role
    const config = await getPeriodClosingConfig();
    const reopenRole = config.reopen_role || 'Accounts Manager';

    // Check if user has override permission
    // System Manager or users with reopen_role can modify closed period transactions
    const hasOverridePermission = 
      userRoles.includes('System Manager') || 
      userRoles.includes(reopenRole) ||
      user === 'Administrator';

    if (hasOverridePermission) {
      // Allow transaction but require logging
      return {
        allowed: true,
        period,
        reason: `Transaction allowed in closed period ${period.period_name} with administrator override`,
        requiresLogging: true,
      };
    }

    // Deny transaction for regular users
    return {
      allowed: false,
      period,
      reason: `Cannot modify transaction: Period ${period.period_name} is closed. Contact administrator to reopen the period.`,
      requiresLogging: false,
    };
  } catch (error: any) {
    console.error('Error validating transaction against closed period:', error);
    // On error, allow transaction to avoid blocking operations
    // but log the error for investigation
    return {
      allowed: true,
      requiresLogging: false,
      reason: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Log administrator override for transaction in closed period
 * 
 * @param params - Transaction and period information
 * @returns Created audit log entry
 */
export async function logAdministratorOverride(params: {
  period: AccountingPeriod;
  doctype: string;
  docname: string;
  user: string;
  action: 'create' | 'update' | 'delete';
  reason?: string;
}): Promise<any> {
  const { period, doctype, docname, user, action, reason } = params;

  return await createAuditLog({
    accounting_period: period.name,
    action_type: 'Transaction Modified',
    action_by: user,
    action_date: new Date().toISOString(),
    affected_transaction: docname,
    transaction_doctype: doctype,
    reason: reason || `Administrator ${action} ${doctype} ${docname} in closed period ${period.period_name}`,
  });
}

/**
 * Check if a transaction can be created in a closed period
 * Convenience wrapper for validateTransactionAgainstClosedPeriod
 * 
 * @param params - Transaction validation parameters
 * @returns True if transaction can be created, false otherwise
 */
export async function canCreateTransaction(
  params: TransactionValidationParams
): Promise<boolean> {
  const result = await validateTransactionAgainstClosedPeriod(params);
  return result.allowed;
}

/**
 * Check if a transaction can be modified in a closed period
 * Convenience wrapper for validateTransactionAgainstClosedPeriod
 * 
 * @param params - Transaction validation parameters
 * @returns True if transaction can be modified, false otherwise
 */
export async function canModifyTransaction(
  params: TransactionValidationParams
): Promise<boolean> {
  const result = await validateTransactionAgainstClosedPeriod(params);
  return result.allowed;
}

/**
 * Check if a transaction can be deleted in a closed period
 * Convenience wrapper for validateTransactionAgainstClosedPeriod
 * 
 * @param params - Transaction validation parameters
 * @returns True if transaction can be deleted, false otherwise
 */
export async function canDeleteTransaction(
  params: TransactionValidationParams
): Promise<boolean> {
  const result = await validateTransactionAgainstClosedPeriod(params);
  return result.allowed;
}

/**
 * Get restriction info for a transaction
 * Returns detailed information about why a transaction is restricted
 * 
 * @param params - Transaction validation parameters
 * @returns Restriction information
 */
export async function getTransactionRestrictionInfo(
  params: TransactionValidationParams
): Promise<{
  restricted: boolean;
  period?: AccountingPeriod;
  reason?: string;
  canOverride: boolean;
}> {
  const result = await validateTransactionAgainstClosedPeriod(params);

  return {
    restricted: !result.allowed,
    period: result.period,
    reason: result.reason,
    canOverride: result.requiresLogging, // If logging is required, it means override is possible
  };
}
