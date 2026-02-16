import React, { memo } from 'react';
import { useThemeStore } from '../../stores/themeStore';

const statusConfig = {
  Active:    { light: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }, dark: { bg: 'rgba(32,227,178,0.1)',  text: '#20E3B2', border: 'rgba(32,227,178,0.25)' } },
  Completed: { light: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' }, dark: { bg: 'rgba(51,154,240,0.1)',  text: '#74C0FC', border: 'rgba(51,154,240,0.25)' } },
  Paused:    { light: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }, dark: { bg: 'rgba(255,212,59,0.1)',  text: '#FFD43B', border: 'rgba(255,212,59,0.2)' } },
  Training:  { light: { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD' }, dark: { bg: 'rgba(32,227,178,0.08)', text: '#20E3B2', border: 'rgba(32,227,178,0.15)' } },
  Ready:     { light: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }, dark: { bg: 'rgba(32,227,178,0.1)',  text: '#20E3B2', border: 'rgba(32,227,178,0.25)' } },
  Error:     { light: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }, dark: { bg: 'rgba(255,107,107,0.1)', text: '#FF6B6B', border: 'rgba(255,107,107,0.25)' } },
  Idle:      { light: { bg: '#F0F2F8', text: '#6366F1', border: '#E0E4F0' }, dark: { bg: 'rgba(56,78,124,0.2)',   text: '#94A3B8', border: 'rgba(56,78,124,0.3)' } },
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
