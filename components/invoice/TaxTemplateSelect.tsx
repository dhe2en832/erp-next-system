'use client';

import React, { useState, useEffect } from 'react';

export interface TaxTemplate {
  name: string;
  title: string;
  company: string;
  is_default: boolean;
  taxes: Array<{
    charge_type: string;
    account_head: string;
    description: string;
    rate: number;
  }>;
}

export interface TaxTemplateSelectProps {
  type: 'Sales' | 'Purchase';
  value?: string;
  onChange: (template: TaxTemplate | null) => void;
  company: string;
  disabled?: boolean;
}

export default function TaxTemplateSelect({
  type,
  value = '',
  onChange,
  company,
  disabled = false
}: TaxTemplateSelectProps) {
  const [templates, setTemplates] = useState<TaxTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>(value);

  useEffect(() => {
    // Only fetch tax templates if company is provided
    // This prevents API errors when component mounts before company is selected
    if (company) {
      fetchTaxTemplates();
    }
  }, [type, company]);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const fetchTaxTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        type,
        company
      });

      const response = await fetch(`/api/setup/tax-templates?${params}`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data template pajak');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('[TaxTemplateSelect] Loaded templates:', {
          count: result.data?.length || 0,
          templates: result.data?.map((t: TaxTemplate) => ({
            name: t.name,
            title: t.title,
            taxesCount: t.taxes?.length || 0
          }))
        });
        setTemplates(result.data || []);
      } else {
        throw new Error(result.error || 'Gagal mengambil data template pajak');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    setSelectedValue(templateName);

    if (!templateName) {
      console.log('[TaxTemplateSelect] Cleared template selection');
      onChange(null);
      return;
    }

    const selectedTemplate = templates.find(t => t.name === templateName);
    if (selectedTemplate) {
      console.log('[TaxTemplateSelect] Selected template:', {
        name: selectedTemplate.name,
        title: selectedTemplate.title,
        taxesCount: selectedTemplate.taxes?.length || 0,
        taxes: selectedTemplate.taxes
      });
      onChange(selectedTemplate);
    } else {
      console.warn('[TaxTemplateSelect] Template not found:', templateName);
    }
  };

  const getTaxRateDisplay = (template: TaxTemplate): string => {
    if (template.taxes.length === 0) return '';
    
    if (template.taxes.length === 1) {
      return `${template.taxes[0].rate}%`;
    }
    
    // Multiple taxes
    const rates = template.taxes.map(t => `${t.rate}%`).join(' + ');
    return rates;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Template Pajak {type === 'Sales' ? 'Penjualan' : 'Pembelian'}
      </label>

      {loading ? (
        <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          <p className="text-sm text-gray-500">Memuat template pajak...</p>
        </div>
      ) : error ? (
        <div className="space-y-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchTaxTemplates}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          <select
            value={selectedValue}
            onChange={handleChange}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">-- Pilih Template Pajak --</option>
            {templates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.title} ({getTaxRateDisplay(template)})
              </option>
            ))}
          </select>

          {selectedValue && templates.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              {(() => {
                const selected = templates.find(t => t.name === selectedValue);
                if (!selected) return null;

                return (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      {selected.title}
                    </p>
                    {selected.taxes.map((tax, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        <p>
                          {tax.description || tax.charge_type}: {tax.rate}%
                        </p>
                        <p className="text-xs text-blue-600">
                          Akun: {tax.account_head}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {templates.length === 0 && !loading && (
            <p className="text-sm text-gray-500">
              Tidak ada template pajak tersedia untuk {type === 'Sales' ? 'penjualan' : 'pembelian'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
