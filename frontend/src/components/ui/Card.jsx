import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../../stores/themeStore';

const Card = memo(function Card({
  children,
  className = '',
  hover = false,
  glow = false,
  padding = 'p-5',
  onClick,
  ...props
}) {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <motion.div
      className={`glass-card ${padding} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hover ? (isDark ? { y: -6, scale: 1.005, boxShadow: '0 20px 45px rgba(0,0,0,0.6)' } : { y: -4, scale: 1.006, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }) : {}}
      whileTap={onClick ? { scale: 0.99 } : {}}
      onClick={onClick}
      layout
      {...props}
    >
      {children}
    </motion.div>
  );
});

export default Card;
