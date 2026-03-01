import { ERPNextClient } from '@/lib/erpnext';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
  const client = new ERPNextClient();
  
  // console.log('Checking for root accounts in ERPNext...\n');
  
  const accounts = await client.getList('Account', {
    filters: [['company', '=', 'Berkat Abadi Cirebon']],
    fields: ['name', 'account_name', 'account_number', 'parent_account', 'is_group', 'root_type'],
    limit: 500
  });
  
  const rootAccounts = accounts.filter((acc) => !acc.parent_account || acc.parent_account === '');
  
  // console.log(`Total accounts: ${accounts.length}`);
  // console.log(`Root accounts (no parent): ${rootAccounts.length}\n`);
  
  // if (rootAccounts.length > 0) {
  //   rootAccounts.forEach((acc) => {
  //     console.log(`- ${acc.name}`);
  //     console.log(`  account_number: ${acc.account_number || 'N/A'}`);
  //     console.log(`  parent_account: "${acc.parent_account}"`);
  //     console.log(`  is_group: ${acc.is_group}`);
  //     console.log(`  root_type: ${acc.root_type}`);
  //     console.log('');
  //   });
  // }
  
  // Also check for accounts with root_type matching our new accounts
  // console.log('\nAccounts by root_type:');
  const rootTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
  for (const rootType of rootTypes) {
    const typeAccounts = accounts.filter((acc) => acc.root_type === rootType && (!acc.parent_account || acc.parent_account === ''));
    // console.log(`${rootType}: ${typeAccounts.length} root accounts`);
  }
}

main().catch(console.error);
