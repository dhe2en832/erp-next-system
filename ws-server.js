"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importStar(require("ws"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const PORT = process.env.WS_PORT || 3002;
const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;
const wss = new ws_1.WebSocketServer({ port: Number(PORT) }, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
async function fetchCOA() {
    let accounts = [];
    try {
        // Coba dengan token authentication jika ada
        if (ERP_API_KEY && ERP_API_SECRET) {
            const res = await (0, node_fetch_1.default)(`${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","parent_account","balance"]&limit_page_length=500`, {
                headers: {
                    'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
                    'Content-Type': 'application/json'
                },
            });
            const data = await res.json();
            if (res.ok) {
                accounts = data.data || [];
            }
        }
    }
    catch (err) {
        console.log('Token auth failed, trying without balance field...');
    }
    // Fallback: tanpa balance atau tanpa auth
    if (accounts.length === 0) {
        try {
            const res = await (0, node_fetch_1.default)(`${ERPNEXT_API_URL}/api/resource/Account?fields=["name","account_name","account_type","parent_account"]&limit_page_length=500`, {
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                accounts = (data.data || []).map((acc) => ({
                    ...acc,
                    balance: 0
                }));
            }
        }
        catch (err) {
            console.error('Failed to fetch COA:', err);
        }
    }
    return accounts;
}
function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === ws_1.default.OPEN)
            client.send(msg);
    });
}
const prevBalances = {};
setInterval(async () => {
    try {
        const accounts = await fetchCOA();
        const highlight = {};
        accounts.forEach(acc => {
            const prev = prevBalances[acc.name];
            if (prev !== undefined) {
                if (acc.balance > prev)
                    highlight[acc.name] = 'up';
                else if (acc.balance < prev)
                    highlight[acc.name] = 'down';
                else
                    highlight[acc.name] = '';
            }
            prevBalances[acc.name] = acc.balance;
        });
        broadcast({ accounts, highlight });
    }
    catch (err) {
        console.error('WebSocket COA fetch error:', err);
    }
}, 1000);
wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});
