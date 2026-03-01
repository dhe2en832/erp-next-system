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
  is_group: number;
  parent_account?: string;
  account_type?: string;
  root_type: string;
  company: string;
  [key: string]: any;
}

async function getCompany(): Promise<Company> {
  // console.log(`\n🔍 Getting company: ${COMPANY_NAME}...`);
  const company = await client.get<Company>('Company', COMPANY_NAME);
  // console.log(`✅ Found company`);
  // console.log(`   Default Income Account: ${company.default_income_account || 'Not set'}`);
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

async function updateAccountToGroup(accountName: string): Promise<void> {
  // console.log(`\n📝 Updating account ${accountName} to group account...`);
  // console.log(`   Step 1: Removing account_type...`);
  
  await client.update('Account', accountName, {
    account_type: null
  });
  
  // console.log(`   Step 2: Setting is_group to 1...`);
  
  await client.update('Account', accountName, {
    is_group: 1
  });
  
  // console.log(`✅ Account updated to group`);
}

async function createAccount(accountData: Partial<Account>): Promise<void> {
  // console.log(`\n📝 Creating account: ${accountData.account_number} - ${accountData.account_name}...`);
  
  await client.insert('Account', accountData);
  
  // console.log(`✅ Account created`);
}

async function main() {
  try {
    // console.log('╔════════════════════════════════════════════════════════════╗');
    // console.log('║  Fix Penjualan Account with Company Update Script        ║');
    // console.log(`║  Company: ${COMPANY_NAME.padEnd(43)}║`);
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Step 1: Get company and check default income account
    const company = await getCompany();
    
    // Step 2: Find account 4110.000 - Penjualan
    // console.log(`\n🔍 Finding account 4110.000 - Penjualan...`);
    const penjualanAccount = await getAccount('4110.000');
    
    if (!penjualanAccount) {
      throw new Error('Account 4110.000 - Penjualan not found');
    }
    
    // console.log(`✅ Found account: ${penjualanAccount.name}`);
    // console.log(`   Current is_group: ${penjualanAccount.is_group}`);
    
    // Step 3: Check if 4110.001 already exists
    // console.log(`\n🔍 Checking if account 4110.001 - Penjualan Barang Dagang exists...`);
    const penjualanBarangAccount = await getAccount('4110.001');
    
    if (penjualanBarangAccount) {
      // console.log(`✅ Account 4110.001 already exists: ${penjualanBarangAccount.name}`);
      
      // If company default income is 4110.000, change it to 4110.001
      if (company.default_income_account === penjualanAccount.name) {
        await updateCompanyDefaultIncome(penjualanBarangAccount.name);
      }
      
      // Update 4110.000 to group
      await updateAccountToGroup(penjualanAccount.name);
      
      // console.log('\n✅ Process complete!');
      return;
    }
    
    // Step 4: Find alternative income account to use as temporary default
    // console.log(`\n🔍 Finding alternative income account...`);
    const incomeAccounts = await client.getList<Account>('Account', {
      filters: [
        ['company', '=', COMPANY_NAME],
        ['root_type', '=', 'Income'],
        ['is_group', '=', 0],
        ['name', '!=', penjualanAccount.name]
      ],
      fields: ['name', 'account_name', 'account_number'],
      limit: 1
    });
    
    let tempDefaultAccount: string;
    
    if (incomeAccounts.length > 0) {
      tempDefaultAccount = incomeAccounts[0].name;
      // console.log(`✅ Found alternative: ${tempDefaultAccount}`);
    } else {
      // If no alternative, we'll create 4110.001 first, then use it
      // console.log(`⚠️  No alternative income account found`);
      // console.log(`   Will create 4110.001 first as ledger under 4100.000`);
      
      // Create 4110.001 under 4100.000 (Pendapatan Usaha) temporarily
      const pendapatanUsahaAccount = await getAccount('4100.000');
      if (!pendapatanUsahaAccount) {
        throw new Error('Account 4100.000 - Pendapatan Usaha not found');
      }
      
      await createAccount({
        account_name: 'Penjualan Barang Dagang',
        account_number: '4110.001',
        parent_account: pendapatanUsahaAccount.name,
        is_group: 0,
        root_type: 'Income',
        company: COMPANY_NAME
      });
      
      const newAccount = await getAccount('4110.001');
      if (!newAccount) {
        throw new Error('Failed to create account 4110.001');
      }
      
      tempDefaultAccount = newAccount.name;
    }
    
    // Step 5: Update company default income account
    if (company.default_income_account === penjualanAccount.name) {
      await updateCompanyDefaultIncome(tempDefaultAccount);
    }
    
    // Step 6: Update 4110.000 to group account
    await updateAccountToGroup(penjualanAccount.name);
    
    // Step 7: If 4110.001 was created under 4100.000, move it to 4110.000
    const finalAccount = await getAccount('4110.001');
    if (finalAccount && finalAccount.parent_account !== penjualanAccount.name) {
      // console.log(`\n📝 Moving 4110.001 to correct parent (4110.000)...`);
      await client.update('Account', finalAccount.name, {
        parent_account: penjualanAccount.name
      });
      // console.log(`✅ Account moved to correct parent`);
    }
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ Process Complete!                                      ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    // console.log('\n📊 Summary:');
    // console.log(`   - Company default income: ${tempDefaultAccount}`);
    // console.log(`   - 4110.000 - Penjualan: Now a group account`);
    // console.log(`   - 4110.001 - Penjualan Barang Dagang: Created/Updated`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  }
}

main();
