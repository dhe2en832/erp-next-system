import { NextRequest, NextResponse } from 'next/server';
import { analyticsCache } from '@/lib/analytics-cache';

/**
 * Clear Analytics Cache Endpoint
 * 
 * Clears all analytics cache entries.
 * Useful for debugging or when cache needs to be invalidated.
 * 
 * POST /api/analytics/clear-cache
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get cache stats before clearing
    const statsBefore = analyticsCache.getStats();
    
    // Clear all cache
    analyticsCache.clear();
    
    // Get cache stats after clearing
    const statsAfter = analyticsCache.getStats();
    
    return NextResponse.json({
      success: true,
      message: 'Analytics cache cleared successfully',
      before: statsBefore,
      after: statsAfter,
    });
  } catch (error) {
    console.error('[Clear Cache Error]', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'CACHE_CLEAR_ERROR',
        message: error instanceof Error ? error.message : 'Failed to clear cache',
      },
      { status: 500 }
    );
  }
}
