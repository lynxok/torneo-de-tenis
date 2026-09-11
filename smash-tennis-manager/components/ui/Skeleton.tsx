import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

export const TournamentCardSkeleton: React.FC = () => (
  <div className="bg-surface border border-white/10 rounded-2xl p-5 space-y-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-white/10 rounded-md w-3/4" />
        <div className="h-4 bg-white/5 rounded-md w-1/2" />
      </div>
      <div className="w-16 h-6 bg-white/10 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3 pt-2">
      <div className="h-10 bg-white/5 rounded-xl" />
      <div className="h-10 bg-white/5 rounded-xl" />
    </div>
    <div className="pt-2 flex justify-between items-center border-t border-white/5">
      <div className="h-4 bg-white/5 rounded-md w-1/3" />
      <div className="h-8 bg-white/10 rounded-xl w-24" />
    </div>
  </div>
);

export const BookingSlotSkeleton: React.FC = () => (
  <div className="bg-surface/50 border border-white/5 rounded-2xl p-4 animate-pulse space-y-3">
    <div className="flex justify-between items-center">
      <div className="h-5 bg-white/10 rounded-md w-24" />
      <div className="h-5 bg-white/10 rounded-full w-16" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
    <div className="h-9 bg-white/10 rounded-xl w-full" />
  </div>
);
