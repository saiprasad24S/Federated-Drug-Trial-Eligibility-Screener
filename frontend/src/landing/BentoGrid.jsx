import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';

const BentoGrid = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const features = [
    {
      title: 'Federated Learning',
      description: 'Distributed training across multiple hospital networks while keeping data private and secure.',
      icon: '🤖',
      delay: 0,
    },
    {
      title: 'Privacy First',
      description: 'Advanced encryption and privacy-preserving algorithms protect patient data at every step.',
      icon: '🔐',
      delay: 0.1,
    },
    {
      title: 'Blockchain Audit',
      description: 'Immutable transaction logs ensure complete transparency and accountability.',
      icon: '⛓️',
      delay: 0.2,
    },
    {
      title: 'Real-time Analytics',
      description: 'Monitor training progress, patient eligibility, and system metrics in real time.',
      icon: '📊',
      delay: 0.3,
    },
    {
      title: 'Smart Contracts',
      description: 'Automated execution of eligibility criteria with tamper-proof verification.',
      icon: '✅',
      delay: 0.4,
    },
    {
      title: 'Scalable Architecture',
      description: 'Seamlessly scale from small pilot programs to enterprise-wide deployments.',
      icon: '📈',
      delay: 0.5,
    },
  ];

  return (
    <section
      id="features"
      ref={containerRef}
      className={`py-24 px-6 ${isDark ? 'bg-gradient-to-b from-slate-900 to-slate-800' : 'bg-gray-50'}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <h2
            className={`text-4xl md:text-5xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Powerful Features
          </h2>
          <p
            className={`text-lg max-w-2xl mx-auto ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Everything you need to run secure, compliant, and efficient clinical trials
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard
              key={idx}
              feature={feature}
              index={idx}
              isDark={isDark}
              scrollProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ feature, index, isDark, scrollProgress }) => {
  const scale = useTransform(scrollProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollProgress, [0, 1], [0.5, 1]);

  const isLarge = index === 0 || index === 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: feature.delay, duration: 0.6 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ scale: 1.05, y: -10 }}
      style={index < 3 ? { scale, opacity } : { scale: 1 }}
      className={`p-8 rounded-2xl border transition-all cursor-pointer group ${
        isDark
          ? 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-800/80'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
      } ${isLarge ? 'lg:col-span-2' : ''}`}
    >
      {/* Icon */}
      <div
        className={`text-5xl mb-4 transform group-hover:scale-110 transition-transform ${
          isDark ? 'group-hover:drop-shadow-lg' : ''
        }`}
      >
        {feature.icon}
      </div>

      {/* Content */}
      <h3
        className={`text-xl font-bold mb-3 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {feature.title}
      </h3>
      <p
        className={`${isDark ? 'text-slate-400' : 'text-slate-600'}`}
      >
        {feature.description}
      </p>

      {/* Decorative Line */}
      <motion.div
        className={`mt-4 h-0.5 bg-gradient-to-r ${
          isDark
            ? 'from-cyan-500/0 via-cyan-400 to-cyan-500/0'
            : 'from-blue-500/0 via-blue-400 to-blue-500/0'
        }`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ delay: feature.delay + 0.3, duration: 0.8 }}
        viewport={{ once: true }}
      />
    </motion.div>
  );
};

export default BentoGrid;
