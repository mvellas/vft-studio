import type { CSSProperties } from 'react'

interface BrandLogoProps {
  compact?: boolean
  size?: number
  subtitle?: string | null
}

export function BrandLogo({ compact = false, size = 44, subtitle = 'Decision Intelligence Studio' }: BrandLogoProps) {
  const labelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? '0px' : '2px',
    minWidth: 0,
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="relative shrink-0 rounded-[18px] overflow-hidden"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(145deg, rgba(15,23,42,0.94), rgba(30,41,59,0.86))',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 20px 40px rgba(15,23,42,0.26), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="absolute inset-[5px] rounded-[14px]"
          style={{
            background: 'radial-gradient(circle at 24% 18%, rgba(56,189,248,0.38), transparent 40%), linear-gradient(135deg, rgba(8,47,73,0.55), rgba(76,29,149,0.5) 56%, rgba(16,185,129,0.24))',
            border: '1px solid rgba(125,211,252,0.14)',
          }}
        />
        <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="vft-logo-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="48%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="vft-logo-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(103,232,249,0.34)" />
              <stop offset="100%" stopColor="rgba(52,211,153,0.12)" />
            </linearGradient>
          </defs>
          <path
            d="M13 18 L24 46 L32 29 L40 46 L51 18"
            fill="none"
            stroke="url(#vft-logo-stroke)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 16 C22 10, 42 10, 48 16"
            fill="none"
            stroke="rgba(248,250,252,0.55)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="32" cy="30" r="15.5" fill="url(#vft-logo-fill)" opacity="0.85" />
          <circle cx="32" cy="30" r="2.5" fill="#f8fafc" opacity="0.95" />
        </svg>
      </div>

      {!compact && (
        <div style={labelStyle}>
          <span
            className="truncate"
            style={{
              color: '#f8fafc',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            VFT Studio
          </span>
          {subtitle && (
            <span
              className="truncate"
              style={{
                color: '#94a3b8',
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
