import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../stores/themeStore';

const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #111827, #1E293B)'
          : 'linear-gradient(135deg, #EFF6FF, #ECFDF5)',
        boxShadow: isDark
          ? '0 0 10px rgba(34, 211, 238, 0.16), inset 0 1px 2px rgba(0,0,0,0.35)'
          : 'inset 0 1px 3px rgba(37,99,235,0.18)',
      }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Genome Glass (Light)' : 'BioTech Elite (Dark)'}
    >
      <motion.div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isDark ? '#162040' : '#FFFFFF',
          boxShadow: isDark
            ? '0 0 8px rgba(34, 211, 238, 0.22)'
            : '0 1px 4px rgba(37,99,235,0.22)',
        }}
        layout
        animate={{ x: isDark ? 26 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <svg className="w-3.5 h-3.5 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </motion.div>
    </motion.button>
  );
});

export default ThemeToggle;
