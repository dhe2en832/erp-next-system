/**
 * Script untuk mengganti Chart of Accounts (COA) existing dengan data baru
 * 
 * PERINGATAN: Script ini akan menghapus SEMUA akun existing dan menggantinya dengan data baru!
 * Pastikan Anda sudah backup database sebelum menjalankan script ini.
 * 
 * Usage:
 *   pnpm tsx scripts/replace-coa.ts
 */

import dotenv from 'dotenv';
import { erpnextClient } from '../lib/erpnext';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const COMPANY = 'Berkat Abadi Cirebon';
const BACKUP_DIR = './coa-backup';

interface COAData {
  doctype: string;
  account_number: string;
  account_name: string;
  company: string;
  parent_account: string;
  is_group: number;
  root_type: string;
  report_type: string;
  account_type?: string;
  account_currency: string;
}

// Data COA baru dari user
const NEW_COA_DATA: Omit<COAData, 'doctype'>[] = [
  // ... (data akan diisi dari CSV/Excel yang diberikan user)
];

/**
 * Backup existing COA to JSON file
 */
async function backupExistingCOA(): Promise<void> {
  // console.log('\n📦 Backing up existing Chart of Accounts...');
  
  try {
    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Fetch all existing accounts
    const accounts = await erpnextClient.getList('Account', {
      filters: [['company', '=', COMPANY]],
      fields: ['*'],
      limit_page_length: 99999
    });
    
    // Save to JSON file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `coa-backup-${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(accounts, null, 2));
    
    // console.log(`✅ Backup saved to: ${backupFile}`);
    // console.log(`   Total accounts backed up: ${accounts.length}`);
    
  } catch (error) {
    console.error('❌ Error backing up COA:', error);
    throw error;
  }
}

/**
 * Delete all existing accounts (in correct order to avoid foreign key issues)
 */
async function deleteExistingCOA(): Promise<void> {
  // console.log('\n🗑️  Deleting existing Chart of Accounts...');
  
  try {
    // Fetch all accounts ordered by level (deepest first)
    const accounts = await erpnextClient.getList('Account', {
      filters: [['company', '=', COMPANY]],
      fields: ['name', 'is_group', 'lft', 'rgt'],
      order_by: 'rgt desc', // Delete from deepest level first
      limit_page_length: 99999
    });
    
    // console.log(`   Found ${accounts.length} accounts to delete`);
    
    let deleted = 0;
    let skipped = 0;
    
    for (const account of accounts as any[]) {
      try {
        // Skip if account has GL entries
        const glEntries = await erpnextClient.getList('GL Entry', {
          filters: [['account', '=', account.name]],
          fields: ['name'],
          limit_page_length: 1
        });
        
        if (glEntries.length > 0) {
          // console.log(`   ⚠️  Skipping ${account.name} (has GL entries)`);
          skipped++;
          continue;
        }
        
        // Delete account
        await erpnextClient.delete('Account', account.name);
        deleted++;
        
        if (deleted % 10 === 0) {
          console.log(`   Progress: ${deleted}/${accounts.length} deleted`);
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error deleting ${account.name}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`✅ Deletion complete: ${deleted} deleted, ${skipped} skipped`);
    
  } catch (error) {
    console.error('❌ Error deleting COA:', error);
    throw error;
  }
}

/**
 * Parse COA data from the provided text format
 */
function parseCOAData(rawData: string): Omit<COAData, 'doctype'>[] {
  const lines = rawData.trim().split('\n');
  const accounts: Omit<COAData, 'doctype'>[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    
    if (parts.length < 8) continue;
    
    accounts.push({
      account_number: parts[1] || '',
      account_name: parts[2] || '',
      company: parts[3] || COMPANY,
      parent_account: parts[4] || '',
      is_group: parseInt(parts[5]) || 0,
      root_type: parts[6] || '',
      report_type: parts[7] || '',
      account_type: parts[8] || undefined,
      account_currency: parts[9] || 'IDR'
    });
  }
  
  return accounts;
}

/**
 * Create new COA from provided data
 */
async function createNewCOA(coaData: Omit<COAData, 'doctype'>[]): Promise<void> {
  console.log('\n📝 Creating new Chart of Accounts...');
  console.log(`   Total accounts to create: ${coaData.length}`);
  
  try {
    let created = 0;
    let failed = 0;
    
    // Sort by hierarchy (parent accounts first)
    // Accounts without parent_account or with empty parent should be created first
    const sortedData = [...coaData].sort((a, b) => {
      const aHasParent = a.parent_account && a.parent_account.trim() !== '';
      const bHasParent = b.parent_account && b.parent_account.trim() !== '';
      
      if (!aHasParent && bHasParent) return -1;
      if (aHasParent && !bHasParent) return 1;
      
      // If both have parents, sort by account number
      return (a.account_number || '').localeCompare(b.account_number || '');
    });
    
    for (const account of sortedData) {
      try {
        // Build account name with number
        const accountName = account.account_number 
          ? `${account.account_number} - ${account.account_name} - BAC`
          : `${account.account_name} - BAC`;
        
        // Prepare account data
        const accountData: any = {
          doctype: 'Account',
          account_name: accountName,
          company: account.company,
          is_group: account.is_group,
          root_type: account.root_type,
          report_type: account.report_type,
          account_currency: account.account_currency
        };
        
        // Add parent account if specified
        if (account.parent_account && account.parent_account.trim() !== '') {
          accountData.parent_account = account.parent_account;
        }
        
        // Add account type if specified
        if (account.account_type) {
          accountData.account_type = account.account_type;
        }
        
        // Create account
        await erpnextClient.insert('Account', accountData);
        created++;
        
        if (created % 10 === 0) {
          console.log(`   Progress: ${created}/${sortedData.length} created`);
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error creating ${account.account_name}:`, error.message);
        failed++;
      }
    }
    
    console.log(`✅ Creation complete: ${created} created, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Error creating COA:', error);
    throw error;
  }
}

/**
 * Verify the new COA structure
 */
async function verifyCOA(): Promise<void> {
  console.log('\n🔍 Verifying new Chart of Accounts...');
  
  try {
    const accounts = await erpnextClient.getList('Account', {
      filters: [['company', '=', COMPANY]],
      fields: ['name', 'root_type', 'is_group'],
      limit_page_length: 99999
    });
    
    // Count by root type
    const counts: Record<string, number> = {};
    for (const account of accounts as any[]) {
      counts[account.root_type] = (counts[account.root_type] || 0) + 1;
    }
    
    console.log('   Account summary:');
    console.log(`   - Total accounts: ${accounts.length}`);
    for (const [rootType, count] of Object.entries(counts)) {
      console.log(`   - ${rootType}: ${count}`);
    }
    
    console.log('✅ Verification complete');
    
  } catch (error) {
    console.error('❌ Error verifying COA:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Chart of Accounts Replacement Script                     ║');
  console.log('║  Company: Berkat Abadi Cirebon                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n⚠️  WARNING: This script will DELETE all existing accounts!');
  console.log('⚠️  Make sure you have backed up your database before proceeding.');
  console.log('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...\n');
  
  // Wait 10 seconds for user to cancel
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  try {
    // Step 1: Backup existing COA
    await backupExistingCOA();
    
    // Step 2: Delete existing COA
    await deleteExistingCOA();
    
    // Step 3: Load new COA data from file
    console.log('\n📂 Loading new COA data...');
    const coaDataFile = path.join(__dirname, 'new-coa-data.json');
    
    if (!fs.existsSync(coaDataFile)) {
      throw new Error(`COA data file not found: ${coaDataFile}`);
    }
    
    const coaData = JSON.parse(fs.readFileSync(coaDataFile, 'utf-8'));
    console.log(`✅ Loaded ${coaData.length} accounts from file`);
    
    // Step 4: Create new COA
    await createNewCOA(coaData);
    
    // Step 5: Verify new COA
    await verifyCOA();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ COA Replacement Complete!                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    console.error('\n💡 You can restore from backup in:', BACKUP_DIR);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
