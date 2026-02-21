'use client';

import { useRouter } from 'next/navigation';
import CreatePeriodForm from '../components/CreatePeriodForm';

export default function CreatePeriodPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buat Periode Akuntansi Baru</h1>
        <p className="text-sm text-gray-500 mt-1">
          Buat periode akuntansi baru untuk perusahaan Anda
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <CreatePeriodForm 
          onSuccess={() => router.push('/accounting-period')}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
