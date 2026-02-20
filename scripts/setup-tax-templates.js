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

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;

async function createTaxTemplate(config) {
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
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function verifyAccount(accountName) {
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
  } catch (error) {
    console.error(`   ❌ Error verifying account: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Setup Tax Templates for ERPNext');
  console.log('   Task 1.1: Buat Sales Taxes and Charges Template untuk PPN 11%');
  console.log('='.repeat(60));

  // Verify API credentials
  if (!API_KEY || !API_SECRET) {
    console.error('\n❌ Error: API credentials not configured');
    console.error('   Please set ERP_API_KEY and ERP_API_SECRET in .env file');
    console.error('\n   Example .env file:');
    console.error('   ERPNEXT_API_URL=http://localhost:8000');
    console.error('   ERP_API_KEY=your_api_key');
    console.error('   ERP_API_SECRET=your_api_secret');
    process.exit(1);
  }

  console.log(`\n✅ API credentials configured`);
  console.log(`   API URL: ${ERPNEXT_API_URL}`);

  // Step 1: Verify account exists
  const accountName = '2210 - Hutang PPN - BAC';
  const accountExists = await verifyAccount(accountName);
  
  if (!accountExists) {
    console.error(`\n❌ Error: Account "${accountName}" not found in Chart of Accounts`);
    console.error('   Please ensure the account exists before creating the tax template');
    process.exit(1);
  }

  // Step 2: Create PPN 11% template
  const ppnTemplate = {
    title: 'PPN 11%',
    company: 'BAC',
    is_default: 1,
    disabled: 0,
    taxes: [
      {
        charge_type: 'On Net Total',
        account_head: '2210 - Hutang PPN - BAC',
        description: 'PPN 11%',
        rate: 11,
        included_in_print_rate: 0
      }
    ]
  };

  try {
    const result = await createTaxTemplate(ppnTemplate);
    
    console.log('\n' + '='.repeat(60));
    if (result.exists) {
      console.log('✅ Setup completed (template already exists)');
    } else {
      console.log('✅ Setup completed successfully');
    }
    console.log('='.repeat(60));
    
    console.log('\n📋 Summary:');
    console.log(`   Template Name: PPN 11%`);
    console.log(`   Company: BAC`);
    console.log(`   Account: 2210 - Hutang PPN - BAC`);
    console.log(`   Rate: 11%`);
    console.log(`   Default: Yes`);
    console.log(`   Status: ${result.exists ? 'Already exists' : 'Created'}`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
