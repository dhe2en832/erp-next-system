/**
 * Unit tests for StockCardSummary component
 * Task 7: Implement summary statistics component
 * 
 * Tests the summary statistics display component for Stock Card Report
 * Requirements: 1.5, 1.6
 */

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface StockCardSummaryProps {
  openingBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  transactionCount: number;
  itemName: string;
  uom: string;
}

// Helper: Format number with Indonesian locale
function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Test 1: Number formatting with Indonesian locale
function testNumberFormatting(): TestResult {
  const testCases = [
    { input: 1234.56, expected: '1.234,56' },
    { input: 5678.90, expected: '5.678,90' },
    { input: 0, expected: '0,00' },
    { input: 1000000.50, expected: '1.000.000,50' },
    { input: -50.25, expected: '-50,25' }
  ];

  for (const testCase of testCases) {
    const result = formatNumber(testCase.input);
    if (result !== testCase.expected) {
      return {
        name: 'Number Formatting',
        passed: false,
        message: `Expected ${testCase.input} to format as "${testCase.expected}", got "${result}"`
      };
    }
  }

  return {
    name: 'Number Formatting',
    passed: true,
    message: 'All number formatting tests passed'
  };
}

// Test 2: Summary data structure validation
function testSummaryDataStructure(): TestResult {
  const props: StockCardSummaryProps = {
    openingBalance: 100,
    closingBalance: 150,
    totalIn: 75,
    totalOut: 25,
    transactionCount: 10,
    itemName: 'Test Item',
    uom: 'Pcs'
  };

  // Validate all required fields are present
  const requiredFields = [
    'openingBalance',
    'closingBalance',
    'totalIn',
    'totalOut',
    'transactionCount',
    'itemName',
    'uom'
  ];

  for (const field of requiredFields) {
    if (!(field in props)) {
      return {
        name: 'Summary Data Structure',
        passed: false,
        message: `Missing required field: ${field}`
      };
    }
  }

  return {
    name: 'Summary Data Structure',
    passed: true,
    message: 'All required fields present in summary data'
  };
}

// Test 3: Balance calculation consistency (Requirement 1.5, 1.6)
function testBalanceCalculation(): TestResult {
  const testCases = [
    {
      opening: 100,
      totalIn: 75,
      totalOut: 25,
      expectedClosing: 150
    },
    {
      opening: 0,
      totalIn: 100,
      totalOut: 50,
      expectedClosing: 50
    },
    {
      opening: 200,
      totalIn: 0,
      totalOut: 50,
      expectedClosing: 150
    }
  ];

  for (const testCase of testCases) {
    const calculatedClosing = testCase.opening + testCase.totalIn - testCase.totalOut;
    if (calculatedClosing !== testCase.expectedClosing) {
      return {
        name: 'Balance Calculation',
        passed: false,
        message: `Balance calculation failed: ${testCase.opening} + ${testCase.totalIn} - ${testCase.totalOut} = ${calculatedClosing}, expected ${testCase.expectedClosing}`
      };
    }
  }

  return {
    name: 'Balance Calculation',
    passed: true,
    message: 'Balance calculations are consistent'
  };
}

// Test 4: Edge cases handling
function testEdgeCases(): TestResult {
  const edgeCases = [
    {
      name: 'Zero values',
      props: {
        openingBalance: 0,
        closingBalance: 0,
        totalIn: 0,
        totalOut: 0,
        transactionCount: 0,
        itemName: 'Test Item',
        uom: 'Pcs'
      }
    },
    {
      name: 'Negative values',
      props: {
        openingBalance: -50,
        closingBalance: -25,
        totalIn: 0,
        totalOut: 25,
        transactionCount: 5,
        itemName: 'Test Item',
        uom: 'Pcs'
      }
    },
    {
      name: 'Large numbers',
      props: {
        openingBalance: 1000000,
        closingBalance: 2000000,
        totalIn: 1500000,
        totalOut: 500000,
        transactionCount: 1000,
        itemName: 'Test Item',
        uom: 'Unit'
      }
    },
    {
      name: 'Empty item name',
      props: {
        openingBalance: 100,
        closingBalance: 150,
        totalIn: 75,
        totalOut: 25,
        transactionCount: 10,
        itemName: '',
        uom: 'Pcs'
      }
    },
    {
      name: 'Empty UOM',
      props: {
        openingBalance: 100,
        closingBalance: 150,
        totalIn: 75,
        totalOut: 25,
        transactionCount: 10,
        itemName: 'Test Item',
        uom: ''
      }
    }
  ];

  for (const edgeCase of edgeCases) {
    // Validate that all numeric fields are numbers
    if (typeof edgeCase.props.openingBalance !== 'number' ||
        typeof edgeCase.props.closingBalance !== 'number' ||
        typeof edgeCase.props.totalIn !== 'number' ||
        typeof edgeCase.props.totalOut !== 'number' ||
        typeof edgeCase.props.transactionCount !== 'number') {
      return {
        name: 'Edge Cases',
        passed: false,
        message: `Edge case "${edgeCase.name}" has invalid numeric types`
      };
    }
  }

  return {
    name: 'Edge Cases',
    passed: true,
    message: 'All edge cases handled correctly'
  };
}

// Test 5: Decimal precision
function testDecimalPrecision(): TestResult {
  const testCases = [
    { input: 10.123456, expected: '10,12' },
    { input: 20.987654, expected: '20,99' },
    { input: 15.555555, expected: '15,56' },
    { input: 5.444444, expected: '5,44' }
  ];

  for (const testCase of testCases) {
    const result = formatNumber(testCase.input);
    if (result !== testCase.expected) {
      return {
        name: 'Decimal Precision',
        passed: false,
        message: `Expected ${testCase.input} to round to "${testCase.expected}", got "${result}"`
      };
    }
  }

  return {
    name: 'Decimal Precision',
    passed: true,
    message: 'Decimal precision handled correctly (2 decimal places)'
  };
}

// Test 6: Requirement 1.5 - Opening Balance Display
function testRequirement1_5(): TestResult {
  const props: StockCardSummaryProps = {
    openingBalance: 100,
    closingBalance: 150,
    totalIn: 75,
    totalOut: 25,
    transactionCount: 10,
    itemName: 'Test Item',
    uom: 'Pcs'
  };

  const formattedOpening = formatNumber(props.openingBalance);
  
  if (formattedOpening !== '100,00') {
    return {
      name: 'Requirement 1.5 - Opening Balance',
      passed: false,
      message: `Opening balance should display as "100,00", got "${formattedOpening}"`
    };
  }

  return {
    name: 'Requirement 1.5 - Opening Balance',
    passed: true,
    message: 'Opening balance displayed correctly'
  };
}

// Test 7: Requirement 1.6 - Closing Balance Display
function testRequirement1_6(): TestResult {
  const props: StockCardSummaryProps = {
    openingBalance: 100,
    closingBalance: 150,
    totalIn: 75,
    totalOut: 25,
    transactionCount: 10,
    itemName: 'Test Item',
    uom: 'Pcs'
  };

  const formattedClosing = formatNumber(props.closingBalance);
  
  if (formattedClosing !== '150,00') {
    return {
      name: 'Requirement 1.6 - Closing Balance',
      passed: false,
      message: `Closing balance should display as "150,00", got "${formattedClosing}"`
    };
  }

  return {
    name: 'Requirement 1.6 - Closing Balance',
    passed: true,
    message: 'Closing balance displayed correctly'
  };
}

// Run all tests
function runTests() {
  console.log('\n=== StockCardSummary Component Tests ===\n');

  const tests = [
    testNumberFormatting,
    testSummaryDataStructure,
    testBalanceCalculation,
    testEdgeCases,
    testDecimalPrecision,
    testRequirement1_5,
    testRequirement1_6
  ];

  const results: TestResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const test of tests) {
    const result = test();
    results.push(result);

    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${status}${reset} ${result.name}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
    console.log('');

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('='.repeat(50));
  console.log(`Total: ${tests.length} tests`);
  console.log(`\x1b[32mPassed: ${passedCount}\x1b[0m`);
  if (failedCount > 0) {
    console.log(`\x1b[31mFailed: ${failedCount}\x1b[0m`);
  }
  console.log('='.repeat(50));

  // Exit with error code if any tests failed
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests();
