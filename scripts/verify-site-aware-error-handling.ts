#!/usr/bin/env tsx
/**
 * Script to verify site-aware error handling coverage in API routes
 * 
 * Checks:
 * 1. All API routes use buildSiteAwareErrorResponse
 * 2. All API routes use logSiteError
 * 3. Error responses include site context
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteAnalysis {
  path: string;
  hasBuildSiteAwareErrorResponse: boolean;
  hasLogSiteError: boolean;
  hasGetSiteIdFromRequest: boolean;
  hasErrorHandling: boolean;
  errorHandlerCount: number;
  usesLegacyErrorPattern: boolean;
}

function analyzeRouteFile(filePath: string): RouteAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for site-aware error handling imports
  const hasBuildSiteAwareErrorResponse = content.includes('buildSiteAwareErrorResponse');
  const hasLogSiteError = content.includes('logSiteError');
  const hasGetSiteIdFromRequest = content.includes('getSiteIdFromRequest');
  
  // Check for error handling blocks
  const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{/g) || [];
  const errorHandlerCount = catchBlocks.length;
  const hasErrorHandling = errorHandlerCount > 0;
  
  // Check for legacy error patterns (not using site-aware helpers)
  const hasLegacyErrorResponse = content.includes('NextResponse.json') && 
                                  content.includes('catch') &&
                                  !hasBuildSiteAwareErrorResponse;
  
  return {
    path: filePath,
    hasBuildSiteAwareErrorResponse,
    hasLogSiteError,
    hasGetSiteIdFromRequest,
    hasErrorHandling,
    errorHandlerCount,
    usesLegacyErrorPattern: hasLegacyErrorResponse
  };
}

function findAllRouteFiles(dir: string): string[] {
  const routes: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.name === 'route.ts') {
        routes.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return routes;
}

function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api');
  
  console.log('🔍 Scanning API routes for site-aware error handling...\n');
  
  const routeFiles = findAllRouteFiles(apiDir);
  console.log(`Found ${routeFiles.length} API route files\n`);
  
  const analyses: RouteAnalysis[] = routeFiles.map(analyzeRouteFile);
  
  // Categorize routes
  const fullyCompliant = analyses.filter(a => 
    a.hasBuildSiteAwareErrorResponse && 
    a.hasLogSiteError && 
    a.hasGetSiteIdFromRequest &&
    a.hasErrorHandling
  );
  
  const partiallyCompliant = analyses.filter(a => 
    (a.hasBuildSiteAwareErrorResponse || a.hasLogSiteError) &&
    !(a.hasBuildSiteAwareErrorResponse && a.hasLogSiteError && a.hasGetSiteIdFromRequest)
  );
  
  const nonCompliant = analyses.filter(a => 
    !a.hasBuildSiteAwareErrorResponse && 
    !a.hasLogSiteError &&
    a.hasErrorHandling
  );
  
  const noErrorHandling = analyses.filter(a => !a.hasErrorHandling);
  
  // Report results
  console.log('📊 SUMMARY\n');
  console.log(`✅ Fully Compliant: ${fullyCompliant.length} routes`);
  console.log(`⚠️  Partially Compliant: ${partiallyCompliant.length} routes`);
  console.log(`❌ Non-Compliant: ${nonCompliant.length} routes`);
  console.log(`⚪ No Error Handling: ${noErrorHandling.length} routes\n`);
  
  // Detailed reports
  if (partiallyCompliant.length > 0) {
    console.log('⚠️  PARTIALLY COMPLIANT ROUTES:\n');
    partiallyCompliant.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}`);
      console.log(`    - buildSiteAwareErrorResponse: ${a.hasBuildSiteAwareErrorResponse ? '✓' : '✗'}`);
      console.log(`    - logSiteError: ${a.hasLogSiteError ? '✓' : '✗'}`);
      console.log(`    - getSiteIdFromRequest: ${a.hasGetSiteIdFromRequest ? '✓' : '✗'}`);
      console.log(`    - Error handlers: ${a.errorHandlerCount}`);
      console.log('');
    });
  }
  
  if (nonCompliant.length > 0) {
    console.log('❌ NON-COMPLIANT ROUTES (have error handling but not site-aware):\n');
    nonCompliant.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}`);
      console.log(`    - Error handlers: ${a.errorHandlerCount}`);
      console.log(`    - Uses legacy pattern: ${a.usesLegacyErrorPattern ? 'Yes' : 'No'}`);
      console.log('');
    });
  }
  
  if (noErrorHandling.length > 0) {
    console.log('⚪ ROUTES WITHOUT ERROR HANDLING:\n');
    noErrorHandling.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      console.log(`  ${relativePath}`);
    });
    console.log('');
  }
  
  // Generate markdown report
  const reportPath = path.join(process.cwd(), 'docs', 'site-aware-error-handling-coverage.md');
  generateMarkdownReport(analyses, fullyCompliant, partiallyCompliant, nonCompliant, noErrorHandling, reportPath);
  
  console.log(`\n📄 Detailed report saved to: ${reportPath.replace(process.cwd() + '/', '')}`);
  
  // Exit with appropriate code
  if (nonCompliant.length > 0 || partiallyCompliant.length > 0) {
    console.log('\n⚠️  Some routes need attention for site-aware error handling');
    process.exit(0); // Don't fail, just report
  } else {
    console.log('\n✅ All routes with error handling use site-aware patterns!');
    process.exit(0);
  }
}

function generateMarkdownReport(
  analyses: RouteAnalysis[],
  fullyCompliant: RouteAnalysis[],
  partiallyCompliant: RouteAnalysis[],
  nonCompliant: RouteAnalysis[],
  noErrorHandling: RouteAnalysis[],
  outputPath: string
) {
  const lines: string[] = [];
  
  lines.push('# Site-Aware Error Handling Coverage Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total API Routes**: ${analyses.length}`);
  lines.push(`- **✅ Fully Compliant**: ${fullyCompliant.length} (${Math.round(fullyCompliant.length / analyses.length * 100)}%)`);
  lines.push(`- **⚠️ Partially Compliant**: ${partiallyCompliant.length} (${Math.round(partiallyCompliant.length / analyses.length * 100)}%)`);
  lines.push(`- **❌ Non-Compliant**: ${nonCompliant.length} (${Math.round(nonCompliant.length / analyses.length * 100)}%)`);
  lines.push(`- **⚪ No Error Handling**: ${noErrorHandling.length} (${Math.round(noErrorHandling.length / analyses.length * 100)}%)`);
  lines.push('');
  
  lines.push('## Compliance Criteria');
  lines.push('');
  lines.push('A route is considered **fully compliant** if it:');
  lines.push('1. Imports and uses `buildSiteAwareErrorResponse` for error responses');
  lines.push('2. Imports and uses `logSiteError` for error logging');
  lines.push('3. Imports and uses `getSiteIdFromRequest` to extract site context');
  lines.push('4. Has error handling (catch blocks)');
  lines.push('');
  
  if (fullyCompliant.length > 0) {
    lines.push('## ✅ Fully Compliant Routes');
    lines.push('');
    lines.push('These routes properly implement site-aware error handling:');
    lines.push('');
    fullyCompliant.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      lines.push(`- \`${relativePath}\` (${a.errorHandlerCount} error handler${a.errorHandlerCount !== 1 ? 's' : ''})`);
    });
    lines.push('');
  }
  
  if (partiallyCompliant.length > 0) {
    lines.push('## ⚠️ Partially Compliant Routes');
    lines.push('');
    lines.push('These routes have some site-aware error handling but are missing components:');
    lines.push('');
    partiallyCompliant.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      lines.push(`### \`${relativePath}\``);
      lines.push('');
      lines.push('| Component | Status |');
      lines.push('|-----------|--------|');
      lines.push(`| buildSiteAwareErrorResponse | ${a.hasBuildSiteAwareErrorResponse ? '✅' : '❌'} |`);
      lines.push(`| logSiteError | ${a.hasLogSiteError ? '✅' : '❌'} |`);
      lines.push(`| getSiteIdFromRequest | ${a.hasGetSiteIdFromRequest ? '✅' : '❌'} |`);
      lines.push(`| Error handlers | ${a.errorHandlerCount} |`);
      lines.push('');
    });
  }
  
  if (nonCompliant.length > 0) {
    lines.push('## ❌ Non-Compliant Routes');
    lines.push('');
    lines.push('These routes have error handling but do not use site-aware patterns:');
    lines.push('');
    nonCompliant.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      lines.push(`- \`${relativePath}\` (${a.errorHandlerCount} error handler${a.errorHandlerCount !== 1 ? 's' : ''})`);
      if (a.usesLegacyErrorPattern) {
        lines.push('  - Uses legacy error response pattern');
      }
    });
    lines.push('');
  }
  
  if (noErrorHandling.length > 0) {
    lines.push('## ⚪ Routes Without Error Handling');
    lines.push('');
    lines.push('These routes do not have explicit error handling (may rely on framework defaults):');
    lines.push('');
    noErrorHandling.forEach(a => {
      const relativePath = a.path.replace(process.cwd() + '/', '');
      lines.push(`- \`${relativePath}\``);
    });
    lines.push('');
  }
  
  lines.push('## Recommendations');
  lines.push('');
  
  if (partiallyCompliant.length > 0) {
    lines.push('### For Partially Compliant Routes');
    lines.push('');
    lines.push('1. Import missing helpers from `@/lib/api-helpers`:');
    lines.push('   ```typescript');
    lines.push('   import {');
    lines.push('     getERPNextClientForRequest,');
    lines.push('     getSiteIdFromRequest,');
    lines.push('     buildSiteAwareErrorResponse,');
    lines.push('     logSiteError');
    lines.push('   } from \'@/lib/api-helpers\';');
    lines.push('   ```');
    lines.push('');
    lines.push('2. Extract site ID at the start of each handler:');
    lines.push('   ```typescript');
    lines.push('   const siteId = await getSiteIdFromRequest(request);');
    lines.push('   ```');
    lines.push('');
    lines.push('3. Update error handling in catch blocks:');
    lines.push('   ```typescript');
    lines.push('   catch (error) {');
    lines.push('     logSiteError(error, \'GET /api/your/route\', siteId);');
    lines.push('     const errorResponse = buildSiteAwareErrorResponse(error, siteId);');
    lines.push('     return NextResponse.json(errorResponse, { status: 500 });');
    lines.push('   }');
    lines.push('   ```');
    lines.push('');
  }
  
  if (nonCompliant.length > 0) {
    lines.push('### For Non-Compliant Routes');
    lines.push('');
    lines.push('These routes need to be migrated to use site-aware error handling. Follow the migration pattern:');
    lines.push('');
    lines.push('1. Import site-aware helpers');
    lines.push('2. Extract site ID from request');
    lines.push('3. Replace legacy error responses with `buildSiteAwareErrorResponse`');
    lines.push('4. Replace console.error with `logSiteError`');
    lines.push('');
  }
  
  lines.push('## Validation');
  lines.push('');
  lines.push('To verify site-aware error handling:');
  lines.push('');
  lines.push('1. **Error responses include site context**: Check that error responses have a `site` field when site ID is present');
  lines.push('2. **Error logs include site context**: Check that error logs include site ID for troubleshooting');
  lines.push('3. **Error type classification**: Check that errors are classified correctly (network, authentication, configuration, unknown)');
  lines.push('');
  
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
}

main();
