'use client';

import { useState } from 'react';

interface AllocationItem {
  name: string;
  due_date: string;
  outstanding_amount: number;
  allocated_amount: number;
  allocation_status: string;
  remaining_outstanding: number;
}

interface JournalEntry {
  account: string;
  amount: number;
}

interface PreviewAccordionProps {
  paymentAmount: number;
  allocation: AllocationItem[];
  totalAllocated: number;
  unallocated: number;
  journal?: {
    debit: JournalEntry;
    credits: Array<JournalEntry & { reference?: string }>;
  };
  paymentType: 'Receive' | 'Pay';
}

export default function PreviewAccordion({
  paymentAmount,
  allocation,
  totalAllocated,
  unallocated,
  journal,
  paymentType,
}: PreviewAccordionProps) {
  const [expandedSection, setExpandedSection] = useState<'allocation' | 'journal' | null>(null);

  const toggleSection = (section: 'allocation' | 'journal') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-2">
      {/* Allocation Preview */}
      <div className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('allocation')}
          className="w-full flex items-center justify-between p-2.5 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 text-blue-600 transition-transform ${expandedSection === 'allocation' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
            </svg>
            <h5 className="text-sm font-medium text-blue-900">Preview Alokasi (FIFO)</h5>
          </div>
          <span className="text-xs text-blue-700 font-medium">
            Rp {totalAllocated.toLocaleString('id-ID')} / Rp {paymentAmount.toLocaleString('id-ID')}
          </span>
        </button>

        {expandedSection === 'allocation' && (
          <div className="px-2.5 py-2 border-t border-blue-200 space-y-1 text-xs">
            {allocation.map((item) => (
              <div key={item.name} className="flex justify-between items-start bg-white p-1.5 rounded border border-blue-100">
                <div className="flex-1">
                  <div className="font-medium text-blue-900">{item.name}</div>
                  <div className="text-gray-500">Jatuh Tempo: {item.due_date}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-blue-700">
                    Rp {item.outstanding_amount.toLocaleString('id-ID')} →
                    <span className={`font-medium ml-1 ${
                      item.allocation_status === 'Paid' ? 'text-green-600' :
                      item.allocation_status === 'Partially Paid' ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      Rp {item.allocated_amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {item.allocation_status === 'Paid' ? 'Lunas' : 
                     item.allocation_status === 'Partially Paid' ? 'Sebagian' : 'Belum'}
                  </div>
                </div>
              </div>
            ))}

            {unallocated > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-blue-200">
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Belum Teralokasi:</span>
                  <span>Rp {unallocated.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Journal Preview */}
      {journal && (
        <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('journal')}
            className="w-full flex items-center justify-between p-2.5 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 text-gray-600 transition-transform ${expandedSection === 'journal' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
              </svg>
              <h5 className="text-sm font-medium text-gray-900">Preview Jurnal</h5>
            </div>
            <span className="text-xs text-gray-600">Entri Akuntansi</span>
          </button>

          {expandedSection === 'journal' && (
            <div className="px-2.5 py-2 border-t border-gray-200 space-y-1 text-xs font-mono">
              <div className="bg-green-50 border border-green-200 rounded p-1.5 text-green-700">
                <div className="flex justify-between">
                  <span>Debit: {journal.debit.account}</span>
                  <span className="font-medium">Rp {journal.debit.amount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-1">
                {journal.credits.map((credit, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded p-1.5 text-red-700">
                    <div className="flex justify-between">
                      <span>Kredit: {credit.account}</span>
                      <span className="font-medium">Rp {credit.amount.toLocaleString('id-ID')}</span>
                    </div>
                    {credit.reference && <div className="text-xs text-red-600 mt-0.5">{credit.reference}</div>}
                  </div>
                ))}
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-gray-300 text-gray-700">
                <div className="flex justify-between font-medium">
                  <span>Total Debit:</span>
                  <span>Rp {journal.debit.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total Kredit:</span>
                  <span>Rp {journal.credits.reduce((sum, c) => sum + c.amount, 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
