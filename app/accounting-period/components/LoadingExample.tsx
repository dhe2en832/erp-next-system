'use client';

/**
 * Loading States Example Component
 * 
 * Demonstrates all loading state components and patterns.
 * This is a reference implementation for the accounting period feature.
 */

import { useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoadingButton from '@/components/LoadingButton';
import LoadingOverlay from '@/components/LoadingOverlay';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
} from '@/components/SkeletonLoader';
import { useLoading, useMultipleLoading } from '@/lib/use-loading';
import { useToast } from '@/lib/toast-context';

export default function LoadingExample() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);
  const { isLoading: isSingleLoading, withLoading: withSingleLoading } = useLoading();
  const { isLoading, withLoading } = useMultipleLoading();
  const { success, info } = useToast();

  const simulateAsync = (duration: number) => {
    return new Promise(resolve => setTimeout(resolve, duration));
  };

  const handleSingleAction = async () => {
    await withSingleLoading(async () => {
      await simulateAsync(2000);
    });
    success('Single action completed!');
  };

  const handleMultipleAction = async (key: string) => {
    await withLoading(key, async () => {
      await simulateAsync(2000);
    });
    success(`Action ${key} completed!`);
  };

  const handleOverlayDemo = async () => {
    setShowOverlay(true);
    await simulateAsync(3000);
    setShowOverlay(false);
    success('Overlay demo completed!');
  };

  const handleSkeletonDemo = async () => {
    setShowSkeletons(true);
    await simulateAsync(3000);
    setShowSkeletons(false);
    info('Skeleton demo completed!');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Loading States Examples</h1>
        <p className="text-gray-600">
          Demonstrasi semua komponen loading states untuk Accounting Period Closing
        </p>
      </div>

      {/* Loading Spinners */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">1. Loading Spinners</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Sizes:</p>
            <div className="flex items-center space-x-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
              <LoadingSpinner size="xl" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Variants:</p>
            <div className="flex items-center space-x-4">
              <LoadingSpinner variant="primary" />
              <LoadingSpinner variant="secondary" />
              <div className="bg-blue-600 p-2 rounded">
                <LoadingSpinner variant="white" />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Inline with text:</p>
            <div className="flex items-center">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Loading data...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Loading Buttons */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">2. Loading Buttons</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Single loading state:</p>
            <LoadingButton
              loading={isSingleLoading}
              loadingText="Processing..."
              onClick={handleSingleAction}
            >
              Execute Action
            </LoadingButton>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Multiple loading states:</p>
            <div className="flex space-x-3">
              <LoadingButton
                loading={isLoading('action1')}
                loadingText="Closing..."
                variant="primary"
                onClick={() => handleMultipleAction('action1')}
              >
                Close Period
              </LoadingButton>
              <LoadingButton
                loading={isLoading('action2')}
                loadingText="Reopening..."
                variant="secondary"
                onClick={() => handleMultipleAction('action2')}
              >
                Reopen Period
              </LoadingButton>
              <LoadingButton
                loading={isLoading('action3')}
                loadingText="Deleting..."
                variant="danger"
                onClick={() => handleMultipleAction('action3')}
              >
                Delete
              </LoadingButton>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Sizes:</p>
            <div className="flex items-center space-x-3">
              <LoadingButton size="sm" onClick={() => {}}>Small</LoadingButton>
              <LoadingButton size="md" onClick={() => {}}>Medium</LoadingButton>
              <LoadingButton size="lg" onClick={() => {}}>Large</LoadingButton>
            </div>
          </div>
        </div>
      </section>

      {/* Loading Overlay */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">3. Loading Overlay</h2>
        <div className="space-y-4">
          <div className="relative border rounded p-4 min-h-[200px]">
            <LoadingOverlay 
              isLoading={showOverlay} 
              message="Processing period closing..."
            />
            <p className="mb-4">Content area that will be covered by overlay</p>
            <LoadingButton onClick={handleOverlayDemo}>
              Show Overlay Demo
            </LoadingButton>
          </div>
        </div>
      </section>

      {/* Skeleton Loaders */}
      <section className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">4. Skeleton Loaders</h2>
        <div className="space-y-4">
          <LoadingButton onClick={handleSkeletonDemo}>
            Toggle Skeleton Demo
          </LoadingButton>

          {showSkeletons ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Skeleton Text:</p>
                <SkeletonText lines={3} />
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Skeleton Card:</p>
                <SkeletonCard />
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Skeleton List:</p>
                <SkeletonList items={3} />
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Skeleton Table:</p>
                <SkeletonTable rows={3} columns={4} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Actual Text:</p>
                <div className="space-y-2">
                  <p>This is the first line of actual content.</p>
                  <p>This is the second line of actual content.</p>
                  <p>This is the third line of actual content.</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Actual Card:</p>
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2">Period: January 2024</h3>
                  <p className="text-sm text-gray-600 mb-1">Status: Open</p>
                  <p className="text-sm text-gray-600 mb-1">Start: 2024-01-01</p>
                  <p className="text-sm text-gray-600">End: 2024-01-31</p>
                  <div className="mt-4 flex space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
                      Close
                    </button>
                    <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded text-sm">
                      View
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Actual List:</p>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold">{i}</span>
                      </div>
                      <div>
                        <p className="font-medium">Period Item {i}</p>
                        <p className="text-sm text-gray-600">Description for item {i}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Actual Table:</p>
                <table className="min-w-full border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Period</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Start Date</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">End Date</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[1, 2, 3].map(i => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">Period {i}</td>
                        <td className="px-4 py-2 text-sm">2024-0{i}-01</td>
                        <td className="px-4 py-2 text-sm">2024-0{i}-31</td>
                        <td className="px-4 py-2 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Open
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Best Practices */}
      <section className="border rounded-lg p-6 bg-blue-50">
        <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">✓</span>
            <span>Use skeleton screens for initial data loading instead of spinners</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">✓</span>
            <span>Always disable buttons and form elements during processing</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">✓</span>
            <span>Provide specific loading messages that describe what's happening</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">✓</span>
            <span>Use withLoading helper for automatic loading state management</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">✓</span>
            <span>Combine loading states with toast notifications for complete feedback</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
