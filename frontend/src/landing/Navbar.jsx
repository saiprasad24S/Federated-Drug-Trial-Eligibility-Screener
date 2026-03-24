import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '../components/ui';
import { useThemeStore } from '../stores/themeStore';
import UniversalLogo from '../components/UniversalLogo';

const Navbar = ({ onLoginClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? isDark
            ? 'bg-slate-900/80 backdrop-blur-md border-b border-slate-700'
            : 'bg-white/80 backdrop-blur-md border-b border-gray-200'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center ${isDark ? 'shadow-lg shadow-cyan-500/50' : ''}`}>
            <UniversalLogo className="w-5 h-5" style={{ color: '#fff' }} />
          </div>
          <div className="flex flex-col">
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>FEDTES</span>
            <span className={`text-xs ${isDark ? 'text-cyan-400' : 'text-blue-500'}`}>Federated Learning</span>
          </div>
        </motion.div>

        {/* Right Side - Links & Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-6"
        >
          {/* Navigation Links */}
          <div className="hidden sm:flex gap-6">
            {['Features', 'FAQ', 'About', 'Contact'].map((link, idx) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className={`text-sm font-medium transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-cyan-400'
                    : 'text-slate-700 hover:text-blue-500'
                }`}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoginClick}
            className={`px-5 py-2 rounded-lg font-semibold transition-all ${
              isDark
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-blue-500/30'
            }`}
          >
            Login
          </motion.button>
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
