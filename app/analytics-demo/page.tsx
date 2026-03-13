'use client';

/**
 * Analytics Dashboard Page
 * 
 * Tabbed analytics dashboard with categorized sections
 */

import { useState } from 'react';
import {
  TopProductsChart,
  CustomerBehaviorSection,
  SalesPerformanceSection,
  CommissionTrackerSection,
  InventoryAnalyticsSection,
  SupplierAnalyticsSection,
} from '@/components/analytics';
import { 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Archive, 
  Truck 
} from 'lucide-react';

type TabId = 'products' | 'customers' | 'sales' | 'commission' | 'inventory' | 'suppliers';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'products', label: 'Produk', icon: Package },
  { id: 'customers', label: 'Pelanggan', icon: Users },
  { id: 'sales', label: 'Penjualan', icon: TrendingUp },
  { id: 'commission', label: 'Komisi', icon: DollarSign },
  { id: 'inventory', label: 'Inventori', icon: Archive },
  { id: 'suppliers', label: 'Supplier', icon: Truck },
];

export default function AnalyticsDemoPage() {
  const [activeTab, setActiveTab] = useState<TabId>('products');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Dashboard Analytics
          </h1>
          <p className="text-gray-600">
            Analisis bisnis dan performa penjualan
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 md:px-6 py-4 text-sm font-medium whitespace-nowrap
                      border-b-2 transition-colors
                      ${isActive
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">{renderTabContent(activeTab)}</div>
      </div>
    </div>
  );
}

function renderTabContent(tabId: TabId) {
  switch (tabId) {
    case 'products':
      return (
        <div className="space-y-6">
          <TopProductsChart />
        </div>
      );
    
    case 'customers':
      return (
        <div className="space-y-6">
          <CustomerBehaviorSection />
        </div>
      );
    
    case 'sales':
      return (
        <div className="space-y-6">
          <SalesPerformanceSection />
        </div>
      );
    
    case 'commission':
      return (
        <div className="space-y-6">
          <CommissionTrackerSection />
        </div>
      );
    
    case 'inventory':
      return (
        <div className="space-y-6">
          <InventoryAnalyticsSection />
        </div>
      );
    
    case 'suppliers':
      return (
        <div className="space-y-6">
          <SupplierAnalyticsSection />
        </div>
      );
    
    default:
      return null;
  }
}
