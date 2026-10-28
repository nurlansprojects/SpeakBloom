import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 48, className = '', showText = false }) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Violet Rounded Square */}
        <rect width="64" height="64" rx="20" fill="#6D28D9" />
        
        {/* White Speech Bubble */}
        <path
          d="M18 20C18 16.6863 20.6863 14 24 14H40C43.3137 14 46 16.6863 46 20V34C46 37.3137 43.3137 40 40 40H30L22 47V40H24H24C20.6863 40 18 37.3137 18 34V20Z"
          fill="white"
        />

        {/* Sound Wave Bars inside speech bubble */}
        <rect x="26" y="24" width="3" height="8" rx="1.5" fill="#6D28D9" />
        <rect x="31" y="21" width="3" height="14" rx="1.5" fill="#6D28D9" />
        <rect x="36" y="24" width="3" height="8" rx="1.5" fill="#6D28D9" />
      </svg>
      {showText && (
        <span className="text-2xl font-bold tracking-tight text-[#1C1530] dark:text-white">
          SpeakBloom
        </span>
      )}
    </div>
  );
};
