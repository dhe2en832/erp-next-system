/**
 * Accounting Period Permissions Utilities
 * 
 * This module provides role-based access control functions for:
 * - Period closing operations
 * - Period reopening operations
 * - Permanent closing operations (System Manager only)
 * - Configuration changes
 * 
 * Requirements: 5.4, 6.1, 7.1, 12.3, 12.4
 */

import { NextRequest } from 'next/server';
import { erpnextClient } from './erpnext';
import type { PeriodClosingConfig } from '@/types/accounting-period';

export interface UserInfo {
  name: string;
  email: string;
  full_name: string;
  roles: string[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  required_role?: string;
  user_roles?: string[];
}

/**
 * Get current user information from session
 * 
 * @param request - Next.js request object
 * @returns User information including roles
 */
export async function getCurrentUser(request: NextRequest): Promise<UserInfo | null> {
  try {
    const sid = request.cookies.get('sid')?.value;
    
    if (!sid) {
      return null;
    }

    // Call ERPNext API to get current user info
    const response = await fetch(`${process.env.ERPNEXT_URL}/api/method/frappe.auth.get_logged_user`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sid}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const username = data.message;

    if (!username || username === 'Guest') {
      return null;
    }

    // Get user details including roles
    const userDoc = await erpnextClient.get('User', username);
    
    // Extract roles from user document
    const roles = userDoc.roles?.map((r: any) => r.role) || [];

    return {
      name: userDoc.name,
      email: userDoc.email,
      full_name: userDoc.full_name || userDoc.name,
      roles: roles,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Check if user has a specific role
 * 
 * @param user - User information
 * @param role - Role name to check
 * @returns True if user has the role
 */
export function hasRole(user: UserInfo, role: string): boolean {
  return user.roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 * 
 * @param user - User information
 * @param roles - Array of role names to check
 * @returns True if user has at least one of the roles
 */
export function hasAnyRole(user: UserInfo, roles: string[]): boolean {
  return roles.some(role => user.roles.includes(role));
}

/**
 * Get Period Closing Config from ERPNext
 * 
 * @returns Period closing configuration
 */
export async function getPeriodClosingConfig(): Promise<PeriodClosingConfig> {
  return await erpnextClient.get<PeriodClosingConfig>(
    'Period Closing Config',
    'Period Closing Config'
  );
}

/**
 * Check if user can perform period closing operations
 * Validates against closing_role from configuration
 * 
 * Requirements: 5.4, 12.3
 * 
 * @param user - User information
 * @returns Permission check result
 */
export async function canClosePeriod(user: UserInfo): Promise<PermissionCheckResult> {
  try {
    const config = await getPeriodClosingConfig();
    const closingRole = config.closing_role || 'Accounts Manager';

    // System Manager can always close periods
    if (hasRole(user, 'System Manager')) {
      return { allowed: true };
    }

    // Check if user has the configured closing role
    if (hasRole(user, closingRole)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have permission to close periods. Required role: ${closingRole}`,
      required_role: closingRole,
      user_roles: user.roles,
    };
  } catch (error) {
    console.error('Error checking close period permission:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions',
    };
  }
}

/**
 * Check if user can perform period reopening operations
 * Validates against reopen_role from configuration
 * 
 * Requirements: 6.1, 12.4
 * 
 * @param user - User information
 * @returns Permission check result
 */
export async function canReopenPeriod(user: UserInfo): Promise<PermissionCheckResult> {
  try {
    const config = await getPeriodClosingConfig();
    const reopenRole = config.reopen_role || 'Accounts Manager';

    // System Manager can always reopen periods
    if (hasRole(user, 'System Manager')) {
      return { allowed: true };
    }

    // Check if user has the configured reopen role
    if (hasRole(user, reopenRole)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have permission to reopen periods. Required role: ${reopenRole}`,
      required_role: reopenRole,
      user_roles: user.roles,
    };
  } catch (error) {
    console.error('Error checking reopen period permission:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions',
    };
  }
}

/**
 * Check if user can perform permanent closing operations
 * Only System Manager role is allowed
 * 
 * Requirements: 7.1
 * 
 * @param user - User information
 * @returns Permission check result
 */
export function canPermanentlyClosePeriod(user: UserInfo): PermissionCheckResult {
  // Only System Manager can permanently close periods
  if (hasRole(user, 'System Manager')) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Only System Manager can permanently close periods',
    required_role: 'System Manager',
    user_roles: user.roles,
  };
}

/**
 * Check if user can modify period closing configuration
 * Only System Manager and Accounts Manager roles are allowed
 * 
 * Requirements: 12.3, 12.4
 * 
 * @param user - User information
 * @returns Permission check result
 */
export function canModifyConfig(user: UserInfo): PermissionCheckResult {
  // System Manager and Accounts Manager can modify config
  if (hasAnyRole(user, ['System Manager', 'Accounts Manager'])) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'User does not have permission to modify configuration. Required role: System Manager or Accounts Manager',
    required_role: 'System Manager or Accounts Manager',
    user_roles: user.roles,
  };
}

/**
 * Check if user can modify transactions in closed periods
 * Only System Manager and users with reopen_role can modify
 * 
 * Requirements: 5.4
 * 
 * @param user - User information
 * @returns Permission check result
 */
export async function canModifyClosedPeriodTransaction(user: UserInfo): Promise<PermissionCheckResult> {
  try {
    const config = await getPeriodClosingConfig();
    const reopenRole = config.reopen_role || 'Accounts Manager';

    // System Manager can always modify
    if (hasRole(user, 'System Manager')) {
      return { allowed: true };
    }

    // Users with reopen role can modify
    if (hasRole(user, reopenRole)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have permission to modify transactions in closed periods. Required role: ${reopenRole} or System Manager`,
      required_role: `${reopenRole} or System Manager`,
      user_roles: user.roles,
    };
  } catch (error) {
    console.error('Error checking modify closed period permission:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions',
    };
  }
}

/**
 * Check if user can view audit logs
 * System Manager and Accounts Manager can view audit logs
 * 
 * @param user - User information
 * @returns Permission check result
 */
export function canViewAuditLog(user: UserInfo): PermissionCheckResult {
  // System Manager and Accounts Manager can view audit logs
  if (hasAnyRole(user, ['System Manager', 'Accounts Manager'])) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'User does not have permission to view audit logs. Required role: System Manager or Accounts Manager',
    required_role: 'System Manager or Accounts Manager',
    user_roles: user.roles,
  };
}

/**
 * Middleware helper to check authentication
 * Returns user info if authenticated, null otherwise
 * 
 * @param request - Next.js request object
 * @returns User information or null
 */
export async function requireAuth(request: NextRequest): Promise<UserInfo | null> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return null;
  }

  return user;
}

/**
 * Middleware helper to check specific permission
 * Returns user info if authorized, throws error otherwise
 * 
 * @param request - Next.js request object
 * @param permissionCheck - Permission check function
 * @returns User information
 * @throws Error if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permissionCheck: (user: UserInfo) => Promise<PermissionCheckResult> | PermissionCheckResult
): Promise<UserInfo> {
  const user = await requireAuth(request);
  
  if (!user) {
    throw new Error('Authentication required');
  }

  const result = await permissionCheck(user);
  
  if (!result.allowed) {
    const error = new Error(result.reason || 'Permission denied');
    (error as any).statusCode = 403;
    (error as any).details = {
      required_role: result.required_role,
      user_roles: result.user_roles,
    };
    throw error;
  }

  return user;
}
