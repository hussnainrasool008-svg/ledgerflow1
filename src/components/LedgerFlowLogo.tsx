import React from 'react';

interface LedgerFlowLogoProps {
  variant?: 'full' | 'icon' | 'lock-screen' | 'splash';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const LedgerFlowLogo: React.FC<LedgerFlowLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  showTagline = true,
}) => {
  // Dimension presets
  const sizeMap = {
    sm: { icon: 28, height: 28, textScale: 0.8 },
    md: { icon: 38, height: 38, textScale: 1 },
    lg: { icon: 52, height: 52, textScale: 1.3 },
    xl: { icon: 72, height: 72, textScale: 1.8 },
  };

  const currentSize = sizeMap[size];

  // SVG Icon Graphic Component
  const LogoIcon = ({ width = 50, height = 40 }: { width?: number; height?: number }) => (
    <svg
      viewBox="0 0 100 80"
      width={width}
      height={height}
      className="shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="barOrange" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
        <linearGradient id="barAmber" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F57C00" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
        <linearGradient id="barYellow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FB8C00" />
          <stop offset="100%" stopColor="#FFD54F" />
        </linearGradient>
        <linearGradient id="barCyan" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0277BD" />
          <stop offset="100%" stopColor="#00E5FF" />
        </linearGradient>
        <linearGradient id="barBlue" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#01579B" />
          <stop offset="100%" stopColor="#00B0FF" />
        </linearGradient>
        <linearGradient id="arrowGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#E0F7FA" />
          <stop offset="40%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#0091EA" />
        </linearGradient>
        <linearGradient id="flowTextGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFA726" />
          <stop offset="100%" stopColor="#F4511E" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Floating data dots/squares */}
      <rect x="30" y="10" width="4.5" height="4.5" rx="0.5" fill="#FFB300" />
      <rect x="36" y="6" width="4.5" height="4.5" rx="0.5" fill="#FFA000" />
      <rect x="38" y="13" width="4" height="4" rx="0.5" fill="#FF8F00" />

      {/* 5 Growth Chart Bars */}
      {/* Bar 1 (Left Orange) */}
      <path d="M12 48 L18 45 L18 64 L12 66 Z" fill="url(#barOrange)" />
      {/* Bar 2 (Amber) */}
      <path d="M20 38 L27 34 L27 68 L20 66 Z" fill="url(#barAmber)" />
      {/* Bar 3 (Yellow-Amber) */}
      <path d="M29 28 L36 24 L36 71 L29 69 Z" fill="url(#barYellow)" />
      {/* Bar 4 (Cyan-Blue) */}
      <path d="M48 20 L55 18 L55 76 L48 74 Z" fill="url(#barCyan)" />
      {/* Bar 5 (Vivid Blue) */}
      <path d="M57 26 L64 29 L64 77 L57 76 Z" fill="url(#barBlue)" />

      {/* Upward Growth Swoop Arrow */}
      <path
        d="M6 68 C 12 76, 28 80, 52 72 C 60 69, 70 58, 80 20 L 71 21 L 86 12 L 86 28 L 78 25 C 68 62, 54 75, 26 75 C 14 75, 8 71, 6 68 Z"
        fill="url(#arrowGrad)"
      />

      {/* Bottom Swoop Accent Layer */}
      <path
        d="M8 65 C 16 57, 30 50, 48 40 L 49 44 C 32 53, 19 61, 9 68 Z"
        fill="#FFFFFF"
        opacity="0.85"
      />

      {/* Indian Rupee Symbol ₹ embedded in the curve */}
      <g transform="translate(18, 28) scale(0.65)" fill="#FFFFFF">
        <path d="M6 4 L22 4 L22 7 L15 7 C 18 8.5 19.5 11 19.5 14 L22 14 L22 17 L19 17 C 18 21.5 14.5 24 9 24.5 L20 38 L14 38 L4 25 L4 22 C 10 22 14 20.5 14 17 L4 17 L4 14 L14 14 C 14 11 11 9 6 9 L4 9 L4 4 L6 4 Z" />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoIcon width={currentSize.icon * 1.25} height={currentSize.icon} />
      </div>
    );
  }

  if (variant === 'splash') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        <div className="relative mb-4 drop-shadow-[0_10px_25px_rgba(0,180,255,0.2)]">
          <LogoIcon width={130} height={104} />
        </div>
        <div className="flex items-center tracking-tight font-black text-3xl sm:text-4xl text-white">
          <span>Ledger</span>
          <span className="bg-gradient-to-b from-[#FFA726] to-[#F4511E] bg-clip-text text-transparent ml-0.5">
            Flow
          </span>
        </div>
        <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#a3a3a3] uppercase mt-2">
          Secure • Manage • Grow
        </p>
      </div>
    );
  }

  if (variant === 'lock-screen') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        <div className="mb-3 drop-shadow-[0_8px_20px_rgba(0,180,255,0.15)]">
          <LogoIcon width={96} height={76} />
        </div>
        <div className="flex items-center tracking-tight font-black text-2xl sm:text-3xl text-white">
          <span>Ledger</span>
          <span className="bg-gradient-to-b from-[#FFA726] to-[#F4511E] bg-clip-text text-transparent ml-0.5">
            Flow
          </span>
        </div>
        {showTagline && (
          <p className="text-[11px] font-medium tracking-wider text-[#737373] mt-1">
            Secure. Manage. Grow.
          </p>
        )}
      </div>
    );
  }

  // Default 'full' horizontal lockup
  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      <LogoIcon width={currentSize.icon * 1.25} height={currentSize.icon} />
      <div className="flex flex-col">
        <div className="flex items-baseline tracking-tight font-black text-base sm:text-lg text-white leading-none">
          <span>Ledger</span>
          <span className="bg-gradient-to-b from-[#FFA726] to-[#F4511E] bg-clip-text text-transparent ml-0.5">
            Flow
          </span>
        </div>
        {showTagline && (
          <span className="text-[9px] font-medium text-[#737373] tracking-wide mt-0.5 whitespace-nowrap">
            Secure. Manage. Grow.
          </span>
        )}
      </div>
    </div>
  );
};
