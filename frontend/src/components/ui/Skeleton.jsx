import React, { memo } from 'react';

const Skeleton = memo(function Skeleton({ className = '', rows = 1, height = 'h-4', width = 'w-full' }) {
  if (rows === 1) return <div className={`skeleton ${height} ${width} ${className}`} />;
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${height}`}
          style={{ width: i === rows - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
});

export const TableSkeleton = memo(function TableSkeleton({ cols = 5, rows = 8 }) {
  return (
    <div className="space-y-1">
      <div className="skeleton h-10 w-full rounded-t-lg" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
});

export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-4/5" />
      <div className="flex gap-2 pt-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  );
});

export default Skeleton;
