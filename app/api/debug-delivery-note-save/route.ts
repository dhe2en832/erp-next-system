import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const deliveryNoteData = await request.json();
    
    console.log('=== DEBUG DELIVERY NOTE SAVE ===');
    console.log('Received Payload:', JSON.stringify(deliveryNoteData, null, 2));
    console.log('Payload Keys:', Object.keys(deliveryNoteData));
    
    // Check for common issues
    const issues = [];
    
    // Check for null/undefined required fields
    const requiredFields = ['customer', 'posting_date', 'company'];
    for (const field of requiredFields) {
      if (!deliveryNoteData[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    }
    
    // Check for invalid field names
    const invalidFields = ['against_sales_order', 'sales_order'];
    for (const field of invalidFields) {
      if (deliveryNoteData[field]) {
        issues.push(`Invalid field detected: ${field} (not permitted in ERPNext)`);
      }
    }
    
    // Check items structure
    if (deliveryNoteData.items) {
      if (!Array.isArray(deliveryNoteData.items)) {
        issues.push('Items should be an array');
      } else {
        deliveryNoteData.items.forEach((item: any, index: number) => {
          if (!item.item_code) {
            issues.push(`Item ${index}: missing item_code`);
          }
          if (!item.qty || item.qty <= 0) {
            issues.push(`Item ${index}: invalid qty`);
          }
        });
      }
    }
    
    // Suggest clean payload
    const cleanPayload = {
      customer: deliveryNoteData.customer,
      posting_date: deliveryNoteData.posting_date,
      company: deliveryNoteData.company,
      items: deliveryNoteData.items?.map((item: any) => ({
        item_code: item.item_code,
        qty: item.qty,
        rate: item.rate || 0,
        warehouse: item.warehouse || ''
      })) || []
    };
    
    console.log('Clean Payload Suggestion:', JSON.stringify(cleanPayload, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Debug complete',
      original_payload: deliveryNoteData,
      issues_found: issues,
      clean_payload_suggestion: cleanPayload,
      recommendations: [
        'Remove any against_sales_order or sales_order fields',
        'Ensure all required fields are present',
        'Check items array structure',
        'Use API key authentication instead of session'
      ]
    });
    
  } catch (error: unknown) {
    console.error('Debug delivery note save error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
