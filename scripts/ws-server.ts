import WebSocket, { WebSocketServer } from 'ws';
import fetch from 'node-fetch';

const PORT = process.env.WS_PORT || 3002;
const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

interface Account {
  name: string;
  account_name: string;
  account_type: string;
  parent_account: string | null;
  balance: number;
}

const wss = new WebSocketServer({ port: Number(PORT) }, () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

async function fetchCOA(): Promise<Account[]> {
  let accounts: Account[] = [];
  
  try {
    // Coba dengan token authentication jika ada
    if (ERP_API_KEY && ERP_API_SECRET) {
      const res = await fetch(`${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","parent_account","balance"]&limit_page_length=500`, {
        headers: { 
          'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`, 
          'Content-Type': 'application/json' 
        },
      });
      const data = await res.json() as { data: Account[] };
      if (res.ok) {
        accounts = data.data || [];
      }
    }
  } catch (err) {
    console.log('Token auth failed, trying without balance field...');
  }
  
  // Fallback: tanpa balance atau tanpa auth
  if (accounts.length === 0) {
    try {
      const res = await fetch(`${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","parent_account"]&limit_page_length=500`, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json() as { data: unknown[] };
      if (res.ok) {
        accounts = (data.data || []).map((acc: unknown) => ({ 
          ...(acc as Omit<Account, 'balance'>), 
          balance: 0 
        }));
      }
    } catch (err) {
      console.error('Failed to fetch COA:', err);
    }
  }
  
  return accounts;
}

function broadcast(data: unknown) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

const prevBalances: Record<string, number> = {};

setInterval(async () => {
  try {
    const accounts = await fetchCOA();
    const highlight: Record<string, 'up' | 'down' | ''> = {};
    accounts.forEach(acc => {
      const prev = prevBalances[acc.name];
      if (prev !== undefined) {
        if (acc.balance > prev) highlight[acc.name] = 'up';
        else if (acc.balance < prev) highlight[acc.name] = 'down';
        else highlight[acc.name] = '';
      }
      prevBalances[acc.name] = acc.balance;
    });
    broadcast({ accounts, highlight });
  } catch (err) { 
    console.error('WebSocket COA fetch error:', err); 
  }
}, 1000);

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});
