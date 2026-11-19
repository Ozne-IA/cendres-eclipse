import React from 'react';

export function EclipseTitleEmblem() {
  return (
    <svg
      viewBox="0 0 540 130"
      className="w-full max-w-[520px] h-auto select-none"
      role="img"
      aria-label="Cendres de l'Éclipse"
    >
      <defs>
        <linearGradient id="eclipseGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d98f" />
          <stop offset="50%" stopColor="#d4a853" />
          <stop offset="100%" stopColor="#8c6228" />
        </linearGradient>
      </defs>

      {/* Ornamental Eclipse Crest */}
      <g transform="translate(38, 65)">
        <circle cx="0" cy="0" r="28" fill="#070609" stroke="url(#eclipseGold)" strokeWidth="2.5" />
        <path
          d="M -36 0 L -28 -5 L -28 5 Z M 36 0 L 28 -5 L 28 5 Z M 0 -36 L -5 -28 L 5 -28 Z M 0 36 L -5 28 L 5 28 Z"
          fill="#d4a853"
        />
        <path d="M 0 -22 L 4 12 L 0 18 L -4 12 Z" fill="#e8e1d5" />
        <rect x="-8" y="-12" width="16" height="3" fill="#d4a853" />
      </g>

      {/* Title Lockup */}
      <text
        x="86"
        y="58"
        fill="#f0e6d2"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="4"
      >
        CENDRES
      </text>
      <line x1="88" y1="70" x2="480" y2="70" stroke="#6b5235" strokeWidth="1" />
      <text
        x="88"
        y="96"
        fill="url(#eclipseGold)"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="22"
        fontWeight="600"
        letterSpacing="7"
      >
        DE L&apos;ÉCLIPSE
      </text>
    </svg>
  );
}

export function CinderIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.5C12 2.5 17.5 7.6 17.5 13.2C17.5 17.3 15.1 20.5 12 21.5C8.9 20.5 6.5 17.3 6.5 13.2C6.5 10.6 7.8 8.3 9.2 6.8C9.2 9 10.5 10.2 11.4 10.2C10.8 7.5 12 2.5 12 2.5Z"
        fill="#e06b2b"
        stroke="#0a080c"
        strokeWidth="1.5"
      />
      <path d="M12 12.2C13.6 14 14.2 15.8 13.6 17.6C12.8 19 11.2 19 10.4 17.6C9.8 15.8 10.4 14 12 12.2Z" fill="#ffd470" />
    </svg>
  );
}

export function IronIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <polygon
        points="12,3 20,8 18,18 12,21 6,18 4,8"
        fill="#7f8a99"
        stroke="#0a080c"
        strokeWidth="1.5"
      />
      <polygon points="12,3 20,8 12,12 4,8" fill="#b4bfcc" />
    </svg>
  );
}

export function TearIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3C12 3 18 10.8 18 15C18 18.5 15.3 21 12 21C8.7 21 6 18.5 6 15C6 10.8 12 3 12 3Z"
        fill="#5f9ae0"
        stroke="#0a080c"
        strokeWidth="1.5"
      />
      <path d="M9.5 14.5C9.5 16.5 10.8 18 12 18" stroke="#cbe6ff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FlaskSocketIcon({ state }: { state: 'full' | 'empty' }) {
  return (
    <svg viewBox="0 0 20 24" className="w-4 h-5" fill="none" aria-hidden="true">
      <path
        d="M7 2H13V5L16.5 10.2V19.5C16.5 21 15.2 22 13.8 22H6.2C4.8 22 3.5 21 3.5 19.5V10.2L7 5V2Z"
        fill={state === 'full' ? '#9e2c1c' : '#18141c'}
        stroke={state === 'full' ? '#d4a853' : '#4a3b2c'}
        strokeWidth="1.6"
      />
      {state === 'full' && (
        <>
          <path d="M5 13H15V19C15 20 14.3 20.5 13.5 20.5H6.5C5.7 20.5 5 20 5 19V13Z" fill="#ff943d" />
          <line x1="6.5" y1="14.5" x2="6.5" y2="18.5" stroke="#ffe0a3" strokeWidth="1.3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M11 5L6 9H3V15H6L11 19V5Z" />
      {muted ? (
        <path d="M16 9L21 15M21 9L16 15" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5" strokeLinecap="round" />
          <path d="M18.5 6C21 8.8 21 15.2 18.5 18" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
