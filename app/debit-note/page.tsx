/**
 * Debit Note Page
 * 
 * Main page for Debit Note management
 * Conditionally renders list or form based on query parameters
 * 
 * Requirements: 2.1, 11.1
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import DebitNoteList from './dnList/component';
import DebitNoteMain from './dnMain/component';
import LoadingSpinner from '@/components/LoadingSpinner';

function DebitNotePageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const name = searchParams.get('name');

  // Show form if mode=create or name is provided
  if (mode === 'create' || name) {
    return <DebitNoteMain />;
  }

  // Default: show list
  return <DebitNoteList />;
}

export default function DebitNotePage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat..." />}>
      <DebitNotePageContent />
    </Suspense>
  );
}
