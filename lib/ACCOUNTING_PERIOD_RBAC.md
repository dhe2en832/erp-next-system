# Accounting Period Role-Based Access Control (RBAC)

## Overview

This document describes the role-based access control implementation for the Accounting Period Closing feature. The RBAC system ensures that only authorized users can perform sensitive operations like closing, reopening, and permanently closing accounting periods.

## Requirements Addressed

- **Requirement 5.4**: Pembatasan Transaksi pada Periode Tertutup - Administrator override with logging
- **Requirement 6.1**: Pembukaan Kembali Periode - Role-based access for reopening
- **Requirement 7.1**: Penutupan Permanen - System Manager only access
- **Requirement 12.3**: Konfigurasi role untuk penutupan periode
- **Requirement 12.4**: Konfigurasi role untuk pembukaan kembali periode

## Architecture

### Core Components

1. **Permission Utilities** (`lib/accounting-period-permissions.ts`)
   - User authentication and role checking
   - Permission validation functions
   - Middleware helpers for API routes

2. **API Route Protection**
   - Close endpoint: Requires `closing_role` (configurable)
   - Reopen endpoint: Requires `reopen_role` (configurable)
   - Permanent close endpoint: Requires `System Manager` role
   - Config endpoint: Requires `System Manager` or `Accounts Manager` role
   - Audit log endpoint: Requires `System Manager` or `Accounts Manager` role

3. **Transaction Restrictions** (`lib/accounting-period-restrictions.ts`)
   - Validates transactions against closed periods
   - Enforces role-based overrides
   - Logs administrator actions

## Permission Functions

### User Authentication

```typescript
// Get current user from session
const user = await getCurrentUser(request);
// Returns: { name, email, full_name, roles: string[] }

// Check if user has a specific role
const hasSystemManager = hasRole(user, 'System Manager');

// Check if user has any of multiple roles
const hasAnyAdminRole = hasAnyRole(user, ['System Manager', 'Accounts Manager']);
```

### Permission Checks

#### 1. Period Closing Permission

```typescript
const result = await canClosePeriod(user);
// Checks: System Manager OR closing_role from config
// Default closing_role: 'Accounts Manager'
```

**Allowed Roles:**
- System Manager (always)
- Role specified in `Period Closing Config.closing_role` (default: Accounts Manager)

#### 2. Period Reopening Permission

```typescript
const result = await canReopenPeriod(user);
// Checks: System Manager OR reopen_role from config
// Default reopen_role: 'Accounts Manager'
```

**Allowed Roles:**
- System Manager (always)
- Role specified in `Period Closing Config.reopen_role` (default: Accounts Manager)

#### 3. Permanent Closing Permission

```typescript
const result = canPermanentlyClosePeriod(user);
// Checks: System Manager ONLY
```

**Allowed Roles:**
- System Manager (only)

#### 4. Configuration Modification Permission

```typescript
const result = canModifyConfig(user);
// Checks: System Manager OR Accounts Manager
```

**Allowed Roles:**
- System Manager
- Accounts Manager

#### 5. Closed Period Transaction Modification

```typescript
const result = await canModifyClosedPeriodTransaction(user);
// Checks: System Manager OR reopen_role from config
```

**Allowed Roles:**
- System Manager (always)
- Role specified in `Period Closing Config.reopen_role` (default: Accounts Manager)

#### 6. Audit Log Viewing Permission

```typescript
const result = canViewAuditLog(user);
// Checks: System Manager OR Accounts Manager
```

**Allowed Roles:**
- System Manager
- Accounts Manager

## API Route Implementation

### Using Permission Middleware

All protected API routes use the `requirePermission` middleware:

```typescript
import { requirePermission, canClosePeriod } from '@/lib/accounting-period-permissions';

export async function POST(request: NextRequest) {
  try {
    // Check permissions - throws error if not authorized
    const user = await requirePermission(request, canClosePeriod);
    
    // User is authenticated and authorized
    const currentUser = user.name;
    
    // ... rest of the implementation
  } catch (error: any) {
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
  }
}
```

### Error Responses

#### 401 Unauthorized (Not Authenticated)

```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden (Not Authorized)

```json
{
  "success": false,
  "error": "AUTHORIZATION_ERROR",
  "message": "User does not have permission to close periods. Required role: Accounts Manager",
  "details": {
    "required_role": "Accounts Manager",
    "user_roles": ["Accounts User"]
  }
}
```

## Transaction Restrictions

### Closed Period Validation

When a transaction is created/modified, the system checks if the posting date falls within a closed period:

```typescript
const result = await validateTransactionAgainstClosedPeriod({
  company: 'Test Company',
  posting_date: '2024-01-15',
  doctype: 'Sales Invoice',
  docname: 'SI-001',
  user: 'user@example.com',
  userRoles: ['Accounts User']
});
```

**Validation Logic:**

1. **No Closed Period**: Transaction allowed
2. **Permanently Closed Period**: Transaction rejected for all users
3. **Closed Period + Admin User**: Transaction allowed with audit logging
4. **Closed Period + Regular User**: Transaction rejected

### Administrator Override

When an administrator modifies a transaction in a closed period:

1. Transaction is allowed
2. Audit log entry is created with:
   - Period name
   - Transaction type and name
   - User who performed the action
   - Timestamp
   - Reason for modification

```typescript
await logAdministratorOverride({
  period: closedPeriod,
  doctype: 'Sales Invoice',
  docname: 'SI-001',
  user: 'admin@example.com',
  action: 'update',
  reason: 'Correcting invoice amount'
});
```

## Configuration

### Period Closing Config DocType

The configuration is stored in a singleton DocType `Period Closing Config`:

```typescript
interface PeriodClosingConfig {
  name: 'Period Closing Config';
  retained_earnings_account: string;
  
  // Validation settings
  enable_bank_reconciliation_check: boolean;
  enable_draft_transaction_check: boolean;
  enable_unposted_transaction_check: boolean;
  enable_sales_invoice_check: boolean;
  enable_purchase_invoice_check: boolean;
  enable_inventory_check: boolean;
  enable_payroll_check: boolean;
  
  // Role settings
  closing_role: string;  // Default: 'Accounts Manager'
  reopen_role: string;   // Default: 'Accounts Manager'
  
  // Notification settings
  reminder_days_before_end: number;
  escalation_days_after_end: number;
  enable_email_notifications: boolean;
}
```

### Configuring Roles

To change which roles can close or reopen periods:

1. Navigate to Period Closing Config
2. Update `closing_role` field (e.g., 'Senior Accountant')
3. Update `reopen_role` field (e.g., 'Finance Manager')
4. Save the configuration

The changes take effect immediately for all subsequent operations.

## Security Considerations

### 1. Session-Based Authentication

- User authentication is based on ERPNext session cookies (`sid`)
- Session validation is performed on every protected API call
- Invalid or expired sessions result in 401 Unauthorized

### 2. Role Verification

- User roles are fetched from ERPNext User document
- Roles are verified against configuration settings
- Role checks are performed server-side (cannot be bypassed)

### 3. Audit Trail

All sensitive operations are logged:
- Period closing/reopening/permanent closing
- Configuration changes
- Transaction modifications in closed periods

Audit logs include:
- User who performed the action
- Timestamp
- Before/after snapshots
- Reason (when applicable)
- IP address and user agent (when available)

### 4. Permanent Closure Protection

- Only System Manager can permanently close periods
- Permanent closure cannot be reversed
- All transaction modifications are blocked (no override)

### 5. Configuration Protection

- Only System Manager and Accounts Manager can modify configuration
- Configuration changes are logged in audit trail
- Invalid role assignments are rejected

## Testing

### Unit Tests

Test permission functions with different user roles:

```typescript
describe('Permission Checks', () => {
  it('should allow System Manager to close periods', async () => {
    const user = { name: 'admin', roles: ['System Manager'] };
    const result = await canClosePeriod(user);
    expect(result.allowed).toBe(true);
  });
  
  it('should deny regular user from closing periods', async () => {
    const user = { name: 'user', roles: ['Accounts User'] };
    const result = await canClosePeriod(user);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

Test API routes with different authentication states:

```typescript
describe('Close Period API', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch('/api/accounting-period/close', {
      method: 'POST',
      body: JSON.stringify({ period_name: 'Jan 2024', company: 'Test' })
    });
    expect(response.status).toBe(401);
  });
  
  it('should return 403 for unauthorized users', async () => {
    const response = await fetch('/api/accounting-period/close', {
      method: 'POST',
      headers: { Cookie: 'sid=user_session' },
      body: JSON.stringify({ period_name: 'Jan 2024', company: 'Test' })
    });
    expect(response.status).toBe(403);
  });
});
```

## Troubleshooting

### Issue: User has correct role but still gets 403 error

**Possible Causes:**
1. Session cookie is invalid or expired
2. User role assignment is not saved in ERPNext
3. Configuration has different role specified

**Solution:**
1. Check if user is logged in to ERPNext
2. Verify user roles in ERPNext User document
3. Check Period Closing Config for role settings

### Issue: Administrator cannot modify transactions in closed period

**Possible Causes:**
1. Period is permanently closed (no override allowed)
2. User doesn't have System Manager or reopen_role

**Solution:**
1. Check period status (cannot override permanently closed)
2. Verify user has System Manager or configured reopen_role
3. Check Period Closing Config.reopen_role setting

### Issue: Configuration changes not taking effect

**Possible Causes:**
1. Configuration not saved properly
2. API cache issue

**Solution:**
1. Verify configuration is saved in ERPNext
2. Restart Next.js server to clear cache
3. Check browser console for errors

## Best Practices

1. **Principle of Least Privilege**: Assign only necessary roles to users
2. **Regular Audit Reviews**: Review audit logs periodically for suspicious activity
3. **Role Segregation**: Separate closing and reopening roles if needed
4. **Configuration Backup**: Document role assignments and configuration settings
5. **Testing**: Test permission changes in development before production
6. **Documentation**: Keep role assignments documented for compliance

## Future Enhancements

1. **Multi-level Approval**: Require multiple approvals for sensitive operations
2. **Time-based Restrictions**: Allow modifications only during specific time windows
3. **IP Whitelisting**: Restrict sensitive operations to specific IP addresses
4. **Two-Factor Authentication**: Require 2FA for permanent closing operations
5. **Role Hierarchy**: Implement hierarchical role inheritance
6. **Custom Permissions**: Allow custom permission rules per company

## References

- Requirements Document: `requirements.md`
- Design Document: `design.md`
- API Documentation: `app/api/accounting-period/README.md`
- ERPNext Permissions: https://docs.erpnext.com/docs/user/manual/en/setting-up/users-and-permissions
