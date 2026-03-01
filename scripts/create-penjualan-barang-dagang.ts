import { ERPNextClient } from '../lib/erpnext';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const client = new ERPNextClient();
const COMPANY_NAME = 'Berkat Abadi Cirebon';

interface Account {
  name: string;
  account_name: string;
  is_group: number;
  parent_account?: string;
  account_type?: string;
  root_type: string;
  company: string;
  [key: string]: any;
}

async function getAccount(accountNumber: string): Promise<Account | null> {
  try {
    const accounts = await client.getList<Account>('Account', {
      filters: [
        ['company', '=', COMPANY_NAME],
        ['account_number', '=', accountNumber]
      ],
      fields: ['name', 'account_name', 'account_number', 'is_group', 'parent_account', 'account_type', 'root_type', 'company']
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

async function createAccount(accountData: Partial<Account>): Promise<void> {
  // console.log(`\n📝 Creating account: ${accountData.account_number} - ${accountData.account_name}...`);
  
  await client.insert('Account', accountData);
  
  // console.log(`✅ Account created`);
}

async function main() {
  try {
    // console.log('╔════════════════════════════════════════════════════════════╗');
    // console.log('║  Create Penjualan Barang Dagang Account                  ║');
    // console.log(`║  Company: ${COMPANY_NAME.padEnd(43)}║`);
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Step 1: Check if 4110.001 already exists
    // console.log(`\n🔍 Checking if account 4110.001 - Penjualan Barang Dagang exists...`);
    const existingAccount = await getAccount('4110.001');
    
    if (existingAccount) {
      // console.log(`✅ Account already exists: ${existingAccount.name}`);
      // console.log(`   Parent: ${existingAccount.parent_account}`);
      // console.log(`   Is Group: ${existingAccount.is_group}`);
      // console.log('\n✅ No action needed!');
      return;
    }
    
    // Step 2: Get parent account 4110.000 - Penjualan
    // console.log(`\n🔍 Finding parent account 4110.000 - Penjualan...`);
    const parentAccount = await getAccount('4110.000');
    
    if (!parentAccount) {
      throw new Error('Parent account 4110.000 - Penjualan not found');
    }
    
    // console.log(`✅ Found parent account: ${parentAccount.name}`);
    // console.log(`   Is Group: ${parentAccount.is_group}`);
    
    if (parentAccount.is_group !== 1) {
      throw new Error('Parent account 4110.000 - Penjualan is not a group account');
    }
    
    // Step 3: Create 4110.001 - Penjualan Barang Dagang
    await createAccount({
      account_name: 'Penjualan Barang Dagang',
      account_number: '4110.001',
      parent_account: parentAccount.name,
      is_group: 0,
      root_type: 'Income',
      company: COMPANY_NAME
    });
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ Account Created Successfully!                          ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    // console.log('\n📊 Summary:');
    // console.log(`   - Account: 4110.001 - Penjualan Barang Dagang`);
    // console.log(`   - Parent: ${parentAccount.name}`);
    // console.log(`   - Type: Income (Ledger)`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  }
}

main();
