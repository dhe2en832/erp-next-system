export function normalizeProfitReport(raw: Record<string, unknown>) {
  // Keep by_invoice, by_customer, by_sales as objects (new API format)
  const by_invoice = (raw?.by_invoice as Record<string, unknown>) || {};
  const by_customer = (raw?.by_customer as Record<string, unknown>) || {};
  const by_sales = (raw?.by_sales as Record<string, unknown>) || {};

  let by_item: Record<string, unknown>[] = [];
  if (Array.isArray(raw?.by_item)) {
    by_item = (raw.by_item as Record<string, unknown>[]).map((it) => ({
      ...it,
      item: String(it?.item_name || it?.item_code || it?.item || ""),
      company_margin: Number(it?.company_margin ?? it?.company_profit ?? 0),
      gross_profit: Number(it?.gross_profit ?? 0),
    }));
  } else if (raw?.by_item && typeof raw.by_item === 'object') {
    // Support object format: { key: {...} } or { key: [{...}, {...}] }
    Object.entries(raw.by_item as Record<string, unknown>).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((item: Record<string, unknown>) =>
          by_item.push({
            invoice: key,
            ...item,
            item: String(item?.item_name || item?.item_code || item?.item || ""),
            company_margin: Number(item?.company_margin ?? item?.company_profit ?? 0),
            gross_profit: Number(item?.gross_profit ?? 0),
          })
        );
      } else if (val && typeof val === 'object') {
        const item = val as Record<string, unknown>;
        by_item.push({
          invoice: key,
          ...item,
          item: String(item?.item_name || item?.item_code || item?.item || ""),
          company_margin: Number(item?.company_margin ?? item?.company_profit ?? 0),
          gross_profit: Number(item?.gross_profit ?? 0),
        });
      }
    });
  }

  return {
    by_invoice,
    by_customer,
    by_sales,
    by_item,
    summary: (raw?.summary as Record<string, unknown>) || {},
    params: (raw?.params as Record<string, unknown>) || {},
  };
}
