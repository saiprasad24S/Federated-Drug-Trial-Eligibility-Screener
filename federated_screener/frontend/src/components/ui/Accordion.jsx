import React, { memo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Accordion = memo(function Accordion({ title, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const contentRef = useRef(null);

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={open}
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="font-semibold text-sm">{title}</span>
        <motion.svg
          className="w-4 h-4 flex-shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={contentRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Accordion;
