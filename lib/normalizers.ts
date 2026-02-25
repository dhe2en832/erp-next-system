export function normalizeProfitReport(raw: any) {
  // Keep by_invoice, by_customer, by_sales as objects (new API format)
  const by_invoice = raw?.by_invoice || {};
  const by_customer = raw?.by_customer || {};
  const by_sales = raw?.by_sales || {};

  let by_item: any[] = [];
  if (Array.isArray(raw?.by_item)) {
    by_item = raw.by_item.map((it: any) => ({
      ...it,
      item: it?.item_name || it?.item_code || it?.item || "",
      company_margin: it?.company_margin ?? it?.company_profit ?? 0,
      gross_profit: it?.gross_profit ?? 0,
    }));
  } else if (raw?.by_item && typeof raw.by_item === 'object') {
    // Support object format: { key: {...} } or { key: [{...}, {...}] }
    Object.entries(raw.by_item).forEach(([key, val]: any) => {
      if (Array.isArray(val)) {
        val.forEach((item) =>
          by_item.push({
            invoice: key,
            ...item,
            item: item?.item_name || item?.item_code || item?.item || "",
            company_margin: item?.company_margin ?? item?.company_profit ?? 0,
            gross_profit: item?.gross_profit ?? 0,
          })
        );
      } else if (val && typeof val === 'object') {
        by_item.push({
          invoice: key,
          ...val,
          item: val?.item_name || val?.item_code || val?.item || "",
          company_margin: val?.company_margin ?? val?.company_profit ?? 0,
          gross_profit: val?.gross_profit ?? 0,
        });
      }
    });
  }

  return {
    by_invoice,
    by_customer,
    by_sales,
    by_item,
    summary: raw?.summary || {},
    params: raw?.params || {},
  };
}
