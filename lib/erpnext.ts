const ERPNEXT_API_URL = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function buildAuthHeaders() {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ERP API credentials not configured');
  }

  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return {
    Authorization: `Basic ${authString}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

export async function fetchProfitReport(params: {
  from_date: string;
  to_date: string;
  company?: string;
  mode: 'valuation' | 'margin';
}) {
  const headers = buildAuthHeaders();
  const res = await fetch(`${ERPNEXT_API_URL}/api/method/get_profit_commission_report_dual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.exc || 'Failed to fetch profit report');
  }
  return data.message || data;
}

export default fetchProfitReport;
