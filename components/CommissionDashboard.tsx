'use client';

import React, { useState, useEffect } from 'react';

interface CommissionData {
  summary: {
    total_sales: number;
    total_paid: number;
    potential_commission: number;
    earned_commission: number;
    commission_rate: number;
  };
  sales_orders: any[];
  paid_invoices: any[];
}

export default function CommissionDashboard() {
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesPerson, setSalesPerson] = useState('Deden');

  useEffect(() => {
    fetchCommissionData();
  }, [salesPerson]);

  const fetchCommissionData = async () => {
    try {
      const response = await fetch(`/api/commission?sales_person=${salesPerson}`);
      const result = await response.json();
      
      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading commission data...</div>;
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
      <div className="grid grid-cols-4 gap-4 mb-8">
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
        </div>
      </div>

      {/* Commission Rate Info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-sm">
          <span className="font-medium">Commission Rate:</span> {data.summary.commission_rate}%
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Komisi akan dibayarkan setelah Sales Invoice berstatus "Paid"
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
                {data.sales_orders.slice(0, 10).map((so: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{so.name}</td>
                    <td className="px-4 py-2 text-sm">{so.transaction_date}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      Rp {so.base_grand_total.toLocaleString()}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.paid_invoices.slice(0, 10).map((inv: any, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm">{inv.name}</td>
                    <td className="px-4 py-2 text-sm">{inv.posting_date}</td>
                    <td className="px-4 py-2 text-sm text-right">
                      Rp {inv.base_grand_total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
