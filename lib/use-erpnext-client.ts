/**
 * React Hook for ERPNext Multi-Site Client
 * 
 * Client-side only hook for using ERPNext client in React components.
 */

'use client';

import { useMemo } from 'react';
import { ERPNextMultiClient } from './erpnext-multi';
import { useSite } from './site-context';

/**
 * React hook to get an ERPNext client for the currently active site
 * 
 * This hook uses the site context to automatically create a client
 * configured for the active site. It will throw an error if no site
 * is currently selected.
 * 
 * @returns ERPNextMultiClient configured for the active site
 * @throws Error if no site is currently active
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useERPNextClient();
 *   
 *   useEffect(() => {
 *     async function fetchData() {
 *       const items = await client.getList('Item');
 *       setItems(items);
 *     }
 *     fetchData();
 *   }, [client]);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useERPNextClient(): ERPNextMultiClient {
  const { activeSite } = useSite();

  // Create client instance, memoized by site to avoid recreating on every render
  const client = useMemo(() => {
    if (!activeSite) {
      throw new Error(
        'No active site selected. Please select a site before making API requests.'
      );
    }

    return new ERPNextMultiClient(activeSite);
  }, [activeSite]); // Recreate when site changes

  return client;
}
