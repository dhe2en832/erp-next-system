#!/usr/bin/env tsx

/**
 * Analytics API Diagnostic Script
 * 
 * Tests the analytics API endpoint to identify issues
 */

async function testAnalyticsAPI() {
  console.log('=== Analytics API Diagnostic Test ===\n');

  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Debug endpoint
  console.log('Test 1: Debug endpoint');
  try {
    const response = await fetch(`${baseUrl}/api/analytics/debug`);
    const data = await response.json();
    console.log('✓ Debug endpoint response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Debug endpoint failed:', error);
  }
  
  console.log('\n---\n');
  
  // Test 2: Top products endpoint
  console.log('Test 2: Top products endpoint');
  try {
    const response = await fetch(`${baseUrl}/api/analytics?type=top_products`);
    console.log('Status:', response.status, response.statusText);
    
    const text = await response.text();
    console.log('Raw response:', text.substring(0, 500));
    
    try {
      const data = JSON.parse(text);
      console.log('Parsed response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON response');
    }
  } catch (error) {
    console.error('✗ Top products endpoint failed:', error);
  }
  
  console.log('\n---\n');
  
  // Test 3: Check environment variables
  console.log('Test 3: Environment check');
  console.log('ERPNEXT_API_URL:', process.env.ERPNEXT_API_URL || 'NOT SET');
  console.log('ERP_API_KEY:', process.env.ERP_API_KEY ? '***SET***' : 'NOT SET');
  console.log('ERP_API_SECRET:', process.env.ERP_API_SECRET ? '***SET***' : 'NOT SET');
}

testAnalyticsAPI().catch(console.error);
