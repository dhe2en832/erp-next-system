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
  // console.log(`   Old account_name: "${newAccountName}"`);
  
  await client.update('Account', accountName, {
    account_name: newAccountName
  });
  
  console.log(`   ✅ Updated`);
}

async function main() {
  try {
    // console.log('╔════════════════════════════════════════════════════════════╗');
    // console.log('║  Clean Account Names                                      ║');
    // console.log(`║  Company: ${COMPANY_NAME.padEnd(43)}║`);
    // console.log('╚════════════════════════════════════════════════════════════╝');
    
    // Get all accounts
    const accounts = await getAllAccounts();
    
    // Find accounts with problematic names
    const problematicAccounts = accounts.filter(acc => {
      // Check if account_name starts with " - " or is empty
      return acc.account_name.startsWith(' - ') || 
             acc.account_name.startsWith('- ') ||
             acc.account_name.trim() === '' ||
             acc.account_name.trim() === '-';
    });
    
    // console.log(`\n📊 Found ${problematicAccounts.length} accounts with problematic names`);
    
    if (problematicAccounts.length === 0) {
      // console.log('\n✅ No problematic names found!');
      return;
    }
    
    // console.log('\n📝 Fixing account names...\n');
    
    let fixed = 0;
    let errors = 0;
    
    for (const account of problematicAccounts) {
      try {
        let cleanName = account.account_name.trim();
        
        // Remove leading " - " or "- "
        if (cleanName.startsWith('- ')) {
          cleanName = cleanName.substring(2).trim();
        } else if (cleanName.startsWith('-')) {
          cleanName = cleanName.substring(1).trim();
        }
        
        // If still empty or just dash, skip
        if (cleanName === '' || cleanName === '-') {
          // console.log(`   ⚠️  Skipped (empty name): ${account.name}`);
          errors++;
          continue;
        }
        
        await fixAccountName(account.name, cleanName);
        fixed++;
      } catch (error: any) {
        // console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }
    
    // console.log('\n╔════════════════════════════════════════════════════════════╗');
    // console.log('║  ✅ Fix Complete!                                          ║');
    // console.log('╚════════════════════════════════════════════════════════════╝');
    // console.log(`\n📊 Summary:`);
    // console.log(`   - Fixed: ${fixed}`);
    // console.log(`   - Errors: ${errors}`);
    // console.log(`   - Total processed: ${problematicAccounts.length}`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    throw error;
  }
}

main();
