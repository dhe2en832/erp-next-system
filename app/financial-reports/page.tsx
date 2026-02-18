'use client';

import { useState, useEffect, useCallback } from 'react';
import BrowserStyleDatePicker from '../../components/BrowserStyleDatePicker';
import LoadingSpinner from '../components/LoadingSpinner';
import PrintPreviewModal from '../../components/PrintPreviewModal';

interface TrialBalanceEntry {
  account: string;
  account_name: string;
  account_number: string;
  root_type: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface BalanceSheetEntry {
  account: string;
  account_name: string;
  account_number: string;
  root_type: string;
  root_type_label: string;
  account_type: string;
  sub_category: string;
  balance: number;
}

interface ProfitLossEntry {
  account: string;
  account_name: string;
  account_number: string;
  root_type: string;
  root_type_label: string;
  account_type: string;
  sub_category: string;
  amount: number;
}

const fmtCur = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(v));

const fmtCurPrint = (v: number) => `Rp ${Math.abs(v).toLocaleString('id-ID')}`;

function groupByRootType<T extends { root_type: string }>(entries: T[]): Record<string, T[]> {
  const order = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
  const map: Record<string, T[]> = {};
  entries.forEach(e => { if (!map[e.root_type]) map[e.root_type] = []; map[e.root_type].push(e); });
  const sorted: Record<string, T[]> = {};
  order.forEach(k => { if (map[k]) sorted[k] = map[k]; });
  Object.keys(map).forEach(k => { if (!sorted[k]) sorted[k] = map[k]; });
  return sorted;
}

function groupBySubCat<T extends { sub_category: string }>(entries: T[]): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  entries.forEach(e => { const k = e.sub_category || 'Lainnya'; if (!map[k]) map[k] = []; map[k].push(e); });
  return map;
}

const formatDate = (d: Date) => {
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'balance-sheet' | 'profit-loss'>('trial-balance');
  const [showPrint, setShowPrint] = useState(false);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceEntry[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetEntry[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLossEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return { from_date: formatDate(new Date(today.getFullYear(), 0, 1)), to_date: formatDate(today) };
  });

  useEffect(() => {
    let co = localStorage.getItem('selected_company');
    if (!co) {
      const c = document.cookie.split(';').find(x => x.trim().startsWith('selected_company='));
      if (c) { co = c.split('=')[1]; if (co) localStorage.setItem('selected_company', co); }
    }
    if (co) setCompany(co);
  }, []);

  const fetchReport = useCallback(async (tab: typeof activeTab) => {
    let co = company || localStorage.getItem('selected_company') || '';
    if (!co) {
      const c = document.cookie.split(';').find(x => x.trim().startsWith('selected_company='));
      if (c) co = c.split('=')[1] || '';
    }
    if (!co) { setError('Perusahaan belum dipilih.'); return; }
    if (!company) setCompany(co);
    setLoading(true); setError('');
    try {
      const toYMD = (s: string) => { const p = s.split('/'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ''; };
      let url = `/api/finance/reports?company=${encodeURIComponent(co)}&report=${tab}`;
      if (dateFilter.from_date) url += `&from_date=${toYMD(dateFilter.from_date)}`;
      if (dateFilter.to_date) url += `&to_date=${toYMD(dateFilter.to_date)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        if (tab === 'trial-balance') setTrialBalance(data.data || []);
        else if (tab === 'balance-sheet') setBalanceSheet(data.data || []);
        else setProfitLoss(data.data || []);
      } else { setError(data.message || 'Gagal memuat laporan'); }
    } catch { setError('Gagal memuat laporan'); }
    finally { setLoading(false); }
  }, [company, dateFilter]);

  useEffect(() => { if (company) fetchReport(activeTab); }, [company, activeTab, dateFilter, fetchReport]);

  const filterData = <T extends { account_name: string }>(data: T[]) => {
    if (!search.trim()) return data;
    const s = search.toLowerCase();
    return data.filter(e => e.account_name?.toLowerCase().includes(s));
  };

  const tabLabel = activeTab === 'trial-balance' ? 'Neraca Saldo' : activeTab === 'balance-sheet' ? 'Neraca' : 'Laporan Laba Rugi';

  const tbData = filterData(trialBalance);
  const tbTotD = tbData.reduce((s, e) => s + e.debit, 0);
  const tbTotC = tbData.reduce((s, e) => s + e.credit, 0);
  const tbDiff = Math.abs(tbTotD - tbTotC);

  const bsData = filterData(balanceSheet);
  const bsGrouped = groupByRootType(bsData);
  const bsAssets = (bsGrouped['Asset'] || []).reduce((s, e) => s + e.balance, 0);
  const bsLiab = (bsGrouped['Liability'] || []).reduce((s, e) => s + Math.abs(e.balance), 0);
  const bsEquity = (bsGrouped['Equity'] || []).reduce((s, e) => s + Math.abs(e.balance), 0);

  const plData = filterData(profitLoss);
  const plGrouped = groupByRootType(plData);
  const plIncome = (plGrouped['Income'] || []).reduce((s, e) => s + e.amount, 0);
  const plHPP = (plGrouped['Expense'] || []).filter(e => e.account_type === 'Cost of Goods Sold').reduce((s, e) => s + e.amount, 0);
  const plGross = plIncome - plHPP;
  const plOpex = (plGrouped['Expense'] || []).filter(e => e.account_type !== 'Cost of Goods Sold').reduce((s, e) => s + e.amount, 0);
  const plNet = plGross - plOpex;

  const renderPrint = () => {
    const period = `${dateFilter.from_date} s/d ${dateFilter.to_date}`;

    if (activeTab === 'trial-balance') {
      return (
        <div className="fin-print">
          <div className="doc-header">
            <div className="doc-company">{company}</div>
            <div className="doc-title">NERACA SALDO</div>
            <div className="doc-meta">Periode: {period}</div>
          </div>
          <table>
            <thead><tr>
              <th style={{width:'50%'}}>Nama Akun</th>
              <th className="right" style={{width:'25%'}}>Debit</th>
              <th className="right" style={{width:'25%'}}>Kredit</th>
            </tr></thead>
            <tbody>
              {tbData.map(e => (
                <tr key={e.account}>
                  <td>{e.account_name}</td>
                  <td className="right">{e.debit > 0 ? fmtCurPrint(e.debit) : '-'}</td>
                  <td className="right">{e.credit > 0 ? fmtCurPrint(e.credit) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="total-row">
              <td><strong>JUMLAH</strong></td>
              <td className="right"><strong>{fmtCurPrint(tbTotD)}</strong></td>
              <td className="right"><strong>{fmtCurPrint(tbTotC)}</strong></td>
            </tr></tfoot>
          </table>
          {tbDiff > 0 && <div style={{color:'red',fontSize:'10px',marginTop:'4px'}}>* Selisih: {fmtCurPrint(tbDiff)}</div>}
        </div>
      );
    }

    if (activeTab === 'balance-sheet') {
      const assets = bsGrouped['Asset'] || [];
      const liab = bsGrouped['Liability'] || [];
      const equity = bsGrouped['Equity'] || [];
      const totAsset = assets.reduce((s, e) => s + e.balance, 0);
      const totLiab = liab.reduce((s, e) => s + Math.abs(e.balance), 0);
      const totEquity = equity.reduce((s, e) => s + Math.abs(e.balance), 0);

      const renderBSSection = (entries: BalanceSheetEntry[], isCredit: boolean) =>
        Object.entries(groupBySubCat(entries)).map(([cat, rows]) => {
          const sub = rows.reduce((s, e) => s + Math.abs(e.balance), 0);
          return (
            <div key={cat}>
              <div className="section-sub">{cat}</div>
              <table><tbody>
                {rows.map(e => (
                  <tr key={e.account}>
                    <td style={{paddingLeft:'16px'}}>{e.account_name}</td>
                    <td className="right" style={{ width: '36%' }}>{fmtCurPrint(isCredit ? Math.abs(e.balance) : e.balance)}</td>
                  </tr>
                ))}
              </tbody><tfoot>
                <tr className="subtotal-row">
                  <td>Jumlah {cat}</td>
                  <td className="right">{fmtCurPrint(sub)}</td>
                </tr>
              </tfoot></table>
            </div>
          );
        });

      return (
        <div className="fin-print">
          <div className="doc-header">
            <div className="doc-company">{company}</div>
            <div className="doc-title">NERACA</div>
            <div className="doc-meta">Per tanggal: {dateFilter.to_date}</div>
          </div>
          <div className="section-header">AKTIVA</div>
          {renderBSSection(assets, false)}
          <table><tfoot><tr className="total-row">
            <td><strong>JUMLAH AKTIVA</strong></td>
            <td className="right"><strong>{fmtCurPrint(totAsset)}</strong></td>
          </tr></tfoot></table>
          <div style={{marginTop:'10px'}} />
          <div className="section-header">KEWAJIBAN</div>
          {renderBSSection(liab, true)}
          <table><tfoot><tr className="subtotal-row">
            <td><strong>JUMLAH KEWAJIBAN</strong></td>
            <td className="right"><strong>{fmtCurPrint(totLiab)}</strong></td>
          </tr></tfoot></table>
          <div className="section-header" style={{marginTop:'8px'}}>EKUITAS</div>
          {renderBSSection(equity, true)}
          <table><tfoot>
            <tr className="subtotal-row">
              <td><strong>JUMLAH EKUITAS</strong></td>
              <td className="right"><strong>{fmtCurPrint(totEquity)}</strong></td>
            </tr>
            <tr className="total-row">
              <td><strong>JUMLAH KEWAJIBAN &amp; EKUITAS</strong></td>
              <td className="right"><strong>{fmtCurPrint(totLiab + totEquity)}</strong></td>
            </tr>
          </tfoot></table>
          {Math.abs(totAsset - (totLiab + totEquity)) > 1 && (
            <div style={{color:'red',fontSize:'10px',marginTop:'4px'}}>
              * Neraca tidak seimbang — selisih: {fmtCurPrint(Math.abs(totAsset - (totLiab + totEquity)))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'profit-loss') {
      const incomeEntries = plGrouped['Income'] || [];
      const expenseEntries = plGrouped['Expense'] || [];
      const hppEntries = expenseEntries.filter(e => e.account_type === 'Cost of Goods Sold');
      const opexEntries = expenseEntries.filter(e => e.account_type !== 'Cost of Goods Sold');
      const totInc = incomeEntries.reduce((s, e) => s + e.amount, 0);
      const totHPP = hppEntries.reduce((s, e) => s + e.amount, 0);
      const gross = totInc - totHPP;
      const totOpex = opexEntries.reduce((s, e) => s + e.amount, 0);
      const net = gross - totOpex;
      return (
        <div className="fin-print">
          <div className="doc-header">
            <div className="doc-company">{company}</div>
            <div className="doc-title">LAPORAN LABA RUGI</div>
            <div className="doc-meta">Periode: {period}</div>
          </div>
          <div className="section-header">PENDAPATAN</div>
          <table>
            <tbody>{incomeEntries.map(e => (
              <tr key={e.account}><td style={{paddingLeft:'16px'}}>{e.account_name}</td><td className="right" style={{ width: '36%' }}>{fmtCurPrint(e.amount)}</td></tr>
            ))}</tbody>
            <tfoot><tr className="subtotal-row"><td><strong>Jumlah Pendapatan</strong></td><td className="right"><strong>{fmtCurPrint(totInc)}</strong></td></tr></tfoot>
          </table>
          {hppEntries.length > 0 && <>
            <div className="section-header" style={{marginTop:'8px'}}>HARGA POKOK PENJUALAN</div>
            <table>
              <tbody>{hppEntries.map(e => (
                <tr key={e.account}><td style={{paddingLeft:'16px'}}>{e.account_name}</td><td className="right" style={{ width: '36%' }}>{fmtCurPrint(e.amount)}</td></tr>
              ))}</tbody>
              <tfoot><tr className="subtotal-row"><td><strong>Jumlah HPP</strong></td><td className="right"><strong>{fmtCurPrint(totHPP)}</strong></td></tr></tfoot>
            </table>
          </>}
          <table style={{marginTop:'4px'}}><tbody>
            <tr className="total-row"><td><strong>LABA KOTOR</strong></td><td className="right"><strong>{fmtCurPrint(gross)}</strong></td></tr>
          </tbody></table>
          {opexEntries.length > 0 && <>
            <div className="section-header" style={{marginTop:'8px'}}>BEBAN OPERASIONAL</div>
            <table>
              <tbody>{opexEntries.map(e => (
                <tr key={e.account}><td style={{paddingLeft:'16px'}}>{e.account_name}</td><td className="right" style={{ width: '36%' }}>{fmtCurPrint(e.amount)}</td></tr>
              ))}</tbody>
              <tfoot><tr className="subtotal-row"><td><strong>Jumlah Beban Operasional</strong></td><td className="right"><strong>{fmtCurPrint(totOpex)}</strong></td></tr></tfoot>
            </table>
          </>}
          <table style={{marginTop:'8px'}}><tbody>
            <tr className="total-row"><td><strong>{net >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</strong></td><td className="right"><strong>{fmtCurPrint(net)}</strong></td></tr>
          </tbody></table>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="mt-1 text-sm text-gray-600">Neraca Saldo · Neraca · Laporan Laba Rugi</p>
        </div>
        <button onClick={() => setShowPrint(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak {tabLabel}
        </button>
      </div>

      {showPrint && (
        <PrintPreviewModal title={`${tabLabel} — ${company}`} onClose={() => setShowPrint(false)}>
          <>
            <style>{`
              .fin-print table { table-layout: auto !important; width: 100%; border-collapse: collapse; margin-bottom: 8px; }
              .fin-print th, .fin-print td { padding: 4px 6px; vertical-align: top; }
              .fin-print .doc-header { margin-bottom: 12px; }
              .fin-print .section-header { margin-top: 10px; margin-bottom: 4px; }
            `}</style>
            {renderPrint()}
            <div style={{marginTop:'20px',borderTop:'1px solid #d1d5db',paddingTop:'4px',fontSize:'8px',color:'#9ca3af',textAlign:'center'}}>
              Dicetak oleh sistem &mdash; {new Date().toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'})}
            </div>
          </>
        </PrintPreviewModal>
      )}

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Nama Akun</label>
            <input type="text"
              className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nama akun..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.from_date}
              onChange={(v: string) => setDateFilter(p => ({...p, from_date: v}))}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="DD/MM/YYYY" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
            <BrowserStyleDatePicker value={dateFilter.to_date}
              onChange={(v: string) => setDateFilter(p => ({...p, to_date: v}))}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="DD/MM/YYYY" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => { const t = new Date(); setDateFilter({from_date: formatDate(new Date(t.getFullYear(),0,1)), to_date: formatDate(t)}); setSearch(''); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">Reset</button>
            <button onClick={() => fetchReport(activeTab)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">Refresh</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-1 px-4 py-2">
            {([{id:'trial-balance',label:'Neraca Saldo'},{id:'balance-sheet',label:'Neraca'},{id:'profit-loss',label:'Laba Rugi'}] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading && <LoadingSpinner message="Memuat laporan..." />}

          {/* ── NERACA SALDO ── */}
          {!loading && activeTab === 'trial-balance' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Akun</p>
                  <p className="text-2xl font-bold text-blue-900">{tbData.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-semibold uppercase">Total Debit</p>
                  <p className="text-base font-bold text-green-900">{fmtCur(tbTotD)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-orange-600 font-semibold uppercase">Total Kredit</p>
                  <p className="text-base font-bold text-orange-900">{fmtCur(tbTotC)}</p>
                </div>
                <div className={`border rounded-lg p-4 ${tbDiff === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-xs font-semibold uppercase ${tbDiff === 0 ? 'text-green-600' : 'text-red-600'}`}>{tbDiff === 0 ? '✓ Seimbang' : '⚠ Selisih'}</p>
                  <p className={`text-base font-bold ${tbDiff === 0 ? 'text-green-900' : 'text-red-900'}`}>{fmtCur(tbDiff)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Neraca Saldo</h2>
                <span className="text-sm text-gray-500">{tbData.length} akun</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Akun</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-44">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-44">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tbData.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Tidak ada data</td></tr>
                    ) : tbData.map(e => (
                      <tr key={e.account} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-900">{e.account_name}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-900">{e.debit > 0 ? fmtCur(e.debit) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-900">{e.credit > 0 ? fmtCur(e.credit) : <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  {tbData.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-400">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">JUMLAH</td>
                        <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-gray-900">{fmtCur(tbTotD)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right tabular-nums text-gray-900">{fmtCur(tbTotC)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ── NERACA ── */}
          {!loading && activeTab === 'balance-sheet' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Akun</p>
                  <p className="text-2xl font-bold text-blue-900">{bsData.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-semibold uppercase">Total Aktiva</p>
                  <p className="text-base font-bold text-green-900">{fmtCur(bsAssets)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-orange-600 font-semibold uppercase">Total Kewajiban</p>
                  <p className="text-base font-bold text-orange-900">{fmtCur(bsLiab)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-xs text-purple-600 font-semibold uppercase">Total Ekuitas</p>
                  <p className="text-base font-bold text-purple-900">{fmtCur(bsEquity)}</p>
                </div>
              </div>

              {bsData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Tidak ada data</div>
              ) : (
                <div className="space-y-6">
                  {/* AKTIVA */}
                  <div>
                    <div className="bg-blue-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">AKTIVA</div>
                    <div className="border border-blue-200 rounded-b-lg overflow-hidden">
                      {Object.entries(groupBySubCat(bsGrouped['Asset'] || [])).map(([cat, rows]) => (
                        <div key={cat}>
                          <div className="bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 uppercase border-b border-blue-100">{cat}</div>
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-100">
                              {rows.map(e => (
                                <tr key={e.account} className="hover:bg-gray-50">
                                  <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                  <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(e.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                              <tr>
                                <td className="px-6 py-2 text-xs font-semibold text-gray-600">Jumlah {cat}</td>
                                <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums text-gray-900 w-44">
                                  {fmtCur(rows.reduce((s, e) => s + e.balance, 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ))}
                      <div className="bg-blue-700 text-white px-4 py-2 flex justify-between text-sm font-bold">
                        <span>JUMLAH AKTIVA</span>
                        <span className="tabular-nums">{fmtCur(bsAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KEWAJIBAN */}
                  <div>
                    <div className="bg-orange-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">KEWAJIBAN</div>
                    <div className="border border-orange-200 rounded-b-lg overflow-hidden">
                      {Object.entries(groupBySubCat(bsGrouped['Liability'] || [])).map(([cat, rows]) => (
                        <div key={cat}>
                          <div className="bg-orange-50 px-4 py-1.5 text-xs font-semibold text-orange-700 uppercase border-b border-orange-100">{cat}</div>
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-100">
                              {rows.map(e => (
                                <tr key={e.account} className="hover:bg-gray-50">
                                  <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                  <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(Math.abs(e.balance))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                              <tr>
                                <td className="px-6 py-2 text-xs font-semibold text-gray-600">Jumlah {cat}</td>
                                <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums text-gray-900 w-44">
                                  {fmtCur(rows.reduce((s, e) => s + Math.abs(e.balance), 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ))}
                      <div className="bg-orange-100 px-4 py-2 flex justify-between text-sm font-bold text-orange-900 border-t border-orange-200">
                        <span>JUMLAH KEWAJIBAN</span>
                        <span className="tabular-nums">{fmtCur(bsLiab)}</span>
                      </div>
                    </div>
                  </div>

                  {/* EKUITAS */}
                  <div>
                    <div className="bg-purple-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">EKUITAS</div>
                    <div className="border border-purple-200 rounded-b-lg overflow-hidden">
                      {Object.entries(groupBySubCat(bsGrouped['Equity'] || [])).map(([cat, rows]) => (
                        <div key={cat}>
                          <div className="bg-purple-50 px-4 py-1.5 text-xs font-semibold text-purple-700 uppercase border-b border-purple-100">{cat}</div>
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-100">
                              {rows.map(e => (
                                <tr key={e.account} className="hover:bg-gray-50">
                                  <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                  <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(Math.abs(e.balance))}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-200">
                              <tr>
                                <td className="px-6 py-2 text-xs font-semibold text-gray-600">Jumlah {cat}</td>
                                <td className="px-4 py-2 text-sm font-semibold text-right tabular-nums text-gray-900 w-44">
                                  {fmtCur(rows.reduce((s, e) => s + Math.abs(e.balance), 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ))}
                      <div className="bg-purple-100 px-4 py-2 flex justify-between text-sm font-bold text-purple-900 border-t border-purple-200">
                        <span>JUMLAH EKUITAS</span>
                        <span className="tabular-nums">{fmtCur(bsEquity)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TOTAL KEWAJIBAN + EKUITAS */}
                  <div className={`flex justify-between px-4 py-3 rounded-lg text-sm font-bold ${Math.abs(bsAssets - (bsLiab + bsEquity)) < 2 ? 'bg-green-700 text-white' : 'bg-red-600 text-white'}`}>
                    <span>JUMLAH KEWAJIBAN &amp; EKUITAS</span>
                    <span className="tabular-nums">{fmtCur(bsLiab + bsEquity)}</span>
                  </div>
                  {Math.abs(bsAssets - (bsLiab + bsEquity)) > 1 && (
                    <div className="text-red-600 text-xs text-center">
                      ⚠ Neraca tidak seimbang — selisih: {fmtCur(Math.abs(bsAssets - (bsLiab + bsEquity)))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── LABA RUGI ── */}
          {!loading && activeTab === 'profit-loss' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Akun</p>
                  <p className="text-2xl font-bold text-blue-900">{plData.length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-semibold uppercase">Total Pendapatan</p>
                  <p className="text-base font-bold text-green-900">{fmtCur(plIncome)}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-orange-600 font-semibold uppercase">Total Beban</p>
                  <p className="text-base font-bold text-orange-900">{fmtCur(plHPP + plOpex)}</p>
                </div>
                <div className={`border rounded-lg p-4 ${plNet >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-xs font-semibold uppercase ${plNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{plNet >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</p>
                  <p className={`text-base font-bold ${plNet >= 0 ? 'text-green-900' : 'text-red-900'}`}>{fmtCur(plNet)}</p>
                </div>
              </div>

              {plData.length === 0 ? (
                <div className="text-center py-8 text-gray-400">Tidak ada data</div>
              ) : (
                <div className="space-y-4">
                  {/* PENDAPATAN */}
                  <div>
                    <div className="bg-green-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">PENDAPATAN</div>
                    <div className="border border-green-200 rounded-b-lg overflow-hidden">
                      {Object.entries(groupBySubCat(plGrouped['Income'] || [])).map(([cat, rows]) => (
                        <div key={cat}>
                          <div className="bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-700 uppercase border-b border-green-100">{cat}</div>
                          <table className="min-w-full">
                            <tbody className="divide-y divide-gray-100">
                              {rows.map(e => (
                                <tr key={e.account} className="hover:bg-gray-50">
                                  <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                  <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(e.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                      <div className="bg-green-100 px-4 py-2 flex justify-between text-sm font-bold text-green-900 border-t border-green-200">
                        <span>JUMLAH PENDAPATAN</span>
                        <span className="tabular-nums">{fmtCur(plIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* HPP */}
                  {(plGrouped['Expense'] || []).filter(e => e.account_type === 'Cost of Goods Sold').length > 0 && (
                    <div>
                      <div className="bg-yellow-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">HARGA POKOK PENJUALAN</div>
                      <div className="border border-yellow-200 rounded-b-lg overflow-hidden">
                        {Object.entries(groupBySubCat((plGrouped['Expense'] || []).filter(e => e.account_type === 'Cost of Goods Sold'))).map(([cat, rows]) => (
                          <div key={cat}>
                            <table className="min-w-full">
                              <tbody className="divide-y divide-gray-100">
                                {rows.map(e => (
                                  <tr key={e.account} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                    <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(e.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                        <div className="bg-yellow-100 px-4 py-2 flex justify-between text-sm font-bold text-yellow-900 border-t border-yellow-200">
                          <span>JUMLAH HPP</span>
                          <span className="tabular-nums">{fmtCur(plHPP)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LABA KOTOR */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex justify-between text-sm font-bold text-blue-900">
                    <span>LABA KOTOR</span>
                    <span className="tabular-nums">{fmtCur(plGross)}</span>
                  </div>

                  {/* BEBAN OPERASIONAL */}
                  {(plGrouped['Expense'] || []).filter(e => e.account_type !== 'Cost of Goods Sold').length > 0 && (
                    <div>
                      <div className="bg-red-700 text-white px-4 py-2 rounded-t-lg text-sm font-bold uppercase tracking-wider">BEBAN OPERASIONAL</div>
                      <div className="border border-red-200 rounded-b-lg overflow-hidden">
                        {Object.entries(groupBySubCat((plGrouped['Expense'] || []).filter(e => e.account_type !== 'Cost of Goods Sold'))).map(([cat, rows]) => (
                          <div key={cat}>
                            <div className="bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 uppercase border-b border-red-100">{cat}</div>
                            <table className="min-w-full">
                              <tbody className="divide-y divide-gray-100">
                                {rows.map(e => (
                                  <tr key={e.account} className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-sm text-gray-800">{e.account_name}</td>
                                    <td className="px-4 py-2 text-sm text-right tabular-nums text-gray-900 w-44">{fmtCur(e.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                        <div className="bg-red-100 px-4 py-2 flex justify-between text-sm font-bold text-red-900 border-t border-red-200">
                          <span>JUMLAH BEBAN OPERASIONAL</span>
                          <span className="tabular-nums">{fmtCur(plOpex)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LABA/RUGI BERSIH */}
                  <div className={`flex justify-between px-4 py-3 rounded-lg text-sm font-bold ${plNet >= 0 ? 'bg-green-700 text-white' : 'bg-red-600 text-white'}`}>
                    <span>{plNet >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</span>
                    <span className="tabular-nums">{fmtCur(plNet)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
