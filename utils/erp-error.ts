/**
 * Parse ERPNext error response into a human-readable message.
 * Priority: _server_messages > exception message > exc > message > fallback
 */
export function parseErpError(data: any, fallback = 'Terjadi kesalahan'): string {
  if (!data) return fallback;

  // _server_messages is the most user-friendly source
  if (data._server_messages) {
    try {
      const msgs = JSON.parse(data._server_messages);
      if (Array.isArray(msgs) && msgs.length > 0) {
        const first = typeof msgs[0] === 'string' ? JSON.parse(msgs[0]) : msgs[0];
        if (first?.message) return first.message;
      }
    } catch {
      // fall through
    }
  }

  // exc contains traceback array; last line of first entry is the exception message
  if (data.exc) {
    try {
      const excArr = JSON.parse(data.exc);
      if (Array.isArray(excArr) && excArr.length > 0) {
        const lines = excArr[0].split('\n').filter(Boolean);
        const lastLine = lines[lines.length - 1] || '';
        // Strip "frappe.exceptions.XxxError: " prefix
        const match = lastLine.match(/frappe\.exceptions\.\w+:\s*(.+)/);
        if (match) return match[1].trim();
        if (lastLine) return lastLine.trim();
      }
    } catch {
      // fall through
    }
    if (typeof data.exc === 'string') {
      const lines = data.exc.split('\n').filter(Boolean);
      return lines[lines.length - 1] || fallback;
    }
  }

  if (data.exception) {
    const match = String(data.exception).match(/frappe\.exceptions\.\w+:\s*(.+)/);
    if (match) return match[1].trim();
    return String(data.exception);
  }

  if (data.message && typeof data.message === 'string') return data.message;
  if (data.error && typeof data.error === 'string') return data.error;

  return fallback;
}
