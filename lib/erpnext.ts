const ERPNEXT_API_URL = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function buildAuthHeaders() {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ERP API credentials not configured');
  }

  return {
    Authorization: `token ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

// Generic ERPNext API client
export class ERPNextClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || ERPNEXT_API_URL;
  }

  protected getHeaders(): Record<string, string> {
    return buildAuthHeaders();
  }

  /**
   * Get a list of documents from a DocType
   */
  async getList<T = unknown>(
    doctype: string,
    options?: {
      filters?: (string | number | boolean | null | string[])[][];
      fields?: string[];
      limit?: number;
      limit_page_length?: number;
      start?: number;
      order_by?: string;
    }
  ): Promise<T[]> {
    const params = new URLSearchParams();
    
    if (options?.filters) {
      params.append('filters', JSON.stringify(options.filters));
    }
    if (options?.fields) {
      params.append('fields', JSON.stringify(options.fields));
    }
    if (options?.limit_page_length) {
      params.append('limit_page_length', options.limit_page_length.toString());
    } else if (options?.limit) {
      params.append('limit_page_length', options.limit.toString());
    }
    if (options?.start) {
      params.append('limit_start', options.start.toString());
    }
    if (options?.order_by) {
      params.append('order_by', options.order_by);
    }

    const encodedDoctype = encodeURIComponent(doctype);
    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/api/resource/${encodedDoctype}?${queryString}`
      : `${this.baseUrl}/api/resource/${encodedDoctype}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to fetch ${doctype} list`);
    }
    return data.data || [];
  }

  /**
   * Get a single document by name
   */
  async get<T = unknown>(doctype: string, name: string): Promise<T> {
    const encodedDoctype = encodeURIComponent(doctype);
    // URL encode the name to handle special characters like %, +, (, )
    const encodedName = encodeURIComponent(name);
    
    const res = await fetch(`${this.baseUrl}/api/resource/${encodedDoctype}/${encodedName}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    // Check content type before parsing
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Failed to fetch ${doctype} ${name}: Document not found or invalid response`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to fetch ${doctype} ${name}`);
    }
    return data.data;
  }

  /**
   * Alias for get() - for backward compatibility
   */
  async getDoc<T = unknown>(doctype: string, name: string): Promise<T> {
    return this.get<T>(doctype, name);
  }

  /**
   * Get count of documents matching filters
   */
  async getCount(doctype: string, options?: { filters?: (string | number | boolean | null | string[])[][]; }): Promise<number> {
    const res = await fetch(`${this.baseUrl}/api/method/frappe.client.get_count`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        doctype,
        filters: options?.filters || [],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to count ${doctype}`);
    }
    return data.message || 0;
  }

  /**
   * Insert a new document
   */
  async insert<T = unknown>(doctype: string, doc: Record<string, unknown>): Promise<T> {
    const encodedDoctype = encodeURIComponent(doctype);
    const res = await fetch(`${this.baseUrl}/api/resource/${encodedDoctype}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(doc),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to insert ${doctype}`);
    }
    return data.data;
  }

  /**
   * Update an existing document
   */
  async update<T = unknown>(doctype: string, name: string, doc: Record<string, unknown>): Promise<T> {
    const encodedDoctype = encodeURIComponent(doctype);
    const encodedName = encodeURIComponent(name);
    const res = await fetch(`${this.baseUrl}/api/resource/${encodedDoctype}/${encodedName}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(doc),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to update ${doctype} ${name}`);
    }
    return data.data;
  }

  /**
   * Delete a document
   */
  async delete(doctype: string, name: string): Promise<void> {
    const encodedDoctype = encodeURIComponent(doctype);
    const encodedName = encodeURIComponent(name);
    const res = await fetch(`${this.baseUrl}/api/resource/${encodedDoctype}/${encodedName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.message || data?.exc || `Failed to delete ${doctype} ${name}`);
    }
  }

  /**
   * Submit a document (change docstatus to 1)
   * Fetches latest document first to avoid timestamp mismatch
   */
  async submit<T = unknown>(doctype: string, name: string): Promise<T> {
    // Try up to 3 times to handle TimestampMismatchError
    let lastError: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        // Fetch latest document to get current modified timestamp
        const latestDoc = await this.get<{ modified: string }>(doctype, name);
        
        const res = await fetch(`${this.baseUrl}/api/method/frappe.client.submit`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            doc: latestDoc,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          // If it's a timestamp mismatch, wait a bit and retry
          const errorMsg = data?.message || data?.exc || '';
          if (errorMsg.includes('TimestampMismatchError') || (data.exception && data.exception.includes('TimestampMismatchError'))) {
            console.warn(`[ERPNext] TimestampMismatchError during submit for ${doctype} ${name}, retrying (${i + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1))); // Incremental backoff
            continue;
          }
          throw new Error(data?.message || data?.exc || `Failed to submit ${doctype} ${name}`);
        }
        return (data.message || data.data) as T;
      } catch (error) {
        lastError = error;
        // If the error message contains the specific exception string, retry
        if (error instanceof Error && error.message.includes('TimestampMismatchError')) {
          console.warn(`[ERPNext] Caught TimestampMismatchError in catch block for ${doctype} ${name}, retrying (${i + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError as Error;
  }

  /**
   * Cancel a document (change docstatus to 2)
   * Fetches latest document first to avoid timestamp mismatch
   */
  async cancel<T = unknown>(doctype: string, name: string): Promise<T> {
    // Try up to 3 times to handle TimestampMismatchError
    let lastError: unknown;
    for (let i = 0; i < 3; i++) {
      try {
        // Fetch latest document to get current modified timestamp
        const latestDoc = await this.get<{ modified: string }>(doctype, name);
        
        const res = await fetch(`${this.baseUrl}/api/method/frappe.client.cancel`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            doc: latestDoc,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          // If it's a timestamp mismatch, wait a bit and retry
          const errorMsg = data?.message || data?.exc || '';
          if (errorMsg.includes('TimestampMismatchError') || (data.exception && data.exception.includes('TimestampMismatchError'))) {
            console.warn(`[ERPNext] TimestampMismatchError during cancel for ${doctype} ${name}, retrying (${i + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
            continue;
          }
          throw new Error(data?.message || data?.exc || `Failed to cancel ${doctype} ${name}`);
        }
        return (data.message || data.data) as T;
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.message.includes('TimestampMismatchError')) {
          console.warn(`[ERPNext] Caught TimestampMismatchError in catch block for ${doctype} ${name}, retrying (${i + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError as Error;
  }

  /**
   * Call a custom API method
   */
  async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/method/${method}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params || {}),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to call method ${method}`);
    }
    return data.message || data;
  }

  /**
   * Get current logged-in user from session
   * Returns the user email/ID from the session cookie
   */
  async getCurrentUser(sessionCookie?: string): Promise<string> {
    const headers: Record<string, string> = { ...this.getHeaders() };
    
    // If session cookie provided, use it instead of API key
    if (sessionCookie) {
      delete headers.Authorization;
      headers.Cookie = `sid=${sessionCookie}`;
    }

    const res = await fetch(`${this.baseUrl}/api/method/frappe.auth.get_logged_user`, {
      method: 'GET',
      headers,
    });

    const data = await res.json();
    if (!res.ok || !data.message) {
      // Fallback to Administrator if session user not found
      return 'Administrator';
    }
    return data.message;
  }
}

// Create a singleton instance
export const erpnextClient = new ERPNextClient();

// Legacy function for backward compatibility
export function getERPNextClient(): ERPNextClient {
  return erpnextClient;
}

// Legacy function for backward compatibility
export async function fetchProfitReport(params: {
  from_date: string;
  to_date: string;
  company?: string;
  mode: 'valuation' | 'margin';
  sales_person?: string;
  customer?: string;
  include_hpp?: boolean;
}) {
  return erpnextClient.call('get_profit_commission_report_dual', params);
}

export default fetchProfitReport;
