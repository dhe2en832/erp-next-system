import { NextResponse } from 'next/server';

export async function GET() {
  console.log('=== Environment Variables Debug ===');

  const envVars = {
    ERPNEXT_API_URL: process.env.ERPNEXT_API_URL,
    ERP_API_KEY: process.env.ERP_API_KEY ? `${process.env.ERP_API_KEY.substring(0, 10)}...` : 'NOT SET',
    ERP_API_SECRET: process.env.ERP_API_SECRET ? `${process.env.ERP_API_SECRET.substring(0, 10)}...` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  };

  console.log('Runtime Environment Variables:', envVars);

  return NextResponse.json({
    success: true,
    message: 'Environment variables check',
    data: envVars,
    timestamp: new Date().toISOString()
  });
}
