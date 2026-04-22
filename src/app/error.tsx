'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border max-w-md w-full text-center space-y-6">
        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-500 text-sm">
            An unexpected error occurred. We have been notified and are looking into it.
          </p>
        </div>
        <button
          onClick={() => reset()}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold flex items-center justify-center hover:bg-indigo-700 transition-colors"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try Again
        </button>
        <a 
          href="/dashboard"
          className="block text-sm font-medium text-gray-400 hover:text-gray-600"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
