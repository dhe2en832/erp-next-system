import fetch from 'node-fetch';

const ERPNEXT_URL = 'https://cirebon.batasku.cloud';
const API_KEY = '4618e5708dd3d06';
const API_SECRET = 'c0541b43bb18814';

async function checkJournalEntry() {
  try {
    console.log('\n=== CHECKING JOURNAL ENTRY ACC-JV-2026-00070 ===');
    const jeRes = await fetch(
      `${ERPNEXT_URL}/api/resource/Journal Entry/ACC-JV-2026-00070`,
      {
        headers: {
          'Authorization': `token ${API_KEY}:${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const jeData = (await jeRes.json()) as { data: any };
    const je = jeData.data;

    console.log(`Journal Entry: ${je.name}`);
    console.log(`Date: ${je.posting_date}`);
    console.log(`Status: ${je.docstatus}`);
    console.log(`Title: ${je.title}`);
    console.log(`Remarks: ${je.remarks}`);
    console.log(`Created By: ${je.owner}`);
    console.log(`Created On: ${je.creation}`);

    console.log('\n=== JOURNAL ENTRY ITEMS ===');
    console.log('Account | Debit | Credit | Description');
    console.log('------|------|------|------');
    je.accounts.forEach((item: any) => {
      console.log(`${item.account} | ${item.debit_in_account_currency || 0} | ${item.credit_in_account_currency || 0} | ${item.description || ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkJournalEntry();
