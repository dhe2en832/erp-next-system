/**
 * Unit Tests for Payment APIs
 * Feature: detailed-invoice-payment-reports
 */

import { NextRequest } from 'next/server';
import { GET as PaymentSummaryGET } from '@/app/api/finance/reports/payment-summary/route';
import { GET as PaymentDetailsGET } from '@/app/api/finance/reports/payment-details/route';

describe('Payment Summary API', () => {
  const mockEnv = process.env;

  beforeEach(() => {
    process.env = { ...mockEnv, ERPNEXT_API_URL: 'http://localhost:8000' };
  });

  afterEach(() => {
    process.env = mockEnv;
    jest.clearAllMocks();
  });

  it('should return 400 when company parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-summary');
    
    const response = await PaymentSummaryGET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Company parameter is required');
  });

  it('should have correct response structure for successful request', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-summary?company=Test Company');
    
    const response = await PaymentSummaryGET(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('message');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should handle network errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-summary?company=Test Company');
    
    const response = await PaymentSummaryGET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Network error');
  });
});

describe('Payment Details API', () => {
  const mockEnv = process.env;

  beforeEach(() => {
    process.env = { ...mockEnv, ERPNEXT_API_URL: 'http://localhost:8000' };
  });

  afterEach(() => {
    process.env = mockEnv;
    jest.clearAllMocks();
  });

  it('should return 400 when company parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-details');
    
    const response = await PaymentDetailsGET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Company parameter is required');
  });

  it('should have correct response structure with references', async () => {
    const mockPaymentWithReferences = {
      data: [{
        name: 'PAY-001',
        posting_date: '2024-01-01',
        payment_type: 'Receive',
        party: 'Customer A',
        paid_amount: 1000000
      }]
    };

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentWithReferences
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            ...mockPaymentWithReferences.data[0],
            references: [
              {
                reference_doctype: 'Sales Invoice',
                reference_name: 'INV-001',
                allocated_amount: 500000,
                outstanding_amount: 0
              }
            ]
          }
        })
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-details?company=Test Company');
    
    const response = await PaymentDetailsGET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should handle errors when fetching payment details', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ name: 'PAY-001' }] })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/payment-details?company=Test Company');
    
    const response = await PaymentDetailsGET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data[0]).toHaveProperty('references');
    expect(data.data[0].references).toEqual([]);
  });
});

export {};
