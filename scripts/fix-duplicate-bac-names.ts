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
  account_number: string;
  is_group: number;
  parent_account?: string;
  root_type: string;
  company: string;
  [key: string]: any;
}

async function getAllAccounts(): Promise<Account[]> {
  // console.log(`\n🔍 Fetching all accounts for ${COMPANY_NAME}...`);
  
  const accounts = await client.getList<Account>('Account', {
    filters: [['company', '=', COMPANY_NAME]],
    fields: ['name', 'account_name', 'account_number', 'is_group', 'root_type', 'parent_account'],
    limit: 500,
    order_by: 'account_number asc'
  });
  
  // console.log(`✅ Found ${accounts.length} accounts`);
  return accounts;
}

async function fixAccountName(accountName: string, newAccountName: string): Promise<void> {
  // console.log(`   Fixing: ${accountName}`);
  // console.log(`   New name: ${newAccountName}`);
  
  await client.update('Account', accountName, {
    account_name: newAccountName
  });
  
  // console.log(`   ✅ Updated`);
}

async function main() {
  try {
    // console.log('╔════════════════════════════════════════════════════════════╗');
    // console.log('║  Fix Duplicate BAC Names in COA                           ║');
    // console.log(`║  Company: ${COMPANY_NAME.padEnd(43)}║`);
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Get all accounts
    const accounts = await getAllAccounts();
    
    // Find accounts with " - BAC - BAC" pattern
    const duplicateAccounts = accounts.filter(acc => 
      acc.name.includes(' - BAC - BAC')
    );
    
    // console.log(`\n📊 Found ${duplicateAccounts.length} accounts with duplicate BAC suffix`);
    
    if (duplicateAccounts.length === 0) {
      // console.log('\n✅ No duplicate BAC names found!');
      return;
    }
    
    // console.log('\n📝 Fixing duplicate names...\n');
    
    let fixed = 0;
    let errors = 0;
    
    for (const account of duplicateAccounts) {
      try {
        // The account_name field should NOT include " - BAC" suffix
        // ERPNext automatically adds " - {company}" when displaying the full name
        // So if account_name is "5210.000 - Beban Gaji - BAC", we need to remove " - BAC"
        
        let cleanName = account.account_name;
        
        // Remove " - BAC" suffix if it exists (can appear multiple times due to bug)
        while (cleanName.endsWith(' - BAC')) {
          cleanName = cleanName.substring(0, cleanName.length - 6);
        }
        
        // If the name is different after cleaning, update it
        if (cleanName !== account.account_name) {
          await fixAccountName(account.name, cleanName);
          fixed++;
        } else {
          console.log(`   ⚠️  Skipped (no change needed): ${account.name}`);
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ Fix Complete!                                          ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    // console.log(`\n📊 Summary:`);
    // console.log(`   - Fixed: ${fixed}`);
    // console.log(`   - Errors: ${errors}`);
    // console.log(`   - Total processed: ${duplicateAccounts.length}`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  }
}

main();
