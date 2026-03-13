#!/usr/bin/env tsx

/**
 * Script untuk memverifikasi setup komisi di dashboard
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying Commission Setup...\n');

// 1. Check dashboard file
const dashboardPath = join(process.cwd(), 'app/dashboard/page.tsx');
const dashboardContent = readFileSync(dashboardPath, 'utf-8');

console.log('✅ Dashboard Tab Navigation:');
console.log('   - Commission tab button:', dashboardContent.includes('setActiveAnalyticsTab(\'commission\')') ? '✅' : '❌');
console.log('   - Commission tab content:', dashboardContent.includes('activeAnalyticsTab === \'commission\'') ? '✅' : '❌');
console.log('   - CommissionTrackerSection import:', dashboardContent.includes('CommissionTrackerSection') ? '✅' : '❌');
console.log('   - Role-based visibility:', dashboardContent.includes('(isSales || isAccounts || isAdmin || showAll)') ? '✅' : '❌');

// 2. Check analytics API
const apiPath = join(process.cwd(), 'app/api/analytics/route.ts');
const apiContent = readFileSync(apiPath, 'utf-8');

console.log('\n✅ Analytics API:');
console.log('   - Outstanding commission case:', apiContent.includes('case \'outstanding_commission\':') ? '✅' : '❌');
console.log('   - fetchOutstandingCommission import:', apiContent.includes('fetchOutstandingCommission') ? '✅' : '❌');

// 3. Check analytics handlers
const handlersPath = join(process.cwd(), 'lib/analytics-handlers.ts');
const handlersContent = readFileSync(handlersPath, 'utf-8');

console.log('\n✅ Analytics Handlers:');
console.log('   - fetchOutstandingCommission function:', handlersContent.includes('export async function fetchOutstandingCommission') ? '✅' : '❌');
console.log('   - Error handling:', handlersContent.includes('try {') && handlersContent.includes('catch (error)') ? '✅' : '❌');
console.log('   - Batch processing:', handlersContent.includes('batchSize') ? '✅' : '❌');

// 4. Check commission component
const commissionPath = join(process.cwd(), 'components/analytics/OutstandingCommissionCard.tsx');
const commissionContent = readFileSync(commissionPath, 'utf-8');

console.log('\n✅ Commission Component:');
console.log('   - Fetch data function:', commissionContent.includes('fetchData') ? '✅' : '❌');
console.log('   - Error state handling:', commissionContent.includes('ErrorState') ? '✅' : '❌');
console.log('   - Empty state handling:', commissionContent.includes('Tidak Ada Komisi Outstanding') ? '✅' : '❌');

// 5. Check debug endpoint
try {
  const debugPath = join(process.cwd(), 'app/api/analytics/commission-debug/route.ts');
  const debugContent = readFileSync(debugPath, 'utf-8');
  console.log('\n✅ Debug Endpoint:');
  console.log('   - Commission debug route:', debugContent.includes('Commission Debug') ? '✅' : '❌');
} catch {
  console.log('\n❌ Debug Endpoint: Not found');
}

console.log('\n🎯 Next Steps:');
console.log('1. Restart your development server: pnpm dev');
console.log('2. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('3. Go to dashboard and check if tabs are visible');
console.log('4. Click on "Komisi" tab to see commission data');
console.log('5. Use the debug button to test commission data fetching');

console.log('\n📋 Troubleshooting:');
console.log('- If tabs not visible: Check browser console for errors');
console.log('- If no commission data: Check if Sales Invoices have sales_team with incentives');
console.log('- If API errors: Check ERPNext permissions for Sales Invoice access');