/** Shared Framer Motion variant presets */

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: 16, transition: { duration: 0.2 } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

export const popIn = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 500, damping: 28 } },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Floating / pulse for attention-grabbing elements */
export const floatAnimation = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const pulseGlow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(32, 227, 178, 0)',
      '0 0 0 8px rgba(32, 227, 178, 0.15)',
      '0 0 0 0 rgba(32, 227, 178, 0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Tab content transition (smooth slide + fade) */
export const pageTransition = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

/** Modal / overlay backdrop */
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.92, y: 30 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 30 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

/** Number counter spring for KPI values */
export const counterSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};
