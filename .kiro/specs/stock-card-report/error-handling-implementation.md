# Stock Card Report - Error Handling Implementation

## Overview

This document describes the error handling implementation for the Stock Card Report API route (`/api/inventory/reports/stock-card`).

**Task:** 2.5 Implement error handling  
**Requirements:** 8.3, 12.3, 12.6

## Implemented Error Handling

### 1. Parameter Validation

#### Required Parameters
- **company**: Must be provided
- **item_code**: Must be provided

**Error Response:**
```json
{
  "success": false,
  "message": "Parameter company dan item_code wajib diisi"
}
```
**HTTP Status:** 400 Bad Request

### 2. Date Format Validation

#### Date Format Requirements
- Format: `YYYY-MM-DD` (e.g., `2024-01-15`)
- Must be a valid calendar date
- Applies to both `from_date` and `to_date` parameters

**Error Response (Invalid from_date):**
```json
{
  "success": false,
  "message": "Format tanggal mulai tidak valid. Gunakan format YYYY-MM-DD"
}
```

**Error Response (Invalid to_date):**
```json
{
  "success": false,
  "message": "Format tanggal akhir tidak valid. Gunakan format YYYY-MM-DD"
}
```
**HTTP Status:** 400 Bad Request

### 3. Date Range Validation

#### Date Range Requirements
- `to_date` must be greater than or equal to `from_date`
- Both dates must be provided for range validation

**Error Response:**
```json
{
  "success": false,
  "message": "Tanggal akhir harus setelah atau sama dengan tanggal mulai"
}
```
**HTTP Status:** 400 Bad Request

### 4. Pagination Parameter Validation

#### Page Number Validation
- Must be >= 1

**Error Response:**
```json
{
  "success": false,
  "message": "Nomor halaman harus lebih besar dari 0"
}
```
**HTTP Status:** 400 Bad Request

#### Limit Validation
- Must be between 1 and 1000

**Error Response:**
```json
{
  "success": false,
  "message": "Batas data per halaman harus antara 1 dan 1000"
}
```
**HTTP Status:** 400 Bad Request

#### Page Exceeds Total Pages
- Validated after fetching data

**Error Response:**
```json
{
  "success": false,
  "message": "Halaman 5 tidak tersedia. Total halaman: 3"
}
```
**HTTP Status:** 400 Bad Request

### 5. Authentication Errors

**Error Response:**
```json
{
  "success": false,
  "message": "Autentikasi diperlukan. Silakan login terlebih dahulu."
}
```
**HTTP Status:** 401 Unauthorized

### 6. ERPNext API Errors

#### 404 Not Found
**Error Response:**
```json
{
  "success": false,
  "message": "Data tidak ditemukan untuk item yang dipilih"
}
```
**HTTP Status:** 404 Not Found

#### 403 Forbidden
**Error Response:**
```json
{
  "success": false,
  "message": "Anda tidak memiliki akses untuk melihat data ini"
}
```
**HTTP Status:** 403 Forbidden

#### 401 Unauthorized (ERPNext)
**Error Response:**
```json
{
  "success": false,
  "message": "Sesi Anda telah berakhir. Silakan login kembali."
}
```
**HTTP Status:** 401 Unauthorized

#### 500+ Server Errors
**Error Response:**
```json
{
  "success": false,
  "message": "Terjadi kesalahan pada server ERPNext. Silakan coba lagi nanti."
}
```
**HTTP Status:** 500+ (matches ERPNext status)

### 7. Internal Server Errors

**Error Response:**
```json
{
  "success": false,
  "message": "Terjadi kesalahan internal server. Silakan coba lagi atau hubungi administrator."
}
```
**HTTP Status:** 500 Internal Server Error

### 8. Empty Results

When no data is found for the selected filters:

**Success Response with Message:**
```json
{
  "success": true,
  "data": [],
  "summary": { ... },
  "pagination": { ... },
  "message": "Tidak ada data untuk filter yang dipilih"
}
```
**HTTP Status:** 200 OK

## Error Logging

All errors are logged to the console with detailed information for debugging:

```typescript
console.error('Stock Card API: Missing required parameters', { company, item_code });
console.error('Stock Card API: Invalid from_date format', { from_date });
console.error('Stock Card API: ERPNext API error', { status, statusText, url });
console.error('Stock Card Report API Error:', error);
console.error('Error stack:', error.stack);
```

## Graceful Degradation

The API implements graceful degradation for non-critical failures:

### Data Enrichment Failures
If enrichment (item names, party info, warehouse info) fails:
- Error is logged
- Basic data is returned without enrichment
- Request continues successfully

### Summary Calculation Failures
If summary calculation fails:
- Error is logged
- Default summary values are provided
- Request continues successfully

## Testing

Error handling is tested in `tests/stock-card-error-handling.test.ts`:

**Test Coverage:**
- Missing required parameters
- Invalid date formats
- Invalid date ranges
- Invalid pagination parameters
- Indonesian error messages
- Valid inputs pass validation

**Run Tests:**
```bash
pnpm test:stock-card-error-handling
```

**Note:** Tests require the Next.js dev server to be running:
```bash
pnpm dev
```

## HTTP Status Code Summary

| Status Code | Scenario |
|------------|----------|
| 200 | Success (including empty results) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (no data for item) |
| 500+ | Server Error (internal or ERPNext) |

## Indonesian Language Compliance

All error messages are in Bahasa Indonesia as per requirement 12.3:
- ✅ "Parameter company dan item_code wajib diisi"
- ✅ "Format tanggal mulai tidak valid"
- ✅ "Tanggal akhir harus setelah atau sama dengan tanggal mulai"
- ✅ "Nomor halaman harus lebih besar dari 0"
- ✅ "Autentikasi diperlukan. Silakan login terlebih dahulu."
- ✅ "Data tidak ditemukan untuk item yang dipilih"
- ✅ "Tidak ada data untuk filter yang dipilih"
- ✅ "Terjadi kesalahan internal server"

## Implementation Files

- **API Route:** `app/api/inventory/reports/stock-card/route.ts`
- **Test File:** `tests/stock-card-error-handling.test.ts`
- **Documentation:** `.kiro/specs/stock-card-report/error-handling-implementation.md`
