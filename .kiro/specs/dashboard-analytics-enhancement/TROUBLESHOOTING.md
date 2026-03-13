# Analytics API Troubleshooting Guide

## Error: HTTP 500 when fetching analytics data

### Quick Diagnosis

1. **Visit the debug endpoint:**
   ```
   http://localhost:3000/api/analytics/debug
   ```
   This will show you:
   - Authentication status
   - ERPNext connectivity
   - Sample data fetch results

2. **Check your terminal** where `pnpm dev` is running for detailed error logs

### Common Causes

#### 1. ERPNext Backend Not Running
**Symptoms:** Connection refused, network errors

**Solution:**
- Ensure ERPNext is running on the configured URL
- Check `ERPNEXT_API_URL` in your `.env` file
- Default: `http://localhost:8000`

#### 2. Missing or Invalid Credentials
**Symptoms:** 401 Unauthorized, authentication errors

**Solution:**
- Check `.env` file has valid credentials:
  ```
  ERP_API_KEY=your_api_key_here
  ERP_API_SECRET=your_api_secret_here
  ```
- Generate new API keys in ERPNext if needed

#### 3. No Data in ERPNext
**Symptoms:** Empty arrays returned, no errors

**Solution:**
- Ensure you have Sales Invoices with docstatus=1 in ERPNext
- The analytics require submitted (docstatus=1) documents
- Create test data if needed

#### 4. Slow API Calls / Timeouts
**Symptoms:** Request timeout after 10 seconds

**Cause:** The analytics handlers make many API calls in loops (especially for sales team data)

**Solutions:**

**Option A: Use Mock Data for Testing**
Update your component to use the mock endpoint:
```typescript
// In TopProductsChart.tsx
const response = await fetch('/api/analytics/mock?type=top_products');
```

**Option B: Increase Timeout**
Edit `app/api/analytics/route.ts` line 67:
```typescript
// Change from 10000 to 30000 (30 seconds)
setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
```

**Option C: Optimize Queries** (Recommended for production)
The current implementation fetches invoice details in loops. For production, consider:
- Using ERPNext Reports API instead of individual document fetches
- Implementing server-side aggregation
- Creating custom ERPNext endpoints for analytics

### Testing with Mock Data

To test the frontend without ERPNext:

1. **Update component to use mock endpoint:**
   ```typescript
   // components/analytics/TopProductsChart.tsx
   const response = await fetch('/api/analytics/mock?type=top_products');
   ```

2. **Available mock types:**
   - `top_products`
   - `best_customers`
   - `worst_customers`
   - (Add more as needed)

3. **Restore real endpoint when ready:**
   ```typescript
   const response = await fetch('/api/analytics?type=top_products');
   ```

### Performance Optimization

The current analytics implementation is designed for small to medium datasets. For large datasets:

1. **Reduce data fetch limits:**
   Edit `lib/analytics-handlers.ts`:
   ```typescript
   // Change from 5000 to 1000
   limit: 1000,
   ```

2. **Implement pagination:**
   Add pagination to analytics API

3. **Use ERPNext Reports:**
   Replace individual queries with ERPNext Report API

4. **Add database indexes:**
   Ensure ERPNext has proper indexes on:
   - Sales Invoice: docstatus, company, posting_date
   - Sales Invoice Item: parent, item_code
   - Purchase Order: docstatus, company

### Checking Server Logs

Look for these patterns in your terminal:

**Authentication Error:**
```
[Site Error] {
  "context": "GET /api/analytics",
  "error": "Authentication failed"
}
```

**Network Error:**
```
[Site Error] {
  "context": "GET /api/analytics",
  "error": "fetch failed"
}
```

**Timeout Error:**
```
[Site Error] {
  "context": "GET /api/analytics",
  "error": "Request timeout after 10 seconds"
}
```

### Next Steps

1. Run the debug endpoint to identify the issue
2. Check terminal logs for detailed error messages
3. Use mock data endpoint for frontend testing
4. Optimize queries for production use

### Getting Help

If you're still stuck, provide:
1. Output from `/api/analytics/debug`
2. Terminal error logs
3. ERPNext version
4. Number of documents in your ERPNext instance
