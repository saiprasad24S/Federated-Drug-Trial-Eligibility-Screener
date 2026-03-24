import React from 'react';

export default function UniversalLogo({ className = 'w-5 h-5', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M12 2v20" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 7h14" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12h10" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 17h6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
