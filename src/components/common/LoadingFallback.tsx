import React from 'react';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
  minHeight?: string;
}

export function LoadingFallback({
  message = 'Chargement...',
  fullScreen = true,
  minHeight = 'min-h-screen',
}: LoadingFallbackProps) {
  const containerClass = fullScreen
    ? `${minHeight} bg-slate-50 flex items-center justify-center`
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-slate-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-b-2',
  }[size];

  return (
    <div className={`animate-spin rounded-full ${sizeClass} border-red-600`}></div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="animate-pulse">
        <div className="h-12 bg-slate-200"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 border-t border-slate-100 px-6 py-4">
            <div className="h-4 bg-slate-100 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
