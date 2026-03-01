import { ERPNextClient } from '../lib/erpnext';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const client = new ERPNextClient();
const COMPANY_NAME = 'Berkat Abadi Cirebon';

interface Company {
  name: string;
  default_income_account?: string;
  [key: string]: any;
}

interface Account {
  name: string;
  account_name: string;
  account_number: string;
  is_group: number;
  parent_account?: string;
  root_type: string;
  company: string;
  [key: string]: any;
}

async function getCompany(): Promise<Company> {
  // console.log(`\n🔍 Getting company: ${COMPANY_NAME}...`);
  const company = await client.get<Company>('Company', COMPANY_NAME);
  // console.log(`✅ Found company`);
  // console.log(`   Current Default Income Account: ${company.default_income_account || 'Not set'}`);
  return company;
}

async function updateCompanyDefaultIncome(newAccount: string): Promise<void> {
  // console.log(`\n📝 Updating company default income account to: ${newAccount}...`);
  await client.update('Company', COMPANY_NAME, {
    default_income_account: newAccount
  });
  // console.log(`✅ Company default income account updated`);
}

async function getAccount(accountNumber: string): Promise<Account | null> {
  try {
    const accounts = await client.getList<Account>('Account', {
      filters: [
        ['company', '=', COMPANY_NAME],
        ['account_number', '=', accountNumber]
      ],
      fields: ['name', 'account_name', 'account_number', 'is_group', 'parent_account', 'root_type', 'company']
    });
    
    if (accounts.length === 0) {
      return null;
    }
    
    return accounts[0];
  } catch (error) {
    console.error(`❌ Error getting account ${accountNumber}:`, error);
    return null;
  }
}

async function getCOASummary(): Promise<void> {
  // console.log(`\n📊 Getting COA summary...`);
  
  const accounts = await client.getList<Account>('Account', {
    filters: [['company', '=', COMPANY_NAME]],
    fields: ['name', 'account_name', 'account_number', 'is_group', 'root_type'],
    order_by: 'account_number asc'
  });
  
  // console.log(`\n✅ Total accounts: ${accounts.length}`);
  
  const summary: Record<string, number> = {};
  accounts.forEach(acc => {
    summary[acc.root_type] = (summary[acc.root_type] || 0) + 1;
  });
  
  // console.log('\nAccount summary by type:');
  // Object.entries(summary).forEach(([type, count]) => {
  //   console.log(`   - ${type}: ${count}`);
  // });
}

async function main() {
  try {
    // console.log('╔════════════════════════════════════════════════════════════╗');
    // console.log('║  Finalize COA Setup                                       ║');
    // console.log(`║  Company: ${COMPANY_NAME.padEnd(43)}║`);
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Step 1: Get company
    const company = await getCompany();
    
    // Step 2: Find 4110.001 - Penjualan Barang Dagang
    // console.log(`\n🔍 Finding account 4110.001 - Penjualan Barang Dagang...`);
    const penjualanBarangAccount = await getAccount('4110.001');
    
    if (!penjualanBarangAccount) {
      throw new Error('Account 4110.001 - Penjualan Barang Dagang not found');
    }
    
    // console.log(`✅ Found account: ${penjualanBarangAccount.name}`);
    // console.log(`   Parent: ${penjualanBarangAccount.parent_account}`);
    // console.log(`   Is Group: ${penjualanBarangAccount.is_group}`);
    
    // Step 3: Update company default income account to 4110.001
    if (company.default_income_account !== penjualanBarangAccount.name) {
      await updateCompanyDefaultIncome(penjualanBarangAccount.name);
    } else {
      console.log(`\n✅ Default income account already set correctly`);
    }
    
    // Step 4: Get COA summary
    await getCOASummary();
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ COA Setup Complete!                                    ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    // console.log('\n📊 Final Configuration:');
    // console.log(`   - Company: ${COMPANY_NAME}`);
    // console.log(`   - Default Income Account: ${penjualanBarangAccount.name}`);
    // console.log(`   - 4110.000 - Penjualan: Group account`);
    // console.log(`   - 4110.001 - Penjualan Barang Dagang: Ledger account`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  }
}

main();
