'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../app/components/LoadingSpinner';
import Pagination from '../app/components/Pagination';

interface CommissionData {
  summary: {
    total_sales: number;
    total_paid: number;
    potential_commission: number;
    earned_commission: number;
    credit_note_adjustments: number;
    net_earned_commission: number;
    commission_rate: number;
  };
  sales_orders: Record<string, unknown>[];
  paid_invoices: Array<{
    name: string;
    base_grand_total: number;
    posting_date: string;
    status: string;
    custom_total_komisi_sales: number;
    credit_note_adjustment: number;
    credit_notes: Record<string, unknown>[];
    net_commission: number;
    has_commission_payment: boolean;
    has_post_payment_credit_note: boolean;
    commission_payments: Array<{
      payment_name: string;
      payment_date: string;
    }>;
  }>;
}

export default function CommissionDashboard() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesPerson, setSalesPerson] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

  const fetchCommissionData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sales_person: salesPerson,
        // Add pagination parameters
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });
      
      const response = await fetch(`/api/commission?${params}`);
      const result = await response.json();
      
      if (!result.error) {
        setData(result);
        
        // Update pagination info from API response
        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          const calculatedTotalPages = Math.ceil(result.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          // Fallback: calculate from received data
          const totalItems = (result.sales_orders?.length || 0) + (result.paid_invoices?.length || 0);
          setTotalRecords(totalItems);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    } finally {
      setLoading(false);
    }
  }, [salesPerson, currentPage, pageSize]);

  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);

  if (loading) {
    return <LoadingSpinner message="Loading Commission Dashboard..." />;
  }

  if (!data) {
    return <div className="p-6">Failed to load commission data</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Commission Dashboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sales Person:</label>
          <input
            type="text"
            value={salesPerson}
            onChange={(e) => setSalesPerson(e.target.value)}
            className="px-3 py-1 border rounded"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
          <p className="text-2xl font-bold text-blue-600">
            Rp {data.summary.total_sales.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Total Paid</h3>
          <p className="text-2xl font-bold text-green-600">
            Rp {data.summary.total_paid.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Potential Commission</h3>
          <p className="text-2xl font-bold text-yellow-600">
            Rp {data.summary.potential_commission.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Earned Commission</h3>
          <p className="text-2xl font-bold text-purple-600">
            Rp {data.summary.earned_commission.toLocaleString()}
          </p>
          {data.summary.credit_note_adjustments > 0 && (
            <p className="text-xs text-red-600 mt-1">
              - Rp {data.summary.credit_note_adjustments.toLocaleString()} (CN)
            </p>
          )}
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600">Net Commission</h3>
          <p className="text-2xl font-bold text-indigo-600">
            Rp {data.summary.net_earned_commission.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">After CN adjustments</p>
        </div>
      </div>

      {/* Commission Rate Info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-sm">
          <span className="font-medium">Commission Rate:</span> {data.summary.commission_rate}%
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Komisi akan dibayarkan setelah Sales Invoice berstatus &quot;Paid&quot;
        </p>
      </div>

      {/* Recent Sales Orders */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Sales Orders</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SO #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.sales_orders.slice(0, 10).map((so: Record<string, unknown>, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{so.name as string}</td>
                    <td className="px-4 py-2 text-sm">{so.transaction_date as string}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      Rp {Number(so.base_grand_total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Paid Invoices</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">CN Adj.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Comm.</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.paid_invoices.map((inv: Record<string, unknown>, index: number) => (
                  <tr 
                    key={index} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedInvoice(inv.name as string === selectedInvoice ? null : inv.name as string)}
                  >
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {inv.name as string}
                        {(inv.has_post_payment_credit_note as boolean) && (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                            title="Credit Note dibuat setelah komisi dibayar"
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">{inv.posting_date as string}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      Rp {Number(inv.base_grand_total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-indigo-600 font-bold">
                      Rp {Number(inv.net_commission || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credit Note Detail View */}
      {selectedInvoice && (
        <div className="mt-6">
          {(() => {
            const invoice = data.paid_invoices.find((inv: Record<string, unknown>) => inv.name === selectedInvoice);
            if (!invoice || !invoice.credit_notes || (invoice.credit_notes as unknown[]).length === 0) return null;

            return (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Credit Notes untuk Invoice: {selectedInvoice}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Total {(invoice.credit_notes as unknown[]).length} Credit Note(s) mempengaruhi komisi invoice ini
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Warning for post-payment credit notes */}
                {invoice.has_post_payment_credit_note && (
                  <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Peringatan: Credit Note Setelah Pembayaran Komisi
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Satu atau lebih Credit Note dibuat setelah komisi untuk invoice ini sudah dibayarkan.
                            Ini berarti ada penyesuaian komisi yang perlu diperhitungkan dalam pembayaran komisi berikutnya.
                          </p>
                          {invoice.commission_payments && (invoice.commission_payments as unknown[]).length > 0 && (
                            <p className="mt-2">
                              <strong>Pembayaran Komisi:</strong>{' '}
                              {(invoice.commission_payments as Record<string, unknown>[]).map((p: Record<string, unknown>, i: number) => (
                                <span key={i}>
                                  {p.payment_name as string} ({p.payment_date as string})
                                  {i < (invoice.commission_payments as unknown[]).length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CN #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Grand Total</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Potongan Komisi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(invoice.credit_notes as Record<string, unknown>[]).map((cn: Record<string, unknown>, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{cn.name as string}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{cn.posting_date as string}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            Rp {Number(cn.grand_total || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                            - Rp {Number(cn.custom_komisi_sales_amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Pagination Controls */}
      <div className="mt-6">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
