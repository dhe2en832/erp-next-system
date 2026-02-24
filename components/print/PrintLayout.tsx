/**
 * PrintLayout Component
 * 
 * Renders transaction documents (SO, SJ, FJ, PO, PR, PI, Payment) with continuous form format.
 * 
 * Paper Format: Continuous Form
 * - Width: 210mm (printable area)
 * - Height: Flexible (auto-adjusts to content)
 * - Tractor margins: 5mm left/right
 * - Total width: 220mm (including tractor holes)
 * 
 * Target Printer: Dot Matrix
 * Paper Type: Continuous form with NCR (multi-copy)
 * 
 * @validates Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 4.1-4.10, 7.2-7.10, 8.5-8.6, 9.7
 */

import { PrintLayoutProps, PrintColumn, PrintSignature } from '@/types/print';

// ============================================================================
// Sub-Components (Internal)
// ============================================================================

/**
 * DocumentHeader Sub-Component (Task 5.2)
 * Displays company logo, name, document title, and status badge
 * @validates Requirements 4.1, 4.2, 4.3
 */
function DocumentHeader({
  companyLogo,
  companyName,
  documentTitle,
  status,
}: {
  companyLogo?: string;
  companyName: string;
  documentTitle: string;
  status?: string;
}) {
  return (
    <div className="no-break" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '2px solid #111',
      paddingBottom: '8px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {companyLogo && (
          <img 
            src={companyLogo} 
            alt="Logo" 
            style={{ height: '40px', width: 'auto' }}
          />
        )}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
            {companyName}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
          {documentTitle}
        </div>
        {status && (
          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: '9px',
            fontWeight: 'bold',
            backgroundColor: status === 'Draft' ? '#fef3c7' : status === 'Submitted' ? '#d1fae5' : '#fee2e2',
            color: status === 'Draft' ? '#92400e' : status === 'Submitted' ? '#065f46' : '#991b1b',
            borderRadius: '3px',
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * DocumentMetadata Sub-Component (Task 5.3)
 * Displays document number, date, party info, and optional fields
 * @validates Requirements 4.4, 7.2, 7.3, 7.4, 7.5
 */
function DocumentMetadata({
  documentNumber,
  documentDate,
  partyLabel,
  partyName,
  partyAddress,
  referenceDoc,
  referenceLabel,
  salesPerson,
  deliveryDate,
  paymentTerms,
  dueDate,
  driverName,
  vehicleNumber,
  warehouse,
  paymentMethod,
  bankAccount,
}: {
  documentNumber: string;
  documentDate: string;
  partyLabel: string;
  partyName: string;
  partyAddress?: string;
  referenceDoc?: string;
  referenceLabel?: string;
  salesPerson?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  dueDate?: string;
  driverName?: string;
  vehicleNumber?: string;
  warehouse?: string;
  paymentMethod?: string;
  bankAccount?: string;
}) {
  return (
    <div className="no-break" style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
      fontSize: '9px',
      marginBottom: '12px',
    }}>
      <div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>No. Dokumen:</span> {documentNumber}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>Tanggal:</span> {documentDate}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold' }}>{partyLabel}:</span> {partyName}
        </div>
        {partyAddress && (
          <div style={{ marginBottom: '4px', marginLeft: '10px', fontSize: '8px', whiteSpace: 'pre-line' }}>
            {partyAddress}
          </div>
        )}
        {salesPerson && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Sales:</span> {salesPerson}
          </div>
        )}
        {referenceDoc && referenceLabel && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>{referenceLabel}:</span> {referenceDoc}
          </div>
        )}
      </div>
      <div>
        {deliveryDate && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Tgl Kirim:</span> {deliveryDate}
          </div>
        )}
        {paymentTerms && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Syarat Bayar:</span> {paymentTerms}
          </div>
        )}
        {dueDate && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Jatuh Tempo:</span> {dueDate}
          </div>
        )}
        {driverName && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Pengemudi:</span> {driverName}
          </div>
        )}
        {vehicleNumber && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>No. Kendaraan:</span> {vehicleNumber}
          </div>
        )}
        {warehouse && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Gudang:</span> {warehouse}
          </div>
        )}
        {paymentMethod && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Metode Bayar:</span> {paymentMethod}
          </div>
        )}
        {bankAccount && (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Rekening:</span> {bankAccount}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ItemTable Sub-Component (Task 5.4)
 * Displays line items with dynamic columns, row numbers, quantities, pricing
 * @validates Requirements 4.5, 9.7
 */
function ItemTable({
  items,
  columns,
}: {
  items: Record<string, any>[];
  columns: PrintColumn[];
}) {
  return (
    <div className="no-break" style={{ marginBottom: '12px' }}>
      <table className="print-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9px',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{
              border: '1px solid #d1d5db',
              padding: '4px 6px',
              textAlign: 'center',
              fontWeight: 'bold',
              width: '30px',
            }}>
              No
            </th>
            {columns.map((col) => (
              <th key={col.key} style={{
                border: '1px solid #d1d5db',
                padding: '4px 6px',
                textAlign: col.align || 'left',
                fontWeight: 'bold',
                width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} style={{ pageBreakInside: 'avoid' }}>
              <td style={{
                border: '1px solid #d1d5db',
                padding: '4px 6px',
                textAlign: 'center',
              }}>
                {index + 1}
              </td>
              {columns.map((col) => (
                <td key={col.key} style={{
                  border: '1px solid #d1d5db',
                  padding: '4px 6px',
                  textAlign: col.align || 'left',
                }}>
                  {col.format ? col.format(item[col.key]) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * TotalStatsBar Sub-Component
 * Displays total quantity and total items count
 */
function TotalStatsBar({
  totalQuantity,
  totalItems,
}: {
  totalQuantity?: number;
  totalItems?: number;
}) {
  if (totalQuantity === undefined && totalItems === undefined) return null;

  return (
    <div className="no-break" style={{
      marginBottom: '12px',
      fontSize: '9px',
      padding: '6px 8px',
      backgroundColor: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
    }}>
      {totalQuantity !== undefined && (
        <span>
          <span style={{ fontWeight: 'bold' }}>Total Qty:</span> {totalQuantity}
        </span>
      )}
      {totalItems !== undefined && (
        <span>
          <span style={{ fontWeight: 'bold' }}>Total Item:</span> {totalItems}
        </span>
      )}
    </div>
  );
}

/**
 * TotalsSection Sub-Component (Task 5.5)
 * Displays subtotal, tax, total, and terbilang (right-aligned)
 * @validates Requirements 4.6, 7.8, 7.10, 8.5
 */
function TotalsSection({
  subtotal,
  taxAmount,
  totalAmount,
  terbilang,
}: {
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  terbilang?: string;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="totals-section no-break" style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontSize: '9px',
        gap: '4px',
      }}>
        {subtotal !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px' }}>
            <span style={{ fontWeight: 'bold' }}>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        )}
        {taxAmount !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '200px' }}>
            <span style={{ fontWeight: 'bold' }}>Pajak:</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        )}
        {totalAmount !== undefined && (
          <>
            <div style={{
              borderTop: '1px solid #111',
              width: '200px',
              margin: '2px 0',
            }} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '200px',
              fontWeight: 'bold',
              fontSize: '10px',
            }}>
              <span>TOTAL:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </>
        )}
      </div>
      {terbilang && (
        <div style={{
          marginTop: '8px',
          fontSize: '9px',
          fontStyle: 'italic',
        }}>
          <span style={{ fontWeight: 'bold' }}>Terbilang:</span> {terbilang}
        </div>
      )}
    </div>
  );
}

/**
 * SignatureSection Sub-Component (Task 5.6)
 * Displays 2-3 signature boxes with labels
 * @validates Requirements 4.8, 8.6
 */
function SignatureSection({
  signatures,
}: {
  signatures?: PrintSignature[];
}) {
  if (!signatures || signatures.length === 0) return null;

  return (
    <div className="signature-section no-break" style={{
      display: 'flex',
      justifyContent: 'space-around',
      marginTop: '20px',
      marginBottom: '12px',
      gap: '20px',
    }}>
      {signatures.map((sig, index) => (
        <div key={index} style={{
          flex: 1,
          textAlign: 'center',
          fontSize: '9px',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            {sig.label}
          </div>
          <div style={{
            height: '50px',
            borderBottom: '1px solid #000',
            marginBottom: '4px',
          }} />
          {sig.name && (
            <div style={{ fontSize: '8px' }}>
              {sig.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * DocumentFooter Sub-Component (Task 5.7)
 * Displays print timestamp and system attribution
 * @validates Requirements 4.10
 */
function DocumentFooter() {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(now);

  return (
    <div style={{
      borderTop: '1px solid #d1d5db',
      paddingTop: '8px',
      marginTop: '12px',
      fontSize: '8px',
      color: '#6b7280',
      textAlign: 'center',
    }}>
      Dicetak oleh sistem — {formattedDate} WIB
    </div>
  );
}

/**
 * Notes Section (Task 5.8)
 * Displays optional notes with "Catatan" label
 * @validates Requirements 4.9, 7.6
 */
function NotesSection({ notes }: { notes?: string }) {
  if (!notes) return null;

  return (
    <div className="no-break" style={{
      marginBottom: '12px',
      fontSize: '9px',
      padding: '8px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Catatan:
      </div>
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {notes}
      </div>
    </div>
  );
}

// ============================================================================
// Main PrintLayout Component
// ============================================================================

/**
 * PrintLayout Component
 * 
 * Main layout component for transaction documents using continuous form format.
 * Provides structure for header, metadata, items, totals, signatures, and footer.
 */
export default function PrintLayout(props: PrintLayoutProps) {
  const {
    // Document identification
    documentTitle,
    documentNumber,
    documentDate,
    status,
    
    // Company information
    companyName,
    companyLogo,
    
    // Party information
    partyLabel,
    partyName,
    partyAddress,
    
    // Reference information
    referenceDoc,
    referenceLabel,
    salesPerson,
    
    // Document-specific fields
    deliveryDate,
    paymentTerms,
    dueDate,
    driverName,
    vehicleNumber,
    warehouse,
    paymentMethod,
    bankAccount,
    
    // Items
    items,
    columns,
    
    // Pricing
    showPrice,
    subtotal,
    taxAmount,
    totalAmount,
    terbilang,
    
    // Summary statistics
    totalQuantity,
    totalItems,
    
    // Additional content
    notes,
    signatures,
  } = props;

  return (
    <div className="continuous-mode print-page" style={{
      width: '210mm',
      minHeight: 'auto',
      margin: '0 5mm',
      padding: '10mm 12mm',
      backgroundColor: '#fff',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '10px',
      color: '#111',
      boxSizing: 'border-box',
    }}>
      <DocumentHeader
        companyLogo={companyLogo}
        companyName={companyName}
        documentTitle={documentTitle}
        status={status}
      />
      
      <DocumentMetadata
        documentNumber={documentNumber}
        documentDate={documentDate}
        partyLabel={partyLabel}
        partyName={partyName}
        partyAddress={partyAddress}
        referenceDoc={referenceDoc}
        referenceLabel={referenceLabel}
        salesPerson={salesPerson}
        deliveryDate={deliveryDate}
        paymentTerms={paymentTerms}
        dueDate={dueDate}
        driverName={driverName}
        vehicleNumber={vehicleNumber}
        warehouse={warehouse}
        paymentMethod={paymentMethod}
        bankAccount={bankAccount}
      />
      
      <ItemTable
        items={items}
        columns={columns}
      />
      
      <TotalStatsBar
        totalQuantity={totalQuantity}
        totalItems={totalItems}
      />
      
      {showPrice && (
        <TotalsSection
          subtotal={subtotal}
          taxAmount={taxAmount}
          totalAmount={totalAmount}
          terbilang={terbilang}
        />
      )}
      
      <NotesSection notes={notes} />
      
      <SignatureSection signatures={signatures} />
      
      <DocumentFooter />
    </div>
  );
}
