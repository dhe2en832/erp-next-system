# Setup Scripts for Discount and Tax Implementation

This directory contains setup scripts for implementing discount and tax features in the ERPNext system.

## Overview

The scripts create Tax Templates in ERPNext for the Indonesian tax system:

**Sales Tax Templates (Tasks 1.1, 1.2, 1.3):**
- PPN 11% (default)
- PPN 11% + PPh 23 (2%)
- PPN 11% + PPh 22 (1.5%)

**Purchase Tax Templates (Tasks 1.4, 1.5):**
- PPN Masukan 11% (PKP) - for companies registered as PKP
- PPN Masukan 11% (Non-PKP) - for non-PKP companies

## Prerequisites

1. **ERPNext Server Running**
   - Ensure your ERPNext instance is running and accessible
   - Default URL: http://localhost:8000

2. **API Credentials**
   - You need API Key and API Secret from ERPNext
   - Get them from: User Menu > API Access > Generate Keys

3. **Chart of Accounts**
   - The following accounts must exist in your Chart of Accounts:
     - `2210 - Hutang PPN - BAC` (VAT Payable)
     - `2230 - Hutang PPh 23 - BAC` (PPh 23 Payable)
     - `2240 - Hutang PPh 4(2) Final - BAC` (PPh 22 Payable)
     - `1410 - Pajak Dibayar Dimuka - BAC` (Prepaid Tax / VAT Input)
     - `5100 - Beban Operasional - BAC` (Operating Expense)

4. **Environment Configuration**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your credentials
   ERPNEXT_API_URL=http://localhost:8000
   ERP_API_KEY=your_actual_api_key
   ERP_API_SECRET=your_actual_api_secret
   ```

## Running the Scripts

### Setup All Tax Templates (Recommended)

```bash
# From the project root directory
npm run setup-all-tax-templates
```

This will create all Sales and Purchase tax templates in one go.

### Setup Sales Tax Templates Only

```bash
npm run setup-sales-tax-templates
```

Creates:
- PPN 11%
- PPN 11% + PPh 23 (2%)
- PPN 11% + PPh 22 (1.5%)

### Setup Purchase Tax Templates Only

```bash
npm run setup-purchase-tax-templates
```

Creates:
- PPN Masukan 11% (PKP)
- PPN Masukan 11% (Non-PKP)

## Expected Output

**Success:**
```
============================================================
🚀 Setup Sales Tax Templates for ERPNext
   Tasks 1.1, 1.2, 1.3: Sales Taxes and Charges Templates
============================================================

✅ API credentials configured
   API URL: http://localhost:8000

🔍 Verifying all required accounts...

🔍 Verifying account: 2210 - Hutang PPN - BAC
   ✅ Account exists: Hutang PPN
   Type: Tax

🔍 Verifying account: 2230 - Hutang PPh 23 - BAC
   ✅ Account exists: Hutang PPh 23
   Type: Tax

🔍 Verifying account: 2240 - Hutang PPh 4(2) Final - BAC
   ✅ Account exists: Hutang PPh 4(2) Final
   Type: Tax

🔍 Verifying account: 1410 - Pajak Dibayar Dimuka - BAC
   ✅ Account exists: Pajak Dibayar Dimuka
   Type: Tax

📝 Creating Tax Template: PPN 11%
   ✅ Template created successfully

📝 Creating Tax Template: PPN 11% + PPh 23 (2%)
   ✅ Template created successfully

📝 Creating Tax Template: PPN 11% + PPh 22 (1.5%)
   ✅ Template created successfully

============================================================
✅ Sales Tax Templates Setup Completed
============================================================

📋 Summary:
   PPN 11%: Created
   PPN 11% + PPh 23 (2%): Created
   PPN 11% + PPh 22 (1.5%): Created
```

**If Templates Already Exist:**
```
   ⚠️  Template already exists, skipping...
   Status: Already exists
```

## Troubleshooting

### Error: API credentials not configured
```
❌ Error: API credentials not configured
   Please set ERP_API_KEY and ERP_API_SECRET in .env file
```
**Solution:** Create a .env file with your ERPNext API credentials.

### Error: Account not found
```
❌ Error: Account "2210 - Hutang PPN - BAC" not found in Chart of Accounts
   Please ensure all accounts exist before creating tax templates
```
**Solution:** 
1. Log in to ERPNext
2. Go to Accounting > Chart of Accounts
3. Verify that all required accounts exist
4. Create missing accounts with the correct account types

### Error: Connection refused
```
❌ Error: fetch failed
```
**Solution:** 
1. Ensure ERPNext server is running
2. Check the ERPNEXT_API_URL in your .env file
3. Try accessing the URL in your browser

## Verification

After running the scripts successfully, verify in ERPNext:

### Sales Tax Templates
1. Go to **Selling > Setup > Sales Taxes and Charges Template**
2. You should see:
   - PPN 11% (default)
   - PPN 11% + PPh 23 (2%)
   - PPN 11% + PPh 22 (1.5%)

### Purchase Tax Templates
1. Go to **Buying > Setup > Purchase Taxes and Charges Template**
2. You should see:
   - PPN Masukan 11% (PKP) (default)
   - PPN Masukan 11% (Non-PKP)

## Tax Template Details

### PPN 11%
- **Type:** Sales Tax
- **Account:** 2210 - Hutang PPN - BAC
- **Rate:** 11%
- **Use Case:** Standard VAT for sales invoices

### PPN 11% + PPh 23 (2%)
- **Type:** Sales Tax
- **Accounts:** 
  - 2210 - Hutang PPN - BAC (11%)
  - 2230 - Hutang PPh 23 - BAC (2%)
- **Use Case:** Sales with income tax withholding (services)

### PPN 11% + PPh 22 (1.5%)
- **Type:** Sales Tax
- **Accounts:**
  - 2210 - Hutang PPN - BAC (11%)
  - 2240 - Hutang PPh 4(2) Final - BAC (1.5%)
- **Use Case:** Sales with import tax withholding

### PPN Masukan 11% (PKP)
- **Type:** Purchase Tax
- **Account:** 1410 - Pajak Dibayar Dimuka - BAC
- **Rate:** 11%
- **Use Case:** VAT input for PKP companies (can be credited)

### PPN Masukan 11% (Non-PKP)
- **Type:** Purchase Tax
- **Account:** 5100 - Beban Operasional - BAC
- **Rate:** 11%
- **Use Case:** VAT input for non-PKP companies (expense, cannot be credited)

## Next Steps

After completing tax template setup:
- Task 1.6: Validate Tax Templates with dummy invoices
- Task 1.7: Write property test for Tax Template persistence
- Task 1.8: Document tax template configuration
- Proceed to Phase 2: API Enhancement

## Technical Details

### API Endpoints Used

**Sales Tax Templates:**
```
POST /api/resource/Sales Taxes and Charges Template
```

**Purchase Tax Templates:**
```
POST /api/resource/Purchase Taxes and Charges Template
```

**Authentication:**
```
Authorization: token {API_KEY}:{API_SECRET}
```

## Related Files

- `scripts/setup-tax-templates.ts` - Sales tax templates setup
- `scripts/setup-purchase-tax-templates.ts` - Purchase tax templates setup
- `.env.example` - Environment configuration template
- `erp-next-system/.kiro/specs/discount-and-tax-implementation/` - Full specification

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full specification in `.kiro/specs/discount-and-tax-implementation/`
3. Check ERPNext logs for detailed error messages
