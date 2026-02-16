import React, { memo } from 'react';
import { motion } from 'framer-motion';

const Card = memo(function Card({
  children,
  className = '',
  hover = false,
  glow = false,
  padding = 'p-5',
  onClick,
  ...props
}) {
  return (
    <motion.div
      className={`glass-card ${padding} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hover ? { y: -2, scale: 1.005 } : {}}
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
