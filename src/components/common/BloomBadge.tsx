import React from 'react';
import { BloomLevelNumber, BLOOM_LEVELS } from '../../types';

interface BloomBadgeProps {
  level: BloomLevelNumber;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const BloomBadge: React.FC<BloomBadgeProps> = ({
  level,
  size = 'md',
  showName = false,
  className = '',
}) => {
  const info = BLOOM_LEVELS[level];

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs font-semibold',
    md: 'w-8 h-8 text-sm font-bold',
    lg: 'w-10 h-10 text-base font-bold',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses} rounded-full bg-[#6D28D9] text-white flex items-center justify-center shrink-0 shadow-sm`}
        aria-label={`Bloom Level ${level}: ${info.name}`}
      >
        {level}
      </div>
      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#1C1530] dark:text-[#f3f0fc]">
            {level}. {info.name}
          </span>
        </div>
      )}
    </div>
  );
};
