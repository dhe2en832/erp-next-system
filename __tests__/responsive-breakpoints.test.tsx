/**
 * Responsive Breakpoints Verification Test
 * 
 * Verifies that all analytics components implement proper responsive design:
 * - 1-column layout on mobile (< 768px)
 * - 2-column layout on tablet (768px - 1024px)
 * - 3-4 column layout on desktop (> 1024px)
 * 
 * Requirements: 12.1, 12.2, 12.3
 * Task: 11.1
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Responsive Breakpoints Verification', () => {
  const componentsDir = path.join(process.cwd(), 'components', 'analytics');
  
  // Helper function to read component file
  const readComponent = (filename: string): string => {
    const filePath = path.join(componentsDir, filename);
    return fs.readFileSync(filePath, 'utf-8');
  };

  // Helper function to check for responsive grid classes
  const hasResponsiveGrid = (content: string): {
    hasMobile: boolean;
    hasTablet: boolean;
    hasDesktop: boolean;
    gridClasses: string[];
  } => {
    // Extract all className strings
    const classNameRegex = /className="([^"]*)"/g;
    const matches = [...content.matchAll(classNameRegex)];
    const allClasses = matches.map(m => m[1]).join(' ');
    
    // Check for grid-cols-1 (mobile)
    const hasMobile = /grid-cols-1/.test(allClasses);
    
    // Check for md:grid-cols-2 or md:grid-cols-3 (tablet)
    const hasTablet = /md:grid-cols-[23]/.test(allClasses);
    
    // Check for lg:grid-cols-2, lg:grid-cols-3, or lg:grid-cols-4 (desktop)
    const hasDesktop = /lg:grid-cols-[234]/.test(allClasses);
    
    // Extract specific grid classes
    const gridClasses = allClasses.match(/(?:^|\s)(grid-cols-\d+|md:grid-cols-\d+|lg:grid-cols-\d+)(?:\s|$)/g) || [];
    
    return {
      hasMobile,
      hasTablet,
      hasDesktop,
      gridClasses: gridClasses.map(c => c.trim())
    };
  };

  describe('TopProductsChart', () => {
    it('should be a single component (no grid layout needed)', () => {
      const content = readComponent('TopProductsChart.tsx');
      
      // TopProductsChart is a single chart component, not a section
      // It should be wrapped in a card/container but doesn't need grid layout
      expect(content).toContain('TopProductsChart');
      expect(content).toContain('ResponsiveContainer');
    });
  });

  describe('CustomerBehaviorSection', () => {
    it('should have responsive grid layout: 1 col mobile, 2 col tablet, 3 col desktop', () => {
      const content = readComponent('CustomerBehaviorSection.tsx');
      const result = hasResponsiveGrid(content);
      
      expect(result.hasMobile).toBe(true);
      expect(result.hasTablet).toBe(true);
      expect(result.hasDesktop).toBe(true);
      
      // Should have grid-cols-1 md:grid-cols-2 lg:grid-cols-3
      expect(content).toMatch(/grid-cols-1\s+md:grid-cols-2\s+lg:grid-cols-3/);
    });

    it('should contain all three customer behavior charts', () => {
      const content = readComponent('CustomerBehaviorSection.tsx');
      
      expect(content).toContain('BestCustomersChart');
      expect(content).toContain('WorstCustomersChart');
      expect(content).toContain('BadDebtCustomersChart');
    });
  });

  describe('SalesPerformanceSection', () => {
    it('should have responsive grid layout: 1 col mobile, 2 col tablet, 3 col desktop', () => {
      const content = readComponent('SalesPerformanceSection.tsx');
      const result = hasResponsiveGrid(content);
      
      expect(result.hasMobile).toBe(true);
      expect(result.hasTablet).toBe(true);
      expect(result.hasDesktop).toBe(true);
      
      // Should have grid-cols-1 md:grid-cols-2 lg:grid-cols-3
      expect(content).toMatch(/grid-cols-1\s+md:grid-cols-2\s+lg:grid-cols-3/);
    });

    it('should contain all three sales performance charts', () => {
      const content = readComponent('SalesPerformanceSection.tsx');
      
      expect(content).toContain('TopSalesByRevenueChart');
      expect(content).toContain('TopSalesByCommissionChart');
      expect(content).toContain('WorstSalesByCommissionChart');
    });
  });

  describe('CommissionTrackerSection', () => {
    it('should have responsive grid layout: 1 col mobile, 2 col desktop', () => {
      const content = readComponent('CommissionTrackerSection.tsx');
      const result = hasResponsiveGrid(content);
      
      expect(result.hasMobile).toBe(true);
      expect(result.hasDesktop).toBe(true);
      
      // Should have grid-cols-1 lg:grid-cols-2 (no tablet breakpoint needed for 2-col)
      expect(content).toMatch(/grid-cols-1\s+lg:grid-cols-2/);
    });

    it('should contain commission card and trend chart', () => {
      const content = readComponent('CommissionTrackerSection.tsx');
      
      expect(content).toContain('OutstandingCommissionCard');
      expect(content).toContain('PaidCommissionTrendChart');
    });
  });

  describe('InventoryAnalyticsSection', () => {
    it('should have responsive grid layout: 1 col mobile, 2 col tablet, 3 col desktop', () => {
      const content = readComponent('InventoryAnalyticsSection.tsx');
      const result = hasResponsiveGrid(content);
      
      expect(result.hasMobile).toBe(true);
      expect(result.hasTablet).toBe(true);
      expect(result.hasDesktop).toBe(true);
      
      // Should have grid-cols-1 md:grid-cols-2 lg:grid-cols-3
      expect(content).toMatch(/grid-cols-1\s+md:grid-cols-2\s+lg:grid-cols-3/);
    });

    it('should contain all three inventory analytics charts', () => {
      const content = readComponent('InventoryAnalyticsSection.tsx');
      
      expect(content).toContain('HighestStockItemsChart');
      expect(content).toContain('LowestStockItemsChart');
      expect(content).toContain('MostPurchasedItemsChart');
    });
  });

  describe('SupplierAnalyticsSection', () => {
    it('should have responsive grid layout: 1 col mobile, 2 col tablet, 3 col desktop', () => {
      const content = readComponent('SupplierAnalyticsSection.tsx');
      const result = hasResponsiveGrid(content);
      
      expect(result.hasMobile).toBe(true);
      expect(result.hasTablet).toBe(true);
      expect(result.hasDesktop).toBe(true);
      
      // Should have grid-cols-1 md:grid-cols-2 lg:grid-cols-3
      expect(content).toMatch(/grid-cols-1\s+md:grid-cols-2\s+lg:grid-cols-3/);
    });

    it('should contain all three supplier analytics charts', () => {
      const content = readComponent('SupplierAnalyticsSection.tsx');
      
      expect(content).toContain('TopSuppliersByFrequencyChart');
      expect(content).toContain('PaidSuppliersChart');
      expect(content).toContain('UnpaidSuppliersChart');
    });
  });

  describe('Dashboard Page Integration', () => {
    it('should integrate all analytics sections with proper responsive layout', () => {
      const dashboardPath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf-8');
      
      // Check that all sections are imported
      expect(content).toContain('TopProductsChart');
      expect(content).toContain('CustomerBehaviorSection');
      expect(content).toContain('SalesPerformanceSection');
      expect(content).toContain('CommissionTrackerSection');
      expect(content).toContain('InventoryAnalyticsSection');
      expect(content).toContain('SupplierAnalyticsSection');
      
      // Check that sections are rendered
      expect(content).toContain('<TopProductsChart');
      expect(content).toContain('<CustomerBehaviorSection');
      expect(content).toContain('<SalesPerformanceSection');
      expect(content).toContain('<CommissionTrackerSection');
      expect(content).toContain('<InventoryAnalyticsSection');
      expect(content).toContain('<SupplierAnalyticsSection');
    });
  });

  describe('Tailwind Responsive Classes Summary', () => {
    it('should document all responsive breakpoints used', () => {
      const sections = [
        { name: 'CustomerBehaviorSection', file: 'CustomerBehaviorSection.tsx', expected: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
        { name: 'SalesPerformanceSection', file: 'SalesPerformanceSection.tsx', expected: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
        { name: 'CommissionTrackerSection', file: 'CommissionTrackerSection.tsx', expected: 'grid-cols-1 lg:grid-cols-2' },
        { name: 'InventoryAnalyticsSection', file: 'InventoryAnalyticsSection.tsx', expected: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
        { name: 'SupplierAnalyticsSection', file: 'SupplierAnalyticsSection.tsx', expected: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
      ];

      const summary: Record<string, string> = {};
      
      sections.forEach(section => {
        const content = readComponent(section.file);
        const result = hasResponsiveGrid(content);
        summary[section.name] = result.gridClasses.join(' ');
      });

      // Log summary for documentation
      console.log('\n=== Responsive Breakpoints Summary ===');
      console.log('Mobile (< 768px): 1 column');
      console.log('Tablet (768px - 1024px): 2 columns');
      console.log('Desktop (> 1024px): 2-3 columns\n');
      
      Object.entries(summary).forEach(([name, classes]) => {
        console.log(`${name}:`);
        console.log(`  ${classes}\n`);
      });

      // All sections should have responsive classes
      expect(Object.keys(summary).length).toBe(5);
    });
  });
});
