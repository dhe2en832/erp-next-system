'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Invoice {
  name: string;
  customer: string;
  posting_date: string;
  grand_total: number;
  status: string;
  due_date: string;
  outstanding_amount: number;
  delivery_note: string;
}

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
}

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    customer: '',
    posting_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    delivery_note: '',
    items: [{ 
      item_code: '', 
      item_name: '', 
      qty: 1, 
      rate: 0, 
      amount: 0,
      income_account: 'Sales - ST' 
    }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      customer: '',
      posting_date: new Date().toISOString().split('T')[0],
      due_date: new Date().toISOString().split('T')[0],
      delivery_note: '',
      items: [{ 
        item_code: '', 
        item_name: '', 
        qty: 1, 
        rate: 0, 
        amount: 0,
        income_account: 'Sales - ST' 
      }],
    });
    setEditingInvoice(null);
    setEditingInvoiceStatus(null);
    setError('');
  };

  useEffect(() => {
    // Try to get company from localStorage first, then from cookie
    let savedCompany = localStorage.getItem('selected_company');
    
    if (!savedCompany) {
      // Fallback to cookie if localStorage is empty
      const cookies = document.cookie.split(';');
      const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
      if (companyCookie) {
        savedCompany = companyCookie.split('=')[1];
        // Store in localStorage for future use
        if (savedCompany) {
          localStorage.setItem('selected_company', savedCompany);
        }
      }
    }
    
    if (savedCompany) {
      setSelectedCompany(savedCompany);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [dateFilter]); // Remove selectedCompany from dependencies

  const fetchInvoices = async () => {
    // Clear previous error when starting to fetch
    setError('');
    
    // Check for company selection with better logic
    let companyToUse = selectedCompany;
    
    // If no company in state, try to get it fresh
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      } else {
        const cookies = document.cookie.split(';');
        const companyCookie = cookies.find(cookie => cookie.trim().startsWith('selected_company='));
        if (companyCookie) {
          const cookieValue = companyCookie.split('=')[1];
          if (cookieValue) {
            companyToUse = cookieValue;
          }
        }
      }
    }
    
    if (!companyToUse) {
      setError('No company selected. Please select a company first.');
      setLoading(false);
      return;
    }
    
    // Update state if we found company from storage
    if (!selectedCompany && companyToUse) {
      setSelectedCompany(companyToUse);
    }
    
    try {
      // Test simple request dulu untuk debugging
      console.log('Testing Sales Invoice simple request...');
      const response = await fetch("/api/invoice-simple");
      const data = await response.json();
      
      console.log('Invoice Simple Test Response:', data);
      
      if (data.success) {
        console.log('Invoice data received:', data.data);
        if (data.data && data.data.length > 0) {
          console.log('First invoice structure:', data.data[0]);
          console.log('Available fields:', Object.keys(data.data[0]));
        }
        setInvoices(data.data || []);
        setError('');
      } else {
        setError('Simple test failed: ' + data.message);
      }
    } catch (err) {
      setError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { 
          item_code: '', 
          item_name: '', 
          qty: 1, 
          rate: 0, 
          amount: 0,
          income_account: 'Sales - ST' 
        },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: string, value: unknown) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleEditInvoice = async (invoiceName: string, invoiceStatus?: string) => {
    if (!invoiceName || invoiceName === 'undefined') {
      console.error('Invalid invoice name:', invoiceName);
      return;
    }

    try {
      console.log('Fetching invoice details for:', invoiceName);
      const response = await fetch("/api/get-invoice", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceName }),
      });
      const data = await response.json();

      console.log('Invoice Detail Response:', data);

      if (data.success) {
        const invoice = data.data;
        setFormData({
          customer: invoice.customer,
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          delivery_note: invoice.delivery_note || '',
          items: invoice.items || [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, income_account: 'Sales - ST' }],
        });
        setEditingInvoice(invoiceName);
        setEditingInvoiceStatus(invoiceStatus || 'Draft');
        setShowForm(true);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch invoice details');
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      setError('Failed to fetch invoice details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      const invoicePayload = {
        company: selectedCompany,
        customer: formData.customer,
        posting_date: formData.posting_date,
        due_date: formData.due_date,
        items: formData.items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          income_account: item.income_account,
        })),
      };

      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoicePayload),
      });

      const data = await response.json();

      if (data.success) {
        setShowForm(false);
        setFormData({
          customer: '',
          posting_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          delivery_note: '',
          items: [{ 
            item_code: '', 
            item_name: '', 
            qty: 1, 
            rate: 0, 
            amount: 0,
            income_account: 'Sales - ST' 
          }],
        });
        fetchInvoices();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Invoices</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          New Invoice
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.to_date}
              onChange={(e) => setDateFilter({ ...dateFilter, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateFilter({ from_date: '', to_date: '' })}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">New Sales Invoice</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.customer}
                    onChange={(e) =>
                      setFormData({ ...formData, customer: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Posting Date
                  </label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.posting_date}
                    onChange={(e) =>
                      setFormData({ ...formData, posting_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Note (Optional)
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.delivery_note}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_note: e.target.value })
                    }
                    placeholder="DN-XXXX"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                  >
                    Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                    <div className="grid grid-cols-6 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Item Code
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.item_code}
                          onChange={(e) =>
                            handleItemChange(index, 'item_code', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Item Name
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemChange(index, 'item_name', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Rate
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Amount
                        </label>
                        <input
                          type="number"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.amount}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Income Account
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={item.income_account}
                          onChange={(e) =>
                            handleItemChange(index, 'income_account', e.target.value)
                          }
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="mt-2 text-red-600 text-sm hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || editingInvoiceStatus === 'Paid'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {formLoading ? 'Creating...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <li 
              key={invoice.name}
              onClick={() => {
                if (invoice.name) {
                  handleEditInvoice(invoice.name, invoice.status);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {invoice.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">Customer: {invoice.customer}</p>
                    <p className="mt-1 text-sm text-gray-500">Delivery Note: {invoice.delivery_note || '-'}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : invoice.status === 'Paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Date: {invoice.posting_date}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Due: {invoice.due_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <span className="font-medium">Total: ${invoice.grand_total ? invoice.grand_total.toFixed(2) : '0.00'}</span>
                    <span className="ml-4 text-red-600">
                      Outstanding: ${invoice.outstanding_amount ? invoice.outstanding_amount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {invoices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found</p>
          </div>
        )}
      </div>
    </div>
  );
}
