'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaymentCustomerDialog from '../../components/PaymentCustomerDialog';
import PaymentSupplierDialog from '../../components/PaymentSupplierDialog';
import CurrencyInput from '../../components/CurrencyInput';

interface SalesInvoice {
  name: string;
  customer: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  visual_outstanding?: number;
  status: string;
  allocated_amount?: number;
}

interface PurchaseInvoice {
  name: string;
  supplier: string;
  supplier_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  visual_outstanding?: number;
  status: string;
  allocated_amount?: number;
}

interface CompanyAccount {
  name: string;
  account_type: string;
  root_type: string;
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
  reference_no?: string;
  reference_date?: string;
  custom_notes_payment?: string;
  selected_invoices: Array<{
    invoice_name: string;
    invoice_total: number;
    outstanding_amount: number;
    allocated_amount: number;
  }>;
  // ERPNext specific fields
  paid_from?: string;
  paid_to?: string;
}

interface PaymentMainProps {
  onBack: () => void;
  selectedCompany: string;
  editPayment?: any;
  defaultPaymentType?: 'Receive' | 'Pay';
}

export default function PaymentMain({ onBack, selectedCompany, editPayment, defaultPaymentType }: PaymentMainProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const isEditModeRef = useRef(false);
  const [editingPaymentId, setEditingPaymentId] = useState('');
  const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoice[]>([]);
  const [outstandingPurchaseInvoices, setOutstandingPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Modal states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);

  // Display names for form
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');

  const [formData, setFormData] = useState<PaymentFormData>({
    payment_type: defaultPaymentType || 'Receive',
    party_type: (defaultPaymentType === 'Pay') ? 'Supplier' : 'Customer',
    party: '',
    posting_date: new Date().toISOString().split('T')[0],
    paid_amount: 0,
    received_amount: 0,
    mode_of_payment: 'Kas',
    company: selectedCompany,
    debit_account: '',
    credit_account: '',
    check_number: '',
    check_date: new Date().toISOString().split('T')[0],
    bank_reference: '',
    reference_no: '',
    reference_date: new Date().toISOString().split('T')[0],
    custom_notes_payment: '',
    selected_invoices: [],
    paid_from: '',
    paid_to: '',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState('');
  const [companyAccounts, setCompanyAccounts] = useState<any>({});
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showJournalPreview, setShowJournalPreview] = useState(false);

  // Fetch company default accounts
  const fetchCompanyAccounts = useCallback(async (skipAutoSelection = false) => {
    if (!selectedCompany) return;

    setLoadingAccounts(true);
    try {
      const response = await fetch(`/api/finance/company/accounts?company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setCompanyAccounts(data.data || {});

        // Trigger auto-selection immediately after company accounts are loaded
        // Skip if in edit mode or explicitly requested to skip
        if (!skipAutoSelection && !isEditModeRef.current && formData.payment_type && formData.mode_of_payment) {
          setTimeout(() => {
            // Double-check edit mode inside timeout to handle race conditions
            if (!isEditModeRef.current) {
              triggerAutoSelection(data.data || {}, formData.payment_type, formData.mode_of_payment);
            }
          }, 100);
        }
      } else {
        setCompanyAccounts({});
      }
    } catch (err) {
      console.error('Error fetching company accounts:', err);
      setCompanyAccounts({});
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedCompany, isEditMode, formData.payment_type, formData.mode_of_payment]);

  // Get selectable accounts filtered by mode_of_payment and payment_type
  const getSelectableAccounts = useCallback((mode: string, paymentType?: string): CompanyAccount[] => {
    if (!companyAccounts.available_accounts) return [];
    const accounts = companyAccounts.available_accounts as CompanyAccount[];
    // Use provided paymentType or fall back to formData (for backward compatibility)
    const effectivePaymentType = paymentType || formData.payment_type;

    switch (mode) {
      case 'Cash':
        return accounts.filter(a => a.account_type === 'Cash');
      case 'Bank Transfer':
      case 'Credit Card':
        return accounts.filter(a => a.account_type === 'Bank');
      case 'Warkat': {
        const warkatKeyword = effectivePaymentType === 'Pay' ? 'warkat keluar' : 'warkat masuk';
        return accounts.filter(a =>
          a.root_type === 'Asset' &&
          a.name.toLowerCase().includes(warkatKeyword)
        );
      }
      default:
        return accounts.filter(a => a.account_type === 'Cash');
    }
  }, [companyAccounts.available_accounts, formData.payment_type]);

  // Get the auto-set account (Receivable for Receive, Payable for Pay)
  const getAutoAccount = useCallback((paymentType: string): string => {
    if (paymentType === 'Receive') {
      return companyAccounts.default_receivable_account || '';
    }
    return companyAccounts.default_payable_account || '';
  }, [companyAccounts]);

  // Manual trigger function for auto-selection
  const triggerAutoSelection = useCallback((accounts: any, paymentType: string, paymentMode: string) => {
    if (!accounts || !paymentType || !paymentMode) return;

    console.log('triggerAutoSelection called:', { paymentType, paymentMode, isEditMode });

    const selectableList = getSelectableAccounts(paymentMode, paymentType);
    const firstSelectable = selectableList.length > 0 ? selectableList[0].name : '';
    const autoAccount = paymentType === 'Receive'
      ? (accounts.default_receivable_account || '')
      : (accounts.default_payable_account || '');

    console.log('Auto-selection values:', { firstSelectable, autoAccount });

    if (paymentType === 'Receive') {
      setFormData(prev => ({
        ...prev,
        paid_from: autoAccount,
        paid_to: firstSelectable,
        debit_account: firstSelectable,
        credit_account: autoAccount,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        paid_from: firstSelectable,
        paid_to: autoAccount,
        debit_account: autoAccount,
        credit_account: firstSelectable,
      }));
    }
  }, [getSelectableAccounts]);

  // Auto-update accounts when payment type or mode changes
  useEffect(() => {
    console.log('useEffect auto-selection:', { isEditMode, payment_type: formData.payment_type, mode_of_payment: formData.mode_of_payment, hasCompanyAccounts: !!companyAccounts.default_payable_account });
    if (isEditMode) return;
    if (!companyAccounts || !selectedCompany) return;
    // Don't auto-select if paid_from already has a valid warkat/bank account (for edit mode safety)
    if (formData.paid_from && (formData.paid_from.toLowerCase().includes('warkat') || formData.paid_from.toLowerCase().includes('bank') || formData.paid_from.toLowerCase().includes('kas'))) return;
    triggerAutoSelection(companyAccounts, formData.payment_type, formData.mode_of_payment);
  }, [formData.payment_type, formData.mode_of_payment, companyAccounts, selectedCompany, isEditMode, formData.paid_from]);

  // Fetch company accounts when company changes
  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyAccounts();
    }
  }, [selectedCompany, fetchCompanyAccounts]);

  // Handle edit payment on mount
  useEffect(() => {
    if (editPayment) {
      handleEditPayment(editPayment);
    } else {
      // Trigger auto-selection for new payment
      setTimeout(() => {
        if (companyAccounts && formData.payment_type && formData.mode_of_payment) {
          triggerAutoSelection(companyAccounts, formData.payment_type, formData.mode_of_payment);
        }
      }, 200);
    }
  }, [editPayment]);

  // Handle customer selection from dialog
  const handleCustomerSelect = (customer: { name: string; customer_name: string }) => {
    setFormData(prev => ({ ...prev, party: customer.name }));
    setSelectedCustomerName(customer.customer_name || customer.name);
    fetchOutstandingInvoices(customer.name);
  };

  // Handle supplier selection from dialog
  const handleSupplierSelect = (supplier: { name: string; supplier_name: string }) => {
    setFormData(prev => ({ ...prev, party: supplier.name }));
    setSelectedSupplierName(supplier.supplier_name || supplier.name);
    fetchOutstandingPurchaseInvoices(supplier.name);
  };

  // Fetch outstanding invoices when customer is selected
  const fetchOutstandingInvoices = useCallback(async (customer: string) => {
    if (!customer || !selectedCompany) {
      setOutstandingInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    try {
      const response = await fetch(`/api/sales/invoices/outstanding?customer=${customer}&company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setOutstandingInvoices(data.data || []);
      } else {
        setOutstandingInvoices([]);
      }
    } catch (err) {
      console.error('Error fetching outstanding invoices:', err);
      setOutstandingInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedCompany]);

  // Fetch outstanding purchase invoices when supplier is selected
  const fetchOutstandingPurchaseInvoices = useCallback(async (supplier: string) => {
    if (!supplier || !selectedCompany) {
      setOutstandingPurchaseInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    try {
      const response = await fetch(`/api/purchase/invoices/outstanding?supplier=${supplier}&company=${selectedCompany}`);
      const data = await response.json();

      if (data.success) {
        setOutstandingPurchaseInvoices(data.data || []);
      } else {
        setOutstandingPurchaseInvoices([]);
      }
    } catch (err) {
      console.error('Error fetching outstanding purchase invoices:', err);
      setOutstandingPurchaseInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }, [selectedCompany]);

  // Handle party change
  const handlePartyChange = (party: string) => {
    setFormData(prev => ({
      ...prev,
      party,
      selected_invoices: [],
      received_amount: 0,
      paid_amount: 0
    }));

    setSelectedCustomerName('');
    setSelectedSupplierName('');

    if (formData.party_type === 'Customer' && party) {
      fetchOutstandingInvoices(party);
    } else if (formData.party_type === 'Supplier' && party) {
      fetchOutstandingPurchaseInvoices(party);
    } else {
      setOutstandingInvoices([]);
      setOutstandingPurchaseInvoices([]);
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

    setSelectedCustomerName('');
    setSelectedSupplierName('');
    setOutstandingInvoices([]);
    setOutstandingPurchaseInvoices([]);
  };

  // Handle edit payment
  const handleEditPayment = async (payment: any) => {
    try {
      setIsEditMode(true);
      isEditModeRef.current = true;
      setEditingPaymentId(payment.name);

      const response = await fetch(`/api/finance/payments/details?name=${payment.name}`);
      const data = await response.json();

      if (!data.success) {
        setError('Gagal memuat detail pembayaran');
        return;
      }

      const paymentDetails = data.data;

      // Extract account values - handle both string and object formats from ERPNext
      const paidFromAccount = typeof paymentDetails.paid_from === 'string' 
        ? paymentDetails.paid_from 
        : paymentDetails.paid_from?.name || '';
      const paidToAccount = typeof paymentDetails.paid_to === 'string' 
        ? paymentDetails.paid_to 
        : paymentDetails.paid_to?.name || '';

      console.log('Edit Payment - Accounts:', { 
        paid_from: paidFromAccount, 
        paid_to: paidToAccount,
        payment_type: paymentDetails.payment_type,
        mode_of_payment: paymentDetails.mode_of_payment 
      });

      setFormData({
        payment_type: paymentDetails.payment_type as 'Receive' | 'Pay',
        party_type: paymentDetails.party_type as 'Customer' | 'Supplier',
        party: paymentDetails.party,
        posting_date: paymentDetails.posting_date,
        paid_amount: paymentDetails.paid_amount || 0,
        received_amount: paymentDetails.received_amount || 0,
        mode_of_payment: paymentDetails.mode_of_payment || 'Cash',
        company: selectedCompany,
        debit_account: paymentDetails.payment_type === 'Receive' ? paidFromAccount : paidToAccount,
        credit_account: paymentDetails.payment_type === 'Receive' ? paidToAccount : paidFromAccount,
        check_number: paymentDetails.reference_no || '',
        check_date: paymentDetails.reference_date || '',
        bank_reference: paymentDetails.bank_reference || paymentDetails.reference_no || '',
        reference_no: paymentDetails.reference_no || '',
        reference_date: paymentDetails.reference_date || '',
        custom_notes_payment: paymentDetails.custom_notes_payment || '',
        selected_invoices: paymentDetails.references?.map((ref: { reference_name: string; allocated_amount: number }) => ({
          invoice_name: ref.reference_name,
          invoice_total: 0,
          outstanding_amount: ref.allocated_amount || 0,
          allocated_amount: ref.allocated_amount || 0
        })) || [],
        paid_from: paidFromAccount,
        paid_to: paidToAccount,
      });

      // Set display names
      if (paymentDetails.party_type === 'Customer') {
        setSelectedCustomerName(paymentDetails.party_name || paymentDetails.party);

        const fetchInvoiceDetails = async (references: Array<{ reference_name: string; allocated_amount: number }>) => {
          if (!references || references.length === 0) return [];

          const invoicePromises = references.map(async (ref) => {
            try {
              const response = await fetch(`/api/sales/invoices/details?invoice_name=${ref.reference_name}`);
              const data = await response.json();

              if (data.success && data.data) {
                const invoice = data.data;
                return {
                  name: ref.reference_name,
                  invoice_name: ref.reference_name,
                  invoice_total: invoice.grand_total || 0,
                  outstanding_amount: invoice.outstanding_amount || 0,
                  visual_outstanding: (invoice.outstanding_amount || 0) - (ref.allocated_amount || 0),
                  allocated_amount: ref.allocated_amount || 0,
                  grand_total: invoice.grand_total || 0,
                  due_date: invoice.due_date || '',
                  customer: invoice.customer || '',
                  posting_date: invoice.posting_date || '',
                  status: invoice.status || ''
                };
              } else {
                return {
                  name: ref.reference_name, invoice_name: ref.reference_name,
                  invoice_total: 0, outstanding_amount: ref.allocated_amount || 0,
                  visual_outstanding: 0, allocated_amount: ref.allocated_amount || 0,
                  grand_total: 0, due_date: '', customer: '', posting_date: '', status: 'Unknown'
                };
              }
            } catch (error) {
              return {
                name: ref.reference_name, invoice_name: ref.reference_name,
                invoice_total: 0, outstanding_amount: ref.allocated_amount || 0,
                visual_outstanding: 0, allocated_amount: ref.allocated_amount || 0,
                grand_total: 0, due_date: '', customer: '', posting_date: '', status: 'Unknown'
              };
            }
          });
          return await Promise.all(invoicePromises);
        };

        const allocatedInvoices = await fetchInvoiceDetails(paymentDetails.references || []);
        setOutstandingInvoices(allocatedInvoices);
      } else {
        setSelectedSupplierName(paymentDetails.party_name || paymentDetails.party);

        const fetchPurchaseInvoiceDetails = async (references: Array<{ reference_name: string; allocated_amount: number }>) => {
          if (!references || references.length === 0) return [];

          const invoicePromises = references.map(async (ref) => {
            try {
              const response = await fetch(`/api/purchase/invoices/details?invoice_name=${ref.reference_name}&company=${selectedCompany}`);
              const data = await response.json();

              if (data.success && data.data) {
                const invoice = data.data;
                return {
                  name: ref.reference_name, invoice_name: ref.reference_name,
                  invoice_total: invoice.grand_total || 0, outstanding_amount: invoice.outstanding_amount || 0,
                  visual_outstanding: (invoice.outstanding_amount || 0) - (ref.allocated_amount || 0),
                  allocated_amount: ref.allocated_amount || 0, grand_total: invoice.grand_total || 0,
                  due_date: invoice.due_date || '', supplier: invoice.supplier || '',
                  supplier_name: invoice.supplier_name || '', posting_date: invoice.posting_date || '',
                  status: invoice.status || ''
                };
              } else {
                return {
                  name: ref.reference_name, invoice_name: ref.reference_name,
                  invoice_total: 0, outstanding_amount: ref.allocated_amount || 0,
                  visual_outstanding: 0, allocated_amount: ref.allocated_amount || 0,
                  grand_total: 0, due_date: '', supplier: '', supplier_name: '',
                  posting_date: '', status: 'Unknown'
                };
              }
            } catch (error) {
              return {
                name: ref.reference_name, invoice_name: ref.reference_name,
                invoice_total: 0, outstanding_amount: ref.allocated_amount || 0,
                visual_outstanding: 0, allocated_amount: ref.allocated_amount || 0,
                grand_total: 0, due_date: '', supplier: '', supplier_name: '',
                posting_date: '', status: 'Unknown'
              };
            }
          });
          return await Promise.all(invoicePromises);
        };

        const allocatedPurchaseInvoices = await fetchPurchaseInvoiceDetails(paymentDetails.references || []);
        setOutstandingPurchaseInvoices(allocatedPurchaseInvoices);
        setOutstandingInvoices([]);
      }

      setEditingPayment(payment);
      setEditingPaymentStatus(payment.status);

      // Fetch accounts after setting edit values, with skipAutoSelection=true
      if (selectedCompany) {
        fetchCompanyAccounts(true);
      }

    } catch (error: unknown) {
      console.error('Error fetching payment details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat detail pembayaran';
      setError(errorMessage);
    }
  };

  // Get filtered accounts for dropdowns (now delegates to getSelectableAccounts)
  const getFilteredAccounts = useCallback((accountType: 'debit' | 'credit'): CompanyAccount[] => {
    if (!companyAccounts.available_accounts) return [];

    // The selectable side uses mode-based filtering
    // PAY:     credit side = selectable (source of funds), debit side = auto (Payable)
    // RECEIVE: debit side  = selectable (destination),     credit side = auto (Receivable)
    const isSelectableSide =
      (formData.payment_type === 'Pay' && accountType === 'credit') ||
      (formData.payment_type === 'Receive' && accountType === 'debit');

    if (isSelectableSide) {
      return getSelectableAccounts(formData.mode_of_payment);
    }

    // Auto side: show Payable or Receivable accounts
    const accounts = companyAccounts.available_accounts as CompanyAccount[];
    if (formData.payment_type === 'Pay') {
      return accounts.filter(a => a.account_type === 'Payable');
    }
    return accounts.filter(a => a.account_type === 'Receivable');
  }, [companyAccounts.available_accounts, formData.payment_type, formData.mode_of_payment, getSelectableAccounts]);

  // Calculate total outstanding for validation
  const getTotalOutstanding = useCallback(() => {
    return outstandingInvoices.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0);
  }, [outstandingInvoices]);

  const getTotalPurchaseOutstanding = useCallback(() => {
    return outstandingPurchaseInvoices.reduce((sum, invoice) => sum + invoice.outstanding_amount, 0);
  }, [outstandingPurchaseInvoices]);

  const getTotalAllocationAmount = useCallback(() => {
    return formData.selected_invoices.reduce((total, invoice) => {
      return total + (invoice.allocated_amount || 0);
    }, 0);
  }, [formData.selected_invoices]);

  // Auto-update received/paid amount based on total allocation
  useEffect(() => {
    if (formData.payment_type === 'Receive') {
      const totalAllocation = getTotalAllocationAmount();
      if (totalAllocation > 0) {
        setFormData(prev => ({ ...prev, received_amount: totalAllocation }));
      }
    } else if (formData.payment_type === 'Pay') {
      const totalAllocation = getTotalAllocationAmount();
      if (totalAllocation > 0) {
        setFormData(prev => ({ ...prev, paid_amount: totalAllocation }));
      }
    }
  }, [formData.selected_invoices, getTotalAllocationAmount, formData.payment_type]);

  // Calculate allocation preview (ERPNext FIFO logic)
  const calculateAllocationPreview = useCallback((paymentAmount: number, invoices: any[]) => {
    if (!invoices.length || paymentAmount <= 0) return { allocation: [], unallocated: paymentAmount };

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

  const getJournalPreview = useCallback((paymentAmount: number, allocation: any) => {
    const totalAllocated = allocation.totalAllocated || 0;
    const unallocated = paymentAmount - totalAllocated;

    if (formData.payment_type === 'Receive') {
      let debitAccount = '';
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        debitAccount = companyAccounts.default_accounts?.bank || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        debitAccount = companyAccounts.default_accounts?.credit_card || 'Credit Card';
      } else {
        debitAccount = companyAccounts.default_accounts?.cash || 'Cash Account';
      }
      const creditAccount = companyAccounts.default_accounts?.receivable || 'Accounts Receivable';

      return {
        debit: { account: debitAccount, amount: paymentAmount },
        credits: [
          { account: creditAccount, amount: totalAllocated, reference: 'Customer Invoice Payments' },
          ...(unallocated > 0 ? [{
            account: companyAccounts.default_advance_account || 'Customer Advance',
            amount: unallocated, reference: 'Customer Overpayment'
          }] : [])
        ]
      };
    }

    if (formData.payment_type === 'Pay') {
      const debitAccount = companyAccounts.default_accounts?.payable || 'Accounts Payable';
      let creditAccount = '';
      if (formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') {
        creditAccount = companyAccounts.default_accounts?.bank || 'Bank Account';
      } else if (formData.mode_of_payment === 'Credit Card') {
        creditAccount = companyAccounts.default_accounts?.credit_card || 'Credit Card';
      } else {
        creditAccount = companyAccounts.default_accounts?.cash || 'Cash Account';
      }

      return {
        debit: { account: debitAccount, amount: paymentAmount },
        credits: [
          { account: creditAccount, amount: totalAllocated, reference: 'Supplier Bill Payments' },
          ...(unallocated > 0 ? [{
            account: companyAccounts.default_advance_account || 'Supplier Advance',
            amount: unallocated, reference: 'Supplier Overpayment'
          }] : [])
        ]
      };
    }

    return { debit: { account: '', amount: 0 }, credits: [] };
  }, [formData.payment_type, formData.mode_of_payment, companyAccounts]);

  const getRealPaidFrom = (paymentType: string, paymentMode: string) => {
    if (paymentType === 'Receive') {
      return companyAccounts.default_receivable_account || 'Accounts Receivable';
    } else {
      return companyAccounts.default_payable_account || 'Accounts Payable';
    }
  };

  const getRealPaidTo = (paymentType: string, paymentMode: string) => {
    if (paymentType === 'Receive') {
      if (paymentMode === 'Bank Transfer' || paymentMode === 'Warkat') {
        return companyAccounts.default_bank_account || companyAccounts.default_cash_account || 'Bank Account';
      } else if (paymentMode === 'Credit Card') {
        return companyAccounts.default_credit_card_account || companyAccounts.default_cash_account || 'Credit Card';
      } else {
        return companyAccounts.default_cash_account || 'Cash Account';
      }
    } else {
      if (paymentMode === 'Bank Transfer' || paymentMode === 'Warkat') {
        return companyAccounts.default_bank_account || companyAccounts.default_cash_account || 'Bank Account';
      } else if (paymentMode === 'Credit Card') {
        return companyAccounts.default_credit_card_account || companyAccounts.default_cash_account || 'Credit Card';
      } else {
        return companyAccounts.default_cash_account || 'Cash Account';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Validasi reference_no wajib untuk transaksi Bank/Warkat
      if ((formData.mode_of_payment === 'Bank Transfer' || formData.mode_of_payment === 'Warkat') && !formData.reference_no?.trim()) {
        window.alert('⚠️ Validasi Gagal\n\nMetode pembayaran Bank Transfer atau Warkat memerlukan No. Referensi.\nSilakan isi kolom No. Referensi di bagian Referensi.');
        setFormLoading(false);
        return;
      }

      // Validasi per metode pembayaran
      if (formData.mode_of_payment === 'Warkat') {
        const missingFields: string[] = [];
        if (!formData.check_number?.trim()) missingFields.push('Nomor Warkat');
        if (!formData.check_date) missingFields.push('Tanggal Warkat');
        if (!formData.bank_reference?.trim()) missingFields.push('Referensi Bank');
        if (missingFields.length > 0) {
          window.alert(`⚠️ Validasi Gagal\n\nMetode Warkat memerlukan:\n${missingFields.join('\n')}`);
          setFormLoading(false);
          return;
        }
      }

      const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
      const totalOutstanding = getTotalOutstanding();

      // Validasi akun wajib diisi
      if (!formData.paid_from || !formData.paid_to) {
        window.alert('⚠️ Validasi Gagal\n\nAkun pembayaran belum lengkap.\n\nPastikan akun sumber dan tujuan sudah dipilih.');
        setFormLoading(false);
        return;
      }

      // Validasi jumlah pembayaran harus > 0
      if (!paymentAmount || paymentAmount <= 0) {
        window.alert('⚠️ Validasi Gagal\n\nJumlah pembayaran harus lebih besar dari 0.\nSilakan pilih faktur dan masukkan jumlah alokasi.');
        setFormLoading(false);
        return;
      }

      if (formData.party_type === 'Customer' && paymentAmount > totalOutstanding && totalOutstanding > 0) {
        const confirmOverpayment = window.confirm(
          `⚠️ Kelebihan Pembayaran Terdeteksi\n\n` +
          `Jumlah Pembayaran: Rp ${paymentAmount.toLocaleString('id-ID')}\n` +
          `Total Outstanding: Rp ${totalOutstanding.toLocaleString('id-ID')}\n` +
          `Kelebihan: Rp ${(paymentAmount - totalOutstanding).toLocaleString('id-ID')}\n\n` +
          `Kelebihan akan dibuat sebagai kredit pelanggan untuk pembayaran di masa depan.\n\n` +
          `Lanjutkan?`
        );
        if (!confirmOverpayment) {
          setFormLoading(false);
          return;
        }
      }

      const checkedInvoices = formData.selected_invoices.filter(invoice => invoice.allocated_amount > 0);

      if (!formData.paid_from || !formData.paid_to || formData.paid_from === "Accounts Receivable" || formData.paid_to === "Cash Account") {
        if (companyAccounts && formData.payment_type && formData.mode_of_payment) {
          triggerAutoSelection(companyAccounts, formData.payment_type, formData.mode_of_payment);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Default tanggal ke hari ini jika kosong
      const today = new Date().toISOString().split('T')[0];
      const finalCheckDate = formData.check_date || today;
      const finalReferenceDate = formData.reference_date || today;
      const finalReferenceNo = formData.reference_no || formData.check_number || '';

      // Validasi akun Warkat untuk mode Warkat
      if (formData.mode_of_payment === 'Warkat') {
        const warkatSourceAccount = formData.payment_type === 'Pay' ? formData.paid_from : formData.paid_to;
        if (!warkatSourceAccount || !warkatSourceAccount.toLowerCase().includes('warkat')) {
          window.alert('⚠️ Validasi Gagal\n\nUntuk metode Warkat, silakan pilih akun Warkat yang sesuai.\n\nPAY → Warkat Keluar\nRECEIVE → Warkat Masuk');
          setFormLoading(false);
          return;
        }
      }

      const paymentPayload = {
        company: selectedCompany,
        payment_type: formData.payment_type,
        type: formData.payment_type,
        party_type: formData.party_type,
        party: formData.party,
        posting_date: formData.posting_date,
        paid_amount: formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount,
        received_amount: formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount,
        mode_of_payment: formData.mode_of_payment,
        reference_no: finalReferenceNo,
        reference_date: finalReferenceDate,
        check_number: formData.check_number,
        check_date: finalCheckDate,
        bank_reference: formData.bank_reference,
        custom_notes_payment: formData.custom_notes_payment,
        paid_from: formData.paid_from,
        paid_to: formData.paid_to,
        references: checkedInvoices.map(invoice => ({
          reference_doctype: formData.payment_type === 'Receive' ? "Sales Invoice" : "Purchase Invoice",
          reference_name: invoice.invoice_name,
          allocated_amount: invoice.allocated_amount
        })),
      };

      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();

      if (response.ok) {
        let msg = `Payment Entry ${data.data?.name || ''} berhasil dibuat!\n\nTotal: Rp ${paymentAmount.toLocaleString('id-ID')}`;
        if (formData.party_type === 'Customer' && paymentAmount > totalOutstanding && totalOutstanding > 0) {
          msg += `\nKredit Pelanggan: Rp ${(paymentAmount - totalOutstanding).toLocaleString('id-ID')}`;
        }
        msg += `\n\nERPNext akan otomatis mengalokasikan pembayaran ke invoice yang outstanding.`;
        setSuccessMessage(msg);
        setTimeout(() => {
          onBack();
        }, 2000);
        // Don't setFormLoading(false) here - keep button disabled until navigation
        return;
      } else {
        setError(data.message || 'Gagal membuat pembayaran');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      // Only reset loading if not successful (success case returns early)
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    isEditModeRef.current = false;
    setEditingPaymentId('');
    setFormData({
      payment_type: 'Receive',
      party_type: 'Customer',
      party: '',
      posting_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      received_amount: 0,
      mode_of_payment: 'Kas',
      company: selectedCompany,
      debit_account: '',
      credit_account: '',
      check_number: '',
      check_date: '',
      bank_reference: '',
      reference_no: '',
      reference_date: '',
      custom_notes_payment: '',
      selected_invoices: [],
      paid_from: '',
      paid_to: '',
    });
    setOutstandingInvoices([]);
    setOutstandingPurchaseInvoices([]);
    setSelectedCustomerName('');
    setSelectedSupplierName('');
    setEditingPayment(null);
    setEditingPaymentStatus('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); onBack(); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Kembali"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {editPayment ? (formData.payment_type === 'Receive' ? 'Edit Penerimaan' : 'Edit Pembayaran') : (formData.payment_type === 'Receive' ? 'Buat Penerimaan Baru' : 'Buat Pembayaran Baru')}
          </h1>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Berhasil!</h3>
              <pre className="mt-1 text-sm text-green-700 whitespace-pre-wrap font-sans">{successMessage}</pre>
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

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">

          {/* Section 1: Informasi Dasar */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Dasar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pembayaran</label>
                {defaultPaymentType && !isEditMode ? (
                  <input
                    type="text"
                    value={formData.payment_type === 'Receive' ? 'Penerimaan' : 'Pembayaran'}
                    readOnly
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm cursor-not-allowed"
                  />
                ) : (
                  <select
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.payment_type}
                    onChange={(e) => handlePartyTypeChange(e.target.value as 'Receive' | 'Pay')}
                  >
                    <option value="Receive">Penerimaan</option>
                    <option value="Pay">Pembayaran</option>
                  </select>
                )}
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.party_type === 'Customer' ? selectedCustomerName : selectedSupplierName}
                    readOnly
                    placeholder={`Pilih ${formData.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}`}
                    className="block flex-1 min-w-0 border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                  <div className="flex-shrink-0 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => formData.party_type === 'Customer' ? setShowCustomerDialog(true) : setShowSupplierDialog(true)}
                      className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                      title={`Cari ${formData.party_type === 'Customer' ? 'Pelanggan' : 'Pemasok'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    {formData.party && (
                      <button
                        type="button"
                        onClick={() => handlePartyChange('')}
                        className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        title="Hapus pilihan"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.posting_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, posting_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                <select
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.mode_of_payment}
                  onChange={(e) => setFormData(prev => ({ ...prev, mode_of_payment: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Warkat">Warkat</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Referensi */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Referensi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Referensi</label>
                <input
                  type="text"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.reference_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                  placeholder="cth: TRX-20260207-0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Referensi</label>
                <input
                  type="date"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.reference_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Akun */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pemilihan Akun</h3>
            {(() => {
              console.log('Render - payment_type:', formData.payment_type, 'paid_from:', formData.paid_from, 'paid_to:', formData.paid_to);
              return null;
            })()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {formData.payment_type === 'Pay' ? (
                <>
                  {/* PAY: paid_from = selectable (Cash/Bank/Warkat), paid_to = auto (Payable) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Akun Sumber Dana
                      {formData.mode_of_payment === 'Cash' && <span className="text-xs text-gray-500 ml-1">(Kas)</span>}
                      {formData.mode_of_payment === 'Bank Transfer' && <span className="text-xs text-gray-500 ml-1">(Bank)</span>}
                      {formData.mode_of_payment === 'Warkat' && <span className="text-xs text-gray-500 ml-1">(Warkat Keluar)</span>}
                      {formData.mode_of_payment === 'Credit Card' && <span className="text-xs text-gray-500 ml-1">(Bank)</span>}
                    </label>
                    <select
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.paid_from}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setFormData(prev => ({ ...prev, paid_from: selected, credit_account: selected }));
                      }}
                    >
                      <option value="">-- Pilih Akun --</option>
                      {getSelectableAccounts(formData.mode_of_payment).map((account: CompanyAccount) => (
                        <option key={account.name} value={account.name}>
                          {account.name} ({account.account_type})
                        </option>
                      ))}
                      {/* Fallback: show current value if not in list (edit mode) */}
                      {formData.paid_from && !getSelectableAccounts(formData.mode_of_payment).some((a: CompanyAccount) => a.name === formData.paid_from) && (
                        <option value={formData.paid_from}>{formData.paid_from}</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Pilih akun berdasarkan metode pembayaran</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Akun Tujuan (Hutang)
                      <span className="text-xs text-green-600 ml-1">Otomatis</span>
                    </label>
                    <input
                      type="text"
                      value={formData.paid_to || getAutoAccount('Pay')}
                      readOnly
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-green-600 mt-1">Akun hutang default perusahaan</p>
                  </div>
                </>
              ) : (
                <>
                  {/* RECEIVE: paid_from = auto (Receivable), paid_to = selectable (Cash/Bank/Warkat) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Akun Sumber (Piutang)
                      <span className="text-xs text-green-600 ml-1">Otomatis</span>
                    </label>
                    <input
                      type="text"
                      value={formData.paid_from || getAutoAccount('Receive')}
                      readOnly
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm cursor-not-allowed"
                    />
                    <p className="text-xs text-green-600 mt-1">Akun piutang default perusahaan</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Akun Tujuan Dana
                      {formData.mode_of_payment === 'Cash' && <span className="text-xs text-gray-500 ml-1">(Kas)</span>}
                      {formData.mode_of_payment === 'Bank Transfer' && <span className="text-xs text-gray-500 ml-1">(Bank)</span>}
                      {formData.mode_of_payment === 'Warkat' && <span className="text-xs text-gray-500 ml-1">(Warkat Masuk)</span>}
                      {formData.mode_of_payment === 'Credit Card' && <span className="text-xs text-gray-500 ml-1">(Bank)</span>}
                    </label>
                    <select
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={formData.paid_to}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setFormData(prev => ({ ...prev, paid_to: selected, debit_account: selected }));
                      }}
                    >
                      <option value="">-- Pilih Akun --</option>
                      {getSelectableAccounts(formData.mode_of_payment).map((account: CompanyAccount) => (
                        <option key={account.name} value={account.name}>
                          {account.name} ({account.account_type})
                        </option>
                      ))}
                      {/* Fallback: show current value if not in list (edit mode) */}
                      {formData.paid_to && !getSelectableAccounts(formData.mode_of_payment).some((a: CompanyAccount) => a.name === formData.paid_to) && (
                        <option value={formData.paid_to}>{formData.paid_to}</option>
                      )}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Pilih akun berdasarkan metode pembayaran</p>
                  </div>
                </>
              )}
            </div>

            {/* Account Selection Info */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium">Mapping Akun:</p>
                  <p className="mt-1">
                    <strong>Cash</strong> → Kas | <strong>Transfer</strong> → Bank | <strong>Warkat</strong> → Warkat {formData.payment_type === 'Pay' ? 'Keluar' : 'Masuk'}
                  </p>
                  <p className="mt-1">
                    Akun {formData.payment_type === 'Pay' ? 'hutang' : 'piutang'} dipilih otomatis dari default perusahaan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Catatan */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Catatan</h3>
            <textarea
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              rows={3}
              value={formData.custom_notes_payment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, custom_notes_payment: e.target.value }))}
              placeholder="Tambahkan catatan untuk pembayaran ini..."
            />
          </div>

          {/* Section 5: Detail Warkat (Conditional) */}
          {formData.mode_of_payment === 'Warkat' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detail Warkat</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Warkat</label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.check_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_number: e.target.value }))}
                    placeholder="cth: 001234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Warkat</label>
                  <input
                    type="date"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.check_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referensi Bank</label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={formData.bank_reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, bank_reference: e.target.value }))}
                    placeholder="cth: BCA, Mandiri"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Faktur Outstanding (Customer) */}
          {formData.party_type === 'Customer' && formData.party && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-lg font-medium text-gray-900">Faktur Outstanding</h3>
                <div className="text-sm text-gray-600">
                  <span className="mr-3">
                    {outstandingInvoices.length} faktur • Total: Rp {getTotalOutstanding().toLocaleString('id-ID')}
                  </span>
                  {formData.selected_invoices.length > 0 && (
                    <span className="text-indigo-600 font-medium">
                      {formData.selected_invoices.length} dipilih
                    </span>
                  )}
                </div>
              </div>

              {loadingInvoices ? (
                <div className="text-center py-4">
                  <LoadingSpinner message="Memuat faktur outstanding..." />
                </div>
              ) : outstandingInvoices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Tidak ada faktur outstanding untuk pelanggan ini
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium mb-1">Petunjuk Pemilihan Faktur:</p>
                        <ul className="ml-4 space-y-1 text-sm">
                          <li>• Centang faktur yang ingin dibayar</li>
                          <li>• Masukkan jumlah alokasi untuk setiap faktur</li>
                          <li>• Jumlah Diterima akan otomatis dihitung dari total alokasi</li>
                        </ul>
                        {getTotalAllocationAmount() > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-300">
                            <p className="text-sm font-medium text-blue-800">
                              Total Alokasi: Rp {getTotalAllocationAmount().toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(formData.payment_type === 'Pay' ? outstandingPurchaseInvoices : outstandingInvoices).map(invoice => (
                      <div key={invoice.name} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={formData.selected_invoices.some(selected => selected.invoice_name === invoice.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_invoices: [
                                      ...prev.selected_invoices,
                                      { invoice_name: invoice.name, invoice_total: invoice.grand_total, outstanding_amount: invoice.outstanding_amount, allocated_amount: 0 }
                                    ]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_invoices: prev.selected_invoices.filter(selected => selected.invoice_name !== invoice.name)
                                  }));
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{invoice.name}</p>
                                <p className="text-sm text-gray-500">
                                  Jatuh Tempo: {invoice.due_date} | Total: Rp {invoice.grand_total.toLocaleString('id-ID')}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm text-gray-600">
                                  Outstanding: Rp {(editingPaymentStatus === 'Draft' ? (invoice.visual_outstanding ?? invoice.outstanding_amount) : invoice.outstanding_amount).toLocaleString('id-ID')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(editingPaymentStatus === 'Draft' ? (invoice.visual_outstanding ?? invoice.outstanding_amount) : invoice.outstanding_amount) > 0 ? 'Belum Lunas' : 'Lunas'}
                                </p>
                              </div>
                            </div>

                            {formData.selected_invoices.some(selected => selected.invoice_name === invoice.name) && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Jumlah Alokasi (Maks: Rp {(editingPaymentStatus === 'Draft' ? (invoice.visual_outstanding ?? invoice.outstanding_amount) : invoice.outstanding_amount).toLocaleString('id-ID')})
                                </label>
                                <CurrencyInput
                                  value={formData.selected_invoices.find(selected => selected.invoice_name === invoice.name)?.allocated_amount || 0}
                                  onChange={(allocationAmount) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selected_invoices: prev.selected_invoices.map(selected =>
                                        selected.invoice_name === invoice.name
                                          ? { ...selected, allocated_amount: allocationAmount }
                                          : selected
                                      )
                                    }));
                                  }}
                                  placeholder="Masukkan jumlah alokasi"
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  min={0}
                                  max={editingPaymentStatus === 'Draft' ? (invoice.visual_outstanding ?? invoice.outstanding_amount) : invoice.outstanding_amount}
                                  step="1"
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

          {/* Section 6b: Faktur Outstanding (Supplier) */}
          {formData.party_type === 'Supplier' && formData.party && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-lg font-medium text-gray-900">Faktur Pembelian Outstanding</h3>
                <div className="text-sm text-gray-600">
                  <span className="mr-3">
                    {outstandingPurchaseInvoices.length} faktur • Total: Rp {getTotalPurchaseOutstanding().toLocaleString('id-ID')}
                  </span>
                  {formData.selected_invoices.length > 0 && (
                    <span className="text-indigo-600 font-medium">
                      {formData.selected_invoices.length} dipilih
                    </span>
                  )}
                </div>
              </div>

              {loadingInvoices ? (
                <div className="text-center py-4">
                  <LoadingSpinner message="Memuat faktur pembelian outstanding..." />
                </div>
              ) : outstandingPurchaseInvoices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Tidak ada faktur pembelian outstanding untuk pemasok ini
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium mb-1">Petunjuk Pemilihan Faktur Pembelian:</p>
                        <ul className="ml-4 space-y-1 text-sm">
                          <li>• Centang faktur pembelian yang ingin dibayar</li>
                          <li>• Masukkan jumlah alokasi untuk setiap faktur</li>
                          <li>• Jumlah Dibayar akan otomatis dihitung dari total alokasi</li>
                        </ul>
                        {getTotalAllocationAmount() > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-300">
                            <p className="text-sm font-medium text-blue-800">
                              Total Alokasi: Rp {getTotalAllocationAmount().toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {outstandingPurchaseInvoices.map(invoice => (
                      <div key={invoice.name} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={formData.selected_invoices.some(selected => selected.invoice_name === invoice.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_invoices: [
                                      ...prev.selected_invoices,
                                      { invoice_name: invoice.name, invoice_total: invoice.grand_total, outstanding_amount: invoice.outstanding_amount, allocated_amount: 0 }
                                    ]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    selected_invoices: prev.selected_invoices.filter(selected => selected.invoice_name !== invoice.name)
                                  }));
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{invoice.name}</p>
                                <p className="text-sm text-gray-500">
                                  Jatuh Tempo: {invoice.due_date} | Total: Rp {invoice.grand_total.toLocaleString('id-ID')} | Pemasok: {invoice.supplier_name}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm text-gray-600">
                                  Outstanding: Rp {invoice.outstanding_amount.toLocaleString('id-ID')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {invoice.outstanding_amount > 0 ? 'Belum Lunas' : 'Lunas'}
                                </p>
                              </div>
                            </div>

                            {formData.selected_invoices.some(selected => selected.invoice_name === invoice.name) && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Jumlah Alokasi (Maks: Rp {invoice.outstanding_amount.toLocaleString('id-ID')})
                                </label>
                                <CurrencyInput
                                  value={formData.selected_invoices.find(selected => selected.invoice_name === invoice.name)?.allocated_amount || 0}
                                  onChange={(allocationAmount) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      selected_invoices: prev.selected_invoices.map(selected =>
                                        selected.invoice_name === invoice.name
                                          ? { ...selected, allocated_amount: allocationAmount }
                                          : selected
                                      )
                                    }));
                                  }}
                                  placeholder="Masukkan jumlah alokasi"
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 text-xs focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                  min={0}
                                  max={invoice.outstanding_amount}
                                  step="1"
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

          {/* Section 7: Jumlah Pembayaran */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Jumlah Pembayaran</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {formData.payment_type === 'Receive' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Diterima
                    {outstandingInvoices.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Total Outstanding: Rp {getTotalOutstanding().toLocaleString('id-ID')})
                      </span>
                    )}
                  </label>
                  <CurrencyInput
                    value={formData.received_amount}
                    onChange={() => { }}
                    placeholder="0"
                    className={`block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100 cursor-not-allowed ${formData.received_amount > getTotalOutstanding() && getTotalOutstanding() > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-300'}`}
                    min={0}
                    step="1"
                    required
                    disabled={true}
                  />
                  {getTotalAllocationAmount() > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Dihitung otomatis dari jumlah alokasi: Rp {getTotalAllocationAmount().toLocaleString('id-ID')}
                    </p>
                  )}

                  {formData.received_amount > getTotalOutstanding() && getTotalOutstanding() > 0 && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-orange-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">Kelebihan Pembayaran Terdeteksi</h3>
                          <div className="mt-1 text-sm text-orange-700">
                            <p>Jumlah pembayaran melebihi total outstanding sebesar:</p>
                            <p className="font-medium">Rp {(formData.received_amount - getTotalOutstanding()).toLocaleString('id-ID')}</p>
                            <p className="mt-1 text-xs">Kelebihan akan dibuat sebagai kredit pelanggan untuk pembayaran di masa depan.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, received_amount: getTotalOutstanding() }))}
                            className="mt-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded border border-orange-300"
                          >
                            Sesuaikan ke Total Outstanding
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Dibayar</label>
                  <CurrencyInput
                    value={formData.paid_amount}
                    onChange={() => { }}
                    placeholder="0"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm cursor-not-allowed"
                    min={0}
                    step="1"
                    required
                    disabled={true}
                  />
                  {getTotalAllocationAmount() > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Dihitung otomatis dari jumlah alokasi: Rp {getTotalAllocationAmount().toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 8: Preview Alokasi */}
          {formData.party_type === 'Customer' && outstandingInvoices.length > 0 && (() => {
            const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
            if (paymentAmount <= 0) return null;

            const preview = calculateAllocationPreview(paymentAmount, outstandingInvoices);

            return (
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <h5 className="text-md font-medium text-blue-900">Preview Alokasi Pembayaran (FIFO)</h5>
                  <span className="text-sm text-blue-700 font-medium">
                    Pembayaran: Rp {paymentAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {preview.allocation.map((invoice: any) => (
                    <div key={invoice.name} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm bg-white p-2 rounded border border-blue-100 gap-1">
                      <div className="flex-1">
                        <span className="font-medium text-blue-800">{invoice.name}</span>
                        <span className="text-gray-500 ml-2">(Jatuh Tempo: {invoice.due_date})</span>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-700">
                          Rp {invoice.outstanding_amount.toLocaleString('id-ID')} →
                          <span className={`font-medium ml-1 ${invoice.allocation_status === 'Paid' ? 'text-green-600' :
                            invoice.allocation_status === 'Partially Paid' ? 'text-orange-600' : 'text-gray-500'}`}>
                            Rp {invoice.allocated_amount.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoice.allocation_status === 'Paid' ? 'Lunas' : invoice.allocation_status === 'Partially Paid' ? 'Sebagian' : 'Belum'}
                          {invoice.remaining_outstanding > 0 && ` (Sisa: Rp ${invoice.remaining_outstanding.toLocaleString('id-ID')})`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-blue-200 pt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-blue-900">Total Teralokasi:</span>
                    <span className="font-bold text-blue-900">
                      Rp {(preview.totalAllocated || 0).toLocaleString('id-ID')} / Rp {paymentAmount.toLocaleString('id-ID')}
                      ({Math.round(((preview.totalAllocated || 0) / paymentAmount) * 100)}%)
                    </span>
                  </div>
                  {preview.unallocated > 0 && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-orange-600">Belum Teralokasi:</span>
                      <span className="font-medium text-orange-600">Rp {preview.unallocated.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-xs text-blue-600">
                  ERPNext akan otomatis mengalokasikan pembayaran ke invoice berdasarkan tanggal jatuh tempo (FIFO)
                </div>
              </div>
            );
          })()}

          {/* Section 9: Preview Jurnal */}
          {formData.party_type === 'Customer' && outstandingInvoices.length > 0 && (() => {
            const paymentAmount = formData.payment_type === 'Receive' ? formData.received_amount : formData.paid_amount;
            if (paymentAmount <= 0) return null;

            const preview = calculateAllocationPreview(paymentAmount, outstandingInvoices);
            const journal = getJournalPreview(paymentAmount, preview);

            return (
              <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <h5 className="text-md font-medium text-gray-900">Preview Jurnal</h5>
                    <span className="text-sm text-gray-600">Entri Akuntansi</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJournalPreview(!showJournalPreview)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    {showJournalPreview ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span>Tampilkan</span>
                      </>
                    )}
                  </button>
                </div>

                {showJournalPreview && (
                  <div className="space-y-2 text-sm font-mono">
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
                    ✅ <strong>Pemilihan Akun Otomatis:</strong> Akun dipilih berdasarkan tipe dan metode pembayaran.
                  </div>

                  <div className="flex justify-between items-center text-green-600">
                    <span>Debit: {journal.debit.account}</span>
                    <span className="font-medium">Rp {journal.debit.amount.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="border-t border-gray-300 pt-2 space-y-1">
                    {journal.credits.map((credit: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-red-600">
                        <span>Kredit: {credit.account}</span>
                        <span className="font-medium">Rp {credit.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900">Total Debit:</span>
                      <span className="font-bold text-green-600">Rp {journal.debit.amount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900">Total Kredit:</span>
                      <span className="font-bold text-red-600">
                        Rp {journal.credits.reduce((sum: number, credit: any) => sum + credit.amount, 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    Entri jurnal akan otomatis dibuat oleh ERPNext saat pembayaran di-submit
                  </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { resetForm(); onBack(); }}
              className="w-full sm:w-auto bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading || editingPaymentStatus === 'Submitted'}
              className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {formLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Memproses...
                </>
              ) : (editingPayment ? 'Perbarui Pembayaran' : 'Simpan Pembayaran')}
            </button>
          </div>
        </form>
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
