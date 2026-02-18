import { NextRequest } from 'next/server';

/**
 * Returns auth headers using only env vars (no request needed).
 * Priority: API key > nothing.
 * Use this as a drop-in replacement for inline apiKey/sid auth blocks.
 */
export function makeErpHeaders(): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  }
  return headers;
}

/**
 * Returns auth headers for ERPNext API calls.
 * Priority: API key (admin) > session cookie (sid)
 * Using API key ensures all roles can read data regardless of ERPNext permissions.
 * The frontend already enforces role-based access via Navbar filtering.
 */
export function getErpAuthHeaders(request: NextRequest): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;
  const sid = request.cookies.get('sid')?.value;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  return headers;
}

/**
 * Returns auth headers given a raw sid string.
 * Priority: API key (admin) > sid cookie fallback.
 * Use this in files that already extracted sid separately.
 */
export function getErpHeaders(sid?: string | null): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey && apiSecret) {
    headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
  } else if (sid) {
    headers['Cookie'] = `sid=${sid}`;
  }

  return headers;
}

/**
 * Returns true if the request has a valid session (sid cookie present).
 * Use this to guard routes that require login.
 */
export function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get('sid')?.value;
}
