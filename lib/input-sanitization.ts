/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user inputs and prevent XSS attacks.
 * All user-facing inputs should be sanitized before processing or storage.
 */

/**
 * Sanitize a string by removing potentially malicious HTML/script content
 * This is a basic implementation - for production, consider using DOMPurify
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  // Convert to string if not already
  const str = String(input);
  
  // Remove HTML tags and script content
  let sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*[^\s>]*/gi, ''); // Remove event handlers without quotes
  
  // Encode special HTML characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  return sanitized.trim();
}

/**
 * Sanitize an object by sanitizing all string values recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized as T;
}

/**
 * Sanitize HTML content while preserving safe formatting tags
 * Use this for rich text fields where some HTML is allowed
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  
  const str = String(input);
  
  // Remove dangerous tags and attributes
  let sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const str = String(email).trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(str)) {
    throw new Error('Invalid email format');
  }
  
  // Remove any HTML/script attempts
  return sanitizeString(str);
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const str = String(url).trim();
  
  // Check for dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  
  if (dangerousProtocols.test(str)) {
    throw new Error('Invalid URL protocol');
  }
  
  return str;
}

/**
 * Sanitize SQL-like inputs to prevent injection
 * Note: This is a basic implementation. Always use parameterized queries.
 */
export function sanitizeSqlInput(input: string | null | undefined): string {
  if (!input) return '';
  
  const str = String(input);
  
  // Remove SQL injection attempts
  const sanitized = str
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION keyword
    .replace(/\bSELECT\b/gi, '') // Remove SELECT keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bUPDATE\b/gi, ''); // Remove UPDATE keyword
  
  return sanitized.trim();
}

/**
 * Sanitize file names to prevent path traversal
 */
export function sanitizeFileName(fileName: string | null | undefined): string {
  if (!fileName) return '';
  
  const str = String(fileName);
  
  // Remove path traversal attempts
  const sanitized = str
    .replace(/\.\./g, '') // Remove ..
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/^\.+/, ''); // Remove leading dots
  
  return sanitized.trim();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any): number {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number format');
  }
  
  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }
  
  const str = String(input).toLowerCase().trim();
  
  if (str === 'true' || str === '1' || str === 'yes') {
    return true;
  }
  
  if (str === 'false' || str === '0' || str === 'no' || str === '') {
    return false;
  }
  
  throw new Error('Invalid boolean format');
}

/**
 * Sanitize date string (YYYY-MM-DD format)
 */
export function sanitizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  const str = String(dateStr).trim();
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!dateRegex.test(str)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  
  // Validate date is valid
  const date = new Date(str);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  
  return str;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(arr: any[] | null | undefined): string[] {
  if (!arr || !Array.isArray(arr)) {
    return [];
  }
  
  return arr.map(item => sanitizeString(item));
}

/**
 * Create a sanitization middleware for API routes
 */
export function createSanitizationMiddleware() {
  return (data: any): any => {
    if (typeof data === 'string') {
      return sanitizeString(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      return sanitizeObject(data);
    }
    
    return data;
  };
}

/**
 * Sanitize request body for API endpoints
 */
export function sanitizeRequestBody<T extends Record<string, any>>(body: T): T {
  return sanitizeObject(body);
}

/**
 * Sanitize query parameters
 */
export function sanitizeQueryParams(params: URLSearchParams): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  params.forEach((value, key) => {
    sanitized[sanitizeString(key)] = sanitizeString(value);
  });
  
  return sanitized;
}
