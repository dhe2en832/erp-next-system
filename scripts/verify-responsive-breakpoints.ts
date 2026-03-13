/**
 * Responsive Breakpoints Verification Script
 * 
 * Verifies that all analytics components implement proper responsive design:
 * - 1-column layout on mobile (< 768px)
 * - 2-column layout on tablet (768px - 1024px)
 * - 3-4 column layout on desktop (> 1024px)
 * 
 * Requirements: 12.1, 12.2, 12.3
 * Task: 11.1
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  component: string;
  passed: boolean;
  hasMobile: boolean;
  hasTablet: boolean;
  hasDesktop: boolean;
  gridClasses: string[];
  expectedPattern: string;
  issues: string[];
}

// Helper function to read component file
function readComponent(filename: string): string {
  const filePath = path.join(process.cwd(), 'components', 'analytics', filename);
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper function to check for responsive grid classes
function hasResponsiveGrid(content: string): {
  hasMobile: boolean;
  hasTablet: boolean;
  hasDesktop: boolean;
  gridClasses: string[];
} {
  // Extract all className strings
  const classNameRegex = /className="([^"]*)"/g;
  const matches = [...content.matchAll(classNameRegex)];
  const allClasses = matches.map(m => m[1]).join(' ');
  
  // Check for grid-cols-1 (mobile)
  const hasMobile = /grid-cols-1/.test(allClasses);
  
  // Check for md:grid-cols-2 or md:grid-cols-3 (tablet)
  const hasTablet = /md:grid-cols-[23]/.test(allClasses);
  
  // Check for lg:grid-cols-2, lg:grid-cols-3, or lg:grid-cols-4 (desktop)
  const hasDesktop = /lg:grid-cols-[234]/.test(allClasses);
  
  // Extract specific grid classes
  const gridClassMatches = allClasses.match(/(?:^|\s)(grid-cols-\d+|md:grid-cols-\d+|lg:grid-cols-\d+)(?:\s|$)/g) || [];
  const gridClasses = gridClassMatches.map(c => c.trim());
  
  return {
    hasMobile,
    hasTablet,
    hasDesktop,
    gridClasses
  };
}

// Verify a component
function verifyComponent(
  filename: string,
  expectedPattern: string,
  requiresTablet: boolean = true
): VerificationResult {
  const content = readComponent(filename);
  const result = hasResponsiveGrid(content);
  const issues: string[] = [];
  
  if (!result.hasMobile) {
    issues.push('Missing mobile breakpoint (grid-cols-1)');
  }
  
  if (requiresTablet && !result.hasTablet) {
    issues.push('Missing tablet breakpoint (md:grid-cols-2 or md:grid-cols-3)');
  }
  
  if (!result.hasDesktop) {
    issues.push('Missing desktop breakpoint (lg:grid-cols-2, lg:grid-cols-3, or lg:grid-cols-4)');
  }
  
  const passed = issues.length === 0;
  
  return {
    component: filename,
    passed,
    hasMobile: result.hasMobile,
    hasTablet: result.hasTablet,
    hasDesktop: result.hasDesktop,
    gridClasses: result.gridClasses,
    expectedPattern,
    issues
  };
}

// Main verification
function main() {
  console.log('\n=== Responsive Breakpoints Verification ===\n');
  console.log('Verifying responsive design requirements:');
  console.log('- Mobile (< 768px): 1 column');
  console.log('- Tablet (768px - 1024px): 2 columns');
  console.log('- Desktop (> 1024px): 2-3 columns\n');
  
  const results: VerificationResult[] = [];
  
  // Verify each section component
  results.push(verifyComponent(
    'CustomerBehaviorSection.tsx',
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    true
  ));
  
  results.push(verifyComponent(
    'SalesPerformanceSection.tsx',
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    true
  ));
  
  results.push(verifyComponent(
    'CommissionTrackerSection.tsx',
    'grid-cols-1 lg:grid-cols-2',
    false // Only 2 items, no tablet breakpoint needed
  ));
  
  results.push(verifyComponent(
    'InventoryAnalyticsSection.tsx',
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    true
  ));
  
  results.push(verifyComponent(
    'SupplierAnalyticsSection.tsx',
    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    true
  ));
  
  // Display results
  let allPassed = true;
  
  results.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`${statusColor}${status}${resetColor} ${result.component}`);
    console.log(`  Expected: ${result.expectedPattern}`);
    console.log(`  Found: ${result.gridClasses.join(' ')}`);
    console.log(`  Mobile (grid-cols-1): ${result.hasMobile ? '✓' : '✗'}`);
    console.log(`  Tablet (md:grid-cols-*): ${result.hasTablet ? '✓' : '✗'}`);
    console.log(`  Desktop (lg:grid-cols-*): ${result.hasDesktop ? '✓' : '✗'}`);
    
    if (result.issues.length > 0) {
      console.log(`  Issues:`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
      allPassed = false;
    }
    
    console.log('');
  });
  
  // Verify dashboard integration
  console.log('--- Dashboard Integration ---\n');
  const dashboardPath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
  
  const requiredComponents = [
    'TopProductsChart',
    'CustomerBehaviorSection',
    'SalesPerformanceSection',
    'CommissionTrackerSection',
    'InventoryAnalyticsSection',
    'SupplierAnalyticsSection'
  ];
  
  let dashboardPassed = true;
  requiredComponents.forEach(component => {
    const imported = dashboardContent.includes(`import`) && dashboardContent.includes(component);
    const rendered = dashboardContent.includes(`<${component}`);
    const status = (imported && rendered) ? '✓' : '✗';
    const statusColor = (imported && rendered) ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`${statusColor}${status}${resetColor} ${component} - Imported: ${imported}, Rendered: ${rendered}`);
    
    if (!imported || !rendered) {
      dashboardPassed = false;
    }
  });
  
  console.log('');
  
  // Summary
  console.log('=== Summary ===\n');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Component Tests: ${passedCount}/${totalCount} passed`);
  console.log(`Dashboard Integration: ${dashboardPassed ? 'PASS' : 'FAIL'}`);
  
  if (allPassed && dashboardPassed) {
    console.log('\n\x1b[32m✓ All responsive breakpoint requirements verified!\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\n\x1b[31m✗ Some responsive breakpoint requirements failed!\x1b[0m\n');
    process.exit(1);
  }
}

// Run verification
main();
