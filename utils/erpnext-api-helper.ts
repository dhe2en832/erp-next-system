/**
 * ERPNext API Helper
 * 
 * Provides consistent error handling for all ERPNext API endpoints
 */

import { NextResponse } from 'next/server';

/**
 * Extract user-friendly error message from ERPNext API response
 * This is used in API routes (server-side)
 */
export function extractERPNextErrorMessage(data: any, defaultMessage: string = 'Operation failed'): string {
  let errorMessage = defaultMessage;
  
  console.log('Extracting error from data keys:', Object.keys(data));
  
  // Priority 1: Parse _server_messages (most user-friendly)
  if (data._server_messages) {
    try {
      const serverMessages = JSON.parse(data._server_messages);
      console.log('Parsed serverMessages:', serverMessages);
      
      if (Array.isArray(serverMessages) && serverMessages.length > 0) {
        const firstMessage = typeof serverMessages[0] === 'string' 
          ? JSON.parse(serverMessages[0]) 
          : serverMessages[0];
        
        if (firstMessage.message) {
          // Remove HTML tags from message
          errorMessage = firstMessage.message.replace(/<[^>]*>/g, '');
          console.log('Extracted from _server_messages:', errorMessage);
          return errorMessage;
        }
      }
    } catch (e) {
      console.log('Failed to parse _server_messages:', e);
    }
  }
  
  // Priority 2: Parse exception message from exc
  if (data.exc) {
    try {
      const excArray = JSON.parse(data.exc);
      console.log('Parsed exc array, length:', excArray.length);
      
      if (Array.isArray(excArray) && excArray.length > 0) {
        const excString = excArray[0];
        // Extract the last line which contains the actual error message
        const lines = excString.split('\n');
        const lastLine = lines[lines.length - 2] || lines[lines.length - 1];
        
        if (lastLine && lastLine.includes(':')) {
          const parts = lastLine.split(':');
          if (parts.length > 1) {
            errorMessage = parts.slice(1).join(':').trim();
            console.log('Extracted from exc:', errorMessage);
            return errorMessage;
          }
        }
      }
    } catch (e) {
      console.log('Failed to parse exc:', e);
    }
  }
  
  // Priority 3: Use data.message if available
  if (data.message) {
    console.log('Using data.message:', data.message);
    return data.message;
  }
  
  // Priority 4: Use exception field
  if (data.exception) {
    console.log('Using data.exception:', data.exception);
    return data.exception;
  }
  
  console.log('Using default message:', errorMessage);
  return errorMessage;
}

/**
 * Handle ERPNext POST/PUT error response
 * Returns a NextResponse with extracted error message
 */
export function handleERPNextAPIError(
  response: Response,
  data: any,
  defaultMessage: string = 'Operation failed',
  payload?: any
): NextResponse {
  const errorMessage = extractERPNextErrorMessage(data, defaultMessage);
  
  // Log error details for debugging
  console.error('ERPNext API Error:', {
    status: response.status,
    errorMessage,
    dataKeys: Object.keys(data),
    payload: payload ? JSON.stringify(payload).substring(0, 200) : 'N/A'
  });
  
  return NextResponse.json(
    { success: false, message: errorMessage },
    { status: response.status }
  );
}
