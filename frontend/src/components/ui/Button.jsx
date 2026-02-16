import React, { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

const sizes = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

const Button = memo(forwardRef(function Button(
  { variant = 'primary', size = 'md', children, className = '', disabled, loading, icon, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}));

export default Button;
