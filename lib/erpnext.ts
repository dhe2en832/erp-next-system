const ERPNEXT_API_URL = process.env.ERPNEXT_URL || process.env.ERPNEXT_API_URL || 'http://localhost:8000';

function buildAuthHeaders() {
  const apiKey = process.env.ERP_API_KEY;
  const apiSecret = process.env.ERP_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('ERP API credentials not configured');
  }

  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return {
    Authorization: `Basic ${authString}`,
    'Content-Type': 'application/json',
  } as Record<string, string>;
}

// Generic ERPNext API client
export class ERPNextClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || ERPNEXT_API_URL;
  }

  private getHeaders(): Record<string, string> {
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
    params.append('doctype', doctype);
    
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

    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}?${params.toString()}`, {
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
    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}/${name}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

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
    params.append('doctype', doctype);
    
    if (options?.filters) {
      params.append('filters', JSON.stringify(options.filters));
    }

    const res = await fetch(`${this.baseUrl}/api/resource/${doctype}?${params.toString()}`, {
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
   */
  async submit(doctype: string, name: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/method/frappe.client.submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        doc: {
          doctype,
          name,
        },
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
   */
  async cancel(doctype: string, name: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        doctype,
        name,
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
