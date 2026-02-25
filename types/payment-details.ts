export interface PaymentReference {
  reference_doctype: string;
  reference_name: string;
  total_amount: number;
  allocated_amount: number;
  outstanding_amount: number;
}

export interface PaymentEntry {
  name: string;
  posting_date: string;
  payment_type: 'Receive' | 'Pay';
  party_type: string;
  party: string;
  party_name?: string;
  mode_of_payment: string;
  paid_amount: number;
  received_amount?: number;
  status: string;
  docstatus: number;
}

export interface PaymentWithReferences extends PaymentEntry {
  references: PaymentReference[];
}

export interface PaymentSummaryResponse {
  success: boolean;
  data: PaymentEntry[];
  message?: string;
}

export interface PaymentDetailsResponse {
  success: boolean;
  data: PaymentWithReferences[];
  message?: string;
}
