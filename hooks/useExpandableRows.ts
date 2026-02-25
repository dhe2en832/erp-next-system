import { useState, useCallback } from 'react';

/**
 * Custom hook for managing expandable rows state
 * Used for invoice and payment details with expandable items/references
 */
export function useExpandableRows() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isExpanded = useCallback((id: string) => {
    return expanded.has(id);
  }, [expanded]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const expandAll = useCallback((ids: string[]) => {
    setExpanded(new Set(ids));
  }, []);

  return {
    toggleRow,
    isExpanded,
    collapseAll,
    expandAll
  };
}
