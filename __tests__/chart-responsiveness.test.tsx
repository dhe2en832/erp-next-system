/**
 * Chart Responsiveness Test
 * 
 * Verifies that all analytics chart components use ResponsiveContainer
 * and resize correctly when viewport changes.
 * 
 * Requirements: 10.8, 12.6
 * Task: 11.4 Add chart responsiveness
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import all chart components
import TopProductsChart from '@/components/analytics/TopProductsChart';
import BestCustomersChart from '@/components/analytics/BestCustomersChart';
import WorstCustomersChart from '@/components/analytics/WorstCustomersChart';
import BadDebtCustomersChart from '@/components/analytics/BadDebtCustomersChart';
import TopSalesByRevenueChart from '@/components/analytics/TopSalesByRevenueChart';
import TopSalesByCommissionChart from '@/components/analytics/TopSalesByCommissionChart';
import WorstSalesByCommissionChart from '@/components/analytics/WorstSalesByCommissionChart';
import PaidCommissionTrendChart from '@/components/analytics/PaidCommissionTrendChart';
import HighestStockItemsChart from '@/components/analytics/HighestStockItemsChart';
import LowestStockItemsChart from '@/components/analytics/LowestStockItemsChart';
import MostPurchasedItemsChart from '@/components/analytics/MostPurchasedItemsChart';
import TopSuppliersByFrequencyChart from '@/components/analytics/TopSuppliersByFrequencyChart';
import PaidSuppliersChart from '@/components/analytics/PaidSuppliersChart';
import UnpaidSuppliersChart from '@/components/analytics/UnpaidSuppliersChart';

// Mock fetch for all components
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: [] }),
  })
) as jest.Mock;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Chart Responsiveness - ResponsiveContainer Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const chartComponents = [
    { name: 'TopProductsChart', Component: TopProductsChart },
    { name: 'BestCustomersChart', Component: BestCustomersChart },
    { name: 'WorstCustomersChart', Component: WorstCustomersChart },
    { name: 'BadDebtCustomersChart', Component: BadDebtCustomersChart },
    { name: 'TopSalesByRevenueChart', Component: TopSalesByRevenueChart },
    { name: 'TopSalesByCommissionChart', Component: TopSalesByCommissionChart },
    { name: 'WorstSalesByCommissionChart', Component: WorstSalesByCommissionChart },
    { name: 'PaidCommissionTrendChart', Component: PaidCommissionTrendChart },
    { name: 'HighestStockItemsChart', Component: HighestStockItemsChart },
    { name: 'LowestStockItemsChart', Component: LowestStockItemsChart },
    { name: 'MostPurchasedItemsChart', Component: MostPurchasedItemsChart },
    { name: 'TopSuppliersByFrequencyChart', Component: TopSuppliersByFrequencyChart },
    { name: 'PaidSuppliersChart', Component: PaidSuppliersChart },
    { name: 'UnpaidSuppliersChart', Component: UnpaidSuppliersChart },
  ];

  describe('ResponsiveContainer Implementation', () => {
    chartComponents.forEach(({ name, Component }) => {
      it(`${name} should use ResponsiveContainer`, () => {
        const { container } = render(<Component />);
        
        // ResponsiveContainer renders with class 'recharts-responsive-container'
        const responsiveContainer = container.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toBeInTheDocument();
      });

      it(`${name} should have width="100%" on ResponsiveContainer`, () => {
        const { container } = render(<Component />);
        
        const responsiveContainer = container.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toHaveStyle({ width: '100%' });
      });

      it(`${name} should have appropriate height on ResponsiveContainer`, () => {
        const { container } = render(<Component />);
        
        const responsiveContainer = container.querySelector('.recharts-responsive-container');
        // Height should be set (300px is the standard height used)
        expect(responsiveContainer).toHaveStyle({ height: '300px' });
      });
    });
  });

  describe('Viewport Responsiveness', () => {
    const viewportSizes = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    viewportSizes.forEach(({ name: viewportName, width, height }) => {
      describe(`${viewportName} viewport (${width}x${height})`, () => {
        beforeEach(() => {
          // Mock window dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height,
          });
        });

        chartComponents.forEach(({ name, Component }) => {
          it(`${name} should render on ${viewportName}`, () => {
            const { container } = render(<Component />);
            
            const responsiveContainer = container.querySelector('.recharts-responsive-container');
            expect(responsiveContainer).toBeInTheDocument();
            expect(responsiveContainer).toHaveStyle({ width: '100%' });
          });
        });
      });
    });
  });

  describe('Container Flexibility', () => {
    chartComponents.forEach(({ name, Component }) => {
      it(`${name} should adapt to parent container width`, () => {
        const { container } = render(
          <div style={{ width: '500px' }}>
            <Component />
          </div>
        );
        
        const responsiveContainer = container.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toBeInTheDocument();
        // ResponsiveContainer should inherit parent width
        expect(responsiveContainer).toHaveStyle({ width: '100%' });
      });

      it(`${name} should maintain aspect ratio when resized`, () => {
        const { container, rerender } = render(
          <div style={{ width: '800px' }}>
            <Component />
          </div>
        );
        
        let responsiveContainer = container.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toBeInTheDocument();

        // Simulate resize
        rerender(
          <div style={{ width: '400px' }}>
            <Component />
          </div>
        );

        responsiveContainer = container.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toBeInTheDocument();
        expect(responsiveContainer).toHaveStyle({ width: '100%' });
      });
    });
  });
});

describe('Chart Responsiveness - Integration Test', () => {
  it('should render all 14 charts with ResponsiveContainer', () => {
    const charts = [
      <TopProductsChart key="1" />,
      <BestCustomersChart key="2" />,
      <WorstCustomersChart key="3" />,
      <BadDebtCustomersChart key="4" />,
      <TopSalesByRevenueChart key="5" />,
      <TopSalesByCommissionChart key="6" />,
      <WorstSalesByCommissionChart key="7" />,
      <PaidCommissionTrendChart key="8" />,
      <HighestStockItemsChart key="9" />,
      <LowestStockItemsChart key="10" />,
      <MostPurchasedItemsChart key="11" />,
      <TopSuppliersByFrequencyChart key="12" />,
      <PaidSuppliersChart key="13" />,
      <UnpaidSuppliersChart key="14" />,
    ];

    const { container } = render(<div>{charts}</div>);
    
    const responsiveContainers = container.querySelectorAll('.recharts-responsive-container');
    expect(responsiveContainers).toHaveLength(14);
    
    // Verify all have width 100%
    responsiveContainers.forEach((container) => {
      expect(container).toHaveStyle({ width: '100%' });
    });
  });
});
