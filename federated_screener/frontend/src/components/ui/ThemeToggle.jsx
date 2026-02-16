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
          ? 'linear-gradient(135deg, #0B132B, #1C7ED6)'
          : 'linear-gradient(135deg, #E0E4F0, #C7D2FE)',
        boxShadow: isDark
          ? '0 0 12px rgba(32, 227, 178, 0.2), inset 0 1px 2px rgba(0,0,0,0.3)'
          : 'inset 0 1px 3px rgba(99,102,241,0.15)',
      }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'TechLux Platinum (Light)' : 'BioTech Elite (Dark)'}
    >
      <motion.div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isDark ? '#162040' : '#FFFFFF',
          boxShadow: isDark
            ? '0 0 8px rgba(32, 227, 178, 0.3)'
            : '0 1px 4px rgba(99,102,241,0.2)',
        }}
        layout
        animate={{ x: isDark ? 26 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <svg className="w-3.5 h-3.5 text-[#20E3B2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-[#6366F1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </motion.div>
    </motion.button>
  );
});

export default ThemeToggle;
