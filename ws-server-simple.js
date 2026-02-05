const WebSocket = require('ws');
const fetch = require('node-fetch').default || require('node-fetch');

const PORT = process.env.WS_PORT || 3003;
const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log(`ERPNext URL: ${ERPNEXT_API_URL}`);
  console.log(`API Key: ${ERP_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`API Secret: ${ERP_API_SECRET ? 'SET' : 'NOT SET'}`);
});

async function fetchCOA() {
  try {
    // Fetch langsung dari ERPNext dengan API key
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/Account?limit_page_length=1000`, {
      headers: {
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched COA data directly from ERPNext:', data.data ? data.data.length : 'Failed');
    
    if (data.data && data.data.length > 0) {
      // Filter accounts untuk company yang aktif (BAC)
      const filteredAccounts = data.data.filter(acc => 
        acc.name.includes(' - BAC')
      );
      
      console.log('Filtered accounts for company:', filteredAccounts.length, 'accounts');
      
      // Add balance: 0 untuk semua accounts
      const accountsWithBalance = filteredAccounts.map(acc => ({ 
        ...acc, 
        balance: 0,
        account_type: acc.account_type || '',
        parent_account: acc.parent_account || null,
        is_group: acc.is_group || false
      }));
      
      // Generate random highlights untuk demo
      const highlight = {};
      const randomAccounts = accountsWithBalance.sort(() => 0.5 - Math.random()).slice(0, 3);
      randomAccounts.forEach(acc => {
        highlight[acc.name] = Math.random() > 0.5 ? 'up' : 'down';
      });
      
      return { accounts: accountsWithBalance, highlight };
    }
    return null;
  } catch (error) {
    console.error('Error fetching COA:', error.message);
    return null;
  }
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

setInterval(async () => {
  try {
    const result = await fetchCOA();
    
    // Jika tidak ada accounts (ERPNext tidak accessible), jangan broadcast
    if (!result || result.accounts.length === 0) {
      console.log('No accounts available from ERPNext - skipping broadcast');
      return;
    }
    
    const { accounts, highlight } = result;
    
    broadcast({ accounts, highlight });
    console.log(`Broadcasted ${accounts.length} REAL accounts from ERPNext with highlights`);
  } catch (err) { 
    console.error('WebSocket COA fetch error:', err); 
  }
}, 5000); // Update every 5 seconds

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

console.log('WebSocket COA server started - fetching REAL data directly from ERPNext!');
