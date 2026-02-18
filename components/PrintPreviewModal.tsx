'use client';

import React, { useRef, useState } from 'react';

export type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'F4';
export type PaperOrientation = 'portrait' | 'landscape';

interface PrintSettings {
  paperSize: PaperSize;
  orientation: PaperOrientation;
}

interface PrintPreviewModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  printUrl?: string;
  defaultPaperSize?: PaperSize;
  defaultOrientation?: PaperOrientation;
  fixedPageSizeMm?: { width: number; height: number };
  allowPaperSettings?: boolean;
  zoomMin?: number;
  zoomMax?: number;
  useContentFrame?: boolean;
  contentFramePadding?: string;
  frameBackground?: string;
  frameShadow?: string;
}

const PAPER_DIMS: Record<PaperSize, { w: number; h: number }> = {
  A4:     { w: 210, h: 297 },
  A5:     { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal:  { w: 216, h: 356 },
  F4:     { w: 215, h: 330 },
};

const PAPER_OPTIONS: PaperSize[] = ['A4', 'A5', 'Letter', 'Legal', 'F4'];

export default function PrintPreviewModal({
  title,
  onClose,
  children,
  printUrl,
  defaultPaperSize = 'A4',
  defaultOrientation = 'portrait',
  fixedPageSizeMm,
  allowPaperSettings = true,
  zoomMin = 50,
  zoomMax = 200,
  useContentFrame = true,
  contentFramePadding = '28px 34px',
  frameBackground = '#fff',
  frameShadow = '0 8px 40px rgba(0,0,0,0.5)',
}: PrintPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [settings, setSettings] = useState<PrintSettings>({ paperSize: defaultPaperSize, orientation: defaultOrientation });
  const [showSettings, setShowSettings] = useState(false);

  const dims = PAPER_DIMS[settings.paperSize];
  const pageW = fixedPageSizeMm
    ? fixedPageSizeMm.width
    : settings.orientation === 'portrait' ? dims.w : dims.h;
  const pageH = fixedPageSizeMm
    ? fixedPageSizeMm.height
    : settings.orientation === 'portrait' ? dims.h : dims.w;
  const pageWidthPx = pageW * (96 / 25.4);
  const pageHeightPx = pageH * (96 / 25.4);
  const scale = zoom / 100;

  const buildPrintHtml = () => {
    if (!printRef.current) return '';
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @page { size: ${pageW}mm ${pageH}mm; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
    th { background: #1e293b !important; color: #fff !important; padding: 4px 5px; font-size: 9px; }
    td { padding: 3px 5px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f8fafc; }
    .doc-header { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
    .doc-title { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .doc-company { font-size: 13px; font-weight: 700; }
    .doc-meta { font-size: 9px; color: #555; margin-top: 2px; }
    .section-header { background: #f1f5f9 !important; font-weight: 700; padding: 5px 6px; margin-top: 10px; border-left: 3px solid #4f46e5; }
    .total-row td { font-weight: 700; border-top: 2px solid #111; background: unset !important; }
    .subtotal-row td { font-weight: 600; background: #f9fafb !important; }
    .print-meta-label { color: #555; min-width: 90px; display: inline-block; }
    .print-meta-value { font-weight: 600; }
    .print-sig-space { height: 32px; }
    .print-signatures { display: flex; page-break-inside: avoid; break-inside: avoid; margin-top: 12px; }
    .print-sig-box { flex: 1; text-align: center; border-top: 1px solid #9ca3af; padding-top: 4px; margin-right: 12px; font-size: 9px; }
    .print-sig-box:last-child { margin-right: 0; }
    .print-footer { margin-top: 8px; border-top: 1px solid #d1d5db; padding-top: 4px; font-size: 8px; color: #9ca3af; text-align: center; page-break-inside: avoid; }
    .print-terbilang { font-size: 9px; font-style: italic; color: #374151; margin-bottom: 8px; border-left: 3px solid #d1d5db; padding-left: 6px; }
    .print-notes { font-size: 9px; color: #374151; margin-bottom: 10px; white-space: pre-wrap; }
    .right { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
  </style>
</head>
<body>${printRef.current.innerHTML}</body>
</html>`;
  };

  const handlePrint = () => {
    if (printUrl) {
      window.open(printUrl, '_blank');
      return;
    }
    const html = buildPrintHtml();
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleSavePDF = () => {
    if (printUrl) {
      window.open(printUrl, '_blank');
      return;
    }
    const html = buildPrintHtml();
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(17,24,39,0.97)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0 border-b border-gray-700">
        <span className="font-semibold text-sm truncate max-w-xs">{title}</span>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(z => Math.max(zoomMin, z - 10))}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold"
            title="Zoom Out"
          >−</button>
          <span className="text-xs w-12 text-center tabular-nums">{zoom}%</span>
          <button
            onClick={() => setZoom(z => Math.min(zoomMax, z + 10))}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold"
            title="Zoom In"
          >+</button>
          <button
            onClick={() => setZoom(100)}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >Reset</button>

          {allowPaperSettings && !fixedPageSizeMm && (
            <>
              <div className="w-px h-6 bg-gray-600 mx-1" />

              {/* Settings toggle */}
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-medium transition-colors ${showSettings ? 'bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                title="Pengaturan Kertas & Printer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Pengaturan
              </button>

              <div className="w-px h-6 bg-gray-600 mx-1" />
            </>
          )}

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {/* Save PDF */}
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded font-medium"
            title="Simpan sebagai PDF (pilih 'Save as PDF' di dialog printer)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Simpan PDF
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 hover:bg-red-600 text-white ml-1"
            title="Tutup"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {allowPaperSettings && !fixedPageSizeMm && showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-6 shrink-0">
          {/* Paper Size */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300 font-medium whitespace-nowrap">Ukuran Kertas:</label>
            <select
              value={settings.paperSize}
              onChange={e => setSettings(s => ({ ...s, paperSize: e.target.value as PaperSize }))}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              {PAPER_OPTIONS.map(p => (
                <option key={p} value={p}>{p} ({PAPER_DIMS[p].w}×{PAPER_DIMS[p].h}mm)</option>
              ))}
            </select>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300 font-medium whitespace-nowrap">Orientasi:</label>
            <div className="flex gap-1">
              {(['portrait', 'landscape'] as PaperOrientation[]).map(o => (
                <button
                  key={o}
                  onClick={() => setSettings(s => ({ ...s, orientation: o }))}
                  className={`text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors ${settings.orientation === o ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {o === 'portrait' ? (
                    <svg className="w-3 h-4" viewBox="0 0 12 16" fill="currentColor"><rect x="1" y="1" width="10" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  ) : (
                    <svg className="w-4 h-3" viewBox="0 0 16 12" fill="currentColor"><rect x="1" y="1" width="14" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                  )}
                  {o === 'portrait' ? 'Potret' : 'Lanskap'}
                </button>
              ))}
            </div>
          </div>

          {/* Page info */}
          <span className="text-xs text-gray-400">
            {pageW}mm × {pageH}mm
          </span>

          {/* Printer note */}
          <span className="text-xs text-gray-500 ml-auto">
            Pilihan printer tersedia di dialog print browser
          </span>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto py-6 px-4 bg-gray-700 flex justify-center">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            width: useContentFrame ? `${pageWidthPx}px` : 'fit-content',
            minHeight: useContentFrame ? `${pageHeightPx}px` : undefined,
          }}
        >
          {useContentFrame ? (
            <div
              ref={printRef}
              style={{
                background: frameBackground,
                width: `${pageWidthPx}px`,
                minHeight: `${pageHeightPx}px`,
                margin: '0 auto',
                padding: contentFramePadding,
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '10px',
                color: '#111',
                boxShadow: frameShadow,
              }}
            >
              {children}
            </div>
          ) : (
            <div ref={printRef} style={{ margin: '0 auto' }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
