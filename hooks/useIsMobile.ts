'use client';

import { useState, useEffect } from 'react';

/**
 * Hook untuk mendeteksi apakah viewport berada di bawah breakpoint tertentu
 * @param breakpoint - Nilai breakpoint dalam pixel (default: 768)
 * @returns boolean - true jika lebar layar < breakpoint
 */
export const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // SSR-safe: hanya jalankan di client
    if (typeof window === 'undefined') return;

    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    
    // Initial check
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
};