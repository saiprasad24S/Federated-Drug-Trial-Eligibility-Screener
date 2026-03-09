import React, { memo } from 'react';
import { useThemeStore } from '../../stores/themeStore';

const statusConfig = {
  Active:    { light: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }, dark: { bg: 'rgba(163,230,53,0.12)',  text: '#A3E635', border: 'rgba(163,230,53,0.24)' } },
  Completed: { light: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' }, dark: { bg: 'rgba(34,211,238,0.12)',  text: '#67E8F9', border: 'rgba(34,211,238,0.24)' } },
  Paused:    { light: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }, dark: { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B', border: 'rgba(245,158,11,0.25)' } },
  Training:  { light: { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD' }, dark: { bg: 'rgba(34,211,238,0.1)', text: '#22D3EE', border: 'rgba(34,211,238,0.22)' } },
  Ready:     { light: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }, dark: { bg: 'rgba(163,230,53,0.12)',  text: '#A3E635', border: 'rgba(163,230,53,0.24)' } },
  Error:     { light: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }, dark: { bg: 'rgba(255,107,107,0.1)', text: '#FF6B6B', border: 'rgba(255,107,107,0.25)' } },
  Idle:      { light: { bg: '#F1F5F9', text: '#2563EB', border: '#E2E8F0' }, dark: { bg: 'rgba(56,78,124,0.2)',   text: '#94A3B8', border: 'rgba(56,78,124,0.3)' } },
};

const StatusBadge = memo(function StatusBadge({ status = 'Idle', pulse = true }) {
  const theme = useThemeStore((s) => s.theme);
  const config = statusConfig[status] || statusConfig.Idle;
  const colors = config[theme === 'dark' ? 'dark' : 'light'];
  const isLive = (status === 'Active' || status === 'Training') && pulse;

  return (
    <span
      className="badge"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {isLive && (
        <span
          className="pulse-dot"
          style={{ backgroundColor: colors.text, color: colors.text }}
        />
      )}
      {status}
    </span>
  );
});

export default StatusBadge;
