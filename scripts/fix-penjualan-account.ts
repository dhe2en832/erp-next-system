/**
 * Script untuk memperbaiki akun Penjualan
 * 
 * Script ini akan:
 * 1. Mengubah akun "4110.000 - Penjualan" menjadi group account (is_group=1)
 * 2. Membuat akun child "4110.001 - Penjualan Barang Dagang"
 * 
 * Usage:
 *   pnpm fix-penjualan
 */

import dotenv from 'dotenv';
import { erpnextClient } from '../lib/erpnext';

// Load environment variables
dotenv.config({ path: '.env.local' });

const COMPANY = 'Berkat Abadi Cirebon';

/**
 * Find account by account number
 */
async function findAccountByNumber(accountNumber: string): Promise<any | null> {
  try {
    const accounts = await erpnextClient.getList('Account', {
      filters: [
        ['company', '=', COMPANY],
        ['account_number', '=', accountNumber]
      ],
      fields: ['name', 'account_name', 'account_number', 'is_group'],
      limit_page_length: 1
    });
    
    if (accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Update account to be a group account
 */
async function updateAccountToGroup(accountName: string): Promise<void> {
  // console.log(`\n📝 Updating account ${accountName} to group account...`);
  
  try {
    // First, remove account_type (set to empty string)
    // ERPNext doesn't allow converting to group if account_type is set
    // console.log(`   Step 1: Removing account_type...`);
    await erpnextClient.update('Account', accountName, {
      account_type: ''
    });
    
    // console.log(`   Step 2: Setting is_group to 1...`);
    await erpnextClient.update('Account', accountName, {
      is_group: 1
    });
    
    // console.log(`✅ Successfully updated ${accountName} to group account`);
  } catch (error: any) {
    console.error(`❌ Error updating account:`, error.message);
    throw error;
  }
}

/**
 * Create child account under Penjualan
 */
async function createPenjualanBarangDagang(parentAccountName: string): Promise<void> {
  // console.log(`\n📝 Creating account 4110.001 - Penjualan Barang Dagang...`);
  
  try {
    const accountData = {
      doctype: 'Account',
      account_name: '4110.001 - Penjualan Barang Dagang - BAC',
      account_number: '4110.001',
      company: COMPANY,
      parent_account: parentAccountName,
      is_group: 0,
      root_type: 'Income',
      report_type: 'Profit and Loss',
      account_type: 'Income Account',
      account_currency: 'IDR'
    };
    
    await erpnextClient.insert('Account', accountData);
    
    // console.log(`✅ Successfully created 4110.001 - Penjualan Barang Dagang - BAC`);
  } catch (error: any) {
    console.error(`❌ Error creating account:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  // console.log('╔════════════════════════════════════════════════════════════╗');
  // console.log('║  Fix Penjualan Account Script                             ║');
  // console.log('║  Company: Berkat Abadi Cirebon                            ║');
  // console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // Step 1: Find the Penjualan account
    // console.log('\n🔍 Finding account 4110.000 - Penjualan...');
    const penjualanAccount = await findAccountByNumber('4110.000');
    
    if (!penjualanAccount) {
      throw new Error('Account 4110.000 - Penjualan not found');
    }
    
    // console.log(`✅ Found account: ${penjualanAccount.name}`);
    // console.log(`   Current is_group: ${penjualanAccount.is_group}`);
    
    // Step 2: Update to group account if not already
    if (penjualanAccount.is_group === 0) {
      await updateAccountToGroup(penjualanAccount.name);
    } else {
      // console.log(`ℹ️  Account is already a group account, skipping update...`);
    }
    
    // Step 3: Check if child account already exists
    // console.log('\n🔍 Checking if 4110.001 - Penjualan Barang Dagang exists...');
    const childAccount = await findAccountByNumber('4110.001');
    
    if (childAccount) {
      // console.log(`ℹ️  Account 4110.001 already exists, skipping creation...`);
    } else {
      // Step 4: Create child account
      await createPenjualanBarangDagang(penjualanAccount.name);
    }
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ Fix Complete!                                          ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
