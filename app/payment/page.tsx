'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import PaymentCustomerDialog from '../components/PaymentCustomerDialog';
import PaymentSupplierDialog from '../components/PaymentSupplierDialog';

interface SalesInvoice {
  name: string;
  customer: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
}

interface PaymentEntry {
  name: string;
  payment_type: string;
  party: string;
  party_type: string;
  paid_amount: number;
  received_amount: number;
  status: string;
  posting_date: string;
  total_allocated_amount: number;
  references: Array<{
    reference_doctype: string;
    reference_name: string;
    allocated_amount: number;
  }>;
}

interface CompanyAccount {
  name: string;
  account_type: string;
}

interface PaymentFormData {
  payment_type: 'Receive' | 'Pay';
  party_type: 'Customer' | 'Supplier';
  party: string;
  posting_date: string;
  paid_amount: number;
  received_amount: number;
  mode_of_payment: string;
  company: string;
  debit_account: string;
  credit_account: string;
  check_number?: string;
  check_date?: string;
  bank_reference?: string;
  selected_invoices: Array<{
    invoice_name: string;
    invoice_total: number;
    outstanding_amount: number;
    allocated_amount: number;
  }>;
}

export default function PaymentPage() {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [customers, setCustomers] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  
  // Modal states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    payment_type: 'Receive',
    party_type: 'Customer',
    party: '',
    posting_date: new Date().toISOString().split('T')[0],
    paid_amount: 0,
    received_amount: 0,
    mode_of_payment: 'Cash',
    company: '',
    debit_account: '',
    credit_account: '',
    check_number: '',
    check_date: '',
    bank_reference: '',
    selected_invoices: [],
  });
  
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState('');
  const [companyAccounts, setCompanyAccounts] = useState<any>({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dateFilter, setDateFilter] = useState({
    from_date: '',
    to_date: ''
  });
  
  const router = useRouter();

  useEffect(() => {
    // Check if company is selected
    const savedCompany = localStorage.getItem('selected_company');
    if (!savedCompany) {
      // Redirect to company selection if no company selected
      window.location.href = '/select-company';
      return;
    }

    setSelectedCompany(savedCompany);
    setFormData(prev => ({ ...prev, company: savedCompany }));
  }, []);

  // Fetch company default accounts
  const fetchCompanyAccounts = useCallback(async () => {
    if (!selectedCompany) return;
    
    setLoadingAccounts(true);
    try {
      console.log('🏦 Fetching company accounts for:', selectedCompany);
      const response = await fetch(`/api/company-accounts?company=${selectedCompany}`);
      const data = await response.json();
      
      if (data.success) {
        setCompanyAccounts(data.data || {});
        console.log('✅ Company accounts loaded:', data.data);
        console.log('🤖 Accounts will be automatically selected based on payment type and mode');
      } else {
        console.error('❌ Failed to fetch company accounts:', data.message);
        setCompanyAccounts({});
      }
    } catch (err) {
      console.error('❌ Error fetching company accounts:', err);
      setCompanyAccounts({});
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedCompany]);

  // Auto-update debit and credit accounts when payment type or mode changes
  useEffect(() => {
    if (!companyAccounts.available_accounts || !selectedCompany) return;
    
    console.log('🤖 Auto-updating accounts based on payment type and mode:', {
      paymentType: formData.payment_type,
      paymentMode: formData.mode_of_payment
    });
    
    // Auto-select debit account
    let newDebitAccount = '';
    if (formData.payment_type === 'Receive') {
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        newDebitAccount = companyAccounts.default_bank_account || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        newDebitAccount = companyAccounts.default_credit_card_account || 'Credit Card';
      } else {
        newDebitAccount = companyAccounts.default_cash_account || 'Cash Account';
      }
    } else {
      newDebitAccount = companyAccounts.default_payable_account || 'Accounts Payable';
    }
    
    // Auto-select credit account
    let newCreditAccount = '';
    if (formData.payment_type === 'Receive') {
      newCreditAccount = companyAccounts.default_receivable_account || 'Accounts Receivable';
    } else {
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        newCreditAccount = companyAccounts.default_bank_account || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        newCreditAccount = companyAccounts.default_credit_card_account || 'Credit Card';
      } else {
        newCreditAccount = companyAccounts.default_cash_account || 'Cash Account';
      }
    }
    
    setFormData(prev => ({
      ...prev,
      debit_account: newDebitAccount,
      credit_account: newCreditAccount
    }));
    
    console.log('✅ Accounts auto-selected:', {
      debit: newDebitAccount,
      credit: newCreditAccount
    });
  }, [formData.payment_type, formData.mode_of_payment, companyAccounts, selectedCompany]);

  // Fetch company accounts when company changes
  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyAccounts();
    }
  }, [selectedCompany, fetchCompanyAccounts]);

  // Fetch customers and suppliers
  const fetchParties = useCallback(async () => {
    if (!selectedCompany) return;
    
    try {
      console.log('Fetching parties for company:', selectedCompany);
      
      // Fetch customers
      const customerResponse = await fetch(`/api/customers?company=${selectedCompany}`);
      const customerData = await customerResponse.json();
      console.log('Customers response:', customerData);
      if (customerData.success) {
        const customerList = customerData.data?.map((c: any) => c.name) || [];
        setCustomers(customerList);
        console.log('Customers loaded:', customerList);
      } else {
        console.error('Failed to fetch customers:', customerData.message);
      }

      // Fetch suppliers
      const supplierResponse = await fetch(`/api/suppliers?company=${selectedCompany}`);
      const supplierData = await supplierResponse.json();
      console.log('Suppliers response:', supplierData);
      if (supplierData.success) {
        const supplierList = supplierData.data?.map((s: any) => s.name) || [];
        setSuppliers(supplierList);
        console.log('Suppliers loaded:', supplierList);
      } else {
        console.error('Failed to fetch suppliers:', supplierData.message);
      }
    } catch (err) {
      console.error('Error fetching parties:', err);
    }
  }, [selectedCompany]);

  // Handle customer selection from dialog
  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      party: customer.name
    }));
    
    // Auto-fetch outstanding invoices for customer
    fetchOutstandingInvoices(customer.name);
  };

  // Handle supplier selection from dialog
  const handleSupplierSelect = (supplier: { name: string; supplier_name: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      party: supplier.name
    }));
    
    // Clear outstanding invoices for supplier (suppliers don't have invoices)
    setOutstandingInvoices([]);
  };

  // Fetch outstanding invoices when customer is selected
  const fetchOutstandingInvoices = useCallback(async (customer: string) => {
    if (!customer || !selectedCompany) {
      setOutstandingInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    try {
      console.log(`🔍 Fetching outstanding invoices for customer: ${customer}, company: ${selectedCompany}`);
      const response = await fetch(`/api/outstanding-invoices?customer=${customer}&company=${selectedCompany}`);
      const data = await response.json();
      
      console.log('📊 Outstanding Invoices API Response:', data);
      
      if (data.success) {
        console.log(`✅ Found ${data.data?.length || 0} outstanding invoices`);
        setOutstandingInvoices(data.data || []);
      } else {
        console.error('❌ Failed to fetch outstanding invoices:', data.message);
        setOutstandingInvoices([]);
      }
    } catch (err) {
      console.error('❌ Error fetching outstanding invoices:', err);
      setOutstandingInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedCompany]);

  const fetchPayments = useCallback(async () => {
    setError('');
    
    if (!selectedCompany) {
      setError('No company selected. Please select a company first.');
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams({
        company: selectedCompany,
        limit_page_length: pageSize.toString(),
        start: ((currentPage - 1) * pageSize).toString()
      });
      
      const filters = [["company", "=", selectedCompany]];
      if (dateFilter.from_date) filters.push(["posting_date", ">=", dateFilter.from_date]);
      if (dateFilter.to_date) filters.push(["posting_date", "<=", dateFilter.to_date]);
      
      params.append('filters', JSON.stringify(filters));
      
      const response = await fetch(`/api/payment?${params}`);
      const data = await response.json();

      if (data.success) {
        if (data.total_records !== undefined) {
          setTotalRecords(data.total_records);
          setTotalPages(Math.ceil(data.total_records / pageSize));
        } else {
          setTotalRecords(data.data?.length || 0);
          setTotalPages(1);
        }
        
        setPayments(data.data || []);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch payments');
      }
    } catch (err) {
      setError('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, currentPage, pageSize, dateFilter]);

  useEffect(() => {
    fetchPayments();
    fetchParties();
  }, [fetchPayments, fetchParties]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  // Handle party change
  const handlePartyChange = (party: string) => {
    setFormData(prev => ({ 
      ...prev, 
      party,
      selected_invoices: [],
      received_amount: 0,
      paid_amount: 0
    }));
    
    if (formData.party_type === 'Customer' && party) {
      fetchOutstandingInvoices(party);
    } else {
      setOutstandingInvoices([]);
    }
  };

  // Handle party type change
  const handlePartyTypeChange = (paymentType: 'Receive' | 'Pay') => {
    const newPartyType = paymentType === 'Receive' ? 'Customer' : 'Supplier';
    
    setFormData(prev => ({ 
      ...prev, 
      payment_type: paymentType,
      party_type: newPartyType,
      party: '',  
    }));
    
    // Clear outstanding invoices when switching party type
    setOutstandingInvoices([]);
  };

  // Get filtered accounts for dropdowns
  const getFilteredAccounts = useCallback((accountType: 'debit' | 'credit'): CompanyAccount[] => {
    if (!companyAccounts.available_accounts) return [];
    
    return companyAccounts.available_accounts.filter((account: CompanyAccount) => {
      // For Receive Payment (AR)
      if (formData.payment_type === 'Receive') {
        // Debit: Cash/Bank accounts (menerima uang) - depends on payment mode
        if (accountType === 'debit') {
          if (formData.mode_of_payment === 'Warkat') {
            // For Warkat: show bank accounts primarily
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank') ||
                   account.name.toLowerCase().includes('cek') ||
                   account.name.toLowerCase().includes('warkat') ||
                   account.name.toLowerCase().includes('giro');
          } else if (formData.mode_of_payment === 'Bank Transfer') {
            // For Bank Transfer: show bank accounts
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank');
          } else if (formData.mode_of_payment === 'Credit Card') {
            // For Credit Card: show credit card accounts
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank') ||
                   account.name.toLowerCase().includes('credit') ||
                   account.name.toLowerCase().includes('card');
          } else {
            // For Cash: show cash accounts
            return ['Cash', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('cash') ||
                   account.name.toLowerCase().includes('kas');
          }
        }
        // Credit: Receivable accounts (mengurangi piutang) - same for all modes
        if (accountType === 'credit') {
          return ['Receivable'].includes(account.account_type) ||
                 account.name.toLowerCase().includes('receivable') ||
                 account.name.toLowerCase().includes('piutang');
        }
      }
      
      // For Pay Payment (AP)
      if (formData.payment_type === 'Pay') {
        // Debit: Expense/Purchase accounts (menambah expense) - same for all modes
        if (accountType === 'debit') {
          return ['Expense', 'Purchase', 'Cost'].includes(account.account_type) ||
                 account.name.toLowerCase().includes('expense') ||
                 account.name.toLowerCase().includes('purchase') ||
                 account.name.toLowerCase().includes('biaya') ||
                 account.name.toLowerCase().includes('belanja');
        }
        // Credit: Cash/Bank accounts (mengeluarkan uang) - depends on payment mode
        if (accountType === 'credit') {
          if (formData.mode_of_payment === 'Warkat') {
            // For Warkat: show bank accounts primarily
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank') ||
                   account.name.toLowerCase().includes('cek') ||
                   account.name.toLowerCase().includes('warkat') ||
                   account.name.toLowerCase().includes('giro');
          } else if (formData.mode_of_payment === 'Bank Transfer') {
            // For Bank Transfer: show bank accounts
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank');
          } else if (formData.mode_of_payment === 'Credit Card') {
            // For Credit Card: show credit card accounts
            return ['Bank', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('bank') ||
                   account.name.toLowerCase().includes('credit') ||
                   account.name.toLowerCase().includes('card');
          } else {
            // For Cash: show cash accounts
            return ['Cash', 'Asset'].includes(account.account_type) || 
                   account.name.toLowerCase().includes('cash') ||
                   account.name.toLowerCase().includes('kas');
          }
        }
      }
      
      return false;
    });
  }, [companyAccounts.available_accounts, formData.payment_type, formData.mode_of_payment]);

  // Calculate total outstanding for validation
  const getTotalOutstanding = useCallback(() => {
    return outstandingInvoices.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0);
  }, [outstandingInvoices]);

  // Calculate allocation preview (ERPNext FIFO logic)
  const calculateAllocationPreview = useCallback((paymentAmount: number, invoices: any[]) => {
    if (!invoices.length || paymentAmount <= 0) return { allocation: [], unallocated: paymentAmount };

    // ERPNext FIFO: Sort by due date ascending (yang paling tua duluan)
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    let remainingAmount = paymentAmount;
    const allocation = sortedInvoices.map(invoice => {
      const allocatedAmount = Math.min(remainingAmount, invoice.outstanding_amount);
      remainingAmount -= allocatedAmount;
      
      return {
        ...invoice,
        allocated_amount: allocatedAmount,
        remaining_outstanding: invoice.outstanding_amount - allocatedAmount,
        allocation_status: allocatedAmount === invoice.outstanding_amount ? 'Paid' :
                           allocatedAmount > 0 ? 'Partially Paid' : 'Unpaid'
      };
    });

    return { 
      allocation, 
      unallocated: Math.max(0, remainingAmount),
      totalAllocated: paymentAmount - Math.max(0, remainingAmount)
    };
  }, []);

  // Get journal entry preview - Fully Automatic
  const getJournalPreview = useCallback((paymentAmount: number, allocation: any) => {
    const totalAllocated = allocation.totalAllocated || 0;
    const unallocated = paymentAmount - totalAllocated;
    
    console.log('🤖 Automatic Journal Preview:', {
      paymentType: formData.payment_type,
      paymentMode: formData.mode_of_payment,
      companyAccounts: companyAccounts
    });
    
    // For Receive Payment: Debit Cash/Bank, Credit Receivable
    if (formData.payment_type === 'Receive') {
      // Automatic debit account based on payment mode
      let debitAccount = '';
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        debitAccount = companyAccounts.default_bank_account || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        debitAccount = companyAccounts.default_credit_card_account || 'Credit Card';
      } else {
        debitAccount = companyAccounts.default_cash_account || 'Cash Account';
      }
      
      // Automatic credit account
      const creditAccount = companyAccounts.default_receivable_account || 'Accounts Receivable';
      
      console.log('✅ Automatic Receive Payment Journal:', {
        debit: debitAccount,
        credit: creditAccount,
        amount: paymentAmount
      });
      
      return {
        debit: {
          account: debitAccount,
          amount: paymentAmount
        },
        credits: [
          {
            account: creditAccount,
            amount: totalAllocated,
            reference: 'Customer Invoice Payments'
          },
          ...(unallocated > 0 ? [{
            account: companyAccounts.default_advance_account || 'Customer Advance',
            amount: unallocated,
            reference: 'Customer Overpayment'
          }] : [])
        ]
      };
    }
    
    // For Pay Payment: Debit Expense, Credit Cash/Bank
    if (formData.payment_type === 'Pay') {
      // Automatic debit account
      const debitAccount = companyAccounts.default_payable_account || 'Accounts Payable';
      
      // Automatic credit account based on payment mode
      let creditAccount = '';
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        creditAccount = companyAccounts.default_bank_account || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        creditAccount = companyAccounts.default_credit_card_account || 'Credit Card';
      } else {
        creditAccount = companyAccounts.default_cash_account || 'Cash Account';
      }
      
      console.log('✅ Automatic Pay Payment Journal:', {
        debit: debitAccount,
        credit: creditAccount,
        amount: paymentAmount
      });
      
      return {
        debit: {
          account: debitAccount,
          amount: paymentAmount
        },
        credits: [
          {
            account: creditAccount,
            amount: totalAllocated,
            reference: 'Supplier Bill Payments'
          },
          ...(unallocated > 0 ? [{
            account: companyAccounts.default_advance_account || 'Supplier Advance',
            amount: unallocated,
            reference: 'Supplier Overpayment'
          }] : [])
        ]
      };
    }
    
    // Fallback (should not reach here)
    return {
      debit: {
        account: 'Unknown Account',
        amount: paymentAmount
      },
      credits: []
    };
  }, [formData.payment_type, formData.mode_of_payment, companyAccounts]);

  // Fetch outstanding invoices when customer is selected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
      const totalOutstanding = getTotalOutstanding();
      
      // Overpayment confirmation
      if (formData.party_type === 'Customer' && paymentAmount > totalOutstanding && totalOutstanding > 0) {
        const confirmOverpayment = window.confirm(
          `⚠️ Overpayment Detected\n\n` +
          `Payment Amount: Rp ${paymentAmount.toLocaleString('id-ID')}\n` +
          `Total Outstanding: Rp ${totalOutstanding.toLocaleString('id-ID')}\n` +
          `Excess Amount: Rp ${(paymentAmount - totalOutstanding).toLocaleString('id-ID')}\n\n` +
          `Excess amount will be created as customer credit and can be used for future payments.\n\n` +
          `Do you want to proceed with this overpayment?`
        );
        
        if (!confirmOverpayment) {
          setFormLoading(false);
          return;
        }
      }

      // Build payment payload (simplified - ERPNext handles allocation)
      const paymentPayload = {
        company: selectedCompany,
        payment_type: formData.payment_type,
        party_type: formData.party_type,
        party: formData.party,
        posting_date: formData.posting_date,
        paid_amount: formData.payment_type === 'Pay' ? formData.paid_amount : 0,
        received_amount: formData.payment_type === 'Receive' ? formData.received_amount : 0,
        mode_of_payment: formData.mode_of_payment
        // ERPNext will auto-allocate to outstanding invoices
      };

      console.log('🚀 Submitting Payment:', paymentPayload);

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();

      if (data.success) {
        let successMessage = `✅ Payment Entry ${data.data?.name || 'created'} berhasil dibuat!\n\n💰 Total: Rp ${paymentAmount.toLocaleString('id-ID')}`;
        
        if (formData.party_type === 'Customer' && paymentAmount > totalOutstanding && totalOutstanding > 0) {
          successMessage += `\n💳 Customer Credit: Rp ${(paymentAmount - totalOutstanding).toLocaleString('id-ID')}`;
        }
        
        successMessage += `\n\n🔔 ERPNext akan otomatis mengalokasikan pembayaran ke invoice yang outstanding.`;
        
        setSuccessMessage(successMessage);
        
        setShowForm(false);
        resetForm();
        fetchPayments();
        
        // Clear success message after 8 seconds
        setTimeout(() => setSuccessMessage(''), 8000);
      } else {
        setError(data.message || 'Failed to create payment');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      payment_type: 'Receive',
      party_type: 'Customer',
      party: '',
      posting_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      received_amount: 0,
      mode_of_payment: 'Cash',
      company: selectedCompany,
      debit_account: '',
      credit_account: '',
      check_number: '',
      check_date: '',
      bank_reference: '',
      selected_invoices: [],
    });
    setOutstandingInvoices([]);
    setEditingPayment(null);
    setEditingPaymentStatus('');
  };

  if (loading) {
    return <LoadingSpinner message="Loading Payments..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Payment
        </button>
      </div>

      {/* Success Message */}
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
              <button
                onClick={() => setSuccessMessage('')}
                className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Date Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={dateFilter.from_date}
              onChange={(e) => setDateFilter({ ...dateFilter, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
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

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPayment ? 'Edit Payment Entry' : 'Create Payment Entry'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.payment_type}
                    onChange={(e) => handlePartyTypeChange(e.target.value as 'Receive' | 'Pay')}
                  >
                    <option value="Receive">Receive Payment</option>
                    <option value="Pay">Make Payment</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.party_type}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={formData.party}
                      readOnly
                      placeholder={`Select ${formData.party_type}`}
                      className="mt-1 block flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => formData.party_type === 'Customer' ? setShowCustomerDialog(true) : setShowSupplierDialog(true)}
                      className="mt-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center"
                      title={`Browse ${formData.party_type}s`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    {formData.party && (
                      <button
                        type="button"
                        onClick={() => handlePartyChange('')}
                        className="mt-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
                        title="Clear selection"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posting Date</label>
                  <input
                    type="date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.posting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, posting_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Payment</label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.mode_of_payment}
                    onChange={(e) => {
                      const newMode = e.target.value;
                      setFormData(prev => ({ ...prev, mode_of_payment: newMode }));
                      
                      console.log('🤖 Payment mode changed to:', newMode);
                      console.log('🤖 Accounts will be automatically selected in journal preview');
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Warkat">Warkat</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
              </div>

              {/* Account Selection - Dropdown dengan Auto-Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🏦 {formData.payment_type === 'Receive' ? 'Debit Account (Cash/Bank)' : 'Debit Account (Expense/Purchase)'}
                    <span className="text-xs text-green-600 ml-1">
                      ✅ Auto-selected
                    </span>
                  </label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.debit_account || (formData.payment_type === 'Receive' ? 
                      (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat' ? 
                        companyAccounts.default_bank_account || 'Bank Account' :
                       formData.mode_of_payment === 'Credit Card' ? 
                        companyAccounts.default_credit_card_account || 'Credit Card' :
                       companyAccounts.default_cash_account || 'Cash Account') :
                      companyAccounts.default_payable_account || 'Accounts Payable')
                    }
                    onChange={(e) => {
                      const selectedAccount = e.target.value;
                      setFormData(prev => ({ ...prev, debit_account: selectedAccount }));
                      console.log('🏦 Debit account changed to:', selectedAccount);
                    }}
                  >
                    {getFilteredAccounts('debit').map((account: CompanyAccount) => (
                      <option key={account.name} value={account.name}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-green-600 mt-1">
                    💡 Automatically selected based on payment type and mode
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💳 {formData.payment_type === 'Receive' ? 'Credit Account (Receivable)' : 'Credit Account (Cash/Bank)'}
                    <span className="text-xs text-green-600 ml-1">
                      ✅ Auto-selected
                    </span>
                  </label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.credit_account || (formData.payment_type === 'Receive' ? 
                      companyAccounts.default_receivable_account || 'Accounts Receivable' :
                      (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat' ? 
                        companyAccounts.default_bank_account || 'Bank Account' :
                       formData.mode_of_payment === 'Credit Card' ? 
                        companyAccounts.default_credit_card_account || 'Credit Card' :
                       companyAccounts.default_cash_account || 'Cash Account'))
                    }
                    onChange={(e) => {
                      const selectedAccount = e.target.value;
                      setFormData(prev => ({ ...prev, credit_account: selectedAccount }));
                      console.log('💳 Credit account changed to:', selectedAccount);
                    }}
                  >
                    {getFilteredAccounts('credit').map((account: CompanyAccount) => (
                      <option key={account.name} value={account.name}>
                        {account.name} ({account.account_type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-green-600 mt-1">
                    💡 Automatically selected based on payment type and mode
                  </p>
                </div>
              </div>

              {/* Account Selection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h6 className="text-sm font-medium text-blue-900">🤖 Smart Account Selection</h6>
                </div>
                <div className="mt-2 text-xs text-blue-700">
                  <p>✅ Accounts are automatically selected based on:</p>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• <strong>Payment Type:</strong> {formData.payment_type === 'Receive' ? 'Receive Payment (AR)' : 'Pay Payment (AP)'}</li>
                    <li>• <strong>Payment Mode:</strong> {formData.mode_of_payment}</li>
                    <li>• <strong>Company Defaults:</strong> Your company's default accounts</li>
                  </ul>
                  <p className="mt-2 font-medium">🎯 This prevents accounting errors and ensures compliance.</p>
                </div>
              </div>

              {/* Warkat Payment Details */}
              {formData.mode_of_payment === 'Warkat' && (
                <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                  <h5 className="text-md font-medium text-gray-900 mb-4">💳 Warkat Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warkat Number
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.check_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, check_number: e.target.value }))}
                        placeholder="e.g., 001234"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warkat Date
                      </label>
                      <input
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.check_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, check_date: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Reference
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={formData.bank_reference}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_reference: e.target.value }))}
                        placeholder="e.g., BCA, Mandiri"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Outstanding Invoices Display */}
              {formData.party_type === 'Customer' && formData.party && (
                <div className="border rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Outstanding Invoices</h4>
                    <div className="text-sm text-gray-600">
                      <span className="mr-3">
                        {outstandingInvoices.length} invoice(s) • Total: Rp {getTotalOutstanding().toLocaleString('id-ID')}
                      </span>
                      {formData.selected_invoices.length > 0 && (
                        <span className="text-indigo-600 font-medium">
                          {formData.selected_invoices.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {loadingInvoices ? (
                    <div className="text-center py-4">
                      <LoadingSpinner message="Loading outstanding invoices..." />
                    </div>
                  ) : outstandingInvoices.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No outstanding invoices found for this customer
                    </div>
                  ) : (
                    <>
                      {/* Helper text for checkbox functionality */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-1">📋 Invoice Selection Instructions:</p>
                            <ul className="ml-4 space-y-1">
                              <li>• Check the box next to invoices you want to pay</li>
                              <li>• Enter allocation amount for each selected invoice</li>
                              <li>• Leave allocation amount blank to use full outstanding amount</li>
                              <li>• Total payment will be calculated based on your selections</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                      {outstandingInvoices.map(invoice => (
                        <div key={invoice.name} className="border rounded p-3 bg-gray-50">
                          <div className="flex items-start space-x-3">
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={formData.selected_invoices.some(selected => selected.invoice_name === invoice.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Add invoice to selected_invoices
                                    setFormData(prev => ({
                                      ...prev,
                                      selected_invoices: [
                                        ...prev.selected_invoices,
                                        {
                                          invoice_name: invoice.name,
                                          invoice_total: invoice.grand_total,
                                          outstanding_amount: invoice.outstanding_amount,
                                          allocated_amount: 0
                                        }
                                      ]
                                    }));
                                  } else {
                                    // Remove invoice from selected_invoices
                                    setFormData(prev => ({
                                      ...prev,
                                      selected_invoices: prev.selected_invoices.filter(
                                        selected => selected.invoice_name !== invoice.name
                                      )
                                    }));
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{invoice.name}</p>
                                  <p className="text-sm text-gray-500">
                                    Due: {invoice.due_date} | Total: Rp {invoice.grand_total.toLocaleString('id-ID')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-orange-600">
                                    Outstanding: Rp {invoice.outstanding_amount.toLocaleString('id-ID')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {invoice.outstanding_amount > 0 ? 'Unpaid' : 'Paid'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Allocation amount input for selected invoices */}
                              {formData.selected_invoices.some(selected => selected.invoice_name === invoice.name) && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Allocation Amount (Max: Rp {invoice.outstanding_amount.toLocaleString('id-ID')})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={invoice.outstanding_amount}
                                    step="0.01"
                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter allocation amount"
                                    onChange={(e) => {
                                      const allocationAmount = parseFloat(e.target.value) || 0;
                                      setFormData(prev => ({
                                        ...prev,
                                        selected_invoices: prev.selected_invoices.map(selected =>
                                          selected.invoice_name === invoice.name
                                            ? { ...selected, allocated_amount: allocationAmount }
                                            : selected
                                        )
                                      }));
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    </>
                  )}
                </div>
              )}

              {/* Payment Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {formData.payment_type === 'Receive' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Amount
                      {outstandingInvoices.length > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          (Total Outstanding: Rp {getTotalOutstanding().toLocaleString('id-ID')})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        formData.received_amount > getTotalOutstanding() && getTotalOutstanding() > 0
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-300'
                      }`}
                      value={formData.received_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        received_amount: parseFloat(e.target.value) || 0 
                      }))}
                      required
                    />
                    
                    {/* Overpayment Validation & Warning */}
                    {formData.received_amount > getTotalOutstanding() && getTotalOutstanding() > 0 && (
                      <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-orange-800">
                              ⚠️ Overpayment Detected
                            </h3>
                            <div className="mt-1 text-sm text-orange-700">
                              <p>Payment amount exceeds total outstanding by:</p>
                              <p className="font-medium">
                                Rp {(formData.received_amount - getTotalOutstanding()).toLocaleString('id-ID')}
                              </p>
                              <p className="mt-1 text-xs">
                                💡 Excess amount will be created as customer credit and can be used for future payments.
                              </p>
                            </div>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ 
                                  ...prev, 
                                  received_amount: getTotalOutstanding() 
                                }))}
                                className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded border border-orange-300"
                              >
                                Adjust to Total Outstanding
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.paid_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Allocation Preview */}
              {formData.party_type === 'Customer' && outstandingInvoices.length > 0 && (
                (() => {
                  const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
                  if (paymentAmount <= 0) return null;
                  
                  const preview = calculateAllocationPreview(paymentAmount, outstandingInvoices);
                  
                  return (
                    <div className="border rounded-lg p-4 mb-6 bg-blue-50 border-blue-200">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-md font-medium text-blue-900">
                          📊 Payment Allocation Preview (FIFO by Due Date)
                        </h5>
                        <span className="text-sm text-blue-700 font-medium">
                          Payment: Rp {paymentAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {preview.allocation.map((invoice) => (
                          <div key={invoice.name} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-100">
                            <div className="flex-1">
                              <span className="font-medium text-blue-800">{invoice.name}</span>
                              <span className="text-gray-500 ml-2">
                                (Due: {invoice.due_date})
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-blue-700">
                                Rp {invoice.outstanding_amount.toLocaleString('id-ID')} → 
                                <span className={`font-medium ml-1 ${
                                  invoice.allocation_status === 'Paid' ? 'text-green-600' :
                                  invoice.allocation_status === 'Partially Paid' ? 'text-orange-600' :
                                  'text-gray-500'
                                }`}>
                                  {' '}Rp {invoice.allocated_amount.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {invoice.allocation_status}
                                {invoice.remaining_outstanding > 0 && 
                                  ` (Sisa: Rp ${invoice.remaining_outstanding.toLocaleString('id-ID')})`
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-blue-200 pt-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-blue-900">Total Allocated:</span>
                          <span className="font-bold text-blue-900">
                            Rp {(preview.totalAllocated || 0).toLocaleString('id-ID')} / Rp {paymentAmount.toLocaleString('id-ID')}
                            ({Math.round(((preview.totalAllocated || 0) / paymentAmount) * 100)}%)
                          </span>
                        </div>
                        {preview.unallocated > 0 && (
                          <div className="flex justify-between items-center text-sm mt-1">
                            <span className="text-orange-600">Unallocated:</span>
                            <span className="font-medium text-orange-600">
                              Rp {preview.unallocated.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 text-xs text-blue-600">
                        💡 ERPNext akan otomatis mengalokasikan pembayaran ke invoice terlebih dahulu berdasarkan tanggal jatuh tempo (FIFO)
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Journal Entry Preview */}
              {formData.party_type === 'Customer' && outstandingInvoices.length > 0 && (
                (() => {
                  const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
                  if (paymentAmount <= 0) return null;
                  
                  const preview = calculateAllocationPreview(paymentAmount, outstandingInvoices);
                  const journal = getJournalPreview(paymentAmount, preview);
                  
                  return (
                    <div className="border rounded-lg p-4 mb-6 bg-gray-50 border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-md font-medium text-gray-900">
                          📋 Journal Entry Preview
                        </h5>
                        <span className="text-sm text-gray-600">
                          Accounting Entries
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm font-mono">
                        {/* Success indicator for automatic selection */}
                        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                          ✅ <strong>Automatic Account Selection:</strong> Accounts are selected based on payment type and mode to prevent errors.
                        </div>
                        
                        <div className="flex justify-between items-center text-green-600">
                          <span>🏦 Debit: {journal.debit.account}</span>
                          <span className="font-medium">Rp {journal.debit.amount.toLocaleString('id-ID')}</span>
                        </div>
                        
                        <div className="border-t border-gray-300 pt-2 space-y-1">
                          {journal.credits.map((credit, index) => (
                            <div key={index} className="flex justify-between items-center text-red-600">
                              <span>💳 Credit: {credit.account}</span>
                              <span className="font-medium">Rp {credit.amount.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-900">Total Debit:</span>
                          <span className="font-bold text-green-600">
                            Rp {journal.debit.amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-900">Total Credit:</span>
                          <span className="font-bold text-red-600">
                            Rp {journal.credits.reduce((sum, credit) => sum + credit.amount, 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        💡 Journal entries will be automatically created by ERPNext when payment is submitted
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {formLoading ? 'Processing...' : (editingPayment ? 'Update Payment' : 'Create Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <li 
              key={payment.name}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {payment.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {payment.party_type}: {payment.party}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'Submitted'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'Draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Type: {payment.payment_type}
                    </p>
                    <p className="mt-2 sm:mt-0 sm:ml-6 flex items-center text-sm text-gray-500">
                      Date: {payment.posting_date}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    {payment.payment_type === 'Receive' ? (
                      <span className="text-green-600">
                        Received: {payment.received_amount ? payment.received_amount.toLocaleString('id-ID') : '0'}
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Paid: {payment.paid_amount ? payment.paid_amount.toLocaleString('id-ID') : '0'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {payments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No payments found</p>
          </div>
        )}
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Customer Selection Dialog */}
      <PaymentCustomerDialog
        isOpen={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        onSelect={handleCustomerSelect}
        company={selectedCompany}
      />

      {/* Supplier Selection Dialog */}
      <PaymentSupplierDialog
        isOpen={showSupplierDialog}
        onClose={() => setShowSupplierDialog(false)}
        onSelect={handleSupplierSelect}
        company={selectedCompany}
      />
    </div>
  );
}
