import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';

const AboutSection = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <section
      id="about"
      className={`px-6 py-20 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className={`rounded-2xl p-8 md:p-10 border ${
            isDark
              ? 'bg-slate-800/70 border-slate-700/60'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            About FEDTES
          </h2>

          <div className={`space-y-5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <p>
              The Federated Drug Trial Eligibility Screener is a privacy-preserving, decentralized platform designed to enhance patient recruitment for clinical drug trials across multiple hospitals. The system enables each participating hospital to locally train machine learning models on their complete patient medical records without sharing any raw or identifiable patient data externally.
            </p>
            <p>
              Only anonymized drug trial eligibility parameters, such as drug name, demographic criteria, blood group, and relevant clinical indicators, are published to a secure federated network accessible by all sites. Each hospital independently identifies and counts local patients potentially eligible for external trials, ensuring no exposure of sensitive records.
            </p>
            <p>
              Federated learning coordinates periodic sharing of non-identifying model updates to improve collective predictive accuracy across the network. The platform implements immutable blockchain-based audit trails to securely log all federated actions, patient consent transactions, and eligibility queries, ensuring transparency, data integrity, and regulatory compliance.
            </p>
            <p>
              An interactive, role-based user interface provides clinicians and trial coordinators with seamless access to trial opportunities, eligibility analytics, and privacy status, enabling efficient, transparent, and scalable multi-institutional clinical research collaboration.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
