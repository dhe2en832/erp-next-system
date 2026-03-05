#!/usr/bin/env ts-node

/**
 * Comprehensive API Routes Audit Script
 * 
 * This script audits ALL API routes in the erp-next-system to ensure they follow
 * the multi-site pattern using getERPNextClientForRequest from @/lib/api-helpers
 * 
 * Categories:
 * 1. ✅ Migrated - Uses getERPNextClientForRequest
 * 2. ❌ Legacy - Uses old patterns (process.env.ERPNEXT_API_URL, direct fetch)
 * 3. ⚠️  Unknown - Cannot determine pattern
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteAuditResult {
  path: string;
  status: 'migrated' | 'legacy' | 'unknown';
  patterns: string[];
  lineCount: number;
}

interface AuditSummary {
  total: number;
  migrated: number;
  legacy: number;
  unknown: number;
  migratedRoutes: RouteAuditResult[];
  legacyRoutes: RouteAuditResult[];
  unknownRoutes: RouteAuditResult[];
}

function findAllRouteFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findAllRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function auditRouteFile(filePath: string): RouteAuditResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const patterns: string[] = [];

  // Check for migrated patterns
  const hasSiteAwareImport = content.includes("from '@/lib/api-helpers'");
  const hasGetERPNextClient = content.includes('getERPNextClientForRequest');
  const hasGetSiteId = content.includes('getSiteIdFromRequest');
  const hasBuildSiteAwareError = content.includes('buildSiteAwareErrorResponse');
  const hasLogSiteError = content.includes('logSiteError');

  // Check for legacy patterns
  const hasProcessEnv = content.includes('process.env.ERPNEXT_API_URL');
  const hasERPNextAPIURL = content.includes('ERPNEXT_API_URL');
  const hasDirectFetch = /fetch\s*\(/.test(content);
  const hasGetHeaders = content.includes('getHeaders()');

  // Determine status
  let status: 'migrated' | 'legacy' | 'unknown' = 'unknown';

  if (hasGetERPNextClient && hasGetSiteId) {
    status = 'migrated';
    patterns.push('✅ Uses getERPNextClientForRequest');
    patterns.push('✅ Uses getSiteIdFromRequest');
    
    if (hasBuildSiteAwareError) {
      patterns.push('✅ Uses buildSiteAwareErrorResponse');
    }
    if (hasLogSiteError) {
      patterns.push('✅ Uses logSiteError');
    }
  } else if (hasProcessEnv || hasERPNextAPIURL || (hasDirectFetch && !hasGetERPNextClient)) {
    status = 'legacy';
    
    if (hasProcessEnv) {
      patterns.push('❌ Uses process.env.ERPNEXT_API_URL');
    }
    if (hasERPNextAPIURL && !hasProcessEnv) {
      patterns.push('❌ Uses ERPNEXT_API_URL constant');
    }
    if (hasDirectFetch && !hasGetERPNextClient) {
      patterns.push('❌ Uses direct fetch() calls');
    }
    if (hasGetHeaders) {
      patterns.push('❌ Uses getHeaders() helper');
    }
  }

  return {
    path: filePath.replace('app/api/', ''),
    status,
    patterns,
    lineCount: lines.length
  };
}

function generateReport(summary: AuditSummary): string {
  const report: string[] = [];

  report.push('╔════════════════════════════════════════════════════════════════╗');
  report.push('║     COMPREHENSIVE API ROUTES AUDIT - MULTI-SITE MIGRATION     ║');
  report.push('╚════════════════════════════════════════════════════════════════╝');
  report.push('');
  report.push(`Total API Routes: ${summary.total}`);
  report.push(`✅ Migrated: ${summary.migrated} (${((summary.migrated / summary.total) * 100).toFixed(1)}%)`);
  report.push(`❌ Legacy: ${summary.legacy} (${((summary.legacy / summary.total) * 100).toFixed(1)}%)`);
  report.push(`⚠️  Unknown: ${summary.unknown} (${((summary.unknown / summary.total) * 100).toFixed(1)}%)`);
  report.push('');

  // Migrated Routes
  if (summary.migratedRoutes.length > 0) {
    report.push('═══════════════════════════════════════════════════════════════');
    report.push(`✅ MIGRATED ROUTES (${summary.migratedRoutes.length})`);
    report.push('═══════════════════════════════════════════════════════════════');
    report.push('');

    summary.migratedRoutes.forEach((route, index) => {
      report.push(`${index + 1}. ${route.path}`);
      route.patterns.forEach(pattern => {
        report.push(`   ${pattern}`);
      });
      report.push('');
    });
  }

  // Legacy Routes
  if (summary.legacyRoutes.length > 0) {
    report.push('═══════════════════════════════════════════════════════════════');
    report.push(`❌ LEGACY ROUTES (${summary.legacyRoutes.length})`);
    report.push('═══════════════════════════════════════════════════════════════');
    report.push('');

    summary.legacyRoutes.forEach((route, index) => {
      report.push(`${index + 1}. ${route.path}`);
      route.patterns.forEach(pattern => {
        report.push(`   ${pattern}`);
      });
      report.push('');
    });
  }

  // Unknown Routes
  if (summary.unknownRoutes.length > 0) {
    report.push('═══════════════════════════════════════════════════════════════');
    report.push(`⚠️  UNKNOWN ROUTES (${summary.unknownRoutes.length})`);
    report.push('═══════════════════════════════════════════════════════════════');
    report.push('');

    summary.unknownRoutes.forEach((route, index) => {
      report.push(`${index + 1}. ${route.path} (${route.lineCount} lines)`);
      if (route.patterns.length > 0) {
        route.patterns.forEach(pattern => {
          report.push(`   ${pattern}`);
        });
      }
      report.push('');
    });
  }

  report.push('═══════════════════════════════════════════════════════════════');
  report.push('MIGRATION PRIORITY');
  report.push('═══════════════════════════════════════════════════════════════');
  report.push('');
  report.push('HIGH PRIORITY (Core Business Operations):');
  report.push('  - Finance Module (GL Entry, Journal Entry, Payments)');
  report.push('  - Inventory Module (Stock Entry, Stock Reconciliation)');
  report.push('  - Accounting Period Module');
  report.push('');
  report.push('MEDIUM PRIORITY (Extended Features):');
  report.push('  - Sales Extended (Quotations, Returns)');
  report.push('  - Purchase Extended (Requests, Returns)');
  report.push('  - Setup Extended (Additional configurations)');
  report.push('');
  report.push('LOW PRIORITY (Reports & Utilities):');
  report.push('  - Profit Reports');
  report.push('  - Other utility endpoints');
  report.push('');

  return report.join('\n');
}

async function main() {
  console.log('Starting comprehensive API routes audit...\n');

  const apiDir = path.join(process.cwd(), 'app', 'api');
  const routeFiles = findAllRouteFiles(apiDir);

  console.log(`Found ${routeFiles.length} route files\n`);

  const results: RouteAuditResult[] = [];

  for (const file of routeFiles) {
    const result = auditRouteFile(file);
    results.push(result);
  }

  const summary: AuditSummary = {
    total: results.length,
    migrated: results.filter(r => r.status === 'migrated').length,
    legacy: results.filter(r => r.status === 'legacy').length,
    unknown: results.filter(r => r.status === 'unknown').length,
    migratedRoutes: results.filter(r => r.status === 'migrated'),
    legacyRoutes: results.filter(r => r.status === 'legacy'),
    unknownRoutes: results.filter(r => r.status === 'unknown')
  };

  const report = generateReport(summary);
  console.log(report);

  // Save report to file
  const reportPath = path.join(process.cwd(), 'docs', 'comprehensive-api-routes-audit.md');
  const reportContent = `# Comprehensive API Routes Audit - Multi-Site Migration

**Date**: ${new Date().toISOString().split('T')[0]}  
**Total Routes**: ${summary.total}  
**Migrated**: ${summary.migrated} (${((summary.migrated / summary.total) * 100).toFixed(1)}%)  
**Legacy**: ${summary.legacy} (${((summary.legacy / summary.total) * 100).toFixed(1)}%)  
**Unknown**: ${summary.unknown} (${((summary.unknown / summary.total) * 100).toFixed(1)}%)

${report}
`;

  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n✅ Report saved to: ${reportPath}`);

  // Exit with error if there are legacy routes
  if (summary.legacy > 0) {
    console.log(`\n⚠️  WARNING: ${summary.legacy} legacy routes found that need migration!`);
    process.exit(1);
  } else {
    console.log('\n✅ All routes are using the multi-site pattern!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Error running audit:', error);
  process.exit(1);
});
