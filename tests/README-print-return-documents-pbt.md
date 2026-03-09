# Property-Based Tests: Print Return Documents

## Overview

This document describes the property-based tests for the print-return-documents feature (tasks 6.4-6.10). These tests use `fast-check` to verify universal correctness properties across 100+ iterations with randomly generated data.

## Test File

- **Location**: `tests/print-return-documents-properties.pbt.test.ts`
- **Framework**: fast-check
- **Iterations**: 100+ per property
- **Feature**: print-return-documents

## Running the Tests

```bash
# Run property-based tests
npx tsx tests/print-return-documents-properties.pbt.test.ts

# Or use pnpm if configured
pnpm test:print-return-pbt
```

## Properties Tested

### Property 4: Date Format Conversion
- **Validates**: Requirements 4.8, 13.3
- **Description**: Verifies DD/MM/YYYY to YYYY-MM-DD conversion is correct
- **Iterations**: 100
- **Test Strategy**: Generates random valid dates and verifies conversion

### Property 5: Total Count Calculation
- **Validates**: Requirements 5.2, 14.2
- **Description**: Verifies total count equals array length
- **Iterations**: 100
- **Test Strategy**: Generates random document arrays and verifies count

### Property 6: Total Amount Calculation
- **Validates**: Requirements 5.3, 14.2, 14.3
- **Description**: Verifies total amount equals sum of absolute values
- **Iterations**: 100
- **Test Strategy**: Generates documents with negative grand_total values

### Property 7: Average Amount Calculation
- **Validates**: Requirements 5.4
- **Description**: Verifies average equals total_amount / total_count
- **Iterations**: 100
- **Test Strategy**: Generates non-empty document arrays

### Property 8: Breakdown Aggregation by Reason
- **Validates**: Requirements 6.3, 14.4, 14.5
- **Description**: Verifies breakdown correctly groups items by return reason
- **Iterations**: 100
- **Test Strategy**: Generates documents with various return reasons

### Property 9: Percentage Calculation
- **Validates**: Requirements 6.4
- **Description**: Verifies percentages sum to 100% and are calculated correctly
- **Iterations**: 100
- **Test Strategy**: Generates documents and verifies percentage math

### Property 10: Currency Formatting
- **Validates**: Requirements 6.5, 7.5
- **Description**: Verifies Indonesian locale formatting (Rp prefix, period separator)
- **Iterations**: 100
- **Test Strategy**: Generates random amounts and verifies format

### Property 11: Percentage Decimal Formatting
- **Validates**: Requirements 6.6
- **Description**: Verifies percentages display with exactly one decimal place
- **Iterations**: 100
- **Test Strategy**: Generates random percentages and verifies format

### Property 14: Ungrouped Data Structure
- **Validates**: Requirements 8.2
- **Description**: Verifies ungrouped data has single group with all documents
- **Iterations**: 100
- **Test Strategy**: Generates document arrays and verifies grouping

### Property 15: Customer/Supplier Grouping
- **Validates**: Requirements 8.3
- **Description**: Verifies documents are grouped correctly by party
- **Iterations**: 100
- **Test Strategy**: Generates documents with various party names

### Property 16: Reason Grouping
- **Validates**: Requirements 8.4
- **Description**: Verifies documents are grouped correctly by return reason
- **Iterations**: 100
- **Test Strategy**: Generates documents with multiple items and reasons

### Property 17: Excel Workbook Structure
- **Validates**: Requirements 9.3
- **Description**: Verifies Excel export has exactly 3 sheets (Ringkasan, Detail, Items)
- **Iterations**: 100
- **Test Strategy**: Generates exports and verifies structure

### Property 18: Excel Summary Sheet Content
- **Validates**: Requirements 9.4
- **Description**: Verifies Ringkasan sheet contains period, company, and summary data
- **Iterations**: 100
- **Test Strategy**: Generates exports and verifies content

### Property 19: Excel Detail Sheet Content
- **Validates**: Requirements 9.5
- **Description**: Verifies Detail sheet contains all documents
- **Iterations**: 100
- **Test Strategy**: Generates exports and verifies all documents present

### Property 20: Excel Items Sheet Content
- **Validates**: Requirements 9.6
- **Description**: Verifies Items sheet contains all line items
- **Iterations**: 100
- **Test Strategy**: Generates exports and verifies all items present

### Property 21: Excel Filename Pattern
- **Validates**: Requirements 9.7
- **Description**: Verifies filename follows pattern: [Type]_Report_[dates].xlsx
- **Iterations**: 100
- **Test Strategy**: Generates filenames and verifies pattern

### Property 28: Client-Side Return Reason Filtering
- **Validates**: Requirements 13.8
- **Description**: Verifies filtering only includes documents with matching reason
- **Iterations**: 100
- **Test Strategy**: Generates documents and applies various filters

### Property 28b: Empty Filter Returns All
- **Description**: Verifies empty filter returns all documents
- **Iterations**: 100
- **Test Strategy**: Generates documents and verifies no filtering occurs

## Test Results

All 18 property tests pass with 100+ iterations each:

```
✅ All property-based tests passed!

📊 Coverage Summary:
  ✓ Property 4: Date Format Conversion (Requirements 4.8, 13.3)
  ✓ Property 5-7: Summary Calculations (Requirements 5.2-5.4, 14.2-14.3)
  ✓ Property 8-9: Breakdown Aggregation (Requirements 6.3-6.4, 14.4-14.5)
  ✓ Property 10-11: Formatting (Requirements 6.5-6.6)
  ✓ Property 14-16: Grouping (Requirements 8.2-8.4)
  ✓ Property 17-21: Excel Export (Requirements 9.3-9.7)
  ✓ Property 28: Client-Side Filtering (Requirements 13.8)
```

## Implementation Notes

### Key Functions Tested

1. **convertDateFormat**: Converts DD/MM/YYYY to YYYY-MM-DD
2. **calculateSummary**: Computes total_count, total_amount, average_amount
3. **calculateBreakdown**: Aggregates items by return reason with percentages
4. **formatCurrency**: Formats amounts in Indonesian locale (Rp with periods)
5. **formatPercentage**: Formats percentages with one decimal place
6. **groupDocuments**: Groups documents by none/customer/supplier/reason
7. **generateExcelExport**: Creates Excel workbook with 3 sheets
8. **generateExcelFilename**: Creates filename with correct pattern
9. **filterByReturnReason**: Filters documents by return reason

### Bug Fixes During Testing

1. **Property 15 (Party Grouping)**: Fixed issue with special property names like `__proto__` by using Map instead of plain objects
2. **Property 16 (Reason Grouping)**: Fixed duplicate detection by using document instance identity instead of name comparison

### Test Data Generation

The tests use `fast-check` arbitraries to generate:
- Random dates (day: 1-28, month: 1-12, year: 2000-2099)
- Random document arrays (0-100 documents)
- Random items per document (0-10 items)
- Random amounts (negative for returns)
- Random return reasons (Damaged, Quality Issue, Wrong Item, etc.)
- Random party names
- Random status values (Draft, Submitted, Cancelled)

## Benefits of Property-Based Testing

1. **Comprehensive Coverage**: Tests across many scenarios automatically
2. **Edge Case Discovery**: Finds edge cases developers might miss
3. **Regression Prevention**: Ensures properties hold across refactoring
4. **Documentation**: Properties serve as executable specifications
5. **Confidence**: 100+ iterations per property provide high confidence

## Next Steps

These property-based tests complement the unit tests (tasks 6.1-6.3) to provide comprehensive test coverage for the print-return-documents feature. Together they ensure:

- Specific examples work correctly (unit tests)
- Universal properties hold across all inputs (property tests)
- Edge cases are handled properly (both test types)
- Requirements are validated (both test types)
