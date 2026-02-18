"use client";

import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import BrowserStyleDatePicker from "@/components/BrowserStyleDatePicker";

interface ProfitParams {
  from_date: string;
  to_date: string;
  company?: string;
  mode: "valuation" | "margin";
  sales_person?: string;
  customer?: string;
  include_hpp?: boolean;
}

interface Summary {
  total_sales?: number;
  total_hpp?: number;
  total_commission?: number;
  total_company_profit?: number;
}

export default function ProfitReportPage() {
  const today = new Date();
  const todayStr = new Date(today).toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const [params, setParams] = useState<ProfitParams>({
    from_date: yesterdayStr,
    to_date: todayStr,
    company: "",
    mode: "valuation",
    sales_person: "",
    customer: "",
    include_hpp: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [salesList, setSalesList] = useState<string[]>([]);
  const [customerList, setCustomerList] = useState<string[]>([]);
  const [showSalesPicker, setShowSalesPicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [searchSales, setSearchSales] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");

  const fetchData = async (override?: ProfitParams) => {
    const payload = override || params;
    const payloadToSend = { ...payload } as Record<string, any>;
    // jangan kirim company kosong; biarkan backend pakai default/env
    if (!payloadToSend.company) {
      delete payloadToSend.company;
    }
    if (!payloadToSend.sales_person) {
      delete payloadToSend.sales_person;
    }
    if (!payloadToSend.customer) {
      delete payloadToSend.customer;
    }
    if (payloadToSend.include_hpp === undefined) {
      payloadToSend.include_hpp = false;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/profit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat laporan");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const normalizeDate = (value: string) => {
    if (!value) return value;
    // If already ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // If dd/mm/yyyy or dd-MM-yyyy
    const parts = value.replace(/-/g, "/").split("/");
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        return `${y}-${m}-${d}`;
      }
    }
    // Fallback: Date parse
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return value;
  };

  // Set default company dari localStorage sebelum fetch pertama
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("selected_company") : null;
    if (stored && !params.company) {
      setParams((p) => ({ ...p, company: stored }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch saat parameter siap (termasuk company jika ada)
  useEffect(() => {
    if (!params.from_date || !params.to_date) return;
    // Jika company kosong, tetap kirim agar backend pakai default user; namun jangan fetch duplikat sebelum init
    fetchData(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from_date, params.to_date, params.company, params.mode]);

  const summary: Summary = data?.summary || {};

  const comparisonData = useMemo(() => {
    if (!data?.by_invoice) return [];
    return data.by_invoice.map((inv: any) => ({
      name: inv.invoice,
      sales: inv.sales || inv.total_sales || 0,
      hpp: inv.hpp || inv.total_hpp || 0,
      commission: inv.commission || 0,
      profit: inv.profit || inv.company_profit || 0,
    }));
  }, [data]);

  const salesChartData = useMemo(() => {
    if (!data?.by_sales) return [];
    return data.by_sales.map((row: any) => ({
      name: row.sales,
      commission: row.commission || 0,
    }));
  }, [data]);

  const customerChartData = useMemo(() => {
    if (!data?.by_customer) return [];
    return data.by_customer.map((c: any) => ({ name: c.customer, profit: c.profit || c.company_profit || 0 }));
  }, [data]);
  const salesOptions = useMemo(() => salesList.filter(Boolean), [salesList]);
  const customerOptions = useMemo(() => customerList.filter(Boolean), [customerList]);

  // Fetch master Sales Person list
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const qs = new URLSearchParams();
        if (params.company) qs.set("company", params.company);
        const res = await fetch(`/api/sales/sales-persons?${qs.toString()}`);
        const json = await res.json();
        if (json.success) {
          setSalesList((json.data || []).map((p: any) => p.full_name || p.name));
        }
      } catch (err) {
        console.error("Fetch sales persons error", err);
      }
    };
    fetchSales();
  }, [params.company]);

  // Fetch master Customer list
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("limit", "500");
        if (params.company) qs.set("company", params.company);
        const res = await fetch(`/api/sales/customers?${qs.toString()}`);
        const json = await res.json();
        if (json.success) {
          const names: string[] = (json.data || []).map((c: any) => String(c.customer_name || c.name));
          setCustomerList([...new Set(names)]);
        }
      } catch (err) {
        console.error("Fetch customers error", err);
      }
    };
    fetchCustomers();
  }, [params.company]);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const addSheet = (rows: any[], name: string) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet(data.by_invoice || [], "Per Invoice");
    addSheet(data.by_item || [], "Per Item");
    addSheet(data.by_customer || [], "Per Customer");
    addSheet(data.by_sales || [], "Per Sales");

    XLSX.writeFile(wb, "profit-report.xlsx");
  };

  const toggleInvoice = (inv: string) => {
    setExpandedInvoice((prev) => (prev === inv ? null : inv));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Profit & Komisi</h1>
          <p className="text-sm text-gray-600">Mode ganda (valuation / margin), dengan drilldown & export</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
          <button
            onClick={() => {
              const p = new URLSearchParams({ mode: params.mode });
              if (params.company) p.set('company', params.company);
              if (params.from_date) p.set('from_date', params.from_date);
              if (params.to_date) p.set('to_date', params.to_date);
              window.open(`/reports/profit/print?${p}`, '_blank');
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2"
            disabled={!data}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Cetak Laporan
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            disabled={!data}
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-md shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <BrowserStyleDatePicker
            value={params.from_date}
            onChange={(value: string) => setParams((p) => ({ ...p, from_date: normalizeDate(value) }))}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <BrowserStyleDatePicker
            value={params.to_date}
            onChange={(value: string) => setParams((p) => ({ ...p, to_date: normalizeDate(value) }))}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Perusahaan (opsional)</label>
          <input
            type="text"
            readOnly
            value={params.company || ""}
            onChange={(e) => setParams((p) => ({ ...p, company: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="Nama perusahaan"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Sales Person (opsional)</label>
          <input
            type="text"
            value={params.sales_person || ""}
            onChange={(e) => setParams((p) => ({ ...p, sales_person: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="Nama sales"
          />
          <button
            type="button"
            onClick={() => {
              setSearchSales("");
              setShowSalesPicker(true);
            }}
            className="mt-1 text-sm text-indigo-600 hover:underline"
            disabled={!salesOptions.length}
          >
            Pilih dari daftar
          </button>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Customer (opsional)</label>
          <input
            type="text"
            value={params.customer || ""}
            onChange={(e) => setParams((p) => ({ ...p, customer: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="Kode/nama customer"
          />
          <button
            type="button"
            onClick={() => {
              setSearchCustomer("");
              setShowCustomerPicker(true);
            }}
            className="mt-1 text-sm text-indigo-600 hover:underline"
            disabled={!customerOptions.length}
          >
            Pilih dari daftar
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            id="include_hpp"
            type="checkbox"
            className="h-4 w-4"
            checked={!!params.include_hpp}
            onChange={(e) => setParams((p) => ({ ...p, include_hpp: e.target.checked }))}
          />
          <label htmlFor="include_hpp" className="text-sm text-gray-700">Sertakan HPP</label>
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Mode</label>
          <select
            value={params.mode}
            onChange={(e) => setParams((p) => ({ ...p, mode: e.target.value as ProfitParams["mode"] }))}
            className="w-full border rounded px-3 py-2"
          >
            <option value="valuation">Valuation</option>
            <option value="margin">Margin</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded">Sedang memuat...</div>
      )}

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Sales" value={summary.total_sales} />
          <SummaryCard label="Total HPP" value={summary.total_hpp} />
          <SummaryCard label="Total Komisi" value={summary.total_commission} />
          <SummaryCard label="Profit Perusahaan" value={summary.total_company_profit} />
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Perbandingan Profit per Invoice" subtitle="Klik baris di tabel untuk drilldown item">
            <BarChartResponsive data={comparisonData} dataKeys={["sales", "hpp", "commission", "profit"]} />
          </ChartCard>
          <ChartCard title="Komisi per Sales" subtitle="Total komisi per tenaga penjual">
            <BarChartSimple data={salesChartData} dataKey="commission" color="#10b981" />
          </ChartCard>
          <ChartCard title="Profit per Pelanggan" subtitle="Lihat profit kontribusi per pelanggan">
            <BarChartSimple data={customerChartData} dataKey="profit" color="#6366f1" />
          </ChartCard>
        </div>
      )}

      {/* Tables */}
      {data && (
        <div className="space-y-6">
          <TableInvoice
            rows={data.by_invoice || []}
            expandedInvoice={expandedInvoice}
            onToggle={toggleInvoice}
            itemsMap={data.by_item || []}
          />
          <TableSimple
            title="Per Item"
            columns={[
              { key: "invoice", label: "Invoice" },
              { key: "item", label: "Item" },
              { key: "qty", label: "Qty" },
              { key: "sales", label: "Penjualan" },
              { key: "hpp", label: "HPP" },
              { key: "commission", label: "Komisi" },
              { key: "company_margin", label: "Margin Perusahaan" },
              { key: "company_profit", label: "Laba Perusahaan" },
              { key: "gross_profit", label: "Laba Kotor" },
            ]}
            rows={data.by_item || []}
          />
          <TableSimple
            title="Per Pelanggan"
            columns={[
              { key: "customer", label: "Pelanggan" },
              { key: "invoices", label: "Invoice" },
              { key: "sales", label: "Penjualan" },
              { key: "hpp", label: "HPP" },
              { key: "base_profit", label: "Laba Dasar" },
              { key: "commission", label: "Komisi" },
              { key: "company_margin", label: "Margin Perusahaan" },
              { key: "profit", label: "Laba Perusahaan" },
              { key: "gross_profit", label: "Laba Kotor" },
            ]}
            rows={data.by_customer || []}
          />
          <TableSimple
            title="Per Sales"
            columns={[
              { key: "sales", label: "Sales" },
              { key: "invoices", label: "Invoice" },
              { key: "sales_total", label: "Penjualan" },
              { key: "hpp", label: "HPP" },
              { key: "base_profit", label: "Laba Dasar" },
              { key: "commission", label: "Komisi" },
              { key: "company_margin", label: "Margin Perusahaan" },
              { key: "profit", label: "Laba Perusahaan" },
              { key: "gross_profit", label: "Laba Kotor" },
            ]}
            rows={data.by_sales || []}
          />
        </div>
      )}

      {/* Picker Sales */}
      {showSalesPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold">Pilih Sales Person</h4>
              <button className="text-sm text-gray-500" onClick={() => { setShowSalesPicker(false); setSearchSales(""); }}>Tutup</button>
            </div>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Cari sales..."
              value={searchSales}
              onChange={(e) => setSearchSales(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto divide-y">
              {salesOptions
                .filter((s: string) => !searchSales || s.toLowerCase().includes(searchSales.toLowerCase()))
                .map((s: string) => (
                  <button
                    key={s}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50"
                    onClick={() => {
                      setParams((p) => ({ ...p, sales_person: s }));
                      setShowSalesPicker(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
              {!salesOptions.length && <div className="px-3 py-2 text-sm text-gray-500">Tidak ada data</div>}
            </div>
          </div>
        </div>
      )}

      {/* Picker Customer */}
      {showCustomerPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-semibold">Pilih Customer</h4>
              <button className="text-sm text-gray-500" onClick={() => { setShowCustomerPicker(false); setSearchCustomer(""); }}>Tutup</button>
            </div>
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Cari customer..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto divide-y">
              {customerOptions
                .filter((c: string) => !searchCustomer || c.toLowerCase().includes(searchCustomer.toLowerCase()))
                .map((c: string) => (
                  <button
                    key={c}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50"
                    onClick={() => {
                      setParams((p) => ({ ...p, customer: c }));
                      setShowCustomerPicker(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              {!customerOptions.length && <div className="px-3 py-2 text-sm text-gray-500">Tidak ada data</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-xl font-semibold">{value?.toLocaleString("id-ID") ?? "-"}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded shadow p-4 space-y-2">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function BarChartResponsive({ data, dataKeys }: { data: any[]; dataKeys: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} />
        <YAxis />
        <Tooltip
          formatter={(value: unknown) => {
            const display = typeof value === "number" ? value.toLocaleString("id-ID") : String(value ?? '-');
            return [display, ''];
          }}
        />
        <Legend />
        {dataKeys.map((key, idx) => (
          <Bar key={key} dataKey={key} fill={["#4f46e5", "#f59e0b", "#10b981", "#6366f1"][idx % 4]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function BarChartSimple({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} />
        <YAxis />
        <Tooltip
          formatter={(value: unknown) => {
            const display = typeof value === "number" ? value.toLocaleString("id-ID") : String(value ?? '-');
            return [display, ''];
          }}
        />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TableInvoice({
  rows,
  expandedInvoice,
  onToggle,
  itemsMap,
}: {
  rows: any[];
  expandedInvoice: string | null;
  onToggle: (inv: string) => void;
  itemsMap: any[];
}) {
  // map items by invoice for quick drilldown
  const itemsByInvoice = useMemo(() => {
    const map: Record<string, any[]> = {};
    (itemsMap || []).forEach((it: any) => {
      if (!map[it.invoice]) map[it.invoice] = [];
      map[it.invoice].push(it);
    });
    return map;
  }, [itemsMap]);

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Per Invoice</h3>
        <p className="text-sm text-gray-500">Klik baris untuk lihat item</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-3 py-2 text-right">Penjualan</th>
              <th className="px-3 py-2 text-right">HPP</th>
              <th className="px-3 py-2 text-right">Laba Dasar</th>
              <th className="px-3 py-2 text-right">Komisi</th>
              <th className="px-3 py-2 text-right">Margin Perusahaan</th>
              <th className="px-3 py-2 text-right">Laba Perusahaan</th>
              <th className="px-3 py-2 text-right">Laba Kotor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row: any) => {
              const isOpen = expandedInvoice === row.invoice;
              return (
                <Fragment key={row.invoice}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onToggle(row.invoice)}
                  >
                    <td className="px-3 py-2 font-medium text-indigo-700">{row.invoice}</td>
                    <td className="px-3 py-2 text-right">{(row.sales || row.total_sales || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.hpp || row.total_hpp || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.base_profit || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.commission || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.company_margin || row.company_profit || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.profit || row.company_profit || 0).toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2 text-right">{(row.gross_profit || 0).toLocaleString("id-ID")}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${row.invoice}-details`}>
                      <td colSpan={8} className="bg-gray-50 px-3 py-2">
                        <div className="text-sm text-gray-700 font-semibold mb-1">Detail Item</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="px-2 py-1 text-left">Item</th>
                                <th className="px-2 py-1 text-right">Qty</th>
                                <th className="px-2 py-1 text-right">Sales</th>
                                <th className="px-2 py-1 text-right">HPP</th>
                                <th className="px-2 py-1 text-right">Komisi</th>
                                <th className="px-2 py-1 text-right">Profit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(itemsByInvoice[row.invoice] || []).map((it: any, idx: number) => (
                                <tr key={`${row.invoice}-${it.item || it.item_code || idx}`}>
                                  <td className="px-2 py-1">{it.item || it.item_code}</td>
                                  <td className="px-2 py-1 text-right">{it.qty || 0}</td>
                                  <td className="px-2 py-1 text-right">{(it.sales || 0).toLocaleString("id-ID")}</td>
                                  <td className="px-2 py-1 text-right">{(it.hpp || 0).toLocaleString("id-ID")}</td>
                                  <td className="px-2 py-1 text-right">{(it.commission || 0).toLocaleString("id-ID")}</td>
                                  <td className="px-2 py-1 text-right">{(it.profit || it.company_profit || 0).toLocaleString("id-ID")}</td>
                                </tr>
                              ))}
                              {!(itemsByInvoice[row.invoice] || []).length && (
                                <tr key={`${row.invoice}-no-data`}>
                                  <td colSpan={6} className="px-2 py-1 text-gray-500">Tidak ada data item</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type TableColumn = { key: string; label: string };

function TableSimple({ title, columns, rows }: { title: string; columns: TableColumn[]; rows: any[] }) {
  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {Array.isArray(row[col.key])
                      ? row[col.key].join(", ") || "-"
                      : typeof row[col.key] === "number"
                        ? row[col.key].toLocaleString("id-ID")
                        : row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-2 text-center text-gray-500">Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
