# Print System User Guide

## Overview

The ERP system supports two distinct print modes optimized for different document types and printers:

| Document Type | Paper Mode | Dimensions | Printer Type |
|--------------|------------|------------|--------------|
| **Transaction Documents** | Continuous Form | 210mm × Flexible | Dot Matrix |
| **Reports** | A4 Sheet | 210mm × 297mm | Laser/Inkjet |

---

## Printing Transaction Documents

Transaction documents include:
- Sales Order (SO)
- Delivery Note / Surat Jalan (SJ)
- Sales Invoice / Faktur Jual (FJ)
- Purchase Order (PO)
- Purchase Receipt (PR)
- Purchase Invoice (PI)
- Payment Pay / Pembayaran Keluar
- Payment Receive / Pembayaran Masuk

### How to Print

1. **Open the document** you want to print (e.g., Sales Order SO-2024-001)
2. **Click the Print button** in the top-right corner of the page
3. **Review the preview** in the modal that appears
4. **Adjust zoom** if needed (50% - 200%) using the zoom controls
5. **Click Print** to open the browser print dialog
6. **Configure printer settings**:
   - Select your dot matrix printer
   - Set paper type to "Continuous Form" or "Tractor Feed"
   - Set paper width to 9.5 inches (241mm)
   - Disable margins or set to minimum
7. **Click Print** in the browser dialog

### Paper Settings

**Continuous Form Specifications**:
- Printable width: 210mm (8.27 inches)
- Tractor margins: 5mm left/right for tractor holes
- Total width: 220mm (8.66 inches) including margins
- Height: Flexible (auto-adjusts to content)

**Important Notes**:
- Paper size settings are locked for transaction documents
- Documents print as single continuous page (no page breaks)
- Designed for NCR (multi-copy) paper
- Perforation line at 140mm for optional half-cut

---

## Printing Reports

Report documents include:
- **Financial Reports**: Trial Balance, Balance Sheet, Profit & Loss, Cash Flow, General Ledger
- **System Reports**: Inventory Reports, Sales Reports, Purchase Reports, HR Reports

### How to Print

1. **Navigate to the report** you want to print
2. **Apply filters** (date range, accounts, etc.) as needed
3. **Click the Print button** in the report header
4. **Review the preview** in the modal
5. **Adjust settings** (optional):
   - Paper size: A4, A5, Letter, Legal, F4
   - Orientation: Portrait or Landscape
   - Zoom: 50% - 200%
6. **Click Print** to open the browser print dialog
7. **Configure printer settings**:
   - Select your laser/inkjet printer
   - Verify paper size matches your selection
   - Check orientation setting
8. **Click Print** in the browser dialog

### Paper Settings

**A4 Sheet Specifications** (Default):
- Width: 210mm (8.27 inches)
- Height: 297mm (11.69 inches)
- Margins: 10mm top/bottom, 12mm left/right
- Printable area: 186mm × 277mm

**Alternative Paper Sizes**:
- **A5**: 148mm × 210mm (smaller format)
- **Letter**: 216mm × 279mm (US standard)
- **Legal**: 216mm × 356mm (US legal)
- **F4**: 215mm × 330mm (Asian standard)

**Important Notes**:
- Multi-page reports include page numbers "Page X of Y"
- Page breaks inserted automatically between pages
- Account hierarchy shown with indentation
- Section totals displayed in bold
- Grand totals shown with double underline

---

## Save as PDF

Both transaction documents and reports can be saved as PDF files:

1. **Open print preview** as described above
2. **Click "Save as PDF"** button in the preview modal
3. **Browser print dialog opens** with "Save as PDF" destination
4. **Choose location** and filename
5. **Click Save**

**PDF Benefits**:
- Archive documents electronically
- Email to customers/suppliers
- Attach to accounting records
- Print later from any device

---

## Zoom Controls

The print preview includes zoom controls for better viewing:

- **Zoom In**: Click the "+" button or use keyboard shortcut `Ctrl/Cmd + Plus`
- **Zoom Out**: Click the "-" button or use keyboard shortcut `Ctrl/Cmd + Minus`
- **Reset Zoom**: Click "100%" button or use keyboard shortcut `Ctrl/Cmd + 0`
- **Range**: 50% to 200% in 10% increments

**Note**: Zoom only affects preview display, not actual print output.

---

## Indonesian Localization

All print documents use Indonesian language (Bahasa Indonesia):

### Common Labels
- **No. Dokumen**: Document Number
- **Tanggal**: Date
- **Pelanggan**: Customer
- **Pemasok/Supplier**: Supplier
- **Catatan**: Notes
- **Terbilang**: Amount in Words
- **Subtotal**: Subtotal
- **Pajak**: Tax
- **Total**: Total

### Date Format
- Format: DD MMMM YYYY
- Example: 31 Desember 2024

### Currency Format
- Format: Rp X.XXX.XXX
- Example: Rp 1.000.000 (one million rupiah)
- Thousand separator: period (.)
- Decimal separator: comma (,)

---

## Troubleshooting

### Print Preview Doesn't Match Printed Output

**Solution**: Ensure browser print settings match paper mode:
- **Transaction documents**: Set printer to continuous form, disable margins
- **Reports**: Set printer to A4 sheet, verify margins

### Document Cut Off on Right Side

**Solution**: 
- Check printer paper width setting (should be 9.5" for continuous form)
- Verify tractor margins are set correctly (5mm each side)
- Ensure printer is configured for continuous form paper

### Page Breaks in Transaction Documents

**Solution**: 
- Verify printer is set to continuous form mode
- Disable automatic page breaks in printer settings
- Check that paper type is not set to "Sheet" or "Cut Sheet"

### Report Text Too Small

**Solution**:
- Use zoom controls in print preview to verify content
- Consider using landscape orientation for wide reports
- Try larger paper size (Legal or F4) if available

### Missing Tractor Holes Space

**Solution**:
- Verify continuous form margins are applied (5mm left/right)
- Check printer settings for tractor feed mode
- Ensure paper width includes tractor hole area (220mm total)

### Colors Not Printing

**Solution**:
- Enable "Print background colors" in browser print dialog
- Check printer color settings
- Verify printer supports color output

### PDF File Too Large

**Solution**:
- Remove company logo if not needed
- Use lower quality setting in PDF save dialog
- Consider printing to PDF in black & white

---

## Browser Compatibility

The print system is tested and supported on:
- ✅ Google Chrome (recommended)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (macOS)

**Recommended**: Use Google Chrome for best print preview accuracy.

---

## Printer Configuration

### Dot Matrix Printers (Transaction Documents)

**Recommended Settings**:
- Paper type: Continuous Form / Tractor Feed
- Paper width: 9.5 inches (241mm)
- Paper length: Continuous
- Print quality: Draft or Letter Quality
- Font: Built-in printer font or Arial
- Margins: Minimum or disabled

**Compatible Printers**:
- Epson LX-310
- Epson LQ-310
- Epson LQ-2190
- Any dot matrix printer with tractor feed

### Laser/Inkjet Printers (Reports)

**Recommended Settings**:
- Paper type: Plain Paper
- Paper size: A4 (210mm × 297mm)
- Print quality: Normal or High
- Color: Color or Black & White
- Duplex: Off (single-sided)

**Compatible Printers**:
- Any laser or inkjet printer supporting A4 paper

---

## Best Practices

### Transaction Documents
1. **Use NCR paper** for multi-copy printing (original + copies)
2. **Align paper** properly in tractor feed before printing
3. **Test print** one document before batch printing
4. **Keep printer clean** to ensure clear printing
5. **Store continuous form** paper properly to prevent curling

### Reports
1. **Preview before printing** to verify layout
2. **Use landscape** for wide reports with many columns
3. **Print to PDF** for archival purposes
4. **Use high quality** setting for formal reports
5. **Check page count** before printing large reports

### General
1. **Close preview modal** after printing to free memory
2. **Refresh data** before printing to ensure latest information
3. **Verify document status** (Draft/Submitted) before printing
4. **Keep browser updated** for best compatibility
5. **Test print settings** with sample document first

---

## Support

For technical issues or questions about the print system:
1. Check this guide for troubleshooting steps
2. Verify printer configuration matches requirements
3. Test with different browser if issues persist
4. Contact system administrator for assistance

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Applies To**: ERP Next System v2.0+
