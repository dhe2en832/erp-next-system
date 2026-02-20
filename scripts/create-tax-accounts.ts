/**
 * Script untuk membuat akun pajak yang dibutuhkan untuk tax templates
 * 
 * Akun yang akan dibuat:
 * 1. 1410.000 - Pajak Dibayar Dimuka (Asset - untuk PPN Masukan PKP)
 * 2. 2141.001 - Hutang PPN (Liability - untuk PPN Output)
 * 3. 2141.002 - Hutang PPh 23 (Liability)
 * 4. 2141.003 - Hutang PPh 22 (Liability)
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

interface AccountConfig {
  account_name: string;
  parent_account: string;
  account_number: string;
  is_group: number;
  root_type: string;
  account_type?: string;
  company: string;
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

async function createAccount(config: AccountConfig) {
  if (!API_KEY || !API_SECRET) {
    throw new Error('API credentials not configured');
  }

  const url = `${ERPNEXT_API_URL}/api/resource/Account`;
  
  console.log(`\n📝 Creating Account: ${config.account_number} - ${config.account_name}`);
  console.log(`   Company: ${config.company}`);
  console.log(`   Parent: ${config.parent_account}`);

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
      // Check if account already exists
      if (response.status === 409 || responseText.includes('already exists')) {
        console.log(`   ⚠️  Account already exists, skipping...`);
        return { success: true, exists: true };
      }
      
      console.error(`   ❌ Failed to create account`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Response: ${responseText}`);
      throw new Error(`Failed to create account: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log(`   ✅ Account created successfully`);
    console.log(`   Account ID: ${data.data?.name || 'N/A'}`);
    
    return { success: true, data: data.data };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Create Tax Accounts for ERPNext');
  console.log('   Creating accounts for all companies');
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

  // Create accounts for each company
  for (const company of companies) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Creating tax accounts for: ${company}`);
    console.log('='.repeat(60));

    // Extract company abbreviation (e.g., "BAC" from "Berkat Abadi Cirebon")
    const companyAbbr = company.split(' ').map(w => w[0]).join('').toUpperCase();

    const accounts: AccountConfig[] = [
      // 1. Pajak Dibayar Dimuka (Asset - PPN Masukan PKP)
      {
        account_name: 'Pajak Dibayar Dimuka',
        parent_account: `1100.000 - Aktiva Lancar - ${companyAbbr}`,
        account_number: '1410.000',
        is_group: 0,
        root_type: 'Asset',
        account_type: 'Tax',
        company: company
      },
      // 2. Hutang PPN (Liability - PPN Output)
      {
        account_name: 'Hutang PPN',
        parent_account: `2141.000 - Hutang Pajak - ${companyAbbr}`,
        account_number: '2141.001',
        is_group: 0,
        root_type: 'Liability',
        account_type: 'Tax',
        company: company
      },
      // 3. Hutang PPh 23 (Liability)
      {
        account_name: 'Hutang PPh 23',
        parent_account: `2141.000 - Hutang Pajak - ${companyAbbr}`,
        account_number: '2141.002',
        is_group: 0,
        root_type: 'Liability',
        account_type: 'Tax',
        company: company
      },
      // 4. Hutang PPh 22 (Liability)
      {
        account_name: 'Hutang PPh 22',
        parent_account: `2141.000 - Hutang Pajak - ${companyAbbr}`,
        account_number: '2141.003',
        is_group: 0,
        root_type: 'Liability',
        account_type: 'Tax',
        company: company
      }
    ];

    const results: Array<{ account: string; status: string }> = [];

    try {
      for (const account of accounts) {
        const result = await createAccount(account);
        results.push({
          account: `${account.account_number} - ${account.account_name}`,
          status: result.exists ? 'Already exists' : 'Created'
        });
      }
      
      console.log(`\n✅ Tax accounts setup completed for ${company}`);
      console.log('\n📋 Summary:');
      results.forEach(r => {
        console.log(`   ${r.account}: ${r.status}`);
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
