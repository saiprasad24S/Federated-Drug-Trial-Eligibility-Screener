import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';

const FAQS = [
  {
    q: 'How does FEDTES protect patient privacy?',
    a: 'FEDTES keeps complete patient records inside each hospital. Only non-identifying trial parameters and model updates are shared across the federated network.',
  },
  {
    q: 'Does FEDTES share raw patient data between hospitals?',
    a: 'No. The platform is built so hospitals train models locally and only send safe aggregated learning updates. Raw or identifiable patient data is never exchanged.',
  },
  {
    q: 'What role does blockchain play in this project?',
    a: 'Blockchain provides immutable audit logs for federated actions, consent operations, and eligibility checks, helping with transparency and compliance.',
  },
  {
    q: 'Can clinicians see external trial opportunities?',
    a: 'Yes. The role-based interface allows clinicians and trial coordinators to explore eligible trial opportunities and analytics without exposing sensitive records.',
  },
  {
    q: 'Is FEDTES suitable for multi-hospital scaling?',
    a: 'Yes. The architecture is designed for decentralized collaboration, allowing multiple institutions to join and improve predictive performance over time.',
  },
  {
    q: 'How are eligibility decisions generated?',
    a: 'Eligibility is determined using configured trial criteria and model-assisted analysis on local hospital records, followed by transparent reporting in the dashboard.',
  },
  {
    q: 'Who can access the FEDTES dashboard?',
    a: 'FEDTES uses role-based access for clinicians and trial coordinators. Users only see data they are authorized to view in their institution context.',
  },
  {
    q: 'Can hospitals upload and manage their own patient datasets?',
    a: 'Yes. Each hospital can upload and maintain its own records securely, and those records remain local while federated intelligence is shared safely.',
  },
  {
    q: 'How does FEDTES support regulatory compliance?',
    a: 'The platform combines privacy-preserving federated workflows with blockchain audit trails to provide traceability, integrity, and compliance-friendly evidence.',
  },
  {
    q: 'Does FEDTES support trial analytics in real time?',
    a: 'Yes. FEDTES provides live insights for trial opportunities, eligibility trends, and participation metrics through its interactive dashboards.',
  },
];

const FAQSection = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className={`px-6 py-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className={`text-4xl md:text-5xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-base md:text-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Common questions about privacy, federated learning, and clinical trial collaboration.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                >
                  <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className={isDark ? 'text-cyan-300' : 'text-blue-600'}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className={`px-5 pb-5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
