'use client';

import { useState, useEffect, useCallback } from 'react';

interface SalesOrder {
  name: string;
  customer: string;
  customer_name: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  docstatus: number;
  delivery_date: string;
  items?: Array<{
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
}

interface SalesOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (salesOrder: SalesOrder) => void;
  selectedCompany: string;
  customerFilter?: string;
}

export default function SalesOrderDialog({ isOpen, onClose, onSelect, selectedCompany, customerFilter }: SalesOrderDialogProps) {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchSalesOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const fetchTime = Date.now();
    setLastFetchTime(fetchTime);
    console.log('Sales Order Dialog - Fetching available sales orders for company:', selectedCompany, 'at:', new Date(fetchTime).toISOString());
    
    try {
      // Try the new API first, fallback to simple API if it fails
      let url = '';
      let useAdvancedAPI = true;
      
      try {
        // Use new API that filters out sales orders with existing delivery notes
        const params = new URLSearchParams({
          company: selectedCompany,
          _t: fetchTime.toString() // Add timestamp to prevent caching
        });
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        url = `/api/sales-order-available?${params}`;
        console.log('Sales Order Dialog - Trying Advanced API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // Important: include cookies for authentication
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
        });
        
        console.log('Sales Order Dialog - Advanced API Response Status:', response.status);
        
        if (!response.ok) {
          let errorData: any = {};
          try {
            // Check if response has text method
            if (typeof response.text === 'function') {
              const responseText = await response.text();
              
              // Use console.log instead of console.error to avoid issues
              console.log('Sales Order Dialog - Advanced API Raw Response Text:', responseText);
              
              try {
                errorData = JSON.parse(responseText);
              } catch (jsonParseError) {
                console.log('Sales Order Dialog - Failed to parse error JSON:', jsonParseError);
                errorData = { 
                  message: response.statusText,
                  rawResponse: responseText.substring(0, 200) + '...' // Truncate for logging
                };
              }
            } else {
              // Fallback if response.text is not available
              console.log('Sales Order Dialog - Response.text() not available, using status');
              errorData = { 
                message: response.statusText,
                status: response.status
              };
            }
          } catch (textError) {
            console.log('Sales Order Dialog - Failed to read response text:', textError);
            errorData = { message: response.statusText };
          }
          
          console.log('Sales Order Dialog - Advanced API Error:', errorData);
          throw new Error(`Advanced API failed: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sales Order Dialog - Advanced API Success:', data);
        
        if (data.success) {
          const orders = data.data || [];
          console.log('Sales Order Dialog - Available orders loaded from Advanced API:', orders.length);
          setSalesOrders(orders);
          return; // Success, exit early
        }
        
      } catch (advancedError) {
        console.warn('Sales Order Dialog - Advanced API failed, falling back to Simple API:', advancedError);
        useAdvancedAPI = false;
      }
      
      // Fallback to Simple API
      const params = new URLSearchParams({
        company: selectedCompany,
        _t: fetchTime.toString()
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      url = `/api/sales-order-simple?${params}`;
      console.log('Sales Order Dialog - Using Simple API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      console.log('Sales Order Dialog - Simple API Response Status:', response.status);
      
      let data;
      try {
        // Check if response has text method
        if (typeof response.text === 'function') {
          const responseText = await response.text();
          console.log('Sales Order Dialog - Simple API Raw Response Text:', responseText);
          
          try {
            data = JSON.parse(responseText);
          } catch (jsonParseError) {
            console.log('Sales Order Dialog - Failed to parse Simple API JSON:', jsonParseError);
            throw new Error(`Failed to parse API response: ${responseText.substring(0, 100)}...`);
          }
        } else {
          // Fallback if response.text is not available
          console.log('Sales Order Dialog - Response.text() not available for Simple API');
          throw new Error(`Failed to read API response: ${response.statusText}`);
        }
      } catch (textError) {
        console.log('Sales Order Dialog - Failed to read Simple API response text:', textError);
        throw new Error(`Failed to read API response: ${response.statusText}`);
      }
      
      console.log('Sales Order Dialog - Simple API Parsed Response:', data);
      
      if (response.ok && data.success) {
        let orders = data.data || [];
        console.log('Sales Order Dialog - Orders loaded from Simple API:', orders.length);
        console.log('Sales Order Dialog - Orders data:', orders);
        
        // Client-side filtering: Get existing delivery notes and filter out SOs that have them
        try {
          console.log('Sales Order Dialog - Performing client-side filtering...');
          
          // Get delivery notes for this company using the working API
          const dnParams = new URLSearchParams({
            company: selectedCompany
          });
          
          const dnResponse = await fetch(`/api/get-dn-with-so-references?${dnParams}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (dnResponse.ok) {
            let dnData;
            try {
              const dnResponseText = await dnResponse.text();
              console.log('Client filter: Debug All DN Raw Response:', dnResponseText);
              
              try {
                dnData = JSON.parse(dnResponseText);
              } catch (dnJsonError) {
                console.log('Client filter: Failed to parse Debug All DN JSON:', dnJsonError);
                throw new Error(`Failed to parse debug response: ${dnResponseText.substring(0, 100)}...`);
              }
            } catch (dnTextError) {
              console.log('Client filter: Failed to read Debug All DN response text:', dnTextError);
              throw new Error(`Failed to read debug response: ${dnResponse.statusText}`);
            }
            
            console.log('Client filter: Debug All DN Parsed Response:', dnData);
            
            // Extract SO references from the new API response
            const soReferences = new Set();
            
            if (dnData.success && dnData.so_references && Array.isArray(dnData.so_references)) {
              dnData.so_references.forEach((soRef: string) => {
                soReferences.add(soRef);
                console.log(`Client filter: Found SO reference: ${soRef}`);
              });
            }
            
            // Filter out SOs that have delivery notes
            const originalCount = orders.length;
            orders = orders.filter((so: any) => {
              const hasDN = soReferences.has(so.name);
              if (hasDN) {
                console.log(`Filtering out SO ${so.name} - already has DN`);
              }
              return !hasDN;
            });
            
            console.log(`Sales Order Dialog - Filtering complete: ${originalCount} -> ${orders.length} SOs`);
            console.log('Sales Order Dialog - SOs with existing DN:', Array.from(soReferences));
            
          } else {
            console.log('Client filter: Debug All DN API Error:', dnResponse.status, dnResponse.statusText);
            // If DN fetch fails, show all SOs but log the error
            console.log('Sales Order Dialog - DN fetch failed, showing all SOs');
          }
        } catch (filterError) {
          console.log('Sales Order Dialog - Filtering failed, showing all SOs:', filterError);
          // If filtering fails, show all SOs
        }
        
        setSalesOrders(orders);
        
        if (orders.length > 0) {
          console.log('Sales Order Dialog - Final Order Details:');
          orders.forEach((order: any, index: number) => {
            console.log(`  ${index + 1}. ${order.name} - Status: ${order.status}, Docstatus: ${order.docstatus} - ${order.customer}`);
          });
        } else {
          console.log('Sales Order Dialog - No available orders found after filtering');
        }
      } else {
        console.log('Sales Order Dialog - Simple API Error:', data);
        setError(data.message || 'Failed to fetch sales orders');
      }
      
    } catch (error) {
      console.log('Sales Order Dialog - Fetch Error:', error);
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, searchTerm, customerFilter]);

  useEffect(() => {
    if (isOpen && selectedCompany) {
      console.log('Sales Order Dialog - Opening with company:', selectedCompany);
      // Clear previous data before fetching
      setSalesOrders([]);
      setError('');
      fetchSalesOrders();
    }
  }, [isOpen, selectedCompany, fetchSalesOrders]);

  // Reset sales orders when dialog closes
  useEffect(() => {
    if (!isOpen) {
      console.log('Sales Order Dialog - Closing, resetting state');
      setSalesOrders([]);
      setError('');
      setSelectedOrder(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOrders = salesOrders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = !customerFilter || 
      order.customer === customerFilter;
    
    return matchesSearch && matchesCustomer;
  });

  const handleSelect = () => {
    if (selectedOrder) {
      onSelect(selectedOrder);
      onClose();
      setSelectedOrder(null);
      setSearchTerm('');
    }
  };

  const handleOrderClick = (order: SalesOrder) => {
    setSelectedOrder(order);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Select Sales Order</h3>
          <p className="mt-1 text-sm text-gray-500">Choose a sales order to create delivery note (only showing orders without existing delivery notes)</p>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search by order name or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Sales Orders List */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg">Loading sales orders...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Error: {error}</p>
              <button
                onClick={fetchSalesOrders}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'No sales orders found matching your search' 
                  : 'No sales orders available for delivery note creation'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-gray-400 mt-2">
                  All submitted sales orders may already have delivery notes, or there are no sales orders with &quot;To Deliver and Bill&quot; status.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div
                  key={order.name}
                  onClick={() => handleOrderClick(order)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedOrder?.name === order.name ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-indigo-600">{order.name}</p>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'To Deliver and Bill'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'Completed'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.docstatus === 1
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.docstatus === 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.docstatus === 1 ? 'Submitted' : order.docstatus === 0 ? 'Draft' : 'Unknown'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">Customer: {order.customer_name}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Date: {order.transaction_date}</span>
                        <span>Delivery Date: {order.delivery_date}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {order.grand_total ? order.grand_total.toLocaleString('id-ID', {
                          style: 'currency',
                          currency: 'IDR'
                        }) : 'Rp 0,00'}
                      </p>
                      {order.items && (
                        <p className="text-xs text-gray-500">{order.items.length} items</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedOrder ? (
                <span>Selected: <strong>{selectedOrder.name}</strong> - {selectedOrder.customer_name}</span>
              ) : (
                <span>No order selected</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={!selectedOrder}
                className={`px-4 py-2 rounded-md ${
                  selectedOrder
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Delivery Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
