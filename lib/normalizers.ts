export function normalizeProfitReport(raw: any) {
  const by_invoice = Object.entries(raw?.by_invoice || {}).map(([invoice, v]: any) => ({
    invoice,
    ...v,
  }));

  const by_customer = Object.entries(raw?.by_customer || {}).map(([customer, profit]: any) => ({
    customer,
    profit: typeof profit === 'object' ? profit.profit ?? profit.base_profit ?? 0 : profit,
  }));

  const by_sales = Object.entries(raw?.by_sales || {}).map(([sales, commission]: any) => ({
    sales,
    commission: typeof commission === 'object' ? commission.commission ?? commission.amount ?? commission.profit ?? 0 : commission,
  }));

  const by_item = Array.isArray(raw?.by_item) ? raw.by_item : [];

  return {
    ...raw,
    by_invoice,
    by_customer,
    by_sales,
    by_item,
    summary: raw?.summary || {},
  };
}
