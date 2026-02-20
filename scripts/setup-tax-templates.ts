/**
 * Script untuk membuat Sales Taxes and Charges Template di ERPNext
 * Task 1.1: Buat Sales Taxes and Charges Template untuk PPN 11%
 * 
 * Requirements:
 * - Template name: "PPN 11%"
 * - charge_type: "On Net Total"
 * - account_head: "2210 - Hutang PPN - BAC"
 * - rate: 11%
 * - is_default: true
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables - try .env.local first, then .env
const envLocalPath = path.resolve(__dirname, '../.env.local');
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('No .env or .env.local file found');
}

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

interface TaxTemplateConfig {
  title: string;
  company: string;
  is_default: number;
  disabled: number;
  taxes: Array<{
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
    included_in_print_rate?: number;
  }>;
}

async function getCompanyList(): Promise<string[]> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Company?fields=["name"]`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${API_KEY}:${API_SECRET}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch companies: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.map((c: any) => c.name);
}

async function createTaxTemplate(config: TaxTemplateConfig) {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured. Please set ERP_API_KEY and ERP_API_SECRET in .env file');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Sales Taxes and Charges Template`;
  
  console.log(`\n📝 Creating Tax Template: ${config.title}`);
  console.log(`   Company: ${config.company}`);
  console.log(`   Default: ${config.is_default ? 'Yes' : 'No'}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      // Check if template already exists
      if (response.status === 409 || responseText.includes('already exists')) {
        console.log(`   ⚠️  Template already exists, skipping...`);
        return { success: true, exists: true };
      }
      
      console.error(`   ❌ Failed to create template`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Response: ${responseText}`);
      throw new Error(`Failed to create template: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log(`   ✅ Template created successfully`);
    console.log(`   Template Name: ${data.data?.name || 'N/A'}`);
    
    return { success: true, data: data.data };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function verifyAccount(accountName: string) {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Account?filters=[["name","=","${accountName}"]]&fields=["name","account_name","account_type"]`;
  
  console.log(`\n🔍 Verifying account: ${accountName}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to verify account: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      console.log(`   ✅ Account exists: ${data.data[0].account_name}`);
      console.log(`   Type: ${data.data[0].account_type || 'N/A'}`);
      return true;
    } else {
      console.log(`   ❌ Account not found in Chart of Accounts`);
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ Error verifying account: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Setup Sales Tax Templates for ERPNext');
  console.log('   Tasks 1.1, 1.2, 1.3: Sales Taxes and Charges Templates');
  console.log('='.repeat(60));

  // Verify API credentials
  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API URL: ${ERPNEXT_API_URL}`);

  // Get list of companies
  console.log('\n🔍 Fetching company list...');
  const companies = await getCompanyList();
  console.log(`   Found ${companies.length} companies:`);
  companies.forEach(c => console.log(`   - ${c}`));

  // Create tax templates for each company
  for (const company of companies) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Creating sales tax templates for: ${company}`);
    console.log('='.repeat(60));

    // Extract company abbreviation (e.g., "BAC" from "Berkat Abadi Cirebon")
    const companyAbbr = company.split(' ').map(w => w[0]).join('').toUpperCase();

    // Step 2: Verify all required accounts
    const accounts = [
      `2140.001 - Hutang PPN - ${companyAbbr}`,
      `2140.002 - Hutang PPh 23 - ${companyAbbr}`,
      `2140.003 - Hutang PPh 22 - ${companyAbbr}`,
      `1410.000 - Pajak Dibayar Dimuka - ${companyAbbr}`
    ];

    console.log('\n🔍 Verifying all required accounts...');
    for (const account of accounts) {
      const exists = await verifyAccount(account);
      if (!exists) {
        console.error(`\n❌ Error: Account "${account}" not found in Chart of Accounts`);
        console.error('   Please run "npm run create-tax-accounts" first to create tax accounts');
        console.error('   Skipping this company...');
        continue;
      }
    }

    // Step 3: Create tax templates
    const templates: TaxTemplateConfig[] = [
      // Task 1.1: PPN 11%
      {
        title: 'PPN 11%',
        company: company,
        is_default: 1,
        disabled: 0,
        taxes: [
          {
            charge_type: 'On Net Total',
            account_head: `2140.001 - Hutang PPN - ${companyAbbr}`,
            description: 'PPN 11%',
            rate: 11,
            included_in_print_rate: 0
          }
        ]
      },
      // Task 1.2: PPN 11% + PPh 23 (2%)
      {
        title: 'PPN 11% + PPh 23 (2%)',
        company: company,
        is_default: 0,
        disabled: 0,
        taxes: [
          {
            charge_type: 'On Net Total',
            account_head: `2140.001 - Hutang PPN - ${companyAbbr}`,
            description: 'PPN 11%',
            rate: 11,
            included_in_print_rate: 0
          },
          {
            charge_type: 'On Net Total',
            account_head: `2140.002 - Hutang PPh 23 - ${companyAbbr}`,
            description: 'PPh 23 (2%)',
            rate: 2,
            included_in_print_rate: 0
          }
        ]
      },
      // Task 1.3: PPN 11% + PPh 22 (1.5%)
      {
        title: 'PPN 11% + PPh 22 (1.5%)',
        company: company,
        is_default: 0,
        disabled: 0,
        taxes: [
          {
            charge_type: 'On Net Total',
            account_head: `2140.001 - Hutang PPN - ${companyAbbr}`,
            description: 'PPN 11%',
            rate: 11,
            included_in_print_rate: 0
          },
          {
            charge_type: 'On Net Total',
            account_head: `2140.003 - Hutang PPh 22 - ${companyAbbr}`,
            description: 'PPh 22 (1.5%)',
            rate: 1.5,
            included_in_print_rate: 0
          }
        ]
      }
    ];

    const results: Array<{ template: string; status: string }> = [];

    try {
      for (const template of templates) {
        const result = await createTaxTemplate(template);
        results.push({
          template: template.title,
          status: result.exists ? 'Already exists' : 'Created'
        });
      }
      
      console.log(`\n✅ Sales Tax Templates Setup Completed for ${company}`);
      console.log('\n📋 Summary:');
      results.forEach(r => {
        console.log(`   ${r.template}: ${r.status}`);
      });
      
    } catch (error: any) {
      console.error(`\n❌ Setup failed for ${company}:`, error.message);
      console.error('   Continuing with next company...');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All companies processed');
  console.log('='.repeat(60));
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
