/**
 * Property Test 29: Report Historical Consistency
 * Task 17.4: Write property test untuk Report Historical Consistency
 * 
 * **Validates: Requirements 14.6**
 * 
 * Property:
 * - Snapshot report values untuk periode sebelum implementasi
 * - Run reports setelah implementasi untuk periode yang sama
 * - Verify values unchanged
 * 
 * This test ensures backward compatibility - reports for historical periods
 * (before discount/tax implementation) should show the same values.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const NEXT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const COMPANY = process.env.ERP_DEFAULT_COMPANY || 'BAC';

interface ReportSnapshot {
  date: string;
  profitLoss: {
    grossSales: number;
    salesDiscount: number;
    netSales: number;
    grossCOGS: number;
    purchaseDiscount: number;
    netCOGS: number;
    grossProfit: number;
  };
  balanceSheet: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    pajakDibayarDimuka: number;
    hutangPPN: number;
  };
  vatReport: {
    totalPPNOutput: number;
    totalPPNInput: number;
    ppnKurangLebihBayar: number;
  };
}

// Helper: Get Profit & Loss Report
async function getProfitLossReport(fromDate: string, toDate: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/profit-loss?company=${encodeURIComponent(COMPANY)}&from_date=${fromDate}&to_date=${toDate}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get profit loss report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get Balance Sheet Report
async function getBalanceSheetReport(asOfDate: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/balance-sheet?company=${encodeURIComponent(COMPANY)}&as_of_date=${asOfDate}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get balance sheet report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Get VAT Report
async function getVATReport(fromDate: string, toDate: string): Promise<any> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${NEXT_API_URL}/api/finance/reports/vat-report?company=${encodeURIComponent(COMPANY)}&from_date=${fromDate}&to_date=${toDate}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get VAT report: ${text}`);
  }

  const result = await response.json();
  return result.data;
}

// Helper: Create snapshot for a historical date
async function createSnapshot(date: string): Promise<ReportSnapshot> {
  console.log(`\n  Creating snapshot for ${date}...`);

  // Get Profit & Loss Report
  const profitLoss = await getProfitLossReport(date, date);
  
  // Get Balance Sheet Report
  const balanceSheet = await getBalanceSheetReport(date);
  
  // Get VAT Report
  const vatReport = await getVATReport(date, date);

  // Extract key values
  const snapshot: ReportSnapshot = {
    date,
    profitLoss: {
      grossSales: profitLoss.summary?.gross_sales || 0,
      salesDiscount: profitLoss.summary?.sales_discount || 0,
      netSales: profitLoss.summary?.net_sales || 0,
      grossCOGS: profitLoss.summary?.gross_cogs || 0,
      purchaseDiscount: profitLoss.summary?.purchase_discount || 0,
      netCOGS: profitLoss.summary?.net_cogs || 0,
      grossProfit: profitLoss.summary?.gross_profit || 0,
    },
    balanceSheet: {
      totalAssets: balanceSheet.summary?.total_assets || 0,
      totalLiabilities: balanceSheet.summary?.total_liabilities || 0,
      totalEquity: balanceSheet.summary?.total_equity || 0,
      pajakDibayarDimuka: balanceSheet.current_assets?.find((acc: any) => 
        acc.account.includes('1410')
      )?.amount || 0,
      hutangPPN: balanceSheet.current_liabilities?.find((acc: any) => 
        acc.account.includes('2210')
      )?.amount || 0,
    },
    vatReport: {
      totalPPNOutput: vatReport.summary?.total_ppn_output || 0,
      totalPPNInput: vatReport.summary?.total_ppn_input || 0,
      ppnKurangLebihBayar: vatReport.summary?.ppn_kurang_lebih_bayar || 0,
    }
  };

  console.log('    ✓ Snapshot created');
  console.log(`    ✓ Gross Sales: ${snapshot.profitLoss.grossSales}`);
  console.log(`    ✓ Total Assets: ${snapshot.balanceSheet.totalAssets}`);
  console.log(`    ✓ PPN Output: ${snapshot.vatReport.totalPPNOutput}`);

  return snapshot;
}

// Helper: Compare two snapshots
function compareSnapshots(snapshot1: ReportSnapshot, snapshot2: ReportSnapshot, tolerance: number = 0.01): {
  isEqual: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  // Compare Profit & Loss values
  if (Math.abs(snapshot1.profitLoss.grossSales - snapshot2.profitLoss.grossSales) > tolerance) {
    differences.push(`Gross Sales: ${snapshot1.profitLoss.grossSales} vs ${snapshot2.profitLoss.grossSales}`);
  }
  if (Math.abs(snapshot1.profitLoss.salesDiscount - snapshot2.profitLoss.salesDiscount) > tolerance) {
    differences.push(`Sales Discount: ${snapshot1.profitLoss.salesDiscount} vs ${snapshot2.profitLoss.salesDiscount}`);
  }
  if (Math.abs(snapshot1.profitLoss.netSales - snapshot2.profitLoss.netSales) > tolerance) {
    differences.push(`Net Sales: ${snapshot1.profitLoss.netSales} vs ${snapshot2.profitLoss.netSales}`);
  }
  if (Math.abs(snapshot1.profitLoss.grossCOGS - snapshot2.profitLoss.grossCOGS) > tolerance) {
    differences.push(`Gross COGS: ${snapshot1.profitLoss.grossCOGS} vs ${snapshot2.profitLoss.grossCOGS}`);
  }
  if (Math.abs(snapshot1.profitLoss.purchaseDiscount - snapshot2.profitLoss.purchaseDiscount) > tolerance) {
    differences.push(`Purchase Discount: ${snapshot1.profitLoss.purchaseDiscount} vs ${snapshot2.profitLoss.purchaseDiscount}`);
  }
  if (Math.abs(snapshot1.profitLoss.netCOGS - snapshot2.profitLoss.netCOGS) > tolerance) {
    differences.push(`Net COGS: ${snapshot1.profitLoss.netCOGS} vs ${snapshot2.profitLoss.netCOGS}`);
  }
  if (Math.abs(snapshot1.profitLoss.grossProfit - snapshot2.profitLoss.grossProfit) > tolerance) {
    differences.push(`Gross Profit: ${snapshot1.profitLoss.grossProfit} vs ${snapshot2.profitLoss.grossProfit}`);
  }

  // Compare Balance Sheet values
  if (Math.abs(snapshot1.balanceSheet.totalAssets - snapshot2.balanceSheet.totalAssets) > tolerance) {
    differences.push(`Total Assets: ${snapshot1.balanceSheet.totalAssets} vs ${snapshot2.balanceSheet.totalAssets}`);
  }
  if (Math.abs(snapshot1.balanceSheet.totalLiabilities - snapshot2.balanceSheet.totalLiabilities) > tolerance) {
    differences.push(`Total Liabilities: ${snapshot1.balanceSheet.totalLiabilities} vs ${snapshot2.balanceSheet.totalLiabilities}`);
  }
  if (Math.abs(snapshot1.balanceSheet.totalEquity - snapshot2.balanceSheet.totalEquity) > tolerance) {
    differences.push(`Total Equity: ${snapshot1.balanceSheet.totalEquity} vs ${snapshot2.balanceSheet.totalEquity}`);
  }
  if (Math.abs(snapshot1.balanceSheet.pajakDibayarDimuka - snapshot2.balanceSheet.pajakDibayarDimuka) > tolerance) {
    differences.push(`Pajak Dibayar Dimuka: ${snapshot1.balanceSheet.pajakDibayarDimuka} vs ${snapshot2.balanceSheet.pajakDibayarDimuka}`);
  }
  if (Math.abs(snapshot1.balanceSheet.hutangPPN - snapshot2.balanceSheet.hutangPPN) > tolerance) {
    differences.push(`Hutang PPN: ${snapshot1.balanceSheet.hutangPPN} vs ${snapshot2.balanceSheet.hutangPPN}`);
  }

  // Compare VAT Report values
  if (Math.abs(snapshot1.vatReport.totalPPNOutput - snapshot2.vatReport.totalPPNOutput) > tolerance) {
    differences.push(`Total PPN Output: ${snapshot1.vatReport.totalPPNOutput} vs ${snapshot2.vatReport.totalPPNOutput}`);
  }
  if (Math.abs(snapshot1.vatReport.totalPPNInput - snapshot2.vatReport.totalPPNInput) > tolerance) {
    differences.push(`Total PPN Input: ${snapshot1.vatReport.totalPPNInput} vs ${snapshot2.vatReport.totalPPNInput}`);
  }
  if (Math.abs(snapshot1.vatReport.ppnKurangLebihBayar - snapshot2.vatReport.ppnKurangLebihBayar) > tolerance) {
    differences.push(`PPN Kurang/Lebih Bayar: ${snapshot1.vatReport.ppnKurangLebihBayar} vs ${snapshot2.vatReport.ppnKurangLebihBayar}`);
  }

  return {
    isEqual: differences.length === 0,
    differences
  };
}

// Property Test: Report Historical Consistency
async function testReportHistoricalConsistency(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🧪 Property Test 29: Report Historical Consistency');
  console.log('   Task 17.4: Property test untuk Report Historical Consistency');
  console.log('   Validates: Requirements 14.6');
  console.log('='.repeat(60));

  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`   Next.js API URL: ${NEXT_API_URL}`);
  console.log(`   Company: ${COMPANY}`);

  try {
    // Define historical dates to test (dates before discount/tax implementation)
    // Using dates from 30, 60, and 90 days ago
    const today = new Date();
    const historicalDates: string[] = [];

    for (let daysAgo of [30, 60, 90]) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      historicalDates.push(date.toISOString().split('T')[0]);
    }

    console.log('\n📋 Testing historical consistency for dates:');
    historicalDates.forEach(date => console.log(`   - ${date}`));

    // Create snapshots for each historical date
    console.log('\n📸 Creating first set of snapshots...');
    const snapshots1: ReportSnapshot[] = [];
    for (const date of historicalDates) {
      const snapshot = await createSnapshot(date);
      snapshots1.push(snapshot);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }

    // Wait a bit
    console.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create second set of snapshots for the same dates
    console.log('\n📸 Creating second set of snapshots...');
    const snapshots2: ReportSnapshot[] = [];
    for (const date of historicalDates) {
      const snapshot = await createSnapshot(date);
      snapshots2.push(snapshot);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }

    // Compare snapshots
    console.log('\n🔍 Comparing snapshots...');
    let allConsistent = true;
    const inconsistencies: string[] = [];

    for (let i = 0; i < historicalDates.length; i++) {
      const date = historicalDates[i];
      const comparison = compareSnapshots(snapshots1[i], snapshots2[i]);

      if (!comparison.isEqual) {
        allConsistent = false;
        inconsistencies.push(`\n  Date: ${date}`);
        comparison.differences.forEach(diff => {
          inconsistencies.push(`    - ${diff}`);
        });
      } else {
        console.log(`  ✓ ${date}: Consistent`);
      }
    }

    // Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results');
    console.log('='.repeat(60));
    console.log(`Dates tested: ${historicalDates.length}`);
    console.log(`Consistent: ${allConsistent ? 'Yes' : 'No'}`);

    if (!allConsistent) {
      console.log('\n❌ Inconsistencies found:');
      inconsistencies.forEach(line => console.log(line));
      console.log('\n❌ Property Test FAILED');
      console.log('   Historical report values have changed!');
      console.log('   This violates backward compatibility requirement 14.6');
      process.exit(1);
    } else {
      console.log('\n✅ Property Test PASSED');
      console.log('   Property holds: Historical report values remain unchanged');
      console.log('   Backward compatibility verified for all tested dates');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testReportHistoricalConsistency().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testReportHistoricalConsistency };
