'use client';

interface ErrorDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export default function ErrorDialog({ isOpen, title = 'Gagal', message, onClose }: ErrorDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl w-full">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">{title}</h3>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
