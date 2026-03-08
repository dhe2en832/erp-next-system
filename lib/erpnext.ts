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
  async getList<T = any>(
    doctype: string,
    options?: {
      filters?: any[][];
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

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/api/resource/${doctype}?${queryString}`
      : `${this.baseUrl}/api/resource/${doctype}`;

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
  async get<T = any>(doctype: string, name: string): Promise<T> {
    // URL encode the name to handle special characters like %, +, (, )
    const encodedName = encodeURIComponent(name);
    
    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}/${encodedName}`, {
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
  async getDoc<T = any>(doctype: string, name: string): Promise<T> {
    return this.get<T>(doctype, name);
  }

  /**
   * Get count of documents matching filters
   */
  async getCount(doctype: string, options?: { filters?: any[][] }): Promise<number> {
    const params = new URLSearchParams();
    
    if (options?.filters) {
      params.append('filters', JSON.stringify(options.filters));
    }

    const queryString = params.toString();
    const url = queryString 
      ? `${this.baseUrl}/api/resource/${doctype}?${queryString}`
      : `${this.baseUrl}/api/resource/${doctype}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to count ${doctype}`);
    }
    return data.data?.length || 0;
  }

  /**
   * Insert a new document
   */
  async insert<T = any>(doctype: string, doc: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}`, {
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
  async update<T = any>(doctype: string, name: string, doc: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}/${name}`, {
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
    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}/${name}`, {
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
  async submit(doctype: string, name: string): Promise<any> {
    // Fetch latest document to get current modified timestamp
    const latestDoc = await this.get(doctype, name);
    
    const res = await fetch(`${this.baseUrl}/api/method/frappe.client.submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        doc: latestDoc,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to submit ${doctype} ${name}`);
    }
    return data.message || data.data;
  }

  /**
   * Cancel a document (change docstatus to 2)
   * Fetches latest document first to avoid timestamp mismatch
   */
  async cancel(doctype: string, name: string): Promise<any> {
    // Fetch latest document to get current modified timestamp
    const latestDoc = await this.get(doctype, name);
    
    const res = await fetch(`${this.baseUrl}/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        doc: latestDoc,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.exc || `Failed to cancel ${doctype} ${name}`);
    }
    return data.message || data.data;
  }

  /**
   * Call a custom API method
   */
  async call<T = any>(method: string, params?: any): Promise<T> {
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
