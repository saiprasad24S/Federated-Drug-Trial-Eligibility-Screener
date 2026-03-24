import React from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../stores/themeStore';
import UniversalLogo from '../components/UniversalLogo';

const Footer = () => {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const links = {
    Product: ['Features', 'Security', 'Pricing', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Cookie Policy', 'Compliance'],
    Social: [
      { name: 'Twitter', icon: '𝕏', href: 'https://x.com' },
      { name: 'LinkedIn', icon: '💼', href: 'https://www.linkedin.com' },
      { name: 'GitHub', icon: '🐙', href: 'https://github.com/saiprasad24S' },
      { name: 'Email', icon: '✉️', href: 'mailto:ybsaiprasad@gmail.com' },
    ],
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <footer
      className={`${
        isDark
          ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800'
          : 'bg-gray-900 border-t border-gray-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Footer Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12"
        >
          {/* Brand Column */}
          <motion.div variants={itemVariants} className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center ${isDark ? 'shadow-lg shadow-cyan-500/50' : 'shadow-lg'}`}>
                <UniversalLogo className="w-5 h-5" style={{ color: '#fff' }} />
              </div>
              <span className="text-white font-bold text-lg">FEDTES</span>
            </div>
            <p className="text-slate-400 text-sm">
              Privacy-preserving federated learning for clinical trials.
            </p>
          </motion.div>

          {/* Links Columns */}
          {Object.entries(links).slice(0, 3).map(([category, items]) => (
            <motion.div key={category} variants={itemVariants}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase()}`}
                      className={`text-sm transition-colors ${
                        isDark
                          ? 'text-slate-400 hover:text-cyan-400'
                          : 'text-slate-400 hover:text-blue-400'
                      }`}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Social Links */}
          <motion.div variants={itemVariants}>
            <h4 className="text-white font-semibold mb-4">Connect</h4>
            <div className="flex gap-3">
              {links.Social.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  whileHover={{ scale: 1.2, y: -5 }}
                  title={social.name}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    isDark
                      ? 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-400'
                      : 'bg-slate-800 hover:bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div
          className={`h-px my-8 ${
            isDark ? 'bg-slate-800' : 'bg-slate-800'
          }`}
        />

        {/* Bottom Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm"
        >
          <motion.div variants={itemVariants}>
            © 2024 FEDTES. All rights reserved.
          </motion.div>
          <motion.div variants={itemVariants} className="flex gap-6">
            <a href="#privacy" className={`transition-colors ${isDark ? 'hover:text-cyan-400' : 'hover:text-blue-400'}`}>
              Privacy Policy
            </a>
            <a href="#terms" className={`transition-colors ${isDark ? 'hover:text-cyan-400' : 'hover:text-blue-400'}`}>
              Terms of Service
            </a>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
