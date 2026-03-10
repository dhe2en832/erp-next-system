# ERPNext Submit Action Implementation Guide

## 📋 Overview
This guide provides the standard approach for implementing submit/receive/complete actions for ERPNext documents in Next.js applications, based on the proven Sales Order method.

## 🎯 Key Learning: Use REST API PUT Method

**❌ AVOID: `frappe.client.submit` method**
- Causes timestamp mismatch errors
- Loses relational data (supplier becomes None)
- Complex 2-step process (GET → SUBMIT)
- Unreliable in multi-user environments

**✅ RECOMMENDED: REST API PUT with `docstatus`**
- Simple single API call
- No timestamp issues
- Maintains relational data
- Proven reliable method

## 🔧 Standard Implementation Pattern

### API Route Structure
```
app/api/[module]/[name]/submit/route.ts
```

### Complete API Route Template

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

    // Use API key authentication
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

    console.log(`Using REST API PUT method to submit [MODULE]:`, name);

    // Use REST API update method - most reliable approach
    const response = await fetch(`${ERPNEXT_API_URL}/api/resource/[ERPNext DocType]/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        docstatus: 1 // Submit document (0 = Draft, 1 = Submitted, 2 = Cancelled)
      }),
    });

    const responseText = await response.text();
    console.log(`Submit [MODULE] ERPNext Response Status:`, response.status);
    console.log(`Submit [MODULE] ERPNext Response Text:`, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json(
        { success: false, message: 'Invalid response from ERPNext server' },
        { status: response.status }
      );
    }

    if (response.ok) {
      // ERPNext REST API returns different structure
      const documentData = data.docs?.[0] || data.doc || data.data || data;
      
      console.log(`[MODULE] submitted successfully:`, documentData);
      
      return NextResponse.json({
        success: true,
        data: documentData,
        message: '[MODULE Name] submitted successfully'
      });
    } else {
      let errorMessage = `Failed to submit [MODULE Name]`;
      
      console.log('Full Error Response:', data);
      
      // Comprehensive error parsing
      if (data.exc) {
        try {
          const excData = JSON.parse(data.exc);
          console.log('Parsed Exception Data:', excData);
          errorMessage = `${excData.exc_type}: ${excData.message}`;
        } catch (e) {
          console.log('Failed to parse exception, using raw data');
          errorMessage = data.message || data.exc || `Failed to submit [MODULE Name]`;
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data._server_messages) {
        try {
          const serverMessages = JSON.parse(data._server_messages);
          console.log('Parsed Server Messages:', serverMessages);
          errorMessage = serverMessages[0]?.message || serverMessages[0] || errorMessage;
        } catch (e) {
          console.log('Failed to parse server messages, using raw data');
          errorMessage = data._server_messages;
        }
      } else if (data.error) {
        errorMessage = data.error;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = `Unknown error occurred. Response: ${JSON.stringify(data)}`;
      }
      
      console.error(`Submit [MODULE] Error Details:`, {
        status: response.status,
        data: data,
        errorMessage: errorMessage
      });
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error(`[MODULE Name] submit error:`, error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 📊 Document Status Values

| docstatus | Status | Description |
|-----------|--------|-------------|
| 0 | Draft | Document is in draft state |
| 1 | Submitted | Document is submitted and active |
| 2 | Cancelled | Document is cancelled |

## 🔄 Action-Specific Implementations

### Submit Action
```typescript
body: JSON.stringify({
  docstatus: 1 // Submit document
})
```

### Cancel Action
```typescript
body: JSON.stringify({
  docstatus: 2 // Cancel document
})
```

### Receive/Complete Actions (Module-Specific)
Some modules may require additional fields:

```typescript
body: JSON.stringify({
  docstatus: 1,
  // Module-specific fields if needed
  received_by: "User Name", // For Purchase Order
  completed_on: "2026-02-08", // For tasks/projects
})
```

## 🎨 Frontend Implementation Template

### React Component with Loading & Success Dialog

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentList() {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (docName: string) => {
    setActionLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/[module]/${docName}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`[MODULE] ${docName} berhasil di submit!`);
        setShowSuccessDialog(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push(`/[module]/[mainPage]?name=${docName}`);
        }, 2000);
      } else {
        setError(data.message || 'Failed to submit document');
      }
    } catch (err) {
      setError('Failed to submit document');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Document List */}
      {/* Submit Button */}
      <button
        onClick={() => handleSubmit(doc.name)}
        disabled={actionLoading}
        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
      >
        {actionLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </>
        ) : (
          'Submit'
        )}
      </button>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Sukses!</h3>
              </div>
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

## 🏗️ Module Implementation Checklist

### ✅ Required Files
- [ ] `app/api/[module]/[name]/submit/route.ts`
- [ ] Frontend component with submit button
- [ ] Loading state implementation
- [ ] Success dialog implementation

### ✅ API Route Requirements
- [ ] Use REST API PUT method
- [ ] Set `docstatus: 1` for submit
- [ ] Proper error handling
- [ ] Comprehensive response parsing
- [ ] API key authentication

### ✅ Frontend Requirements
- [ ] Loading spinner during submit
- [ ] Success dialog with confirmation
- [ ] Auto-redirect after success
- [ ] Error state handling
- [ ] Disabled button during loading

### ✅ Testing Checklist
- [ ] Submit from Draft status
- [ ] Error handling for invalid documents
- [ ] Loading state functionality
- [ ] Success dialog display
- [ ] Redirect functionality
- [ ] Multiple submit attempts

## 📚 Module-Specific Examples

### Purchase Order
- **DocType**: `Purchase Order`
- **Actions**: Submit, Receive, Complete
- **Status Flow**: Draft → Submitted → To Receive → Completed

### Sales Order
- **DocType**: `Sales Order`
- **Actions**: Submit, Deliver, Complete
- **Status Flow**: Draft → Submitted → To Deliver → Completed

### Invoice
- **DocType**: `Sales Invoice`
- **Actions**: Submit, Cancel
- **Status Flow**: Draft → Submitted → Paid/Cancelled

### Delivery Note
- **DocType**: `Delivery Note`
- **Actions**: Submit, Complete
- **Status Flow**: Draft → Submitted → Completed

## 🚀 Quick Start Template

Copy this template for new modules:

```bash
# Create API route
mkdir -p app/api/[module]/[name]/submit
cp templates/submit-route.ts app/api/[module]/[name]/submit/route.ts

# Update placeholders:
# - [module] → your module name
# - [ERPNext DocType] → ERPNext document type
# - [MODULE Name] → human readable name
```

## ⚠️ Common Pitfalls to Avoid

1. **Don't use `frappe.client.submit`** - causes timestamp issues
2. **Don't forget `encodeURIComponent()`** for document names with special characters
3. **Don't skip error parsing** - ERPNext has complex error structures
4. **Don't use hardcoded timestamps** - let ERPNext handle them
5. **Don't forget loading states** - improves UX significantly

## 🎯 Best Practices

1. **Always use the REST API PUT method**
2. **Implement comprehensive error handling**
3. **Add loading states for better UX**
4. **Use success dialogs for user feedback**
5. **Auto-redirect after successful actions**
6. **Log all API responses for debugging**
7. **Test with various document states**
8. **Handle network errors gracefully**

---

*This guide is based on real implementation experience and proven methods from the Sales Order module. Follow these patterns for reliable and consistent ERPNext integrations.*
