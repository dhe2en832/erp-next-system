# Accounting Period Configuration Tests

This directory contains tests for the Accounting Period Configuration Management feature.

## Test Files

### Property-Based Tests
- `accounting-period-config.pbt.test.ts` - Property tests for configuration validation

### Unit Tests
- `accounting-period-config-unit.test.ts` - Unit tests for configuration management

## Running Tests

### Prerequisites
Before running tests, ensure you have:
1. ERPNext backend running
2. Environment variables configured in `.env.local`:
   ```
   ERPNEXT_API_URL=http://localhost:8000
   ERP_API_KEY=your_api_key
   ERP_API_SECRET=your_api_secret
   ERP_DEFAULT_COMPANY=Batasku
   ```

### Run Property-Based Tests
```bash
npx tsx tests/accounting-period-config.pbt.test.ts
```

### Run Unit Tests
```bash
npx tsx tests/accounting-period-config-unit.test.ts
```

## Test Coverage

### Property Tests

#### Property 29: Configuration Validation
**Validates: Requirements 12.6**

Tests that configuration changes are validated against accounting rules:
- Rejects Asset accounts as retained_earnings_account
- Rejects Liability accounts as retained_earnings_account
- Rejects Income accounts as retained_earnings_account
- Rejects Expense accounts as retained_earnings_account
- Accepts valid Equity accounts as retained_earnings_account
- Rejects non-existent roles for closing_role
- Rejects non-existent roles for reopen_role
- Accepts valid roles

### Unit Tests

#### Test 1: Config Update with Valid Data
**Requirements: 12.1, 12.2, 12.3, 12.4, 12.5**

Tests successful configuration update with valid values:
- Updates retained_earnings_account with Equity account
- Updates boolean validation flags
- Updates role assignments
- Updates numeric values (reminder_days, escalation_days)
- Verifies configuration can be retrieved via GET endpoint

#### Test 2: Config Validation - Retained Earnings Must Be Equity
**Requirements: 12.6**

Tests that non-equity accounts are rejected:
- Rejects Asset account
- Rejects Liability account
- Rejects Income account
- Rejects Expense account
- Returns appropriate error messages mentioning "equity"
- Returns HTTP 400 status code

#### Test 3: Config Audit Logging
**Requirements: 12.7**

Tests that configuration changes are logged:
- Creates audit log entry when config is updated
- Audit log contains action_type "Configuration Changed"
- Audit log contains before_snapshot and after_snapshot
- Audit log contains action_by and action_date

#### Test 4: Config Validation - Invalid Role
**Requirements: 12.6**

Tests that invalid roles are rejected:
- Rejects non-existent closing_role
- Rejects non-existent reopen_role
- Returns appropriate error messages mentioning "does not exist"
- Returns HTTP 400 status code

## API Endpoints Tested

### GET /api/accounting-period/config
- Retrieves current configuration
- Returns default values if config doesn't exist
- Requirements: 12.1, 12.2, 12.3, 12.4, 12.5

### PUT /api/accounting-period/config
- Updates configuration with validation
- Validates retained_earnings_account is Equity account
- Validates role assignments exist
- Creates audit log entry for changes
- Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7

## Expected Test Results

When running with proper ERPNext backend:
- All property tests should pass
- All unit tests should pass (or skip if test data unavailable)

When running without ERPNext backend:
- Tests will fail with "ERP API credentials not configured" or "fetch failed"
- This is expected behavior - tests require live ERPNext instance

## Implementation Notes

### Configuration Fields

The Period Closing Config DocType contains:
- `retained_earnings_account` (Link to Account) - Must be Equity account
- `enable_bank_reconciliation_check` (Check) - Enable/disable validation
- `enable_draft_transaction_check` (Check) - Enable/disable validation
- `enable_unposted_transaction_check` (Check) - Enable/disable validation
- `enable_sales_invoice_check` (Check) - Enable/disable validation
- `enable_purchase_invoice_check` (Check) - Enable/disable validation
- `enable_inventory_check` (Check) - Enable/disable validation
- `enable_payroll_check` (Check) - Enable/disable validation
- `closing_role` (Link to Role) - Role allowed to close periods
- `reopen_role` (Link to Role) - Role allowed to reopen periods
- `reminder_days_before_end` (Int) - Days before period end to send reminder
- `escalation_days_after_end` (Int) - Days after period end to escalate
- `enable_email_notifications` (Check) - Enable/disable email notifications

### Validation Rules

1. **Retained Earnings Account Validation**
   - Must be an Account with root_type = 'Equity'
   - Cannot be Asset, Liability, Income, or Expense account
   - Error message: "Retained earnings account must be an Equity account"

2. **Role Validation**
   - closing_role and reopen_role must exist in Role DocType
   - Error message: "Role 'RoleName' does not exist"

3. **Audit Logging**
   - All configuration changes create Period Closing Log entry
   - action_type = "Configuration Changed"
   - Includes before_snapshot and after_snapshot

## Troubleshooting

### "ERP API credentials not configured"
- Ensure `.env.local` exists with proper credentials
- Check that ERP_API_KEY and ERP_API_SECRET are set

### "fetch failed"
- Ensure ERPNext backend is running
- Check ERPNEXT_API_URL is correct
- Verify network connectivity

### Tests skip with "No Equity account found"
- Ensure test company has at least one Equity account
- Check that ERP_DEFAULT_COMPANY is set correctly
- Verify Chart of Accounts is properly configured

## Related Documentation

- [Design Document](../.kiro/specs/accounting-period-closing/design.md)
- [Requirements Document](../.kiro/specs/accounting-period-closing/requirements.md)
- [API Documentation](../app/api/accounting-period/README.md)
