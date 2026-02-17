export function normalizeProfitReport(raw: any) {
  const by_invoice = Object.entries(raw?.by_invoice || {}).map(([invoice, v]: any) => ({
    invoice,
    ...v,
    company_margin: v?.company_margin ?? 0,
    gross_profit: v?.gross_profit ?? 0,
  }));

  const by_customer = Object.entries(raw?.by_customer || {}).map(([customer, v]: any) => ({
    customer,
    invoices: v?.invoices || [],
    sales: v?.sales ?? 0,
    hpp: v?.hpp ?? v?.total_hpp ?? 0,
    base_profit: v?.base_profit ?? 0,
    commission: v?.commission ?? 0,
    profit: v?.profit ?? v?.company_profit ?? 0,
    company_margin: v?.company_margin ?? v?.company_profit ?? 0,
    gross_profit: v?.gross_profit ?? 0,
  }));

  const by_sales = Object.entries(raw?.by_sales || {}).map(([sales, v]: any) => ({
    sales,
    invoices: v?.invoices || [],
    sales_total: v?.sales ?? v?.total_sales ?? 0,
    hpp: v?.hpp ?? v?.total_hpp ?? 0,
    base_profit: v?.base_profit ?? 0,
    commission: v?.commission ?? v?.amount ?? v?.profit ?? 0,
    profit: v?.profit ?? v?.company_profit ?? 0,
    company_margin: v?.company_margin ?? v?.company_profit ?? 0,
    gross_profit: v?.gross_profit ?? 0,
  }));

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
    ...raw,
    by_invoice,
    by_customer,
    by_sales,
    by_item,
    summary: raw?.summary || {},
  };
}
