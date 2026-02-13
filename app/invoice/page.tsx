'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { formatDate, parseDate } from '../../utils/format';
import BrowserStyleDatePicker from '../../components/BrowserStyleDatePicker';

interface Invoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  paid_amount: number;
  status: string;
  delivery_note: string;
  items?: InvoiceItem[];
  custom_total_komisi_sales?: number; // Add custom total komisi sales field
  custom_notes_si?: string;
}

interface InvoiceItem {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  income_account: string;
  cost_center: string;
  warehouse: string;
  delivery_note?: string;  // Add delivery_note field
  sales_order?: string;   // Add sales_order field
  so_detail?: string;     // Add so_detail field
  dn_detail?: string;     // Add dn_detail field
  custom_komisi_sales?: number; // Add custom komisi sales field
}

interface CompleteInvoiceItem extends InvoiceItem {
  name?: string;
  description?: string;
  against_sales_order?: string;
  sales_order_item?: string;
  stock_uom?: string;
  conversion_factor?: number;
}

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    from_date: formatDate(new Date(Date.now() - 86400000)), // Yesterday in DD/MM/YYYY
    to_date: formatDate(new Date()), // Today in DD/MM/YYYY
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [documentNumberFilter, setDocumentNumberFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Environment variables
  const ERPNEXT_API_URL = process.env.NEXT_PUBLIC_ERPNEXT_API_URL || '';
  const ERP_API_KEY = process.env.NEXT_PUBLIC_ERP_API_KEY || '';
  const ERP_API_SECRET = process.env.NEXT_PUBLIC_ERP_API_SECRET || '';
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    posting_date: formatDate(new Date()),
    due_date: formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // +30 days
    // ❌ HAPUS delivery_note dari header
    items: [{
      item_code: '',
      item_name: '',
      qty: 1,
      rate: 0,
      amount: 0,
      income_account: '411000 - Penjualan - ST',
      cost_center: 'Main - ST',
      warehouse: 'Finished Goods - ST',
      // SO/DN fields di items, bukan header
      sales_order: '',
      so_detail: '',
      dn_detail: '',
      delivery_note: '', // ✅ Delivery note hanya di items
      custom_komisi_sales: 0, // ✅ Custom komisi sales per item
    }],
    // ERPNext mandatory fields
    company: '',
    currency: 'IDR',
    price_list_currency: 'IDR',
    plc_conversion_rate: 1,
    selling_price_list: 'Standard Selling',
    territory: 'All Territories',
    tax_id: '',
    customer_address: '',
    shipping_address: '',
    contact_person: '',
    tax_category: 'On Net Total',
    taxes_and_charges: '',
    base_total: 0,
    base_net_total: 0,
    base_grand_total: 0,
    total: 0,
    net_total: 0,
    grand_total: 0,
    outstanding_amount: 0,
    custom_total_komisi_sales: 0, // ✅ Custom total komisi sales di header
  });
  const [formLoading, setFormLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showDeliveryNoteDialog, setShowDeliveryNoteDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [deliveryNotesLoading, setDeliveryNotesLoading] = useState(false);
  const [deliveryNotesError, setDeliveryNotesError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize] = useState(20); // 20 records per page
  const router = useRouter();

  // const handleCloseForm = () => {
  //   setShowForm(false);
  //   setFormData({
  //     customer: '',
  //     posting_date: new Date().toISOString().split('T')[0],
  //     due_date: new Date().toISOString().split('T')[0],
  //     delivery_note: '',
  //     items: [{ 
  //       item_code: '', 
  //       item_name: '', 
  //       qty: 1, 
  //       rate: 0, 
  //       amount: 0,
  //       income_account: 'Sales - ST' 
  //     }],
  //   });
  //   setEditingInvoice(null);
  //   setEditingInvoiceStatus(null);
  //   setError('');
  // };

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

  const fetchInvoices = useCallback(async () => {
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
      // Use proper invoice API (bukan invoice-simple)
      console.log('📋 Fetching invoices with complete data...');
      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('limit_page_length', pageSize.toString());
      params.append('start', ((currentPage - 1) * pageSize).toString());
      
      // Add filter parameters
      if (companyToUse) {
        params.append('company', companyToUse);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (documentNumberFilter) {
        params.append('documentNumber', documentNumberFilter);
      }
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (dateFilter.from_date) {
        const parsedDate = parseDate(dateFilter.from_date);
        if (parsedDate) {
          params.append('from_date', parsedDate);
        }
      }
      
      if (dateFilter.to_date) {
        const parsedDate = parseDate(dateFilter.to_date);
        if (parsedDate) {
          params.append('to_date', parsedDate);
        }
      }

      const response = await fetch(`/api/invoice?${params}`);
      const data = await response.json();

      console.log('📊 Invoice Response:', data);

      if (data.success) {
        console.log('✅ Invoice data received:', data.data);
        if (data.data && data.data.length > 0) {
          console.log('📄 First invoice structure:', data.data[0]);
          console.log('🔍 Available fields:', Object.keys(data.data[0]));
          console.log('📦 Items array check:', {
            has_items: 'items' in data.data[0],
            items_length: data.data[0].items ? data.data[0].items.length : 0,
            items_data: data.data[0].items || 'NO ITEMS'
          });

          // Log DN references untuk debugging
          const dnReferences = data.data
            .flatMap((inv: Invoice) => (inv.items || []))
            .filter((item: InvoiceItem) => item.delivery_note && item.delivery_note.trim() !== '')
            .map((item: InvoiceItem) => item.delivery_note);

          console.log('📦 DN References found:', dnReferences);
        }
        setInvoices(data.data || []);

        // Update pagination info from API response
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          const calculatedTotalPages = Math.ceil(data.total_records / pageSize);
          setTotalPages(calculatedTotalPages);
        } else {
          // Fallback: calculate from received data
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }

        setError('');
      } else {
        setError('Invoice fetch failed: ' + data.message);
      }
    } catch (err) {
      setError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter, fetchInvoices]); // Add all filter dependencies

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm, statusFilter, documentNumberFilter]);

  // NEW FUNCTION: Fetch complete invoice header and details
  const fetchCompleteInvoices = useCallback(async () => {
    console.log('🔍 === FETCHING COMPLETE INVOICE DATA ===');

    // Get company from state or storage
    let companyToUse = selectedCompany;
    if (!companyToUse) {
      const storedCompany = localStorage.getItem('selected_company');
      if (storedCompany) {
        companyToUse = storedCompany;
      }
    }

    if (!companyToUse) {
      console.error('❌ No company selected');
      return;
    }

    try {
      // Fetch invoice headers
      console.log('📋 Fetching invoice headers...');
      const headersResponse = await fetch(`/api/invoice?company=${encodeURIComponent(companyToUse)}`);
      const headersData = await headersResponse.json();

      console.log('📊 Headers Response:', headersData);

      if (headersData.success) {
        const invoices = headersData.data || [];
        console.log(`📄 Found ${invoices.length} invoices`);

        // Process each invoice to get complete details
        const completeInvoices = [];

        for (const invoice of invoices) {
          console.log(`🔍 Processing invoice: ${invoice.name}`);

          try {
            // Get complete invoice details
            const detailResponse = await fetch('/api/get-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoiceName: invoice.name })
            });

            const detailData = await detailResponse.json();

            if (detailData.success) {
              const completeInvoice = detailData.data;

              // Log complete structure
              console.log(`✅ Complete data for ${invoice.name}:`, {
                header: {
                  name: completeInvoice.name,
                  customer: completeInvoice.customer,
                  delivery_note: completeInvoice.delivery_note,
                  grand_total: completeInvoice.grand_total
                },
                items_count: completeInvoice.items ? completeInvoice.items.length : 0,
                items_with_dn: completeInvoice.items ?
                  completeInvoice.items.filter((item: CompleteInvoiceItem) => item.delivery_note).length : 0,
                items: completeInvoice.items ?
                  completeInvoice.items.map((item: CompleteInvoiceItem) => ({
                    item_code: item.item_code,
                    delivery_note: item.delivery_note,
                    qty: item.qty,
                    rate: item.rate
                  })) : []
              });

              completeInvoices.push(completeInvoice);
            } else {
              console.warn(`⚠️ Failed to get details for ${invoice.name}:`, detailData.message);
              completeInvoices.push(invoice); // Use header only
            }
          } catch (detailError) {
            console.warn(`⚠️ Error getting details for ${invoice.name}:`, detailError);
            completeInvoices.push(invoice); // Use header only
          }
        }

        // Final summary
        console.log('🎉 COMPLETE INVOICE SUMMARY:', {
          total_invoices: completeInvoices.length,
          invoices_with_items: completeInvoices.filter(inv => inv.items && inv.items.length > 0).length,
          total_items: completeInvoices.reduce((sum, inv) => sum + (inv.items ? inv.items.length : 0), 0),
          items_with_dn: completeInvoices.reduce((sum, inv) =>
            sum + (inv.items ? inv.items.filter((item: InvoiceItem) => item.delivery_note).length : 0), 0),
          all_dn_references: completeInvoices
            .flatMap(inv => inv.items || [])
            .filter((item: InvoiceItem) => item.delivery_note)
            .map((item: InvoiceItem) => item.delivery_note)
        });

        // Store complete data (you can use this for debugging or display)
        (window as any).completeInvoiceData = completeInvoices;

      } else {
        console.error('❌ Failed to fetch headers:', headersData.message);
      }

    } catch (error) {
      console.error('❌ Error in fetchCompleteInvoices:', error);
    }
  }, [selectedCompany]);

  const handleAddItem = () => {
    const newItems = [...formData.items, {
      item_code: '',
      item_name: '',
      qty: 1,
      rate: 0,
      amount: 0,
      // Use VALID ERPNext data
      income_account: '411000 - Penjualan - ST',
      cost_center: 'Main - ST',
      warehouse: 'Finished Goods - ST',
      // SO/DN fields di items
      sales_order: '',
      so_detail: '',
      dn_detail: '',
      delivery_note: '',
      custom_komisi_sales: 0, // ✅ Custom komisi sales per item
    }];
    
    // Calculate total komisi sales
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    
    setFormData({
      ...formData,
      items: newItems,
      custom_total_komisi_sales: totalKomisiSales
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    
    // Calculate total komisi sales
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);
    
    setFormData({ 
      ...formData, 
      items: newItems,
      custom_total_komisi_sales: totalKomisiSales
    });
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      newItems[index].amount = newItems[index].qty * newItems[index].rate;
    }

    // Recalculate totals
    const total = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalKomisiSales = newItems.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0);

    setFormData({
      ...formData,
      items: newItems,
      total,
      net_total: total,
      grand_total: total,
      base_total: total,
      base_net_total: total,
      base_grand_total: total,
      outstanding_amount: total,
      custom_total_komisi_sales: totalKomisiSales
    });
  };

  const fetchAvailableDeliveryNotes = async () => {
    try {
      setDeliveryNotesLoading(true);
      setDeliveryNotesError('');

      console.log('🔍 Fetching available delivery notes for company:', selectedCompany);

      const invoiceItemsResponse = await fetch(`/api/invoice-items?company=${encodeURIComponent(selectedCompany)}`);
      const invoiceItemsData = await invoiceItemsResponse.json();

      console.log('📋 Invoice Items API Response:', invoiceItemsData);

      if (invoiceItemsData.success) {
        const allDNs = invoiceItemsData.data || [];
        const usedDNs = invoiceItemsData.meta?.used_dn_list || [];

        console.log('📊 DN Filtering Data:', {
          total_dn: allDNs.length,
          used_dn_list: usedDNs,
          used_dn_count: usedDNs.length
        });

        // Filter DN yang belum digunakan di frontend
        const availableDNs = allDNs.filter((dn: { name: string }) => !usedDNs.includes(dn.name));

        console.log('✅ Available DNs after filtering:', availableDNs.length);
        console.log('📋 Available DN Names:', availableDNs.map((dn: { name: string }) => dn.name));

        setDeliveryNotes(availableDNs);
      } else {
        console.error('❌ Failed to fetch available DNs:', invoiceItemsData.error);
        setDeliveryNotesError(invoiceItemsData.error || 'Failed to fetch delivery notes');
        setDeliveryNotes([]);
      }
    } catch (error) {
      console.error('❌ Error fetching available delivery notes:', error);
      setDeliveryNotesError('Failed to fetch delivery notes');
      setDeliveryNotes([]);
    } finally {
      setDeliveryNotesLoading(false);
    }
  }

  // Main function to handle delivery note selection - combines preview and form creation
  async function handleSelectDeliveryNote(dn: string) {
    try {
      console.log('🔍 Getting commission preview for DN:', dn);
      
      // Step 1: Try to get commission preview (fallback to manual calculation if fails)
      let commissionData = null;
      try {
        const res = await fetch(
          `/api/preview-sales-invoice-commission?delivery_note=${encodeURIComponent(dn)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await res.json();
        console.log('Commission Preview API Response:', data);

        if (data.success && data.message) {
          commissionData = data.message;
          console.log('Commission Preview Data:', commissionData);
          
          // Validate expected response format
          if (commissionData.preview_available && commissionData.items && commissionData.total_commission !== undefined) {
            console.log('✅ Valid commission preview format received:', {
              sales_person: commissionData.sales_person,
              commission_rate: commissionData.commission_rate,
              items_count: commissionData.items.length,
              total_commission: commissionData.total_commission
            });
          } else {
            console.warn('⚠️ Invalid commission preview format, using fallback');
            commissionData = null;
          }
        } else {
          console.warn('Failed to get commission preview:', data.message);
        }
      } catch (previewError) {
        console.warn('Commission preview API failed, using fallback calculation:', previewError);
        // Continue with manual calculation as fallback
      }

      // Step 2: Get complete DN data and create form
      console.log('📦 Getting complete DN data for form creation:', dn);
      const dnUrl = `/api/delivery-note-detail?name=${encodeURIComponent(dn)}`;
      console.log('🔗 Fetching DN from URL:', dnUrl);

      const dnResponse = await fetch(dnUrl);
      console.log('📡 DN Response Status:', dnResponse.status);

      if (!dnResponse.ok) {
        const errorText = await dnResponse.text();
        console.error('❌ DN API Error Response:', errorText);
        throw new Error(`Failed to fetch DN details: ${dnResponse.status} ${dnResponse.statusText}`);
      }

      const dnData = await dnResponse.json();
      console.log('📋 Complete DN Data:', dnData);

      if (dnData.success && dnData.data) {
        const completeDnData = dnData.data;
        
        // Debug customer fields
        // console.log('🔍 Customer Data Debug:', {
        //   customer: completeDnData.customer,
        //   customer_name: completeDnData.customer_name,
        //   has_customer_name: !!completeDnData.customer_name,
        //   sales_team: completeDnData.sales_team,
        //   sales_team_length: completeDnData.sales_team?.length || 0,
        //   items_count: completeDnData.items?.length || 0
        // });

        // Create invoice items from DN items
        const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => {
          // Get commission from preview data based on item_code
          let commission = 0;
          if (commissionData && commissionData.preview_available && commissionData.items) {
            const foundCommission = commissionData.items.find((p: any) => p.item_code === item.item_code);
            commission = foundCommission?.commission || 0;
            
            // console.log(`💰 Commission for item ${item.item_code}:`, {
            //   item_code: item.item_code,
            //   commission: commission,
            //   from_preview: !!foundCommission,
            //   preview_data: foundCommission
            // });
          }
          
          return {
            item_code: item.item_code,
            item_name: item.item_name || item.description,
            description: item.description || item.item_name,
            qty: item.qty,
            rate: item.rate || 0,
            amount: item.amount || (item.qty * (item.rate || 0)),
            // KRUSIAL: Link ke DN agar status berubah
            delivery_note: completeDnData.name,
            dn_detail: item.name, // Link ke ID baris spesifik di DN
            // TAMBAHKAN SALES ORDER DATA
            sales_order: item.against_sales_order || item.sales_order || completeDnData.sales_order || '',
            so_detail: item.so_detail || item.sales_order_item || '',
            // Custom komisi sales - gunakan commission dari preview
            custom_komisi_sales: commission,
            // ERPNext mandatory fields
            income_account: item.income_account || '411000 - Penjualan - ST',
            cost_center: item.cost_center || 'Main - ST',
            warehouse: item.warehouse || 'Finished Goods - ST',
            stock_uom: item.stock_uom || 'Nos',
            uom_conversion_factor: item.conversion_factor || 1,
          };
        });

        // Use total_commission from preview data, or calculate manually
        const totalKomisiSales = commissionData && commissionData.preview_available ? 
          commissionData.total_commission : 
          invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        console.log('💰 Commission Summary:', {
          preview_available: !!commissionData && commissionData.preview_available,
          sales_person: commissionData?.sales_person,
          commission_rate: commissionData?.commission_rate,
          items_with_commission: invoiceItems.filter(item => item.custom_komisi_sales > 0).length,
          total_commission: totalKomisiSales,
          used_preview_total: commissionData && commissionData.preview_available
        });

        // Update form with DN data and items
        setFormData({
          // Basic fields
          customer: completeDnData.customer || '',
          customer_name: completeDnData.customer_name || '',
          posting_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: invoiceItems,
          custom_total_komisi_sales: totalKomisiSales,
          
          // ERPNext mandatory fields
          company: selectedCompany,
          currency: 'IDR',
          price_list_currency: 'IDR',
          plc_conversion_rate: 1,
          selling_price_list: 'Standard Selling',
          territory: 'All Territories',
          tax_id: '',
          customer_address: '',
          shipping_address: '',
          contact_person: '',
          tax_category: 'On Net Total',
          taxes_and_charges: '',
          base_total: 0,
          base_net_total: 0,
          base_grand_total: 0,
          total: 0,
          net_total: 0,
          grand_total: 0,
          outstanding_amount: 0,
        });

        // Close dialog
        setShowDeliveryNoteDialog(false);

        // Show success alert
        // if (commissionData && commissionData.preview_available) {
        //   alert(`✅ Invoice Created with Commission!\n\nDN: ${dn}\nItems: ${invoiceItems.length}\nSales Person: ${commissionData.sales_person}\nCommission Rate: ${commissionData.commission_rate}%\nTotal Commission: ${totalKomisiSales}\n\nForm has been populated with DN data and commission.`);
        // } else {
        //   alert(`✅ Invoice Created!\n\nDN: ${dn}\nItems: ${invoiceItems.length}\n\nForm has been populated with DN data.\nCommission preview was not available, using manual calculation.`);
        // }

        console.log('✅ Form successfully updated with DN data and commission:', {
          dn: dn,
          items_created: invoiceItems.length,
          total_commission: totalKomisiSales,
          customer: completeDnData.customer_name,
          preview_used: !!commissionData
        });

      } else {
        throw new Error('Invalid DN data received');
      }

    } catch (error) {
      console.error('Error in handleSelectDeliveryNote:', error);
      alert(`❌ System Error!\n\nFailed to process delivery note.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const handleDeliveryNoteSelect = async (deliveryNote: { name: string; customer: string; customer_name?: string }) => {
    try {
      console.log('📦 Selected Delivery Note:', deliveryNote);

      // Gunakan API route yang sudah ada: /api/delivery-note-detail?name=[DN-NAME]
      const dnUrl = `/api/delivery-note-detail?name=${encodeURIComponent(deliveryNote.name)}`;
      console.log('🔗 Fetching DN from URL:', dnUrl);

      // Fetch complete DN details
      const dnResponse = await fetch(dnUrl);

      console.log('📡 DN Response Status:', dnResponse.status);

      if (!dnResponse.ok) {
        const errorText = await dnResponse.text();
        console.error('❌ DN API Error Response:', errorText);
        throw new Error(`Failed to fetch DN details: ${dnResponse.status} ${dnResponse.statusText}`);
      }

      const dnData = await dnResponse.json();
      console.log('📋 Complete DN Data:', dnData);

      if (dnData.success && dnData.data) {
        const completeDnData = dnData.data;
        
        // Debug customer fields
        console.log('🔍 Customer Data Debug:', {
          customer: completeDnData.customer,
          customer_name: completeDnData.customer_name,
          has_customer_name: !!completeDnData.customer_name,
          sales_team: completeDnData.sales_team,
          sales_team_length: completeDnData.sales_team?.length || 0,
          items_count: completeDnData.items?.length || 0
        });

        // Create invoice items from DN items
        const invoiceItems = completeDnData.items.map((item: CompleteInvoiceItem) => ({
          item_code: item.item_code,
          item_name: item.item_name || item.description,
          description: item.description || item.item_name,
          qty: item.qty,
          rate: item.rate || 0,
          amount: item.amount || (item.qty * (item.rate || 0)),
          // KRUSIAL: Link ke DN agar status berubah
          delivery_note: completeDnData.name,
          dn_detail: item.name, // Link ke ID baris spesifik di DN
          // TAMBAHKAN SALES ORDER DATA
          sales_order: item.against_sales_order || item.sales_order || completeDnData.sales_order || '',
          so_detail: item.so_detail || item.sales_order_item || '',
          // Custom komisi sales
          custom_komisi_sales: item.custom_komisi_sales || 0,
          // ERPNext mandatory fields
          income_account: item.income_account || '411000 - Penjualan - ST',
          cost_center: item.cost_center || 'Main - ST',
          warehouse: item.warehouse || 'Finished Goods - ST',
          stock_uom: item.stock_uom || 'Nos',
          uom_conversion_factor: item.conversion_factor || 1,
        }));

        // Calculate total komisi sales
        const totalKomisiSales = invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        // Auto-calculate commission based on ERPNext script logic
        await Promise.all(invoiceItems.map(async (item, index) => {
          if (item.delivery_note && !item.custom_komisi_sales) {
            try 
            {
              // Get delivery note details to get margin and sales person
              const dnDetailResponse = await fetch(`/api/delivery-note-detail?name=${encodeURIComponent(item.delivery_note)}`);
              if (dnDetailResponse.ok) {
                const dnDetailData = await dnDetailResponse.json();
                if (dnDetailData.success && dnDetailData.data) {
                  // Find matching item in DN to get margin
                  const dnItem = dnDetailData.data.items?.find((dnItem: any) => 
                    dnItem.item_code === item.item_code || 
                    dnItem.item_name === item.item_name || 
                    dnItem.name === item.item_name
                  );
                  
                  if (dnItem) {
                    // Get sales person from customer data (simple approach)
                    let salesPerson = null;
                    
                    // Alert untuk debugging - cek data yang tersedia
                    console.log('🔍 DEBUG - Available Data:', {
                      dn_customer: dnData.customer,
                      dn_customer_name: dnData.customer_name,
                      dn_sales_team: dnDetailData.data.sales_team,
                      dn_sales_team_length: dnDetailData.data.sales_team?.length || 0,
                      dn_item_sales_person: dnItem.sales_person,
                      dn_item_data: dnItem,
                      complete_dn_data: dnDetailData.data,
                      dn_detail_customer: dnDetailData.data.customer
                    });
                    
                    // Coba dapatkan sales person dari berbagai sumber
                    if (dnDetailData.data.sales_team && dnDetailData.data.sales_team.length > 0) {
                      salesPerson = dnDetailData.data.sales_team[0].sales_person;
                      console.log(`👥 Found sales person from DN sales team: ${salesPerson}`);
                    } else if (dnItem.sales_person) {
                      salesPerson = dnItem.sales_person;
                      console.log(`👥 Found sales person from DN item: ${salesPerson}`);
                    } else {
                      console.warn(`⚠️ No sales person found in DN data`);
                      const customerName = dnData.customer_name || dnDetailData.data.customer_name || 'Unknown';
                      const customerCode = dnDetailData.data.customer || 'Unknown';
                      
                      // Ambil sales team dari customer master
                      console.log(`🔍 Getting sales team from customer master: ${customerCode}`);
                      // TODO: API customer-sales-team masih 404, dikomentari dulu
                      // const customerResponse = await fetch(`/api/customer-sales-team?customer=${encodeURIComponent(customerCode)}`);
                      // if (customerResponse.ok) {
                      //   const customerData = await customerResponse.json();
                      //   console.log('Customer Sales Team Response:', customerData);
                      //   
                      //   if (customerData.success && customerData.data && customerData.data.sales_persons && customerData.data.sales_persons.length > 0) {
                      //     salesPerson = customerData.data.sales_persons[0];
                      //     console.log(`👥 Found sales person from Customer Sales Team: ${salesPerson}`);
                      //     
                      //     // Ambil commission rate dari sales person master
                      //     console.log(`🔍 Getting commission rate for sales person: ${salesPerson}`);
                      //     const spResponse = await fetch(`/api/sales-person-rate?sales_person=${encodeURIComponent(salesPerson)}`);
                      //     if (spResponse.ok) {
                      //       const spData = await spResponse.json();
                      //       console.log('Sales Person Rate Response Data:', spData);
                      //       
                      //       // Alert untuk debugging
                      //       if (spData.success && spData.data) {
                      //         const commissionRate = spData.data.custom_default_commission_rate || 0;
                      //         alert(`✅ Sales Person Data Found!\n\nSales Person: ${salesPerson}\nCommission Rate: ${commissionRate}%\nCustomer: ${customerName}\nDN: ${item.delivery_note}\nItem: ${item.item_code}\n\nCommission will be calculated automatically.`);
                      //           
                      //         const margin = dnItem.margin_rate_or_amount || dnItem.margin_rate || 0;
                      //         const calculatedCommission = margin * item.qty * commissionRate;
                      //         
                      //         // Update item with calculated commission
                      //         item.custom_komisi_sales = calculatedCommission;
                      //         console.log(`💰 Auto-calculated commission for item ${index}:`, {
                      //           item_code: item.item_code,
                      //           method: 'Found',
                      //           sales_person: salesPerson,
                      //           commission_rate: commissionRate,
                      //           margin: margin,
                      //           qty: item.qty,
                      //           commission: calculatedCommission,
                      //           dn_item_margin: dnItem.margin_rate_or_amount || dnItem.margin_rate
                      //         });
                      //       } else {
                      //         alert(`⚠️ Sales Person Rate Not Found!\n\nSales Person: ${salesPerson}\nCustomer: ${customerName}\n\nCommission rate will be set to 0%.`);
                      //         item.custom_komisi_sales = 0;
                      //       }
                      //     } else {
                      //       console.warn(`⚠️ Failed to get sales person rate for ${salesPerson}`);
                      //       alert(`❌ API Error!\n\nFailed to get commission rate for ${salesPerson}\nPlease check API connection.`);
                      //       item.custom_komisi_sales = 0;
                      //     }
                      //   } else {
                      //     console.warn(`⚠️ Customer ${customerCode} has no sales team members`);
                      //     alert(`⚠️ Customer Has No Sales Team!\n\nCustomer: ${customerName} (${customerCode})\nDN: ${item.delivery_note}\nItem: ${item.item_code}\n\nSales Team: 0 members\n\nPlease check Customer master data.`);
                      //     item.custom_komisi_sales = 0;
                      //   }
                      // } else {
                      //   console.warn(`⚠️ Failed to fetch customer sales team for ${customerCode}`);
                      //   alert(`❌ Customer API Error!\n\nFailed to get sales team for ${customerName} (${customerCode})\nPlease check API connection.`);
                      //   item.custom_komisi_sales = 0;
                      // }
                      
                      // Sementara set commission ke 0 karena API customer-sales-team masih 404
                      console.warn(`⚠️ Customer API disabled - setting commission to 0 for ${customerName} (${customerCode})`);
                      alert(`⚠️ Customer API Disabled!\n\nCustomer: ${customerName} (${customerCode})\nDN: ${item.delivery_note}\nItem: ${item.item_code}\n\nCustomer Sales Team API is temporarily disabled.\nCommission set to 0%.`);
                      item.custom_komisi_sales = 0;
                    }
                    
                    // Get sales person commission rate - ONLY if sales person exists
                    if (salesPerson) {
                      console.log(`🔍 Getting commission rate for sales person: ${salesPerson}`);
                      const spResponse = await fetch(`/api/sales-person-rate?sales_person=${encodeURIComponent(salesPerson)}`);
                      if (spResponse.ok) {
                        const spData = await spResponse.json();
                        console.log('Sales Person Rate Response Data:', spData);
                        
                        // Alert untuk debugging
                        if (spData.success && spData.data) {
                          const commissionRate = spData.data.custom_default_commission_rate || 0;
                          alert(`✅ Sales Person Data Found!\n\nSales Person: ${salesPerson}\nCommission Rate: ${commissionRate}%\nCustomer: ${dnData.customer_name}\nDN: ${item.delivery_note}\nItem: ${item.item_code}\n\nCommission will be calculated automatically.`);
                        } else {
                          alert(`⚠️ Sales Person Rate Not Found!\n\nSales Person: ${salesPerson}\nCustomer: ${dnData.customer_name}\n\nCommission rate will be set to 0%.`);
                        }
                        
                        // Use custom_default_commission_rate as primary (sesuai ERPNext)
                        const commissionRate = spData.success && spData.data ? 
                          spData.data.custom_default_commission_rate || 0 : 0;
                          
                        const margin = dnItem.margin_rate_or_amount || dnItem.margin_rate || 0;
                        const calculatedCommission = margin * item.qty * commissionRate;
                        
                        // Update item with calculated commission
                        item.custom_komisi_sales = calculatedCommission;
                        console.log(`💰 Auto-calculated commission for item ${index}:`, {
                          item_code: item.item_code,
                          method: 'Found',
                          sales_person: salesPerson,
                          commission_rate: commissionRate,
                          margin: margin,
                          qty: item.qty,
                          commission: calculatedCommission,
                          dn_item_margin: dnItem.margin_rate_or_amount || dnItem.margin_rate
                        });
                      } else {
                        console.warn(`⚠️ Failed to get sales person rate for ${salesPerson}`);
                        alert(`❌ API Error!\n\nFailed to get commission rate for ${salesPerson}\nPlease check API connection.`);
                        item.custom_komisi_sales = 0;
                      }
                    } else {
                      console.warn(`⚠️ No sales person found for item ${item.item_code} - setting commission to 0`);
                      item.custom_komisi_sales = 0;
                    }  // Use default commission if rate fetch fails
                        const margin = dnItem.margin_rate_or_amount || dnItem.margin_rate || 0;
                        const defaultCommissionRate = 0; // 0% default
                        const calculatedCommission = margin * item.qty * defaultCommissionRate;
                        item.custom_komisi_sales = calculatedCommission;
                        console.log(`💰 Using default commission (5%) for item ${index}:`, {
                          item_code: item.item_code,
                          commission: calculatedCommission,
                          margin: margin,
                          rate: defaultCommissionRate
                        });
                      }
                    } else {
                      console.warn(`⚠️ No sales person found for item ${item.item_code}`);
                      // Set commission to 0 if no sales person
                      item.custom_komisi_sales = 0;
                    }
                  } else {
                    console.warn(`⚠️ No matching item found in DN for ${item.item_code}`);
                    item.custom_komisi_sales = 0;
                  }
                }
              
             catch (error) {
              console.warn(`⚠️ Failed to auto-calculate commission for item ${index}:`, error);
              item.custom_komisi_sales = 0;
            }
            
          }
        }));

        // Recalculate total after auto-calculation
        const finalTotalKomisiSales = invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        console.log('🛒 Invoice Items with SO/DN data:', invoiceItems);

        // Update form dengan data lengkap (HEADER + DETAIL)
        setFormData({
          // HEADER DATA dari DN
          customer: completeDnData.customer,
          customer_name: completeDnData.customer_name || completeDnData.customer,
          posting_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
          company: selectedCompany,
          // ❌ HAPUS delivery_note dari header - sekarang hanya di items

          // DETAIL DATA di items
          items: invoiceItems,  // SO/DN data sudah di dalam items

          // Additional header fields dari DN
          currency: completeDnData.currency || 'IDR',
          price_list_currency: completeDnData.price_list_currency || 'IDR',
          plc_conversion_rate: completeDnData.plc_conversion_rate || 1,
          selling_price_list: completeDnData.selling_price_list || 'Standard Selling',
          territory: completeDnData.territory || 'All Territories',
          tax_id: completeDnData.tax_id || '',
          customer_address: completeDnData.customer_address || '',
          shipping_address: completeDnData.shipping_address_name || '',
          contact_person: completeDnData.contact_person || '',
          tax_category: completeDnData.tax_category || 'On Net Total',
          taxes_and_charges: completeDnData.taxes_and_charges || '',

          // Calculated totals
          base_total: completeDnData.base_total || 0,
          base_net_total: completeDnData.base_net_total || 0,
          base_grand_total: completeDnData.base_grand_total || 0,
          total: completeDnData.total || 0,
          net_total: completeDnData.net_total || 0,
          grand_total: completeDnData.grand_total || 0,
          outstanding_amount: completeDnData.outstanding_amount || 0,
          custom_total_komisi_sales: finalTotalKomisiSales, // ✅ Custom total komisi sales terhitung otomatis
        });

        console.log('✅ Form updated with complete DN data:', {
          // Header data
          dn: completeDnData.name,
          customer: completeDnData.customer,
          posting_date: completeDnData.posting_date,
          // Detail data
          items_count: invoiceItems.length,
          items_with_so: invoiceItems.filter((item: CompleteInvoiceItem) => item.sales_order).length,
          items_with_dn: invoiceItems.filter((item: CompleteInvoiceItem) => item.delivery_note).length,
          // Totals
          total: completeDnData.total,
          grand_total: completeDnData.grand_total,
        });
      } else {
        throw new Error(`Failed to fetch DN data: ${dnData.message || 'Unknown error'}`);
      }

      setShowDeliveryNoteDialog(false);
      setShowForm(true);
      setError('');
    } catch (error) {
      console.error('❌ Error selecting delivery note:', error);
      setError(`Failed to select delivery note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

        // Extract DN from items (bukan header)
        const itemWithDN = (invoice.items || []).find((item: InvoiceItem) => item.delivery_note && item.delivery_note.trim() !== '');
        const deliveryNote = itemWithDN ? itemWithDN.delivery_note : '';

        // Map items dan hitung total komisi sales
        const invoiceItems = (invoice.items || []).map((item: CompleteInvoiceItem) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          // Use VALID ERPNext data
          income_account: item.income_account || '411000 - Penjualan - ST',
          cost_center: item.cost_center || 'Main - ST',
          warehouse: item.warehouse || 'Finished Goods - ST',
          // Add SO/DN fields di items
          sales_order: item.sales_order || '',
          so_detail: item.so_detail || '',
          dn_detail: item.dn_detail || '',
          delivery_note: item.delivery_note || '',
          custom_komisi_sales: item.custom_komisi_sales || 0, // ✅ Custom komisi sales per item
        }));

        // Calculate total komisi sales
        const totalKomisiSales = invoiceItems.reduce((sum: number, item: CompleteInvoiceItem) => sum + (item.custom_komisi_sales || 0), 0);

        setFormData({
          ...formData,
          customer: invoice.customer,
          customer_name: invoice.customer_name || invoice.customer,
          posting_date: invoice.posting_date,
          due_date: invoice.due_date,
          // ❌ HAPUS delivery_note dari header
          company: selectedCompany,
          items: invoiceItems,
          custom_total_komisi_sales: totalKomisiSales, // ✅ Custom total komisi sales terhitung otomatis
        });
        setEditingInvoice(invoiceName);
        setEditingInvoiceStatus(invoiceStatus || 'Draft');
        setShowForm(true);
        setError('');
        setSuccessMessage(''); // Clear success message when opening edit form

        console.log('✅ Edit form loaded with DN:', deliveryNote);
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
      // Calculate totals
      const total = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);

      const invoicePayload = {
        // ERPNext mandatory fields
        company: selectedCompany,
        customer: formData.customer,
        posting_date: parseDate(formData.posting_date),
        due_date: parseDate(formData.due_date),
        // ❌ HAPUS delivery_note dari header
        // delivery_note: formData.delivery_note || undefined,

        // Currency and pricing - Use VALID data
        currency: 'IDR',
        price_list_currency: 'IDR',
        plc_conversion_rate: 1,
        // selling_price_list: 'Standard Selling',

        // Address and contact
        // territory: 'All Territories',
        customer_address: formData.customer_address || '',
        shipping_address: formData.shipping_address || '',
        contact_person: formData.contact_person || '',

        // Skip tax_category to use system default (Tax Category is empty)
        taxes_and_charges: formData.taxes_and_charges || '',

        // KRUSIAL: Jangan update stock karena sudah dikurangi oleh DN
        update_stock: 0,

        // Remarks untuk tracking
        remarks: formData.items.find(item => item.delivery_note)
          ? `Generated from Delivery Note: ${formData.items.find(item => item.delivery_note)?.delivery_note}`
          : 'Direct Sales Invoice',

        // Items with full ERPNext structure
        items: formData.items.map(item => ({
          item_code: item.item_code,
          // item_name: item.item_name,
          // description: item.item_name,
          qty: item.qty,
          rate: item.rate,
          amount: item.amount,
          // income_account: item.income_account,
          // cost_center: item.cost_center,
          warehouse: item.warehouse,
          // stock_uom: item.stock_uom, //'Nos',
          // uom_conversion_factor: 1,
          // SO/DN data dari items, bukan header
          delivery_note: item.delivery_note,
          dn_detail: item.dn_detail,
          sales_order: item.sales_order,
          so_detail: item.so_detail,
          custom_komisi_sales: item.custom_komisi_sales, // ✅ Custom komisi sales per item
        })),

        // Calculated totals
        // total: total,
        // net_total: total,
        // grand_total: total,
        // base_total: total,
        // base_net_total: total,
        // base_grand_total: total,
        // outstanding_amount: total,

        // Additional fields
        status: 'Draft',
        docstatus: 0,
        custom_total_komisi_sales: formData.custom_total_komisi_sales, // ✅ Custom total komisi sales
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
        setSuccessMessage(`✅ Sales Invoice berhasil disimpan!\n\n📄 Nomor: ${data.data?.name || 'INV Baru'}\n👤 Customer: ${formData.customer}\n📅 Tanggal: ${formData.posting_date}\n💰 Total: ${total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}\n\n🎯 Next Steps:\n• Klik tombol "Submit" untuk mengubah status menjadi "Submitted"\n• Setelah submit, invoice akan masuk ke sistem akuntansi`);
        
        setShowForm(false);
        fetchInvoices();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(`❌ Gagal menyimpan Sales Invoice: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Sales Invoice
  const handleSubmitSalesInvoice = async (invoiceName: string) => {
    try {
      console.log('Submitting Sales Invoice:', invoiceName);
      setSubmittingInvoice(invoiceName); // Set loading state
      
      const response = await fetch(`/api/invoice/${invoiceName}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Submit Sales Invoice Response:', result);

      if (result.success) {
        setSuccessMessage(`✅ Sales Invoice ${invoiceName} berhasil di-submit!\n\n📄 Status: Draft → Unpaid\n💰 Accounting Impact:\n• Invoice masuk ke sistem akuntansi\n• Jurnal penjualan otomatis terbuat\n• Piutang customer tercatat\n\n🔔 Next Steps:\n• Customer dapat melihat invoice\n• Pembayaran dapat diproses\n• Status akan berubah menjadi "Paid" setelah pembayaran`);
        fetchInvoices(); // Refresh list
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(`❌ Gagal submit Sales Invoice: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting sales invoice:', error);
      setError('❌ Terjadi error saat submit Sales Invoice');
    } finally {
      setSubmittingInvoice(null); // Clear loading state
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Sales Invoices..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Invoices</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              // Reset form state untuk create new
              setEditingInvoice(null);
              setEditingInvoiceStatus(null);
              setFormData({
                customer: '',
                customer_name: '',
                posting_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                // ❌ HAPUS delivery_note dari header
                items: [{
                  item_code: '',
                  item_name: '',
                  qty: 1,
                  rate: 0,
                  amount: 0,
                  income_account: '411000 - Penjualan - ST',
                  cost_center: 'Main - ST',
                  warehouse: 'Finished Goods - ST',
                  // SO/DN fields di items, bukan header
                  sales_order: '',
                  so_detail: '',
                  dn_detail: '',
                  delivery_note: '',
                  custom_komisi_sales: 0, // ✅ Custom komisi sales per item
                }],
                company: selectedCompany,
                currency: 'IDR',
                price_list_currency: 'IDR',
                plc_conversion_rate: 1,
                selling_price_list: 'Standard Selling',
                territory: 'All Territories',
                tax_id: '',
                customer_address: '',
                shipping_address: '',
                contact_person: '',
                tax_category: 'On Net Total',
                taxes_and_charges: '',
                base_total: 0,
                base_net_total: 0,
                base_grand_total: 0,
                total: 0,
                net_total: 0,
                grand_total: 0,
                outstanding_amount: 0,
                custom_total_komisi_sales: 0, // ✅ Custom total komisi sales di header
              });
              setError('');
              setSuccessMessage(''); // Clear success message when opening new form
              setShowForm(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Invoice
          </button>
          <button
            onClick={() => {
              setShowDeliveryNoteDialog(true);
              fetchAvailableDeliveryNotes();
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 hidden"
          >
            Create From Delivery Note
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Customer
            </label>
            <input
              type="text"
              placeholder="Search by customer..."
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No. Dokumen
            </label>
            <input
              type="text"
              placeholder="Search invoice..."
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={documentNumberFilter}
              onChange={(e) => setDocumentNumberFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dari Tanggal
            </label>
            <BrowserStyleDatePicker
              value={dateFilter.from_date}
              onChange={(value: string) => setDateFilter({ ...dateFilter, from_date: value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sampai Tanggal
            </label>
            <BrowserStyleDatePicker
              value={dateFilter.to_date}
              onChange={(value: string) => setDateFilter({ ...dateFilter, to_date: value })}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="DD/MM/YYYY"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFilter({ 
                  from_date: formatDate(new Date(Date.now() - 86400000)), // Reset to yesterday
                  to_date: formatDate(new Date()), // Reset to today
                });
                setSearchTerm('');
                setStatusFilter('');
                setDocumentNumberFilter('');
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md mb-6">
          <div className="flex">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Success Message Alert */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Berhasil!</h3>
              <div className="mt-2 text-sm text-green-700">
                <pre className="whitespace-pre-wrap font-sans">{successMessage}</pre>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingInvoice ? 'Edit Sales Invoice' : 'Create Sales Invoice'}
                </h3>
                {!editingInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeliveryNoteDialog(true);
                      fetchAvailableDeliveryNotes();
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Create from Delivery Note
                  </button>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Posting Date
                  </label>
                  <BrowserStyleDatePicker
                    value={formData.posting_date}
                    onChange={(value: string) =>
                      setFormData({ ...formData, posting_date: value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date
                  </label>
                  <BrowserStyleDatePicker
                    value={formData.due_date}
                    onChange={(value: string) =>
                      setFormData({ ...formData, due_date: value })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Komisi Sales
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50"
                    value={formData.custom_total_komisi_sales ? formData.custom_total_komisi_sales.toLocaleString('id-ID') : '0'}
                    readOnly
                    placeholder="0"
                  />
                </div>
                {/* ❌ HAPUS Delivery Note field dari header - sekarang hanya di items */}
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-900">Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="hidden bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
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
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                          value={item.item_code}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Item Name
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                          value={item.item_name}
                          readOnly
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-xs font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-right"
                          value={item.qty.toLocaleString('id-ID')}
                          readOnly
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-xs font-medium text-gray-700">
                          Rate
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-right"
                          value={item.rate.toLocaleString('id-ID')}
                          readOnly
                        />
                      </div>
                      <div className="text-right">
                        <label className="block text-xs font-medium text-gray-700">
                          Amount
                        </label>
                        <input
                          type="text"
                          readOnly
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right font-semibold"
                          value={item.amount.toLocaleString('id-ID')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Income Account
                        </label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                          value={item.income_account}
                          readOnly
                        />
                      </div>
                    </div>
                    {/* DN/SO Fields */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Delivery Note
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.delivery_note || ''}
                          readOnly
                          placeholder="Select DN above..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Sales Order
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.sales_order || ''}
                          readOnly
                          placeholder="Auto-filled from DN..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          SO Detail
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50"
                          value={item.so_detail || ''}
                          readOnly
                          placeholder="Auto-filled from DN..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Komisi Sales
                        </label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-sm bg-gray-50 text-right"
                          value={item.custom_komisi_sales ? item.custom_komisi_sales.toLocaleString('id-ID') : '0'}
                          readOnly
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="mt-2 text-red-600 text-sm hover:text-red-800 hidden"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                {/* Total Summary */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-end">
                    <div className="grid grid-cols-3 gap-8 text-sm">
                      <div className="text-left">
                        <div className="text-gray-600">Total Komisi Sales:</div>
                        <div className="font-semibold text-gray-900">
                          Rp {formData.items.reduce((sum, item) => sum + (item.custom_komisi_sales || 0), 0).toLocaleString('id-ID')}
                        </div>
                      </div>
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
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    // Reset form state saat cancel
                    setEditingInvoice(null);
                    setEditingInvoiceStatus(null);
                    setFormData({
                      customer: '',
                      customer_name: '',
                      posting_date: new Date().toISOString().split('T')[0],
                      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      // ❌ HAPUS delivery_note dari header
                      items: [{
                        item_code: '',
                        item_name: '',
                        qty: 1,
                        rate: 0,
                        amount: 0,
                        income_account: '411000 - Penjualan - ST',
                        cost_center: 'Main - ST',
                        warehouse: 'Finished Goods - ST',
                        // SO/DN fields di items, bukan header
                        sales_order: '',
                        so_detail: '',
                        dn_detail: '',
                        delivery_note: '',
                        custom_komisi_sales: 0, // ✅ Custom komisi sales per item
                      }],
                      company: selectedCompany,
                      currency: 'IDR',
                      price_list_currency: 'IDR',
                      plc_conversion_rate: 1,
                      selling_price_list: 'Standard Selling',
                      territory: 'All Territories',
                      tax_id: '',
                      customer_address: '',
                      shipping_address: '',
                      contact_person: '',
                      tax_category: 'On Net Total',
                      taxes_and_charges: '',
                      base_total: 0,
                      base_net_total: 0,
                      base_grand_total: 0,
                      total: 0,
                      net_total: 0,
                      grand_total: 0,
                      outstanding_amount: 0,
                      custom_total_komisi_sales: 0, // ✅ Custom total komisi sales di header
                    });
                    setError('');
                    setShowForm(false);
                  }}
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
                    <p className="mt-1 text-sm text-gray-900">Customer: {invoice.customer_name || invoice.customer}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'Unpaid'
                          ? 'bg-red-100 text-red-800'
                          : invoice.status === 'Submitted'
                          ? 'bg-blue-100 text-blue-800'
                          : invoice.status === 'Draft'
                            ? 'bg-yellow-100 text-yellow-800'
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
                      Posting Date: {invoice.posting_date}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Due Date: {invoice.due_date}
                    </p>
                    {invoice.items && invoice.items.length > 0 && invoice.items.find((item: InvoiceItem) => item.delivery_note) && (
                      <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                        DN: {invoice.items.find((item: InvoiceItem) => item.delivery_note)?.delivery_note || '-'}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between sm:mt-0">
                    <div className="text-right">
                      <div className="font-medium text-sm text-gray-900">Total: Rp {invoice.grand_total ? invoice.grand_total.toLocaleString('id-ID') : '0'}</div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-green-600">
                          Paid: Rp {(invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs text-orange-600">
                          Outstanding: Rp {invoice.outstanding_amount ? invoice.outstanding_amount.toLocaleString('id-ID') : '0'}
                        </span>
                      </div>
                      {/* Payment Progress Bar */}
                      {invoice.grand_total && invoice.grand_total > 0 && (
                        <div className="mt-2 w-32">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(((invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0) / invoice.grand_total) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(((invoice.paid_amount || (invoice.grand_total - invoice.outstanding_amount) || 0) / invoice.grand_total) * 100)}% Paid
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Submit Button for Draft Invoices */}
                    {invoice.status === 'Draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening invoice details
                          handleSubmitSalesInvoice(invoice.name);
                        }}
                        disabled={submittingInvoice === invoice.name}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        {submittingInvoice === invoice.name ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          'Submit'
                        )}
                      </button>
                    )}
                  </div>
                {invoice.custom_notes_si && (
                  <p className="mt-1 text-xs text-gray-400 truncate">Catatan: {invoice.custom_notes_si}</p>
                )}
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

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Delivery Note Dialog */}
      {showDeliveryNoteDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Select Delivery Note</h3>
                  <p className="text-sm text-gray-500 mt-1">This will replace all items with data from the selected Delivery Note</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeliveryNoteDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              {deliveryNotesLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading delivery notes...</p>
                </div>
              ) : deliveryNotesError ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
                  <p className="mt-1 text-sm text-gray-500">{deliveryNotesError}</p>
                </div>
              ) : deliveryNotes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Available Delivery Notes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No submitted delivery notes available for invoicing.
                  </p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {deliveryNotes.map((dn: { name: string; customer: string; customer_name?: string; status: string; grand_total?: number; posting_date?: string }) => (
                      <li
                        key={dn.name}
                        onClick={() => handleSelectDeliveryNote(dn.name)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {dn.name}
                              </p>
                              <p className="mt-1 text-sm text-gray-900">Customer: {dn.customer_name || dn.customer}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${dn.status === 'To Bill'
                                    ? 'bg-green-100 text-green-800'
                                    : dn.status === 'Submitted'
                                      ? 'bg-blue-100 text-blue-800'
                                      : dn.status === 'Completed'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                  }`}
                              >
                                {dn.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex">
                              <p className="flex items-center text-sm text-gray-500">
                                Date: {dn.posting_date}
                              </p>
                              {/* Sales order field not available in list view
                              {dn.sales_order && (
                                <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                                  SO: {dn.sales_order}
                                </p>
                              )} */}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              <span className="font-medium">Total: Rp {dn.grand_total ? dn.grand_total.toLocaleString('id-ID') : '0'}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeliveryNoteDialog(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
