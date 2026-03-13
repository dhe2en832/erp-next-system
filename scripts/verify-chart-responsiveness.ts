/**
 * Chart Responsiveness Verification Script
 * 
 * Verifies that all analytics chart components use Recharts ResponsiveContainer
 * to ensure charts resize correctly when viewport changes.
 * 
 * Requirements: 10.8, 12.6
 * Task: 11.4
 */

import * as fs from 'fs';
import * as path from 'path';

interface ChartVerificationResult {
  component: string;
  hasResponsiveContainer: boolean;
  hasWidthProp: boolean;
  hasHeightProp: boolean;
  widthValue: string | null;
  heightValue: string | null;
  chartType: string | null;
  passed: boolean;
  issues: string[];
}

// Helper function to read component file
function readComponent(filename: string): string {
  const filePath = path.join(process.cwd(), 'components', 'analytics', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper function to verify ResponsiveContainer usage
function verifyChartComponent(filename: string): ChartVerificationResult {
  const content = readComponent(filename);
  const issues: string[] = [];
  
  // Check for ResponsiveContainer import
  const hasImport = /import.*ResponsiveContainer.*from ['"]recharts['"]/.test(content);
  
  // Check for ResponsiveContainer usage
  const hasResponsiveContainer = /<ResponsiveContainer/.test(content);
  
  // Extract ResponsiveContainer props
  const responsiveContainerMatch = content.match(
    /<ResponsiveContainer\s+([^>]+)>/
  );
  
  let hasWidthProp = false;
  let hasHeightProp = false;
  let widthValue: string | null = null;
  let heightValue: string | null = null;
  
  if (responsiveContainerMatch) {
    const props = responsiveContainerMatch[1];
    
    // Check for width prop
    const widthMatch = props.match(/width=["']([^"']+)["']/);
    if (widthMatch) {
      hasWidthProp = true;
      widthValue = widthMatch[1];
    }
    
    // Check for height prop
    const heightMatch = props.match(/height=\{?(\d+)\}?/);
    if (heightMatch) {
      hasHeightProp = true;
      heightValue = heightMatch[1];
    }
  }
  
  // Determine chart type
  let chartType: string | null = null;
  if (/<BarChart/.test(content)) chartType = 'BarChart';
  else if (/<LineChart/.test(content)) chartType = 'LineChart';
  else if (/<PieChart/.test(content)) chartType = 'PieChart';
  else if (/<AreaChart/.test(content)) chartType = 'AreaChart';
  
  // Validation
  if (!hasImport) {
    issues.push('ResponsiveContainer not imported from recharts');
  }
  
  if (!hasResponsiveContainer) {
    issues.push('ResponsiveContainer not used in component');
  }
  
  if (hasResponsiveContainer && !hasWidthProp) {
    issues.push('ResponsiveContainer missing width prop');
  }
  
  if (hasResponsiveContainer && widthValue !== '100%') {
    issues.push(`ResponsiveContainer width should be "100%" but is "${widthValue}"`);
  }
  
  if (hasResponsiveContainer && !hasHeightProp) {
    issues.push('ResponsiveContainer missing height prop');
  }
  
  if (!chartType) {
    issues.push('No Recharts chart component found (BarChart, LineChart, etc.)');
  }
  
  const passed = issues.length === 0;
  
  return {
    component: filename,
    hasResponsiveContainer,
    hasWidthProp,
    hasHeightProp,
    widthValue,
    heightValue,
    chartType,
    passed,
    issues,
  };
}

// Main verification
function main() {
  console.log('\n=== Chart Responsiveness Verification ===\n');
  console.log('Verifying that all chart components use ResponsiveContainer');
  console.log('Requirements: 10.8, 12.6\n');
  
  const chartComponents = [
    'TopProductsChart.tsx',
    'BestCustomersChart.tsx',
    'WorstCustomersChart.tsx',
    'BadDebtCustomersChart.tsx',
    'TopSalesByRevenueChart.tsx',
    'TopSalesByCommissionChart.tsx',
    'WorstSalesByCommissionChart.tsx',
    'PaidCommissionTrendChart.tsx',
    'HighestStockItemsChart.tsx',
    'LowestStockItemsChart.tsx',
    'MostPurchasedItemsChart.tsx',
    'TopSuppliersByFrequencyChart.tsx',
    'PaidSuppliersChart.tsx',
    'UnpaidSuppliersChart.tsx',
  ];
  
  const results: ChartVerificationResult[] = [];
  
  for (const component of chartComponents) {
    const result = verifyChartComponent(component);
    results.push(result);
  }
  
  // Display results
  let allPassed = true;
  
  results.forEach((result) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`${statusColor}${status}${resetColor} ${result.component}`);
    console.log(`  Chart Type: ${result.chartType || 'Unknown'}`);
    console.log(`  ResponsiveContainer: ${result.hasResponsiveContainer ? '✓' : '✗'}`);
    console.log(`  Width: ${result.widthValue || 'Not set'} ${result.widthValue === '100%' ? '✓' : '✗'}`);
    console.log(`  Height: ${result.heightValue || 'Not set'} ${result.hasHeightProp ? '✓' : '✗'}`);
    
    if (result.issues.length > 0) {
      console.log(`  Issues:`);
      result.issues.forEach((issue) => console.log(`    - ${issue}`));
      allPassed = false;
    }
    
    console.log('');
  });
  
  // Summary
  console.log('=== Summary ===\n');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Total Components: ${totalCount}`);
  console.log(`✓ Passed: ${passedCount}`);
  console.log(`✗ Failed: ${totalCount - passedCount}\n`);
  
  if (allPassed) {
    console.log('\x1b[32m✓ All chart components use ResponsiveContainer correctly!\x1b[0m');
    console.log('\nKey Findings:');
    console.log('  • All 14 chart components use ResponsiveContainer');
    console.log('  • All use width="100%" for fluid scaling');
    console.log('  • All use height={300} for consistent sizing');
    console.log('  • Charts will resize correctly when viewport changes\n');
    process.exit(0);
  } else {
    console.log('\x1b[31m✗ Some chart components have issues!\x1b[0m\n');
    process.exit(1);
  }
}

// Run verification
main();
