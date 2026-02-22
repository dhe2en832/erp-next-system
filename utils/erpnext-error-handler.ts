/**
 * ERPNext Error Handler Utility
 * 
 * Provides consistent error message extraction and user-friendly alerts
 * for all ERPNext API responses, especially for closed accounting period errors.
 */

/**
 * Extract user-friendly error message from ERPNext API response
 */
export function extractERPNextErrorMessage(data: any, defaultMessage: string = 'Operation failed'): string {
  let errorMessage = defaultMessage;
  
  // Priority 1: Parse _server_messages (most user-friendly)
  if (data._server_messages) {
    try {
      const serverMessages = JSON.parse(data._server_messages);
      
      if (Array.isArray(serverMessages) && serverMessages.length > 0) {
        const firstMessage = typeof serverMessages[0] === 'string' 
          ? JSON.parse(serverMessages[0]) 
          : serverMessages[0];
        
        if (firstMessage.message) {
          // Remove HTML tags from message
          errorMessage = firstMessage.message.replace(/<[^>]*>/g, '');
          return errorMessage;
        }
      }
    } catch (e) {
      console.log('Failed to parse _server_messages');
    }
  }
  
  // Priority 2: Parse exception message from exc
  if (data.exc) {
    try {
      const excArray = JSON.parse(data.exc);
      
      if (Array.isArray(excArray) && excArray.length > 0) {
        const excString = excArray[0];
        // Extract the last line which contains the actual error message
        const lines = excString.split('\n');
        const lastLine = lines[lines.length - 2] || lines[lines.length - 1];
        
        if (lastLine && lastLine.includes(':')) {
          const parts = lastLine.split(':');
          if (parts.length > 1) {
            errorMessage = parts.slice(1).join(':').trim();
            return errorMessage;
          }
        }
      }
    } catch (e) {
      console.log('Failed to parse exc');
    }
  }
  
  // Priority 3: Use data.message if available
  if (data.message) {
    return data.message;
  }
  
  // Priority 4: Use exception field
  if (data.exception) {
    return data.exception;
  }
  
  return errorMessage;
}

/**
 * Check if error is related to closed accounting period
 */
export function isClosedPeriodError(errorMessage: string): boolean {
  const lowerMsg = errorMessage.toLowerCase();
  
  return (
    (lowerMsg.includes('period') && lowerMsg.includes('closed')) ||
    (lowerMsg.includes('periode') && lowerMsg.includes('tutup')) ||
    lowerMsg.includes('closedaccountingperiod') ||
    lowerMsg.includes('cannot modify transaction') ||
    (lowerMsg.includes('tidak dapat') && lowerMsg.includes('periode'))
  );
}

/**
 * Show user-friendly alert for closed period error
 */
export function showClosedPeriodAlert(postingDate: string, errorMessage: string, documentType: string = 'dokumen') {
  alert(
    '🚫 PERIODE AKUNTANSI TERTUTUP\n\n' +
    `${documentType} tidak dapat dibuat karena periode akuntansi untuk tanggal ${postingDate} sudah ditutup.\n\n` +
    'Solusi:\n' +
    '1. Ubah tanggal posting ke periode yang masih terbuka\n' +
    '2. Atau hubungi administrator untuk membuka kembali periode\n\n' +
    `Detail: ${errorMessage}`
  );
}

/**
 * Show generic error alert
 */
export function showGenericErrorAlert(errorMessage: string, documentType: string = 'dokumen', postingDate?: string) {
  const dateInfo = postingDate ? `\nTanggal Posting: ${postingDate}\n` : '';
  
  alert(
    `❌ GAGAL MENYIMPAN ${documentType.toUpperCase()}\n\n` +
    `Error: ${errorMessage}${dateInfo}\n` +
    'Kemungkinan penyebab:\n' +
    '• Periode akuntansi untuk tanggal tersebut sudah ditutup\n' +
    '• Data tidak lengkap atau tidak valid\n' +
    '• Masalah koneksi ke server\n\n' +
    'Silakan periksa data Anda atau hubungi administrator.'
  );
}

/**
 * Handle ERPNext API error response with user-friendly alerts
 */
export function handleERPNextError(
  data: any,
  postingDate: string,
  documentType: string = 'dokumen',
  defaultMessage: string = 'Gagal menyimpan'
): { errorMessage: string; bannerMessage: string } {
  const errorMessage = extractERPNextErrorMessage(data, defaultMessage);
  
  if (isClosedPeriodError(errorMessage)) {
    showClosedPeriodAlert(postingDate, errorMessage, documentType);
    return {
      errorMessage,
      bannerMessage: '⚠️ Periode akuntansi tertutup. Silakan ubah tanggal posting ke periode yang terbuka.'
    };
  } else {
    showGenericErrorAlert(errorMessage, documentType, postingDate);
    return {
      errorMessage,
      bannerMessage: `❌ ${errorMessage}`
    };
  }
}
