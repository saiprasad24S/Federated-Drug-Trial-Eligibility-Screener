import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';

const ContactSection = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <section
      id="contact"
      className={`px-6 py-20 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className={`rounded-2xl p-8 md:p-10 border ${
            isDark
              ? 'bg-slate-900/80 border-slate-700/60'
              : 'bg-white border-slate-200'
          }`}
        >
          <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Contact
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div className={`rounded-xl p-5 border ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Name</p>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Y B Sai Prasad
              </p>
            </div>

            <div className={`rounded-xl p-5 border ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email</p>
              <a
                href="mailto:ybsaiprasad@gmail.com"
                className={`font-semibold break-all ${isDark ? 'text-cyan-300' : 'text-blue-700'}`}
              >
                ybsaiprasad@gmail.com
              </a>
            </div>

            <div className={`rounded-xl p-5 border ${isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Address</p>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                CVR College of Engineering, Hyderabad
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
