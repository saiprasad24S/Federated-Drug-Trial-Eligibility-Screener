import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/apiService';
import { Button, ThemeToggle } from './ui';
import { useThemeStore } from '../stores/themeStore';

/* ── Animated floating particles (enhanced) ── */
const Particle = ({ delay, size, x, y, duration, color }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size, height: size, left: `${x}%`, top: `${y}%`,
      background: color || 'var(--brand-accent)', opacity: 0,
      filter: 'blur(1px)',
    }}
    animate={{
      opacity: [0, 0.5, 0],
      y: [0, -80, -160],
      x: [0, Math.sin(delay) * 20, 0],
      scale: [0.3, 1.2, 0.2],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

/* ── Premium DNA helix decoration ── */
const DNAHelix = () => (
  <svg className="absolute opacity-[0.05] pointer-events-none" style={{ right: '-5%', top: '10%', width: '180px', height: '80%' }} viewBox="0 0 100 400">
    {Array.from({ length: 20 }).map((_, i) => {
      const y = i * 20;
      const x1 = 30 + Math.sin(i * 0.6) * 20;
      const x2 = 70 - Math.sin(i * 0.6) * 20;
      return (
        <g key={i}>
          <circle cx={x1} cy={y} r="3" fill="var(--brand-accent)" />
          <circle cx={x2} cy={y} r="3" fill="var(--brand-primary)" />
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--border-primary)" strokeWidth="1" opacity="0.5" />
        </g>
      );
    })}
  </svg>
);

/* ── Animated counter stat ── */
const AnimatedStat = ({ value, label, suffix = '', delay = 0 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const end = parseInt(value);
      const increment = Math.ceil(end / 40);
      const counter = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(counter);
        } else {
          setCount(start);
        }
      }, 30);
      return () => clearInterval(counter);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 + 0.5, duration: 0.5 }}
    >
      <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--brand-accent)' }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] mt-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
    </motion.div>
  );
};

/* ── Floating grid pattern ── */
const GridPattern = ({ isDark }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
    <svg width="100%" height="100%">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? '#20E3B2' : '#6366F1'} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </div>
);

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    try {
      const result = await apiService.login(username, password);
      const user = result.user;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  const demoUsers = [
    { user: 'SaiPrasad24S', pass: '2724', label: 'Admin', icon: '👑' },
    { user: 'apollo', pass: 'apollo@123', label: 'Apollo', icon: '🏥' },
    { user: 'fortis', pass: 'fortis@123', label: 'Fortis', icon: '🏥' },
    { user: 'max', pass: 'max@123', label: 'Max', icon: '🏥' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-login)' }}>
      {/* ── Grid Pattern ── */}
      <GridPattern isDark={isDark} />

      {/* ── Enhanced Floating particles ── */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Particle
          key={i}
          delay={i * 0.9}
          size={3 + (i % 4) * 2}
          x={5 + i * 8}
          y={15 + (i % 5) * 16}
          duration={5 + i * 0.4}
          color={i % 3 === 0 ? 'var(--brand-primary)' : 'var(--brand-accent)'}
        />
      ))}

      {/* ── DNA Helix ── */}
      <DNAHelix />

      {/* ── Theme Toggle ── */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center items-center relative p-12">
        {/* Glowing orb */}
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px] pointer-events-none"
          style={{ background: 'var(--brand-accent)', top: '30%', left: '20%' }} />

        <motion.div
          className="relative z-10 max-w-md"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo */}
          <motion.div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(32,227,178,0.15), rgba(77,171,247,0.1))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(14,165,233,0.08))',
              border: `1.5px solid ${isDark ? 'rgba(32,227,178,0.25)' : 'rgba(99,102,241,0.2)'}`,
              boxShadow: isDark ? '0 0 40px rgba(32,227,178,0.1)' : '0 0 40px rgba(99,102,241,0.08)',
            }}
            whileHover={{ scale: 1.05, rotate: 3 }}
          >
            <svg className="w-10 h-10" style={{ color: 'var(--brand-accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2v20" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 7h14" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7 12h10" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 17h6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>

          <h1 className="text-5xl font-black tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            FDT<span style={{ color: 'var(--brand-accent)' }}>ES</span>
          </h1>
          <p className="text-lg font-medium mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Federated Drug Trial<br />Eligibility Screener
          </p>
          <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Federated learning platform enabling multi-hospital drug trial screening without exposing patient data.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2.5 mt-8">
            {['Federated Learning', 'Blockchain Audit', 'Privacy-First'].map((tag) => (
              <motion.span
                key={tag}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  background: isDark ? 'rgba(32,227,178,0.08)' : 'rgba(99,102,241,0.06)',
                  color: 'var(--brand-accent)',
                  border: `1px solid ${isDark ? 'rgba(32,227,178,0.18)' : 'rgba(99,102,241,0.12)'}`,
                }}
                whileHover={{ scale: 1.05 }}
              >
                {tag}
              </motion.span>
            ))}
          </div>

          {/* Animated stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 p-4 rounded-2xl" style={{
            background: isDark ? 'rgba(32,227,178,0.04)' : 'rgba(99,102,241,0.03)',
            border: `1px solid ${isDark ? 'rgba(32,227,178,0.1)' : 'rgba(99,102,241,0.08)'}`,
          }}>
            <AnimatedStat value="50000" label="Patients" suffix="+" delay={300} />
            <AnimatedStat value="12" label="Hospitals" delay={600} />
            <AnimatedStat value="99" label="Uptime" suffix="%" delay={900} />
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-6 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>System Online</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>End-to-End Encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>HIPAA Compliant</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          {/* Premium glass card with animated border */}
          <div className="relative rounded-3xl overflow-hidden group">
            {/* Animated border glow */}
            <div className="absolute -inset-[1px] rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(32,227,178,0.3), rgba(77,171,247,0.2), rgba(168,85,247,0.2), rgba(32,227,178,0.3))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(14,165,233,0.15), rgba(168,85,247,0.15), rgba(99,102,241,0.2))',
              backgroundSize: '300% 300%',
              animation: 'gradient-shift 4s ease infinite',
            }} />
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: isDark ? 'rgba(13,21,41,0.92)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(32px) saturate(200%)',
                boxShadow: isDark
                  ? '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(32,227,178,0.08) inset, 0 1px 0 rgba(255,255,255,0.03) inset'
                  : '0 30px 80px rgba(99,102,241,0.1), 0 0 0 1px rgba(99,102,241,0.06) inset, 0 1px 0 rgba(255,255,255,0.8) inset',
              }}
            >
            {/* Top accent line */}
            <div className="h-[2px] w-full" style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent, #20E3B2, #4DABF7, transparent)'
                : 'linear-gradient(90deg, transparent, #6366F1, #0EA5E9, transparent)',
            }} />

            <div className="p-8 sm:p-10">
              {/* Mobile-only header */}
              <div className="lg:hidden text-center mb-8">
                <motion.div
                  className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(32,227,178,0.12), rgba(77,171,247,0.08))'
                      : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(14,165,233,0.06))',
                    border: `1.5px solid ${isDark ? 'rgba(32,227,178,0.2)' : 'rgba(99,102,241,0.15)'}`,
                  }}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <svg className="w-8 h-8" style={{ color: 'var(--brand-accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2v20" strokeWidth="2" strokeLinecap="round" />
                    <path d="M5 7h14" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M7 12h10" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </motion.div>
                <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                  FDT<span style={{ color: 'var(--brand-accent)' }}>ES</span>
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Federated Drug Trial Eligibility Screener</p>
              </div>

              {/* Sign In header (desktop) */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Welcome Back</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Sign in to access the platform</p>
              </div>

              {/* Quick access badges */}
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--text-tertiary)' }}>Quick Access</p>
                <div className="grid grid-cols-4 gap-2">
                  {demoUsers.map((d) => (
                    <motion.button
                      key={d.user}
                      type="button"
                      onClick={() => fillCredentials(d.user, d.pass)}
                      className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl text-center transition-all"
                      style={{
                        background: username === d.user
                          ? (isDark ? 'rgba(32,227,178,0.1)' : 'rgba(99,102,241,0.08)')
                          : 'var(--bg-tertiary)',
                        border: `1px solid ${username === d.user ? (isDark ? 'rgba(32,227,178,0.3)' : 'rgba(99,102,241,0.2)') : 'var(--border-primary)'}`,
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="text-lg">{d.icon}</span>
                      <span className="text-[10px] font-bold truncate w-full" style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>or enter credentials</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2.5"
                    style={{ background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', color: 'var(--status-error)' }}
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Username</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focusField === 'user' ? 'var(--brand-accent)' : 'var(--text-tertiary)' }}>
                      <svg className="w-4.5 h-4.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(''); }}
                      onFocus={() => setFocusField('user')}
                      onBlur={() => setFocusField(null)}
                      placeholder="Enter your username"
                      className="input pl-11"
                      disabled={loading}
                      autoComplete="username"
                      style={{
                        borderColor: focusField === 'user' ? (isDark ? 'rgba(32,227,178,0.4)' : 'rgba(99,102,241,0.35)') : undefined,
                        boxShadow: focusField === 'user' ? (isDark ? '0 0 0 3px rgba(32,227,178,0.08)' : '0 0 0 3px rgba(99,102,241,0.06)') : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: focusField === 'pass' ? 'var(--brand-accent)' : 'var(--text-tertiary)' }}>
                      <svg className="w-4.5 h-4.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      onFocus={() => setFocusField('pass')}
                      onBlur={() => setFocusField(null)}
                      placeholder="Enter your password"
                      className="input pl-11 pr-11"
                      disabled={loading}
                      autoComplete="current-password"
                      style={{
                        borderColor: focusField === 'pass' ? (isDark ? 'rgba(32,227,178,0.4)' : 'rgba(99,102,241,0.35)') : undefined,
                        boxShadow: focusField === 'pass' ? (isDark ? '0 0 0 3px rgba(32,227,178,0.08)' : '0 0 0 3px rgba(99,102,241,0.06)') : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                      ) : (
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign in button */}
                <motion.div whileTap={{ scale: 0.985 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden group/btn"
                    style={{
                      background: isDark
                        ? 'linear-gradient(135deg, #20E3B2, #0DD9A6, #4DABF7)'
                        : 'linear-gradient(135deg, #6366F1, #4F46E5, #7C3AED)',
                      backgroundSize: '200% 200%',
                      animation: !loading ? 'gradient-shift 3s ease infinite' : 'none',
                      color: isDark ? '#0A1023' : '#FFFFFF',
                      boxShadow: isDark
                        ? '0 4px 24px rgba(32,227,178,0.35), 0 0 0 1px rgba(32,227,178,0.1) inset'
                        : '0 4px 24px rgba(99,102,241,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
                      opacity: loading ? 0.8 : 1,
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'transparent', borderTopColor: isDark ? '#0A1023' : '#fff' }} />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sign In to Platform
                      </>
                    )}
                  </button>
                </motion.div>
              </form>

              {/* Security footer */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Secured</span>
                  </div>
                  <div className="w-px h-3" style={{ background: 'var(--border-primary)' }} />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Blockchain</span>
                  </div>
                  <div className="w-px h-3" style={{ background: 'var(--border-primary)' }} />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>HIPAA Ready</span>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>&copy; 2026 FDTES Platform. All rights reserved.</p>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

