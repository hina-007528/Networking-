import { brand } from '@stormfiber/config';

/** Inline logo so the mark always renders, even when a static SVG file fails to load. */
export function BrandLogo({
  variant = 'dark',
  compact = false,
}: {
  variant?: 'dark' | 'light';
  compact?: boolean;
}) {
  const textColor = variant === 'light' ? '#FFFFFF' : '#0C2340';
  const subColor = variant === 'light' ? 'rgba(255,255,255,0.65)' : '#4B5563';
  const divColor = variant === 'light' ? 'rgba(255,255,255,0.3)' : '#CBD5E1';
  const w = compact ? 188 : 220;

  return (
    <span className="relative z-10 inline-flex items-center shrink-0" aria-label={brand.name}>
      <svg
        width={w}
        height={compact ? 40 : 48}
        viewBox="0 0 220 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="22" cy="24" r="18" stroke="#2E86DE" strokeWidth="1.6" fill="none" />
        <ellipse cx="22" cy="24" rx="9" ry="18" stroke="#2E86DE" strokeWidth="1.2" fill="none" opacity="0.6" />
        <line x1="4" y1="24" x2="40" y2="24" stroke="#2E86DE" strokeWidth="1.2" opacity="0.5" />
        <line x1="6" y1="14" x2="38" y2="14" stroke="#2E86DE" strokeWidth="1" opacity="0.35" />
        <line x1="6" y1="34" x2="38" y2="34" stroke="#2E86DE" strokeWidth="1" opacity="0.35" />
        <circle cx="22" cy="6" r="2.2" fill="#2E86DE" />
        <circle cx="36" cy="14" r="2" fill="#2E86DE" opacity="0.85" />
        <circle cx="38" cy="24" r="2" fill="#7FD1F0" />
        <circle cx="36" cy="34" r="2" fill="#2E86DE" opacity="0.85" />
        <circle cx="22" cy="42" r="2.2" fill="#2E86DE" />
        <circle cx="8" cy="34" r="2" fill="#2E86DE" opacity="0.85" />
        <circle cx="6" cy="24" r="2" fill="#7FD1F0" />
        <circle cx="8" cy="14" r="2" fill="#2E86DE" opacity="0.85" />
        <line x1="22" y1="6" x2="36" y2="14" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="36" y1="14" x2="38" y2="24" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="38" y1="24" x2="36" y2="34" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="36" y1="34" x2="22" y2="42" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="22" y1="42" x2="8" y2="34" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="8" y1="34" x2="6" y2="24" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="6" y1="24" x2="8" y2="14" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="8" y1="14" x2="22" y2="6" stroke="#2E86DE" strokeWidth="0.9" opacity="0.5" />
        <line x1="50" y1="8" x2="50" y2="40" stroke={divColor} strokeWidth="1.2" />
        <text
          x="58"
          y="26"
          fontFamily="Montserrat, 'Segoe UI', Arial, sans-serif"
          fontWeight="800"
          fontSize={compact ? '13' : '14.5'}
          fill={textColor}
          letterSpacing="-0.3"
        >
          MAJAWAR
        </text>
        <defs>
          <linearGradient id="admin-xgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7FD1F0" />
            <stop offset="100%" stopColor="#2E86DE" />
          </linearGradient>
        </defs>
        <text
          x={compact ? '129' : '135'}
          y="26"
          fontFamily="Montserrat, 'Segoe UI', Arial, sans-serif"
          fontWeight="900"
          fontSize={compact ? '14' : '15.5'}
          fill="url(#admin-xgrad)"
          letterSpacing="-0.3"
        >
          X
        </text>
        <text
          x={compact ? '143' : '150'}
          y="26"
          fontFamily="Montserrat, 'Segoe UI', Arial, sans-serif"
          fontWeight="800"
          fontSize={compact ? '13' : '14.5'}
          fill={textColor}
          letterSpacing="-0.3"
        >
          NETWORK
        </text>
        {!compact ? (
          <text
            x="58"
            y="38"
            fontFamily="'Segoe UI', Arial, sans-serif"
            fontWeight="400"
            fontSize="8.5"
            fill={subColor}
            letterSpacing="0.3"
          >
            Built for Speed – Made for You.
          </text>
        ) : null}
      </svg>
    </span>
  );
}
