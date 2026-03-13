import { NextRequest, NextResponse } from 'next/server';
import type { AnalyticsResponse, TopProduct } from '@/types/dashboard-analytics';

/**
 * Mock Analytics API Endpoint for Testing
 * 
 * Returns mock data to test frontend components without ERPNext backend
 * 
 * GET /api/analytics/mock?type=top_products
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  let mockData: unknown;
  
  switch (type) {
    case 'top_products':
      mockData = [
        { item_code: 'ITEM-001', item_name: 'Product A', total_qty: 150, total_amount: 15000000 },
        { item_code: 'ITEM-002', item_name: 'Product B', total_qty: 120, total_amount: 12000000 },
        { item_code: 'ITEM-003', item_name: 'Product C', total_qty: 100, total_amount: 10000000 },
        { item_code: 'ITEM-004', item_name: 'Product D', total_qty: 80, total_amount: 8000000 },
        { item_code: 'ITEM-005', item_name: 'Product E', total_qty: 60, total_amount: 6000000 },
      ];
      break;
      
    case 'best_customers':
      mockData = [
        { customer_name: 'Customer A', paid_invoices: 50, on_time_percentage: 95, total_paid: 50000000 },
        { customer_name: 'Customer B', paid_invoices: 45, on_time_percentage: 90, total_paid: 45000000 },
        { customer_name: 'Customer C', paid_invoices: 40, on_time_percentage: 85, total_paid: 40000000 },
      ];
      break;
      
    case 'worst_customers':
      mockData = [
        { customer_name: 'Customer X', overdue_invoices: 10, outstanding_amount: 10000000 },
        { customer_name: 'Customer Y', overdue_invoices: 8, outstanding_amount: 8000000 },
        { customer_name: 'Customer Z', overdue_invoices: 6, outstanding_amount: 6000000 },
      ];
      break;
      
    default:
      mockData = [];
  }
  
  return NextResponse.json({
    success: true,
    data: mockData,
    timestamp: new Date().toISOString(),
    mock: true,
  } as AnalyticsResponse<unknown>);
}
