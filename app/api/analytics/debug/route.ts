import { NextRequest, NextResponse } from 'next/server';
import { 
  getERPNextClientForRequest, 
  getSiteIdFromRequest 
} from '@/lib/api-helpers';

/**
 * Debug endpoint to test analytics API connectivity
 * 
 * GET /api/analytics/debug
 * 
 * Returns diagnostic information about:
 * - Authentication status
 * - ERPNext connectivity
 * - Sample data fetch
 */
export async function GET(request: NextRequest) {
  const siteId = await getSiteIdFromRequest(request);
  
  const diagnostics: {
    timestamp: string;
    siteId: string | null;
    authentication: 'success' | 'failed';
    authError?: string;
    connectivity: 'success' | 'failed';
    connectivityError?: string;
    sampleData?: unknown;
    sampleDataError?: string;
  } = {
    timestamp: new Date().toISOString(),
    siteId,
    authentication: 'failed',
    connectivity: 'failed',
  };
  
  try {
    // Test 1: Authentication
    const client = await getERPNextClientForRequest(request);
    diagnostics.authentication = 'success';
    
    // Test 2: Connectivity - try to fetch a simple doctype
    try {
      const testData = await client.getList('Sales Invoice', {
        filters: [['docstatus', '=', 1]],
        fields: ['name'],
        limit: 1,
      });
      
      diagnostics.connectivity = 'success';
      diagnostics.sampleData = testData;
    } catch (connectError) {
      diagnostics.connectivityError = connectError instanceof Error 
        ? connectError.message 
        : 'Unknown connectivity error';
    }
    
  } catch (authError) {
    diagnostics.authError = authError instanceof Error 
      ? authError.message 
      : 'Unknown authentication error';
  }
  
  return NextResponse.json(diagnostics, { 
    status: diagnostics.connectivity === 'success' ? 200 : 500 
  });
}
