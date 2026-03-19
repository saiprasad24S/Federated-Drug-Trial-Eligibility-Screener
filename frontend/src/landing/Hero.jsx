import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';

const Hero = ({ onCTAClick }) => {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
        ease: 'easeOut',
      },
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  return (
    <section className={`min-h-screen flex items-center justify-center overflow-hidden pt-20 ${isDark ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, -50, 0],
            y: [0, 50, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ top: '10%', left: '5%' }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 50, 0],
            y: [0, -50, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ bottom: '10%', right: '5%' }}
        />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        {/* Badge */}
        <motion.div
          variants={textVariants}
          custom={0}
          className={`inline-block mb-6 px-4 py-2 rounded-full border ${
            isDark
              ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
              : 'border-blue-400/50 bg-blue-50 text-blue-600'
          }`}
        >
          <span className="text-sm font-medium">🚀 Next Generation Healthcare AI</span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          variants={textVariants}
          custom={1}
          className={`text-5xl md:text-7xl font-bold mb-6 leading-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Federated Drug Trial{' '}
          <motion.span
            className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
            }}
          >
            Eligibility
          </motion.span>{' '}
          Screener
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={textVariants}
          custom={2}
          className={`text-lg md:text-xl mb-8 max-w-2xl mx-auto ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          Privacy-preserving federated learning system for drug trial eligibility prediction with blockchain-based audit logging.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={textVariants}
          custom={3}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(6, 182, 212, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onCTAClick}
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all ${
              isDark
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/60'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-blue-500/40'
            }`}
          >
            Login
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-8 py-4 text-lg font-semibold rounded-lg border transition-all ${
              isDark
                ? 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
                : 'border-blue-500 text-blue-600 hover:bg-blue-50'
            }`}
          >
            Learn More
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={textVariants}
          custom={4}
          className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t"
          style={{
            borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(203, 213, 225, 0.5)',
          }}
        >
          {[
            { number: '200+', label: 'Hospitals' },
            { number: '50K+', label: 'Patients' },
            { number: '99.9%', label: 'Privacy' },
          ].map((stat, idx) => (
            <motion.div key={idx} whileHover={{ scale: 1.05 }}>
              <div className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-blue-500'}`}>
                {stat.number}
              </div>
              <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <div className={`flex flex-col items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <span className="text-sm">Scroll to explore</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
