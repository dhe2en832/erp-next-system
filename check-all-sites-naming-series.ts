/**
 * Check Employee Naming Series for All Sites
 * 
 * This script checks the naming series counter status for all configured sites.
 * Run with: npx tsx check-all-sites-naming-series.ts
 */

// Load environment from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '.env.local') });

interface SiteInfo {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
}

const sites: SiteInfo[] = [
  {
    id: 'demo-batasku-cloud',
    name: 'Demo Batasku',
    apiUrl: 'https://demo.batasku.cloud',
    apiKey: process.env.SITE_DEMO_BATASKU_CLOUD_API_KEY!,
    apiSecret: process.env.SITE_DEMO_BATASKU_CLOUD_API_SECRET!,
  },
  {
    id: 'bac-batasku-cloud',
    name: 'BAC',
    apiUrl: 'https://bac.batasku.cloud',
    apiKey: process.env.SITE_BAC_BATASKU_CLOUD_API_KEY!,
    apiSecret: process.env.SITE_BAC_BATASKU_CLOUD_API_SECRET!,
  },
  {
    id: 'cirebon-batasku-cloud',
    name: 'Cirebon',
    apiUrl: 'https://cirebon.batasku.cloud',
    apiKey: process.env.SITE_CIREBON_BATASKU_CLOUD_API_KEY!,
    apiSecret: process.env.SITE_CIREBON_BATASKU_CLOUD_API_SECRET!,
  },
  {
    id: 'cvcirebon-batasku-cloud',
    name: 'CV Cirebon',
    apiUrl: 'https://cvcirebon.batasku.cloud',
    apiKey: process.env.SITE_CVCIREBON_BATASKU_CLOUD_API_KEY!,
    apiSecret: process.env.SITE_CVCIREBON_BATASKU_CLOUD_API_SECRET!,
  },
];

interface SiteStatus {
  site: string;
  totalEmployees: number;
  highestNumber: number;
  nextShouldBe: number;
  needsFix: boolean;
  error?: string;
}

async function checkSite(site: SiteInfo): Promise<SiteStatus> {
  const headers = {
    Authorization: `token ${site.apiKey}:${site.apiSecret}`,
    'Content-Type': 'application/json',
  };

  try {
    // Fetch employees
    const res = await fetch(`${site.apiUrl}/api/resource/Employee?fields=["name"]&limit_page_length=999999&order_by=name desc`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const employees = data.data || [];

    // Find highest number
    let maxNumber = 0;
    for (const emp of employees) {
      const match = emp.name.match(/HR-EMP-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }

    const nextNumber = maxNumber + 1;

    // Test if naming series works
    let needsFix = false;
    if (employees.length > 0) {
      // Try a test insert to see if it would fail
      const testRes = await fetch(`${site.apiUrl}/api/resource/Employee`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          first_name: 'TEST CHECK',
          employee_name: 'TEST CHECK',
          gender: 'Male',
          date_of_birth: '2000-01-01',
          date_of_joining: '2026-03-08',
          status: 'Active',
        }),
      });

      const testData = await testRes.json();

      if (!testRes.ok) {
        // Check if it's a duplicate entry error
        const errorStr = JSON.stringify(testData);
        if (errorStr.includes('Duplicate entry') && errorStr.includes('HR-EMP-')) {
          needsFix = true;
        }
      } else {
        // Success - clean up test employee
        await fetch(`${site.apiUrl}/api/resource/Employee/${testData.data.name}`, {
          method: 'DELETE',
          headers,
        });
      }
    }

    return {
      site: site.name,
      totalEmployees: employees.length,
      highestNumber: maxNumber,
      nextShouldBe: nextNumber,
      needsFix,
    };
  } catch (error: any) {
    return {
      site: site.name,
      totalEmployees: 0,
      highestNumber: 0,
      nextShouldBe: 1,
      needsFix: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('=' .repeat(80));
  console.log('CHECKING EMPLOYEE NAMING SERIES FOR ALL SITES');
  console.log('=' .repeat(80));
  console.log();

  const results: SiteStatus[] = [];

  for (const site of sites) {
    console.log(`🔍 Checking ${site.name} (${site.id})...`);
    const status = await checkSite(site);
    results.push(status);
    
    if (status.error) {
      console.log(`   ❌ Error: ${status.error}`);
    } else {
      console.log(`   📊 Employees: ${status.totalEmployees}`);
      console.log(`   📊 Highest ID: HR-EMP-${String(status.highestNumber).padStart(5, '0')}`);
      console.log(`   📊 Next should be: HR-EMP-${String(status.nextShouldBe).padStart(5, '0')}`);
      console.log(`   ${status.needsFix ? '❌ NEEDS FIX' : '✅ OK'}`);
    }
    console.log();
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));
  console.log();

  const sitesNeedingFix = results.filter(r => r.needsFix);
  const sitesWithErrors = results.filter(r => r.error);
  const sitesOk = results.filter(r => !r.needsFix && !r.error);

  console.log(`✅ Sites OK: ${sitesOk.length}`);
  sitesOk.forEach(s => {
    console.log(`   - ${s.site}: ${s.totalEmployees} employees`);
  });

  console.log();
  console.log(`❌ Sites needing fix: ${sitesNeedingFix.length}`);
  sitesNeedingFix.forEach(s => {
    console.log(`   - ${s.site}: ${s.totalEmployees} employees, next should be HR-EMP-${String(s.nextShouldBe).padStart(5, '0')}`);
  });

  if (sitesWithErrors.length > 0) {
    console.log();
    console.log(`⚠️  Sites with errors: ${sitesWithErrors.length}`);
    sitesWithErrors.forEach(s => {
      console.log(`   - ${s.site}: ${s.error}`);
    });
  }

  console.log();
  console.log('=' .repeat(80));

  if (sitesNeedingFix.length > 0) {
    console.log();
    console.log('🔧 ACTION REQUIRED:');
    console.log();
    console.log('Run the Python fix script for each site that needs fixing:');
    console.log();
    sitesNeedingFix.forEach(s => {
      const siteId = sites.find(site => site.name === s.site)?.id.replace(/-/g, '.');
      console.log(`# Fix ${s.site}:`);
      console.log(`bench --site ${siteId} console`);
      console.log(`# Then paste fix_employee_naming_series.py`);
      console.log();
    });
  }
}

main().catch(console.error);
