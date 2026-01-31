'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CustomerDialog from '../components/CustomerDialog';
import ItemDialog from '../components/ItemDialog';
import SalesPersonDialog from '../components/SalesPersonDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';

interface SalesOrder {
  name: string;
  customer: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  delivery_date: string;
  creation?: string; // Tambahkan creation field
}

interface SalesTeamMember {
  sales_person: string;
  allocated_percentage: number;
}

interface OrderItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  warehouse: string;
  stock_uom: string;
  available_stock: number;
  actual_stock: number;
  reserved_stock: number;
}

export default function SalesOrderPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: '',
  });
  const [nameFilter, setNameFilter] = useState('');
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [currentOrderStatus, setCurrentOrderStatus] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [formData, setFormData] = useState({
    customer: '',
    transaction_date: '',
    delivery_date: '',
    sales_person: '',
    items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 }],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showSalesPersonDialog, setShowSalesPersonDialog] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [salesTeam, setSalesTeam] = useState<SalesTeamMember[]>([]);
  const router = useRouter();
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page

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
    fetchOrders();
  }, [dateFilter, nameFilter, currentPage]); // Add currentPage dependency

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, nameFilter]);

  // Set default dates saat component mount
  useEffect(() => {
    // Gunakan timezone lokal untuk mendapatkan tanggal yang benar
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    const todayString = localDate.toISOString().split('T')[0];
    
    console.log('Setting default dates to:', todayString);
    console.log('Current system date:', today.toISOString());
    console.log('Timezone offset:', offset, 'minutes');
    
    setFormData(prev => ({
      ...prev,
      transaction_date: todayString,
      delivery_date: todayString,
    }));
  }, []); // Run only once on mount

  // Update default dates saat buka form baru
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!editingOrder) { // Hanya update jika tidak sedang edit
      setFormData(prev => ({
        ...prev,
        transaction_date: prev.transaction_date || today,
        delivery_date: prev.delivery_date || today,
      }));
    }
  }, [showForm, editingOrder]); // Trigger saat form dibuka/tutup

  const fetchOrders = async () => {
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
      const params = new URLSearchParams();
      
      // Build filters array for ERPNext - use companyToUse instead of selectedCompany
      const filters = [["company", "=", companyToUse]];
      
      // Default filter untuk hari ini jika tidak ada filter tanggal yang diset
      const today = new Date().toISOString().split('T')[0];
      if (dateFilter.from_date) {
        filters.push(["transaction_date", ">=", dateFilter.from_date]);
      } else {
        // Default: filter dari 30 hari ke belakang untuk lebih user-friendly
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filters.push(["transaction_date", ">=", thirtyDaysAgo.toISOString().split('T')[0]]);
      }
      
      if (dateFilter.to_date) {
        filters.push(["transaction_date", "<=", dateFilter.to_date]);
      } else {
        // Default: filter sampai 7 hari ke depan
        const sevenDaysAhead = new Date();
        sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
        filters.push(["transaction_date", "<=", sevenDaysAhead.toISOString().split('T')[0]]);
      }
      
      if (nameFilter) filters.push(["name", "like", "%" + nameFilter + "%"]);
      
      params.append('filters', JSON.stringify(filters));
      
      // Add pagination parameters
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      
      // params.append('order_by', 'creation desc'); // Comment out dulu jika ada error
      
      const response = await fetch("/api/sales-order?" + params.toString());
      const result = await response.json();
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', result);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (result.success) {
        const ordersData = result.data || [];
        
        // Update pagination info from API response
        if (result.total_records !== undefined) {
          setTotalRecords(result.total_records);
          const calculatedTotalPages = Math.ceil(result.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          // Fallback: calculate from received data
          setTotalRecords(ordersData.length);
          setTotalPages(1);
        }
        
        // Sorting di client side: data baru di atas berdasarkan creation date
        ordersData.sort((a: SalesOrder, b: SalesOrder) => {
          // Gunakan creation date jika ada, fallback ke transaction_date
          const dateA = new Date(a.creation || a.transaction_date || '1970-01-01');
          const dateB = new Date(b.creation || b.transaction_date || '1970-01-01');
          return dateB.getTime() - dateA.getTime(); // Descending (baru ke lama)
        });
        
        if (ordersData.length === 0) {
          setError(`No sales orders found for company: ${companyToUse}`);
        } else {
          setError(''); // Clear error if data is found
        }
        setOrders(ordersData);
      } else {
        setError(result.message || 'Failed to fetch sales orders');
      }
    } catch {
      setError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderName: string, orderStatus?: string) => {
    if (!orderName || orderName === 'undefined') {
      console.error('Invalid order name:', orderName);
      return;
    }
    
    try {
      const response = await fetch("/api/sales-order/" + orderName);
      const data = await response.json();
      
      if (data.success) {
        const order = data.data;
        console.log('Order details loaded:', order);
        console.log('Sales person field:', order.sales_person);
        console.log('Salesperson field (no underscore):', order.salesperson);
        console.log('Owner field:', order.owner);
        console.log('Sales team array:', order.sales_team);
        console.log('All order fields:', Object.keys(order));
        
        setEditingOrder(order);
        setCurrentOrderStatus(orderStatus || order.status || '');
        
        // Coba beberapa kemungkinan field untuk sales person
        // Prioritaskan sales_team array, lalu fallback ke field langsung
        let salesPersonValue = '';
        let loadedSalesTeam: SalesTeamMember[] = [];
        
        if (order.sales_team && Array.isArray(order.sales_team) && order.sales_team.length > 0) {
          // Ambil sales person pertama dari sales_team array
          salesPersonValue = order.sales_team[0].sales_person || '';
          loadedSalesTeam = order.sales_team.map((member: any) => ({
            sales_person: member.sales_person || '',
            allocated_percentage: member.allocated_percentage || 0
          }));
          console.log('Sales person from sales_team:', salesPersonValue);
          console.log('Sales team loaded:', loadedSalesTeam);
        } else {
          // Fallback ke field langsung
          salesPersonValue = order.sales_person || order.salesperson || order.owner || '';
          if (salesPersonValue) {
            loadedSalesTeam = [{
              sales_person: salesPersonValue,
              allocated_percentage: 100
            }];
          }
          console.log('Sales person from direct field:', salesPersonValue);
        }
        
        console.log('Final sales person value:', salesPersonValue);
        
        // Update sales team state
        setSalesTeam(loadedSalesTeam);
        
        // Map items dari ERPNext ke format form
        const mappedItems = (order.items || []).map((item: any) => ({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          qty: item.qty || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
          warehouse: item.warehouse || '',
          stock_uom: item.stock_uom || item.uom || '',
          available_stock: 0, // Will be fetched separately if needed
          actual_stock: 0,
          reserved_stock: 0,
        }));
        
        // Jika tidak ada items, buat item kosong default
        if (mappedItems.length === 0) {
          mappedItems.push({ 
            item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, 
            warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 
          });
        }
        
        setFormData({
          customer: order.customer || '',
          transaction_date: order.transaction_date || '',
          delivery_date: order.delivery_date || '',
          sales_person: salesPersonValue,
          items: mappedItems,
        });
        console.log('Form data set:', {
          customer: order.customer || '',
          transaction_date: order.transaction_date || '',
          delivery_date: order.delivery_date || '',
          sales_person: salesPersonValue,
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Failed to fetch order details');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 },
      ],
    });
  };

  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData(prev => ({ ...prev, customer: customer.name }));
    setShowCustomerDialog(false);
    setError('');
    
    // Fetch customer detail untuk mendapatkan default sales person
    fetchCustomerDetail(customer.name);
  };

  // Fetch customer detail untuk auto-fill sales person
  const fetchCustomerDetail = async (customerName: string) => {
    try {
      console.log('Fetching customer detail for:', customerName);
      
      // Gunakan API customer yang sudah ada
      const response = await fetch(`/api/customer/${encodeURIComponent(customerName)}`);
      
      if (!response.ok) {
        console.log('Failed to fetch customer detail, using fallback mapping');
        getFallbackSalesPerson(customerName);
        return;
      }
      
      const result = await response.json();
      console.log('Customer detail response:', result);
      
      if (result.success && result.data) {
        const customerData = result.data;
        
        // Cari sales person dari sales_team array
        if (customerData.sales_team && customerData.sales_team.length > 0) {
          const primarySalesPerson = customerData.sales_team.find((member: any) => 
            member.allocated_percentage === 100 || member.idx === 1
          );
          
          const salesPersonName = primarySalesPerson?.sales_person || customerData.sales_team[0].sales_person;
          
          if (salesPersonName) {
            console.log('Auto-filling sales person from customer data:', salesPersonName);
            
            // Set sales person di form
            setFormData(prev => ({ 
              ...prev, 
              sales_person: salesPersonName 
            }));
            
            // Set sales team state
            setSalesTeam([{
              sales_person: salesPersonName,
              allocated_percentage: 100
            }]);
            
            console.log('Sales person auto-filled successfully from customer data');
            return;
          }
        }
      }
      
      // Fallback ke mapping jika tidak ada sales_team
      console.log('No sales team found in customer data, using fallback mapping');
      getFallbackSalesPerson(customerName);
      
    } catch (error) {
      console.error('Error fetching customer detail:', error);
      getFallbackSalesPerson(customerName);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // Fallback sales person mapping
  const getFallbackSalesPerson = (customerName: string) => {
    // Mapping customer ke default sales person (bisa diperluas)
    const customerSalesPersonMapping: Record<string, string> = {
      'West View Software Ltd.': 'Deden',
      'Grant Plastics Ltd.': 'Kantor',
      'Palmer Productions Ltd.': 'Tim Penjualan',
    };
    
    // Cari sales person berdasarkan mapping
    let defaultSalesPerson = customerSalesPersonMapping[customerName];
    
    // Jika tidak ada di mapping, gunakan default
    if (!defaultSalesPerson) {
      defaultSalesPerson = 'Deden'; // Default sales person
      console.log('Using default sales person:', defaultSalesPerson);
    } else {
      console.log('Found mapped sales person:', defaultSalesPerson);
    }
    
    // Auto-fill sales person
    if (defaultSalesPerson) {
      // Set sales person di form
      setFormData(prev => ({ 
        ...prev, 
        sales_person: defaultSalesPerson 
      }));
      
      // Set sales team state
      setSalesTeam([{
        sales_person: defaultSalesPerson,
        allocated_percentage: 100
      }]);
      
      console.log('Sales person auto-filled successfully:', defaultSalesPerson);
    }
  };

  const resetForm = () => {
    // Gunakan timezone lokal untuk mendapatkan tanggal yang benar
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    const todayString = localDate.toISOString().split('T')[0];
    
    console.log('Reset form with today:', todayString);
    console.log('Current system date:', today.toISOString());
    console.log('Timezone offset:', offset, 'minutes');
    
    setFormData({
      customer: '',
      transaction_date: todayString,
      delivery_date: todayString,
      sales_person: '',
      items: [{ item_code: '', item_name: '', qty: 1, rate: 0, amount: 0, warehouse: '', stock_uom: '', available_stock: 0, actual_stock: 0, reserved_stock: 0 }],
    });
    setSalesTeam([]); // Reset sales team
    setError('');
    setEditingOrder(null);
    setCurrentOrderStatus('');
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    console.log('handleItemChange called:', { index, field, value, currentValue: formData.items[index]?.[field] });
    
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
      console.log('Updated amount:', newItems[index].amount);
    }
    
    console.log('Setting form data with new items:', newItems);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemSelect = async (item: { item_code: string; item_name: string; stock_uom?: string }) => {
    console.log('Item selected:', item);
    if (currentItemIndex !== null) {
      const newItems = [...formData.items];
      
      // Fetch item price tanpa company filter (company tidak diizinkan di ERPNext)
      let rate = 0;
      try {
        const priceResponse = await fetch(`/api/item-price?item_code=${item.item_code}`);
        const priceResult = await priceResponse.json();
        
        if (priceResult.success) {
          rate = priceResult.data.price_list_rate;
          console.log('Item price fetched:', priceResult.data);
        } else {
          console.log('No price found, using default rate 0');
        }
      } catch (error) {
        console.error('Failed to fetch item price:', error);
      }
      
      // Get current item to preserve existing fields
      const currentItem = formData.items[currentItemIndex];
      console.log('Current item before update:', currentItem);
      
      newItems[currentItemIndex] = {
        ...currentItem, // Preserve all existing fields from current form state
        item_code: item.item_code,
        item_name: item.item_name,
        stock_uom: item.stock_uom || '',
        rate: rate,
      };
      // Update amount
      newItems[currentItemIndex].amount = newItems[currentItemIndex].qty * newItems[currentItemIndex].rate;
      
      console.log('Updated item before stock check:', newItems[currentItemIndex]);
      
      setFormData({ ...formData, items: newItems });
      
      // Check stock for selected item - pass the updated item
      checkItemStock(item.item_code, currentItemIndex, newItems[currentItemIndex]);
    }
  };

  const checkItemStock = async (itemCode: string, itemIndex: number, currentItem: any) => {
    console.log('Checking stock for item:', itemCode, 'at index:', itemIndex);
    console.log('Current item passed to stock check:', currentItem);
    
    try {
      const response = await fetch(`/api/stock-check?item_code=${itemCode}`);
      const data = await response.json();
      
      console.log('Stock check response:', data);
      
      if (!data.error && data.length > 0) {
        // Find warehouse with highest available stock
        const bestWarehouse = data.reduce((prev: any, current: any) => 
          (prev.available >= current.available) ? prev : current
        );
        
        console.log('Best warehouse:', bestWarehouse);
        
        // Update item with warehouse info
        const updatedItem = {
          ...currentItem, // Use the passed item instead of formData
          warehouse: bestWarehouse.warehouse,
          available_stock: bestWarehouse.available,
          actual_stock: bestWarehouse.actual,
          reserved_stock: bestWarehouse.reserved,
        };
        
        console.log('Updated item with warehouse:', updatedItem);
        
        // Update form data with the updated item
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
        
        console.log('Form data updated with warehouse');
      } else {
        console.log('No available stock data found, using first warehouse from stock data');
        
        // Set default warehouse
        const defaultWarehouse = data.length > 0 ? data[0].warehouse : 'Stores - E1D';
        const actualStock = data.length > 0 ? data[0].available : 0;
        
        const updatedItem = {
          ...currentItem, // Use the passed item instead of formData
          warehouse: defaultWarehouse,
          available_stock: actualStock,
          actual_stock: data.length > 0 ? data[0].actual : 0,
          reserved_stock: data.length > 0 ? data[0].reserved : 0,
        };
        
        setFormData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => 
            index === itemIndex ? updatedItem : item
          )
        }));
        
        console.log('Set default warehouse from stock database data');
      }
    } catch (error) {
      console.error('Stock check failed:', error);
    }
  };

  const handleSalesPersonSelect = (salesPerson: { name: string; full_name: string }) => {
    // Update form data dengan sales person name
    setFormData({ ...formData, sales_person: salesPerson.name });
    
    // Update sales team dengan allocated percentage 100% (untuk single sales person)
    const newSalesTeam: SalesTeamMember[] = [{
      sales_person: salesPerson.name,
      allocated_percentage: 100
    }];
    setSalesTeam(newSalesTeam);
  };

  const openItemDialog = (index: number) => {
    setCurrentItemIndex(index);
    setShowItemDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    // Validasi dasar
    if (!selectedCompany) {
      setError('Company is required');
      setFormLoading(false);
      return;
    }

    if (!formData.customer) {
      setError('Customer is required');
      setFormLoading(false);
      return;
    }

    if (!formData.transaction_date) {
      setError('Transaction date is required');
      setFormLoading(false);
      return;
    }

    if (!formData.delivery_date) {
      setError('Delivery date is required');
      setFormLoading(false);
      return;
    }

    // Validasi items
    const validItems = formData.items.filter(item => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      setError('At least one valid item is required');
      setFormLoading(false);
      return;
    }

    // Validasi warehouse untuk setiap item
    const itemsWithoutWarehouse = validItems.filter(item => !item.warehouse);
    if (itemsWithoutWarehouse.length > 0) {
      setError('All items must have a warehouse assigned');
      setFormLoading(false);
      return;
    }

    try {
      // Format payload sesuai ERPNext Sales Order API - MINIMAL VERSION FOR TESTING
      const orderPayload = {
        doctype: "Sales Order",
        company: selectedCompany,
        customer: formData.customer,
        transaction_date: formData.transaction_date,
        delivery_date: formData.delivery_date,
        order_type: "Sales",
        currency: "IDR",
        status: "Draft",
        
        // Sales person di dalam sales_team array
        sales_team: salesTeam.length > 0 ? salesTeam : (formData.sales_person ? [{
          sales_person: formData.sales_person,
          allocated_percentage: 100
        }] : []),
        
        items: validItems.map(item => ({
          doctype: "Sales Order Item",
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          warehouse: item.warehouse,
        })),
        
        total: validItems.reduce((sum, item) => sum + item.amount, 0),
        grand_total: validItems.reduce((sum, item) => sum + item.amount, 0),
      };

      console.log('Sales Order Payload:', JSON.stringify(orderPayload, null, 2));
      console.log('Sales team payload:', orderPayload.sales_team);
      
      // Validasi dasar sebelum kirim
      if (!orderPayload.customer) {
        setError('Customer is required');
        setFormLoading(false);
        return;
      }
      
      if (validItems.length === 0) {
        setError('At least one item is required');
        setFormLoading(false);
        return;
      }
      
      if (orderPayload.sales_team && orderPayload.sales_team.length > 0) {
        console.log('Sales person validation:', {
          sales_person: orderPayload.sales_team[0].sales_person,
          type: typeof orderPayload.sales_team[0].sales_person,
          length: orderPayload.sales_team[0].sales_person.length
        });
      } else {
        console.log('No sales team in payload');
      }

      const response = await fetch('/api/sales-order', {
        method: editingOrder ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingOrder ? { ...orderPayload, name: editingOrder.name } : orderPayload),
      });

      const result = await response.json();
      console.log('Sales Order API Response:', result);
      console.log('API Response Status:', response.status);
      console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (result.success) {
        // Reset form and close on success
        resetForm();
        setShowForm(false);
        
        // Refresh orders list
        fetchOrders();
        
        // Show success message dengan nomor order
        const orderName = result.data?.name || 'Unknown';
        const action = editingOrder ? 'updated' : 'created';
        alert(`Sales Order ${orderName} ${action} successfully!`);
      } else {
        // Handle error dengan detail yang lebih baik
        const errorMessage = result.message || result.error || 'Failed to save sales order';
        setError(errorMessage);
        console.error('Sales Order operation failed:', result);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      setError('An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Sales Order untuk mengubah status dari Draft ke Submitted
  const handleSubmitSalesOrder = async (orderName: string) => {
    try {
      console.log('Submitting Sales Order:', orderName);
      
      const response = await fetch(`/api/sales-order/${orderName}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Submit Sales Order Response:', result);

      if (result.success) {
        alert(`✅ Sales Order ${orderName} submitted successfully!\n\n📋 Status: Draft → Submitted\n\n🔔 Next Steps:\n• Create Delivery Note (untuk pengiriman & stok)\n• Create Sales Invoice (untuk jurnal akuntansi)`);
        fetchOrders(); // Refresh list
      } else {
        alert(`❌ Failed to submit Sales Order: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting sales order:', error);
      alert('❌ An error occurred while submitting Sales Order');
    }
  };

  // Create Delivery Note dari Sales Order (akan mengurangi stok)
  const handleCreateDeliveryNote = async (orderName: string) => {
    try {
      console.log('Creating Delivery Note from Sales Order:', orderName);
      
      // Gunakan ERPNext API untuk membuat Delivery Note dari Sales Order
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/delivery-note/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Create Delivery Note Response:', result);

      if (result.success) {
        const deliveryNoteName = result.data?.name || 'Unknown';
        alert(`✅ Delivery Note ${deliveryNoteName} created successfully!\n\n📦 Status: Draft\n\n📉 Stock Impact:\n• Stock akan berkurang saat Delivery Note disubmit\n• Barang akan keluar dari gudang\n\n🔔 Next Step:\n• Submit Delivery Note untuk mengurangi stok\n• Create Sales Invoice untuk jurnal akuntansi`);
        fetchOrders(); // Refresh list
      } else {
        alert(`❌ Failed to create Delivery Note: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating delivery note:', error);
      alert('❌ An error occurred while creating Delivery Note');
    }
  };

  // Create Sales Invoice dari Sales Order (akan membuat jurnal akuntansi)
  const handleCreateSalesInvoice = async (orderName: string) => {
    try {
      console.log('Creating Sales Invoice from Sales Order:', orderName);
      
      const response = await fetch(`/api/sales-invoice/from-sales-order/${orderName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Create Sales Invoice Response:', result);

      if (result.success) {
        const invoiceName = result.data?.name || 'Unknown';
        alert(`✅ Sales Invoice ${invoiceName} created successfully!\n\n📊 Status: Draft\n\n💰 Jurnal Akuntansi:\n• Debit: Accounts Receivable (Piutang Usaha)\n• Credit: Sales Revenue (Pendapatan Penjualan)\n• Credit: Tax Payable (PPN Keluaran) - jika ada\n\n🔔 Next Step:\n• Submit Sales Invoice untuk mengaktifkan jurnal\n• Create Payment Entry untuk pelunasan`);
        fetchOrders(); // Refresh list
      } else {
        alert(`❌ Failed to create Sales Invoice: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating sales invoice:', error);
      alert('❌ An error occurred while creating Sales Invoice');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Sales Orders..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          New Sales Order
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Name
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
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
              onClick={() => {
                setDateFilter({ from_date: '', to_date: '' });
                setNameFilter('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">New Sales Order</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      required
                      className={`mt-1 block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        currentOrderStatus !== 'Draft' && currentOrderStatus !== '' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      value={formData.customer}
                      onChange={(e) =>
                        setFormData({ ...formData, customer: e.target.value })
                      }
                      disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerDialog(true)}
                      disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                      className={`px-3 py-2 border border-l-0 border-gray-300 rounded-r-md ${
                        currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      currentOrderStatus !== 'Draft' && currentOrderStatus !== '' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.transaction_date}
                    onChange={(e) =>
                      setFormData({ ...formData, transaction_date: e.target.value })
                    }
                    disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                      currentOrderStatus !== 'Draft' && currentOrderStatus !== '' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                    value={formData.delivery_date}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_date: e.target.value })
                    }
                    disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sales Person <span className="text-red-500">*</span>
                  </label>
                  <div className="flex mt-1">
                    <input
                      type="text"
                      className={`block w-full border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100 cursor-not-allowed`}
                      value={formData.sales_person}
                      onChange={(e) =>
                        setFormData({ ...formData, sales_person: e.target.value })
                      }
                      disabled={true}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => setShowSalesPersonDialog(true)}
                      disabled={true}
                      className={`px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-100 text-gray-400 cursor-not-allowed`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                    className={`${
                      currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } px-3 py-1 rounded-md text-sm`}
                  >
                    Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-2">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Item Code <span className="text-red-500">*</span>
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={item.item_code}
                            onChange={(e) =>
                              handleItemChange(index, 'item_code', e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openItemDialog(index)}
                            disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                            className={`px-2 py-1 border border-l-0 border-gray-300 rounded-r-md ${
                              currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700">
                          Item Name <span className="text-red-500">*</span>
                        </label>
                        <div className="flex mt-1">
                          <input
                            type="text"
                            required
                            className="block w-full border border-gray-300 rounded-l-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            value={item.item_name}
                            onChange={(e) =>
                              handleItemChange(index, 'item_name', e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openItemDialog(index)}
                            disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                            className={`px-2 py-1 border border-l-0 border-gray-300 rounded-r-md ${
                              currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            } focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Warehouse
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.warehouse}
                          placeholder="Auto-select"
                        />
                        {item.warehouse && (
                          <div className="mt-1 p-1 bg-blue-50 border border-blue-200 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-blue-700">
                                Avail: <span className="font-semibold">{item.available_stock || 0}</span>
                              </span>
                              <span className="text-gray-600">
                                A:{item.actual_stock || 0} R:{item.reserved_stock || 0}
                              </span>
                            </div>
                            {item.available_stock <= 0 && (
                              <div className="text-xs text-orange-600">⚠️ Out of stock</div>
                            )}
                            {item.available_stock > 0 && item.available_stock < 10 && (
                              <div className="text-xs text-yellow-600">⚠️ Low stock ({item.available_stock})</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Qty <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                            currentOrderStatus !== 'Draft' && currentOrderStatus !== '' ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          style={{
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)
                          }
                          disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          UoM
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.stock_uom}
                          placeholder="Auto"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Rate
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right ${
                            currentOrderStatus !== 'Draft' && currentOrderStatus !== '' ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          style={{
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                          value={item.rate || 0}
                          onChange={(e) =>
                            handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)
                          }
                          disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">
                          Amount
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                        className={`mt-2 text-sm ${
                          currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="text-right">
                      <div className="text-gray-600">Total Quantity:</div>
                      <div className="font-semibold text-gray-900">
                        {formData.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600">Total Amount:</div>
                      <div className="font-semibold text-lg text-gray-900">
                        Rp {formData.items.reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || currentOrderStatus !== 'Draft' && currentOrderStatus !== ''}
                  className={`${
                    currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } px-4 py-2 rounded-md disabled:opacity-50`}
                >
                  {formLoading 
                    ? 'Creating...' 
                    : currentOrderStatus !== 'Draft' && currentOrderStatus !== ''
                      ? `${currentOrderStatus} - Cannot Edit` 
                      : editingOrder 
                        ? 'Update Order' 
                        : 'Create Order'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {orders.map((order, index) => {
            console.log(`Rendering order ${index}:`, order);
            return (
            <li 
              key={order.name}
              onClick={() => {
                if (order.name) {
                  fetchOrderDetails(order.name, order.status);
                }
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {order.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">Customer: {order.customer}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Transaction Date: {order.transaction_date}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Delivery Date: {order.delivery_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between sm:mt-0">
                    <span className="font-medium text-sm text-gray-500">Total: Rp {order.grand_total.toLocaleString('id-ID')}</span>
                    
                    {/* Submit button for Draft orders */}
                    {order.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening order details
                          handleSubmitSalesOrder(order.name);
                        }}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                      >
                        Submit
                      </button>
                    )}
                    
                    {/* Create Invoice button for Submitted orders */}
                    {order.status === 'Submitted' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening order details
                            handleCreateDeliveryNote(order.name);
                          }}
                          className="ml-4 px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                        >
                          Create Delivery
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening order details
                            handleCreateSalesInvoice(order.name);
                          }}
                          className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          Create Invoice
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No sales orders found</p>
          </div>
        )}
        
        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
      
      {/* Customer Selection Dialog */}
      <CustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
      />

      {/* Item Selection Dialog */}
      <ItemDialog
        isOpen={showItemDialog}
        onClose={() => setShowItemDialog(false)}
        onSelect={handleItemSelect}
      />

      {/* Sales Person Selection Dialog */}
      <SalesPersonDialog
        isOpen={showSalesPersonDialog}
        onClose={() => setShowSalesPersonDialog(false)}
        onSelect={handleSalesPersonSelect}
      />
      
    </div>
    
  );
}
