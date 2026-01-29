'use client';

import React, { useState, useEffect } from 'react';
import ItemDialog from '../app/components/ItemDialog';

interface CartItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  warehouse?: string;
  item_name?: string;
}

interface StockInfo {
  warehouse: string;
  available: number;
  actual: number;
  reserved: number;
}

interface SalesOrderFormProps {
  onOrderCreated?: () => void;
}

export default function SalesOrderForm({ onOrderCreated }: SalesOrderFormProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [salesPerson, setSalesPerson] = useState('Deden');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [setWarehouse, setSetWarehouse] = useState(''); // Header warehouse field
  const [loading, setLoading] = useState(false);
  const [stockInfo, setStockInfo] = useState<{ [key: string]: StockInfo[] }>({});
  const [availableWarehouses, setAvailableWarehouses] = useState<string[]>([]);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Fetch available warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch(`${process.env.ERP_URL}/api/resource/Warehouse?fields=["name"]`, {
          headers: {
            'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}`,
          },
        });
        const result = await response.json();
        if (!result.error) {
          setAvailableWarehouses(result.data.map((wh: any) => wh.name));
        }
      } catch (error) {
        console.error('Failed to fetch warehouses:', error);
      }
    };
    fetchWarehouses();
  }, []);

  // Auto-update all item warehouses when set_warehouse changes
  useEffect(() => {
    if (setWarehouse) {
      setCartItems(prev => prev.map(item => ({ 
        ...item, 
        warehouse: item.warehouse || setWarehouse 
      })));
    }
  }, [setWarehouse]);

  // Check stock untuk setiap item di cart
  const checkStock = async (sku: string) => {
    try {
      const res = await fetch(`/api/stock-check?item_code=${sku}`);
      const data = await res.json();
      
      if (!data.error) {
        setStockInfo(prev => ({ ...prev, [sku]: data }));
        
        // Auto-select warehouse dengan stok terbanyak
        if (data.length > 0 && !setWarehouse) {
          const bestWh = data.reduce((prev: StockInfo, current: StockInfo) => 
            (prev.available > current.available) ? prev : current
          );
          
          setCartItems(prev => prev.map(item => 
            item.sku === sku ? { ...item, warehouse: bestWh.warehouse } : item
          ));
        }
      }
    } catch (error) {
      console.error('Stock check failed:', error);
    }
  };

  // Handle item selection from dialog
  const handleItemSelect = (item: any) => {
    if (editingItemIndex !== null) {
      // Update existing item
      const newItems = [...cartItems];
      newItems[editingItemIndex] = {
        ...newItems[editingItemIndex],
        sku: item.item_code,
        name: item.item_name,
        price: parseFloat(item.formatted_price?.replace(/[^0-9.]/g, '') || '0')
      };
      setCartItems(newItems);
      checkStock(item.item_code);
    } else {
      // Add new item
      const newItem: CartItem = {
        sku: item.item_code,
        name: item.item_name,
        quantity: 1,
        price: parseFloat(item.formatted_price?.replace(/[^0-9.]/g, '') || '0'),
        warehouse: setWarehouse
      };
      setCartItems(prev => [...prev, newItem]);
      checkStock(item.item_code);
    }
    setEditingItemIndex(null);
  };

  // Open dialog for selecting item
  const openItemDialog = (itemIndex?: number) => {
    setEditingItemIndex(itemIndex ?? null);
    setIsItemDialogOpen(true);
  };

  // Add item ke cart
  const addToCart = () => {
    openItemDialog(); // Open dialog instead of adding empty item
  };

  // Submit Sales Order
  const submitOrder = async () => {
    if (!customerName || cartItems.length === 0) {
      alert('Mohon lengkapi data pesanan');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: customerName,
          cart_items: cartItems.map(item => ({
            ...item,
            warehouse: item.warehouse || setWarehouse // Ensure every item has warehouse
          })),
          sales_name: salesPerson,
          requested_delivery_date: deliveryDate
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Sales Order berhasil dibuat!');
        setCartItems([]);
        setCustomerName('');
        if (onOrderCreated) {
          onOrderCreated();
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan saat membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Order Form</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Customer</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Nama Customer"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Sales Person</label>
          <input
            type="text"
            value={salesPerson}
            onChange={(e) => setSalesPerson(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Delivery Date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Set Warehouse (Default for all items)</label>
          <select
            value={setWarehouse}
            onChange={(e) => setSetWarehouse(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Warehouse (Auto-select)</option>
            {availableWarehouses.map((wh) => (
              <option key={wh} value={wh}>{wh}</option>
            ))}
          </select>
          {setWarehouse && (
            <p className="text-xs text-gray-500 mt-1">
              All items will use {setWarehouse} unless manually changed
            </p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Cart Items</h2>
        
        {cartItems.map((item, index) => (
          <div key={index} className="border p-4 mb-4 rounded">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.sku}
                    readOnly
                    onClick={() => openItemDialog(index)}
                    className="w-full p-2 border rounded cursor-pointer hover:bg-gray-50"
                    placeholder="Click to select item"
                  />
                  <button
                    onClick={() => openItemDialog(index)}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    📦
                  </button>
                </div>
                {item.item_name && (
                  <div className="text-xs text-gray-600 mt-1">{item.item_name}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newItems = [...cartItems];
                    newItems[index].quantity = parseInt(e.target.value) || 0;
                    setCartItems(newItems);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => {
                    const newItems = [...cartItems];
                    newItems[index].price = parseFloat(e.target.value) || 0;
                    setCartItems(newItems);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Warehouse</label>
                <select
                  value={item.warehouse || ''}
                  onChange={(e) => {
                    const newItems = [...cartItems];
                    newItems[index].warehouse = e.target.value;
                    setCartItems(newItems);
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Auto from header</option>
                  {availableWarehouses.map((wh) => (
                    <option key={wh} value={wh}>{wh}</option>
                  ))}
                </select>
                {setWarehouse && !item.warehouse && (
                  <p className="text-xs text-gray-500 mt-1">Default: {setWarehouse}</p>
                )}
              </div>
            </div>
            
            {/* Stock Info Display */}
            {stockInfo[item.sku] && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <h4 className="font-medium mb-2">Available Stock:</h4>
                {stockInfo[item.sku].map((stock, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{stock.warehouse}</span>
                    <span className={stock.available > 0 ? 'text-green-600' : 'text-red-600'}>
                      {stock.available} available
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {item.warehouse && (
              <div className="mt-2 text-sm text-blue-600">
                Selected Warehouse: {item.warehouse}
              </div>
            )}
          </div>
        ))}
        
        <button
          onClick={addToCart}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Item
        </button>
      </div>

      {/* Item Dialog */}
      <ItemDialog
        isOpen={isItemDialogOpen}
        onClose={() => {
          setIsItemDialogOpen(false);
          setEditingItemIndex(null);
        }}
        onSelect={handleItemSelect}
        showStock={true}
      />

      <button
        onClick={submitOrder}
        disabled={loading}
        className="w-full px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Processing...' : 'Submit Sales Order'}
      </button>
    </div>
  );
}
