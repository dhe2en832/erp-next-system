# ERPNext CRUD Operations Implementation Guide

## 📋 Overview
This guide provides comprehensive patterns for implementing all ERPNext CRUD operations (GET, POST, PUT, DELETE) and related patterns in Next.js applications.

## 🏗️ Folder Structure

```
app/
├── api/
│   ├── [module]/                    # Module collection routes
│   │   ├── route.ts                 # GET (list) + POST (create)
│   │   └── [name]/                  # Individual document routes
│   │       ├── route.ts             # GET (detail) + PUT (update) + DELETE
│   │       └── submit/              # Action-specific routes
│   │           └── route.ts         # POST (submit action)
│   ├── customers/                   # Master data examples
│   │   ├── route.ts                 # GET list + POST create
│   │   └── [name]/route.ts          # GET detail + PUT update + DELETE
│   ├── items/                       # Master data examples
│   │   ├── route.ts                 # GET list + POST create
│   │   └── [name]/route.ts          # GET detail + PUT update + DELETE
│   └── suppliers/                   # Master data examples
│       ├── route.ts                 # GET list + POST create
│       └── [name]/route.ts          # GET detail + PUT update + DELETE
```

## 🎯 CRUD Operations Patterns

### 1️⃣ GET - List Documents (Collection)

**Route**: `app/api/[module]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log(`=== [MODULE] List API Called ===`);
    
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const limit = searchParams.get('limit_page_length') || '20';
    const start = searchParams.get('start') || '0';
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const orderBy = searchParams.get('order_by');

    console.log('Request params:', { company, search, status, fromDate, toDate, orderBy });

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Build filters
    let filters = `[["company","=","${company}"]`;
    
    if (search) {
      filters += `,["field_name","like","%${search}%"]`;
    }
    
    if (status) {
      filters += `,["status","=","${status}"]`;
    }
    
    if (fromDate) {
      filters += `,["transaction_date",">=","${fromDate}"]`;
    }
    
    if (toDate) {
      filters += `,["transaction_date","<=","${toDate}"]`;
    }
    
    filters += ']';

    // Build ERPNext URL
    const fields = '["name","field1","field2","status","date_field","total_field"]';
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]?fields=${fields}&filters=${encodeURIComponent(filters)}&limit_page_length=${limit}&start=${start}`;
    
    if (orderBy) {
      erpNextUrl += `&order_by=${orderBy}`;
    } else {
      erpNextUrl += '&order_by=creation desc';
    }

    console.log(`[MODULE] ERPNext URL:`, erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();
    console.log(`[MODULE] response:`, data);

    if (response.ok) {
      // Process data if needed
      const processedData = (data.data || []).map((item: any) => ({
        ...item,
        // Add computed fields if needed
        computed_field: item.field1 + item.field2,
      }));

      return NextResponse.json({
        success: true,
        data: processedData,
        total_records: data.total_records || processedData.length,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || `Failed to fetch [MODULE]` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error(`[MODULE] API Error:`, error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2️⃣ POST - Create Document

**Route**: `app/api/[module]/route.ts` (same file as GET)

```typescript
export async function POST(request: NextRequest) {
  try {
    const documentData = await request.json();

    console.log('Creating [MODULE]:', documentData);

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(documentData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: '[MODULE] created successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to create [MODULE]' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[MODULE] creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3️⃣ GET - Document Detail

**Route**: `app/api/[module]/[name]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    console.log(`Fetching [MODULE] detail:`, name);

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company is required' },
        { status: 400 }
      );
    }

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    // Get specific document with all fields
    const erpNextUrl = `${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]/${name}?fields=["*"]`;

    console.log('Fetch [MODULE] ERPNext URL:', erpNextUrl);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to fetch [MODULE]' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[MODULE] fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4️⃣ PUT - Update Document

**Route**: `app/api/[module]/[name]/route.ts` (same file as GET detail)

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const documentData = await request.json();

    console.log('Updating [MODULE]:', name);
    console.log('[MODULE] Data:', documentData);

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]/${name}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(documentData),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data,
        message: '[MODULE] updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to update [MODULE]' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[MODULE] update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5️⃣ DELETE - Delete Document

**Route**: `app/api/[module]/[name]/route.ts` (same file as GET/PUT)

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    console.log('Deleting [MODULE]:', name);

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]/${name}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${apiKey}:${apiSecret}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: '[MODULE] deleted successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.exc || data.message || 'Failed to delete [MODULE]' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[MODULE] delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🔄 Action Operations

### Submit Action (Recommended Method)

**Route**: `app/api/[module]/[name]/submit/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const ERPNEXT_API_URL = process.env.ERPNEXT_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    console.log(`Submitting [MODULE]:`, name);

    // Authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, message: 'ERPNext API credentials not configured' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `token ${apiKey}:${apiSecret}`,
    };

    // Use REST API PUT method - most reliable approach
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const responseText = await response.text();
    console.log(`Submit [MODULE] ERPNext Response:`, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    if (response.ok) {
      const documentData = data.docs?.[0] || data.doc || data.data || data;
      
      return NextResponse.json({
        success: true,
        data: documentData,
        message: '[MODULE] submitted successfully'
      });
    } else {
      let errorMessage = `Failed to submit [MODULE]`;
      
      // Comprehensive error parsing
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          errorMessage = data.message || data.exc || `Failed to submit [MODULE]`;
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          errorMessage = data._server_messages;
        }
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error(`[MODULE] submit error:`, error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 📊 Master Data Patterns

### Customer/Supplier/Item List with Search

**Route**: `app/api/[master-data]/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '20';
    const company = searchParams.get('company');

    // Build ERPNext URL
    let erpNextUrl = `${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]?fields=["name","display_field"]&limit_page_length=${limit}`;
    
    // Build filters
    const filters: any[] = [];
    
    if (search && search.trim()) {
      const searchTrim = search.trim();
      filters.push(["display_field", "like", `%${searchTrim}%`]);
    }
    
    if (filters.length > 0) {
      erpNextUrl += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
    }

    console.log('[MASTER DATA] ERPNext URL:', erpNextUrl);

    // Authentication (API Key or Session)
    const headers = buildAuthHeaders(request);

    const response = await fetch(erpNextUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: data.data || [],
      });
    } else {
      // Fallback: try without search filter if it causes error
      if (!response.ok && search && search.trim()) {
        const fallbackUrl = `${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]?fields=["name","display_field"]&limit_page_length=${limit}`;
        
        const fallbackResponse = await fetch(fallbackUrl, { method: 'GET', headers });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return NextResponse.json({
            success: true,
            data: fallbackData.data || [],
          });
        }
      }
      
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch [MASTER DATA]' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('[MASTER DATA] API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function for authentication
function buildAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookies = request.cookies;
  const sid = cookies.get('sid')?.value;

  // Try session-based authentication first
  if (sid) {
    headers['Cookie'] = `sid=${sid}`;
    console.log('Using session authentication');
  } else {
    // Fallback to API key authentication
    const apiKey = process.env.ERP_API_KEY;
    const apiSecret = process.env.ERP_API_SECRET;
    
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
      console.log('Using API key authentication');
    } else {
      console.log('No authentication available');
    }
  }

  return headers;
}
```

## 🎨 Frontend Implementation Patterns

### React Component with Full CRUD

```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Document {
  name: string;
  field1: string;
  field2: string;
  status: string;
  // ... other fields
}

export default function DocumentManager() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch documents
  const fetchDocuments = async (searchParams?: any) => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams(searchParams);
      const response = await fetch(`/api/[module]?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  // Create document
  const handleCreate = async (documentData: Partial<Document>) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/[module]', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('[MODULE] created successfully!');
        setShowSuccessDialog(true);
        fetchDocuments(); // Refresh list
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // Update document
  const handleUpdate = async (name: string, documentData: Partial<Document>) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/[module]/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('[MODULE] updated successfully!');
        setShowSuccessDialog(true);
        fetchDocuments(); // Refresh list
        setIsEditing(false);
        setSelectedDocument(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update document');
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDelete = async (name: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/[module]/${name}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('[MODULE] deleted successfully!');
        setShowSuccessDialog(true);
        fetchDocuments(); // Refresh list
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  // Submit document
  const handleSubmit = async (name: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/[module]/${name}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`[MODULE] ${name} submitted successfully!`);
        setShowSuccessDialog(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(`/[module]/[detailPage]?name=${name}`);
        }, 2000);
        
        fetchDocuments(); // Refresh list
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to submit document');
    } finally {
      setLoading(false);
    }
  };

  // Fetch document detail
  const fetchDocumentDetail = async (name: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/[module]/${name}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedDocument(data.data);
        setIsEditing(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch document detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-4">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-2">Loading...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Document List */}
      <div className="grid gap-4">
        {documents.map((doc) => (
          <div key={doc.name} className="border rounded p-4">
            <h3 className="font-semibold">{doc.name}</h3>
            <p>Status: {doc.status}</p>
            
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => fetchDocumentDetail(doc.name)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              
              {doc.status === 'Draft' && (
                <button
                  onClick={() => handleSubmit(doc.name)}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              )}
              
              <button
                onClick={() => handleDelete(doc.name)}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="ml-3 text-lg font-medium text-gray-900">Success!</h3>
            </div>
            <div className="text-sm text-gray-600">
              {successMessage}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 📋 Module Implementation Checklist

### ✅ Required Files
- [ ] `app/api/[module]/route.ts` (GET list + POST create)
- [ ] `app/api/[module]/[name]/route.ts` (GET detail + PUT update + DELETE)
- [ ] `app/api/[module]/[name]/submit/route.ts` (POST submit action)
- [ ] Frontend component with CRUD operations
- [ ] Loading states implementation
- [ ] Success/error dialogs

### ✅ API Route Requirements
- [ ] Proper authentication (API key or session)
- [ ] Comprehensive error handling
- [ ] Input validation
- [ ] Response logging
- [ ] Fallback mechanisms for search

### ✅ Frontend Requirements
- [ ] Loading spinners for all operations
- [ ] Success dialogs for user feedback
- [ ] Error state handling
- [ ] Confirmation dialogs for destructive actions
- [ ] Auto-refresh after successful operations

### ✅ Testing Checklist
- [ ] List documents with pagination
- [ ] Search and filter functionality
- [ ] Create new document
- [ ] Update existing document
- [ ] Delete document (with confirmation)
- [ ] Submit document (status change)
- [ ] Error handling for invalid data
- [ ] Loading states during operations

## 🚀 Quick Start Templates

### Create New Module
```bash
# Create API routes
mkdir -p app/api/[module]/[name]/submit
cp templates/crud-list-route.ts app/api/[module]/route.ts
cp templates/crud-detail-route.ts app/api/[module]/[name]/route.ts
cp templates/submit-route.ts app/api/[module]/[name]/submit/route.ts

# Update placeholders:
# - [module] → your module name
# - [ERPNext DocType] → ERPNext document type
# - [MODULE] → human readable name
```

### Field Mapping Template
```typescript
// Common field mappings
const fieldMappings = {
  // Purchase Order
  'Purchase Order': {
    list: '["name","supplier","transaction_date","status","grand_total","currency"]',
    detail: '["*"]',
    searchField: 'supplier_name',
    dateField: 'transaction_date',
    totalField: 'grand_total'
  },
  
  // Sales Order
  'Sales Order': {
    list: '["name","customer","transaction_date","status","grand_total","currency"]',
    detail: '["*"]',
    searchField: 'customer_name',
    dateField: 'transaction_date',
    totalField: 'grand_total'
  },
  
  // Customer
  'Customer': {
    list: '["name","customer_name","customer_group","territory"]',
    detail: '["*"]',
    searchField: 'customer_name',
    displayField: 'customer_name'
  },
  
  // Item
  'Item': {
    list: '["item_code","item_name","item_group","stock_uom"]',
    detail: '["*"]',
    searchField: 'item_name',
    displayField: 'item_name'
  }
};
```

## ⚠️ Common Pitfalls to Avoid

1. **Don't use `frappe.client.submit`** - use REST API PUT with docstatus
2. **Don't forget `encodeURIComponent()`** for document names with special characters
3. **Don't skip error parsing** - ERPNext has complex error structures
4. **Don't use hardcoded timestamps** - let ERPNext handle them
5. **Don't forget loading states** - improves UX significantly
6. **Don't ignore authentication** - always validate API keys or sessions
7. **Don't forget pagination** - handle large datasets properly
8. **Don't skip input validation** - validate before sending to ERPNext

## 🎯 Best Practices

1. **Always use consistent folder structure**
2. **Implement comprehensive error handling**
3. **Add loading states for better UX**
4. **Use success dialogs for user feedback**
5. **Auto-refresh after successful operations**
6. **Log all API responses for debugging**
7. **Test with various document states**
8. **Handle network errors gracefully**
9. **Use TypeScript for type safety**
10. **Implement proper authentication flow**

---

*This guide provides complete patterns for implementing all ERPNext CRUD operations. Follow these templates for consistent, reliable, and maintainable integrations.*
