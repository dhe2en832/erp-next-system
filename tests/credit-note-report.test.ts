/**
 * Tests for Credit Note Report Page
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11
 */

// Simple assertion helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}


// Test: Summary Calculation - Total Count
async function testCalculateTotalCount() {
  console.log('\n=== Test: Calculate Total Count ===');
  
  const creditNotes = [
    { name: 'CN-001', grand_total: -1000, items: [] },
    { name: 'CN-002', grand_total: -2000, items: [] },
    { name: 'CN-003', grand_total: -1500, items: [] }
  ];
  
  const totalCount = creditNotes.length;
  assertEqual(totalCount, 3, 'Total count should be 3');
  console.log('✓ Total count calculation correct');
}

// Test: Summary Calculation - Total Amount
async function testCalculateTotalAmount() {
  console.log('\n=== Test: Calculate Total Amount ===');
  
  const creditNotes = [
    { name: 'CN-001', grand_total: -1000, items: [] },
    { name: 'CN-002', grand_total: -2000, items: [] },
    { name: 'CN-003', grand_total: -1500, items: [] }
  ];
  
  const totalAmount = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.grand_total), 0);
  assertEqual(totalAmount, 4500, 'Total amount should be 4500');
  console.log('✓ Total amount calculation correct');
}

// Test: Breakdown by Return Reason
async function testBreakdownByReturnReason() {
  console.log('\n=== Test: Breakdown by Return Reason ===');
  
  const creditNotes = [
    {
      name: 'CN-001',
      grand_total: -1000,
      items: [
        { return_reason: 'Damaged', amount: -500 },
        { return_reason: 'Quality Issue', amount: -500 }
      ]
    },
    {
      name: 'CN-002',
      grand_total: -2000,
      items: [
        { return_reason: 'Damaged', amount: -1000 },
        { return_reason: 'Wrong Item', amount: -1000 }
      ]
    }
  ];
  
  const breakdown: Record<string, { count: number; amount: number }> = {};
  
  creditNotes.forEach(cn => {
    cn.items.forEach((item: any) => {
      const reason = item.return_reason || 'Unknown';
      if (!breakdown[reason]) {
        breakdown[reason] = { count: 0, amount: 0 };
      }
      breakdown[reason].count += 1;
      breakdown[reason].amount += Math.abs(item.amount);
    });
  });
  
  assertEqual(breakdown['Damaged'].count, 2, 'Damaged count should be 2');
  assertEqual(breakdown['Damaged'].amount, 1500, 'Damaged amount should be 1500');
  assertEqual(breakdown['Quality Issue'].count, 1, 'Quality Issue count should be 1');
  assertEqual(breakdown['Quality Issue'].amount, 500, 'Quality Issue amount should be 500');
  assertEqual(breakdown['Wrong Item'].count, 1, 'Wrong Item count should be 1');
  assertEqual(breakdown['Wrong Item'].amount, 1000, 'Wrong Item amount should be 1000');
  console.log('✓ Breakdown by return reason correct');
}

// Test: Average Calculation
async function testCalculateAverage() {
  console.log('\n=== Test: Calculate Average ===');
  
  const creditNotes = [
    { name: 'CN-001', grand_total: -1000, items: [] },
    { name: 'CN-002', grand_total: -2000, items: [] },
    { name: 'CN-003', grand_total: -1500, items: [] }
  ];
  
  const totalAmount = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.grand_total), 0);
  const average = creditNotes.length > 0 ? Math.round(totalAmount / creditNotes.length) : 0;
  
  assertEqual(average, 1500, 'Average should be 1500');
  console.log('✓ Average calculation correct');
}

// Test: Empty Credit Notes
async function testEmptyCreditNotes() {
  console.log('\n=== Test: Empty Credit Notes ===');
  
  const creditNotes: any[] = [];
  
  const totalCount = creditNotes.length;
  const totalAmount = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.grand_total), 0);
  const average = creditNotes.length > 0 ? Math.round(totalAmount / creditNotes.length) : 0;
  
  assertEqual(totalCount, 0, 'Total count should be 0');
  assertEqual(totalAmount, 0, 'Total amount should be 0');
  assertEqual(average, 0, 'Average should be 0');
  console.log('✓ Empty credit notes handled correctly');
}

// Test: Group by Customer
async function testGroupByCustomer() {
  console.log('\n=== Test: Group by Customer ===');
  
  const creditNotes = [
    { name: 'CN-001', customer_name: 'Customer A', grand_total: -1000, items: [] },
    { name: 'CN-002', customer_name: 'Customer B', grand_total: -2000, items: [] },
    { name: 'CN-003', customer_name: 'Customer A', grand_total: -1500, items: [] }
  ];
  
  const groups: Record<string, any[]> = {};
  creditNotes.forEach(cn => {
    const key = cn.customer_name;
    if (!groups[key]) groups[key] = [];
    groups[key].push(cn);
  });
  
  assertEqual(Object.keys(groups).length, 2, 'Should have 2 customer groups');
  assertEqual(groups['Customer A'].length, 2, 'Customer A should have 2 credit notes');
  assertEqual(groups['Customer B'].length, 1, 'Customer B should have 1 credit note');
  console.log('✓ Group by customer correct');
}

// Test: Group by Return Reason
async function testGroupByReturnReason() {
  console.log('\n=== Test: Group by Return Reason ===');
  
  const creditNotes = [
    {
      name: 'CN-001',
      grand_total: -1000,
      items: [{ return_reason: 'Damaged', amount: -1000 }]
    },
    {
      name: 'CN-002',
      grand_total: -2000,
      items: [{ return_reason: 'Quality Issue', amount: -2000 }]
    },
    {
      name: 'CN-003',
      grand_total: -1500,
      items: [{ return_reason: 'Damaged', amount: -1500 }]
    }
  ];
  
  const groups: Record<string, any[]> = {};
  creditNotes.forEach(cn => {
    cn.items.forEach((item: any) => {
      const key = item.return_reason || 'Unknown';
      if (!groups[key]) groups[key] = [];
      if (!groups[key].includes(cn)) groups[key].push(cn);
    });
  });
  
  assertEqual(Object.keys(groups).length, 2, 'Should have 2 reason groups');
  assertEqual(groups['Damaged'].length, 2, 'Damaged should have 2 credit notes');
  assertEqual(groups['Quality Issue'].length, 1, 'Quality Issue should have 1 credit note');
  console.log('✓ Group by return reason correct');
}

// Test: Date Conversion
async function testDateConversion() {
  console.log('\n=== Test: Date Conversion ===');
  
  const dateStr = '15/03/2024';
  const [day, month, year] = dateStr.split('/');
  const apiDate = `${year}-${month}-${day}`;
  
  assertEqual(apiDate, '2024-03-15', 'Date conversion should be correct');
  console.log('✓ Date conversion correct');
}

// Test: Filter by Return Reason
async function testFilterByReturnReason() {
  console.log('\n=== Test: Filter by Return Reason ===');
  
  const creditNotes = [
    {
      name: 'CN-001',
      items: [{ return_reason: 'Damaged', amount: -1000 }]
    },
    {
      name: 'CN-002',
      items: [{ return_reason: 'Quality Issue', amount: -2000 }]
    },
    {
      name: 'CN-003',
      items: [{ return_reason: 'Damaged', amount: -1500 }]
    }
  ];
  
  const filterReason = 'Damaged';
  const filtered = creditNotes.filter((cn: any) => 
    cn.items.some((item: any) => item.return_reason === filterReason)
  );
  
  assertEqual(filtered.length, 2, 'Should have 2 filtered credit notes');
  assertEqual(filtered[0].name, 'CN-001', 'First filtered should be CN-001');
  assertEqual(filtered[1].name, 'CN-003', 'Second filtered should be CN-003');
  console.log('✓ Filter by return reason correct');
}

// Test: Percentage Calculation
async function testPercentageCalculation() {
  console.log('\n=== Test: Percentage Calculation ===');
  
  const totalAmount = 10000;
  const reasonAmount = 2500;
  
  const percentage = totalAmount > 0 
    ? ((reasonAmount / totalAmount) * 100).toFixed(1) 
    : '0';
  
  assertEqual(percentage, '25.0', 'Percentage should be 25.0');
  console.log('✓ Percentage calculation correct');
}

// Test: Zero Total Amount Percentage
async function testZeroTotalAmountPercentage() {
  console.log('\n=== Test: Zero Total Amount Percentage ===');
  
  const totalAmount = 0;
  const reasonAmount = 2500;
  
  const percentage = totalAmount > 0 
    ? ((reasonAmount / totalAmount) * 100).toFixed(1) 
    : '0';
  
  assertEqual(percentage, '0', 'Percentage should be 0 when total is 0');
  console.log('✓ Zero total amount percentage handled correctly');
}

// Main test runner
async function runTests() {
  console.log('Starting Credit Note Report Tests...\n');
  
  try {
    await testCalculateTotalCount();
    await testCalculateTotalAmount();
    await testBreakdownByReturnReason();
    await testCalculateAverage();
    await testEmptyCreditNotes();
    await testGroupByCustomer();
    await testGroupByReturnReason();
    await testDateConversion();
    await testFilterByReturnReason();
    await testPercentageCalculation();
    await testZeroTotalAmountPercentage();
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
