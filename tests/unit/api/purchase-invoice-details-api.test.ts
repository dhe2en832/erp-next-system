/**
 * Unit Tests for Purchase Invoice Details API
 * Feature: detailed-invoice-payment-reports
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finance/reports/purchase-invoice-details/route';

describe('Purchase Invoice Details API', () => {
  const mockEnv = process.env;

  beforeEach(() => {
    process.env = { ...mockEnv, ERPNEXT_API_URL: 'http://localhost:8000' };
  });

  afterEach(() => {
    process.env = mockEnv;
    jest.clearAllMocks();
  });

  it('should return 400 when company parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/finance/reports/purchase-invoice-details');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Company parameter is required');
  });

  it('should have correct response structure for successful request', async () => {
    // Mock successful response
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/purchase-invoice-details?company=Test Company');
    
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('message');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 401 for unauthorized requests', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/purchase-invoice-details?company=Test Company');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Unauthorized');
  });

  it('should handle ERPNext API errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      } as Response);

    const request = new NextRequest('http://localhost:3000/api/finance/reports/purchase-invoice-details?company=Test Company');
    
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(typeof data.message).toBe('string');
  });

  it('should handle network errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/finance/reports/purchase-invoice-details?company=Test Company');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Network error');
  });
});

export {};
