'use client';

import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook untuk infinite scroll menggunakan IntersectionObserver
 * @param callback - Fungsi yang dipanggil saat mencapai batas scroll
 * @param hasMore - Apakah masih ada data untuk dimuat
 * @param isLoading - Apakah sedang dalam proses loading
 * @param rootMargin - Margin trigger (default: '100px')
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean,
  rootMargin = '100px'
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    if (isLoading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, rootMargin]);

  return sentinelRef;
}

/**
 * Hook alternatif: manual trigger tanpa IntersectionObserver
 * Berguna untuk fallback button "Load More"
 */
export function useLoadMoreTrigger(
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean
) {
  return useCallback(() => {
    if (!isLoading && hasMore) {
      callback();
    }
  }, [callback, hasMore, isLoading]);
}