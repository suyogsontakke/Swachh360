import React from 'react';

interface SwachhLogoProps {
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SwachhLogo: React.FC<SwachhLogoProps> = ({
  variant = 'dark',
  showTagline = false,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 32;
  const primaryText = variant === 'light' ? 'text-white' : 'text-[#142B45]';
  const accentText = 'text-[#27AE75]';
  const taglineColor = variant === 'light' ? 'text-slate-300' : 'text-[#52677A]';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer civic 360 circular loop */}
        <path
          d="M20 4.5C28.56 4.5 35.5 11.44 35.5 20C35.5 24.85 33.27 29.18 29.78 32.02"
          stroke="#27AE75"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M32.4 26.8L29.5 32.3L35.3 31.8"
          stroke="#27AE75"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 35.5C11.44 35.5 4.5 28.56 4.5 20C4.5 15.15 6.73 10.82 10.22 7.98"
          stroke={variant === 'light' ? '#E2E8F0' : '#142B45'}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M7.6 13.2L10.5 7.7L4.7 8.2"
          stroke={variant === 'light' ? '#E2E8F0' : '#142B45'}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Clean central civic leaf / hygiene emblem */}
        <path
          d="M20.2 12.2C16.2 13.4 13.8 16.9 14.3 21.1C14.7 24.4 17.5 26.8 20.8 26.8C24.5 26.8 26.8 23.8 26.4 19.6C26 15.6 23.6 13.1 20.2 12.2Z"
          fill="#27AE75"
          fillOpacity="0.18"
          stroke="#27AE75"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M17.2 23.2L22.6 16.8"
          stroke={variant === 'light' ? '#FFFFFF' : '#142B45'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold tracking-tight whitespace-nowrap ${
            size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
          } ${primaryText}`}
        >
          SWACHH<span className={accentText}>360</span>
        </span>
        {showTagline && (
          <span className={`text-xs mt-1 font-normal ${taglineColor}`}>
            Smart Civic. Cleaner Communities.
          </span>
        )}
      </div>
    </div>
  );
};
