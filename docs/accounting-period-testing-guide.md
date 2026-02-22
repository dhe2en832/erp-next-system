# Accounting Period Closing - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the Accounting Period Closing feature to ensure all critical functionality works correctly.

## Prerequisites

1. ERPNext instance running at `http://localhost:8000`
2. Next.js application running at `http://localhost:3000`
3. Python hooks deployed to ERPNext (see deployment guide)
4. Test company with sample data

## Test Scenarios

### Test 1: Create Accounting Period

**Objective**: Verify period creation works correctly

**Steps**:
1. Navigate to `http://localhost:3000/accounting-period`
2. Click "Create New Period" button
3. Fill in the form:
   - Period Name: "Test Period Jan 2024"
   - Company: Select your test company
   - Start Date: 01/01/2024
   - End Date: 31/01/2024
   - Period Type: Monthly
4. Click "Create"

**Expected Result**:
- Period is created successfully
- Status is "Open"
- Period appears in the list

**Requirements Validated**: 1.1, 1.2, 1.3, 1.4, 1.5

---

### Test 2: Validation Framework

**Objective**: Verify pre-closing validations work correctly

**Setup**:
1. Create some draft transactions in the test period:
   - Draft Sales Invoice with posting_date in the period
   - Draft Purchase Invoice with posting_date in the period

**Steps**:
1. Navigate to the period detail page
2. Click "Close Period" button
3. Wizard Step 1 should run validations automatically

**Expected Result**:
- Validation results are displayed
- "No Draft Transactions" check should FAIL
- Error count should be > 0
- Details should show the draft transactions
- "Lanjut ke Review Saldo" button should be disabled

**Requirements Validated**: 2.1, 2.2, 2.4, 2.5

---

### Test 3: Validation - All Checks Pass

**Objective**: Verify closing can proceed when validations pass

**Setup**:
1. Submit all draft transactions from Test 2
2. Ensure all transactions are posted

**Steps**:
1. Navigate to the period detail page
2. Click "Close Period" button
3. Wizard Step 1 should run validations

**Expected Result**:
- All validation checks should PASS
- Green success message: "Semua Validasi Berhasil"
- "Lanjut ke Review Saldo" button should be enabled
- Can proceed to Step 2

**Requirements Validated**: 2.5

---

### Test 4: Review Account Balances

**Objective**: Verify account balance review works

**Steps**:
1. From Step 1 (with passing validations), click "Lanjut ke Review Saldo"
2. Review the account balances displayed

**Expected Result**:
- Account balances are displayed
- Nominal accounts (Income/Expense) are shown separately
- Real accounts (Asset/Liability/Equity) are shown
- Net income/loss is calculated correctly
- Can proceed to Step 3

**Requirements Validated**: 3.1, 4.3

---

### Test 5: Preview Closing Journal

**Objective**: Verify closing journal preview is correct

**Steps**:
1. From Step 2, click "Lanjut ke Preview Jurnal"
2. Review the journal entries displayed

**Expected Result**:
- Journal entries are displayed in a table
- Income accounts have DEBIT entries (to zero them out)
- Expense accounts have CREDIT entries (to zero them out)
- Retained earnings has balancing entry
- Total debits = Total credits
- Can proceed to Step 4

**Requirements Validated**: 3.2, 3.3, 3.4, 3.5

---

### Test 6: Close Period

**Objective**: Verify period closing works correctly

**Steps**:
1. From Step 3, click "Lanjut ke Konfirmasi"
2. Review the summary
3. Click "Tutup Periode" button
4. Confirm the action

**Expected Result**:
- Progress indicator shows closing steps
- Closing completes successfully
- Success message is displayed
- Period status changes to "Closed"
- Closing journal entry is created in ERPNext
- Closing journal is auto-submitted (docstatus = 1)
- Period Closing Log entry is created

**Requirements Validated**: 3.6, 4.1, 4.2, 4.5

---

### Test 7: Transaction Restrictions - Regular User

**Objective**: Verify transactions are blocked in closed periods

**Setup**:
1. Period from Test 6 should be closed
2. Login as a regular user (not System Manager)

**Steps**:
1. Try to create a Sales Invoice with posting_date in the closed period
2. Fill in all required fields
3. Try to save

**Expected Result**:
- Transaction is REJECTED
- Error message: "Cannot modify transaction: Period [name] is closed. Contact administrator to reopen the period."
- Transaction is NOT saved

**Requirements Validated**: 5.1, 5.2

---

### Test 8: Transaction Restrictions - Admin Override

**Objective**: Verify administrators can override with logging

**Setup**:
1. Period from Test 6 should be closed
2. Login as System Manager or Accounts Manager

**Steps**:
1. Try to create a Sales Invoice with posting_date in the closed period
2. Fill in all required fields
3. Try to save

**Expected Result**:
- Warning message is displayed: "Warning: Modifying transaction in closed period [name]. This action is logged."
- Transaction IS saved
- Period Closing Log entry is created with:
  - action_type: "Transaction Modified"
  - affected_transaction: [invoice name]
  - transaction_doctype: "Sales Invoice"
  - action_by: [current user]

**Requirements Validated**: 5.4, 5.5

---

### Test 9: Reopen Period

**Objective**: Verify period can be reopened

**Setup**:
1. Period from Test 6 should be closed
2. No subsequent periods should be closed

**Steps**:
1. Navigate to the closed period detail page
2. Click "Reopen Period" button
3. Enter a reason: "Need to add missing transactions"
4. Confirm

**Expected Result**:
- Period status changes to "Open"
- Closing journal entry is cancelled and deleted
- Period Closing Log entry is created with:
  - action_type: "Reopened"
  - reason: "Need to add missing transactions"
- Can now create transactions in the period

**Requirements Validated**: 6.1, 6.3, 6.4, 6.5

---

### Test 10: Permanent Close

**Objective**: Verify permanent close prevents all modifications

**Setup**:
1. Close the period again (repeat Test 6)

**Steps**:
1. Navigate to the closed period detail page
2. Click "Permanent Close" button
3. Type "PERMANENT" in the confirmation field
4. Confirm

**Expected Result**:
- Period status changes to "Permanently Closed"
- Period Closing Log entry is created
- "Reopen Period" button is disabled/hidden

**Requirements Validated**: 7.1, 7.2, 7.3, 7.6

---

### Test 11: Permanent Close - No Modifications

**Objective**: Verify no one can modify permanently closed periods

**Setup**:
1. Period from Test 10 should be permanently closed
2. Login as System Manager

**Steps**:
1. Try to create a Sales Invoice with posting_date in the permanently closed period
2. Try to save

**Expected Result**:
- Transaction is REJECTED even for System Manager
- Error message: "Cannot modify transaction: Period [name] is permanently closed. No modifications are allowed."
- Transaction is NOT saved

**Requirements Validated**: 7.4

---

### Test 12: Audit Log

**Objective**: Verify audit trail is complete

**Steps**:
1. Navigate to `http://localhost:3000/accounting-period/audit-log`
2. Filter by the test period
3. Review all log entries

**Expected Result**:
- Log entries exist for:
  - Period Created
  - Period Closed
  - Transaction Modified (if admin override was used)
  - Period Reopened (if reopened)
  - Period Closed (again)
  - Period Permanently Closed
- Each entry has:
  - action_type
  - action_by
  - action_date
  - before_snapshot (where applicable)
  - after_snapshot

**Requirements Validated**: 10.1, 10.2, 10.4

---

### Test 13: Validation - Bank Reconciliation

**Objective**: Verify bank reconciliation check works

**Setup**:
1. Create a new test period
2. Create a bank account transaction without clearance_date

**Steps**:
1. Try to close the period
2. Check validation results

**Expected Result**:
- "Bank Reconciliation Complete" check should show WARNING
- Details should list unreconciled bank accounts
- Can still proceed (warning, not error)

**Requirements Validated**: 2.3

---

### Test 14: Validation - Module Integration

**Objective**: Verify integration validations work

**Setup**:
1. Create a new test period
2. Create draft transactions in various modules:
   - Draft Stock Entry
   - Draft Salary Slip

**Steps**:
1. Try to close the period
2. Check validation results

**Expected Result**:
- "Inventory Transactions Posted" check should FAIL
- "Payroll Entries Recorded" check should FAIL
- Details should list the draft documents
- Cannot proceed until resolved

**Requirements Validated**: 11.3, 11.4

---

## API Testing

### Test API Endpoints Directly

Use curl or Postman to test API endpoints:

#### 1. Validate Period
```bash
curl -X POST http://localhost:3000/api/accounting-period/validate \
  -H "Content-Type: application/json" \
  -d '{
    "period_name": "Test Period Jan 2024",
    "company": "Your Company"
  }'
```

**Expected**: JSON response with validation results

#### 2. Preview Closing Journal
```bash
curl http://localhost:3000/api/accounting-period/preview-closing/Test%20Period%20Jan%202024
```

**Expected**: JSON response with journal preview

#### 3. Close Period
```bash
curl -X POST http://localhost:3000/api/accounting-period/close \
  -H "Content-Type: application/json" \
  -d '{
    "period_name": "Test Period Jan 2024",
    "company": "Your Company"
  }'
```

**Expected**: JSON response with closing result

---

## Performance Testing

### Test with Large Dataset

**Objective**: Verify performance with many transactions

**Setup**:
1. Create a period with 1000+ transactions
2. Ensure transactions span multiple accounts

**Steps**:
1. Run validation
2. Close the period
3. Measure time taken

**Expected Result**:
- Validation completes in < 10 seconds
- Closing completes in < 30 seconds
- No timeout errors

**Requirements Validated**: Performance requirements

---

## Troubleshooting

### Issue: Validation endpoint returns 500 error

**Possible Causes**:
- ERPNext API is down
- Invalid period name
- Missing configuration

**Solution**:
- Check ERPNext is running
- Verify period exists
- Check Period Closing Config exists

### Issue: Transaction restrictions not working

**Possible Causes**:
- Python hooks not deployed
- Hooks not registered correctly
- Cache not cleared

**Solution**:
```bash
cd erpnext-dev
bench --site batasku.local migrate
bench --site batasku.local clear-cache
bench restart
```

### Issue: Closing journal not created

**Possible Causes**:
- No nominal accounts with balances
- Retained earnings account not configured
- ERPNext API error

**Solution**:
- Check Period Closing Config has retained_earnings_account set
- Verify account exists and is an Equity account
- Check ERPNext error logs

---

## Test Checklist

Use this checklist to track testing progress:

- [ ] Test 1: Create Accounting Period
- [ ] Test 2: Validation Framework (with errors)
- [ ] Test 3: Validation (all pass)
- [ ] Test 4: Review Account Balances
- [ ] Test 5: Preview Closing Journal
- [ ] Test 6: Close Period
- [ ] Test 7: Transaction Restrictions - Regular User
- [ ] Test 8: Transaction Restrictions - Admin Override
- [ ] Test 9: Reopen Period
- [ ] Test 10: Permanent Close
- [ ] Test 11: Permanent Close - No Modifications
- [ ] Test 12: Audit Log
- [ ] Test 13: Validation - Bank Reconciliation
- [ ] Test 14: Validation - Module Integration
- [ ] API Testing
- [ ] Performance Testing

---

## Reporting Issues

If you find any issues during testing, please document:

1. Test scenario number
2. Steps to reproduce
3. Expected result
4. Actual result
5. Error messages (if any)
6. Screenshots (if applicable)

---

## Conclusion

This testing guide covers all critical functionality of the Accounting Period Closing feature. Complete all tests before deploying to production.
