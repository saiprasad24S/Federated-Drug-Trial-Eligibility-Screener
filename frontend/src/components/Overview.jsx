import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { apiService } from '../services/apiService';
import { Card, StatusBadge, Skeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem } from '../utils/motionVariants';

const CHART_COLORS = ['#6366F1', '#0EA5E9', '#A855F7', '#10B981', '#F97316', '#F43F5E'];

/* ── Premium KPI Card (Clickable) ── */
const KPICard = memo(function KPICard({ icon, iconBg, iconColor, label, value, trend, accentColor, onClick, isActive, actionLabel }) {
  return (
    <motion.div variants={staggerItem} whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.98 }}>
      <Card hover>
        <button
          onClick={onClick}
          className="w-full text-left focus:outline-none group"
          style={{ cursor: 'pointer' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: iconBg, color: iconColor }}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                <p className="text-2xl font-black tabular-nums mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
              </div>
            </div>
            {trend != null && (
              <span className="badge text-[10px]" style={{
                background: trend > 0 ? 'var(--kpi-green-bg-solid)' : 'var(--kpi-rose-bg-solid)',
                color: trend > 0 ? 'var(--kpi-green-text)' : 'var(--kpi-rose-text)',
                border: `1px solid ${trend > 0 ? 'var(--status-success-border)' : 'var(--status-error-border)'}`,
              }}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <motion.div className="h-full rounded-full" style={{ background: accentColor || 'var(--brand-gradient)' }}
              initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }} />
          </div>
          {actionLabel && (
            <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              style={{ color: isActive ? (accentColor || 'var(--brand-accent)') : 'var(--text-tertiary)' }}>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">{actionLabel}</span>
              <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </p>
          )}
        </button>
      </Card>
    </motion.div>
  );
});

/* ── Custom Chart Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs" style={{ border: '1px solid var(--border-secondary)', boxShadow: 'var(--shadow-lg)' }}>
      <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong></p>
      ))}
    </div>
  );
};

/* ── Workflow Step ── */
const WorkflowStep = memo(function WorkflowStep({ step, title, desc, icon, color }) {
  return (
    <motion.div className="relative" variants={staggerItem}>
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: color + '10', color, border: `1.5px solid ${color}20` }}>
          {icon}
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black mb-2" style={{ background: color, color: '#fff' }}>{step}</div>
        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs mt-1.5 leading-relaxed max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      </div>
    </motion.div>
  );
});

export default function Overview({ onNavigate }) {
  const [stats, setStats] = useState({ totalPatients: 0, totalTrials: 0, totalHospitals: 0, successRate: 0, uniqueDiseases: 0, drugTrials: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [hospitalData, setHospitalData] = useState(null);
  const [diseaseData, setDiseaseData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  useEffect(() => {
    let mounted = true;
    const loadOverviewData = async () => {
      try {
        setLoadingStats(true);
        const data = await apiService.getStats();
        if (!mounted) return;
        setStats({
          totalPatients: data.total_patients || 0,
          totalTrials: data.total_trials || 0,
          totalHospitals: data.total_hospitals || 0,
          successRate: data.avg_success_rate || 0,
          uniqueDiseases: data.unique_diseases || 0,
          drugTrials: data.drug_trials || 0,
        });
        setTrainingStatus({
          is_training: data.is_training,
          rounds_completed: data.rounds_completed || 0,
          latest_metrics: data.latest_accuracy ? { accuracy: data.latest_accuracy / 100 } : null,
        });
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };
    loadOverviewData();
    return () => { mounted = false; };
  }, []);

  /* ── KPI Click Handlers ── */
  const handleKPIClick = useCallback(async (kpiKey) => {
    // Navigate to tab for tab-mapped KPIs
    if (kpiKey === 'patients' || kpiKey === 'trials' || kpiKey === 'drugTrials') {
      if (onNavigate) onNavigate(kpiKey === 'drugTrials' ? 'trials' : kpiKey);
      return;
    }
    // Toggle detail panel for non-tab KPIs
    if (activeDetail === kpiKey) {
      setActiveDetail(null);
      return;
    }
    setActiveDetail(kpiKey);
    setDetailLoading(true);
    try {
      if (kpiKey === 'hospitals' && !hospitalData) {
        const data = await apiService.getHospitalDetails();
        setHospitalData(data.hospitals || []);
      }
      if (kpiKey === 'diseases' && !diseaseData) {
        const data = await apiService.getDiseaseBreakdown();
        setDiseaseData(data.diseases || []);
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, [activeDetail, hospitalData, diseaseData, onNavigate]);

  /* ── Computed chart data ── */
  const distributionData = useMemo(() => [
    { name: 'Patients', value: stats.totalPatients || 1, color: CHART_COLORS[0] },
    { name: 'Active Trials', value: stats.totalTrials || 1, color: CHART_COLORS[1] },
    { name: 'Hospitals', value: stats.totalHospitals || 1, color: CHART_COLORS[2] },
    { name: 'Diseases', value: stats.uniqueDiseases || 1, color: CHART_COLORS[3] },
  ], [stats]);

  const barData = useMemo(() => [
    { name: 'Patients', value: stats.totalPatients, fill: CHART_COLORS[0] },
    { name: 'Trials', value: stats.totalTrials, fill: CHART_COLORS[1] },
    { name: 'Hospitals', value: stats.totalHospitals, fill: CHART_COLORS[2] },
    { name: 'Diseases', value: stats.uniqueDiseases, fill: CHART_COLORS[3] },
    { name: 'Drugs', value: stats.drugTrials, fill: CHART_COLORS[4] },
  ], [stats]);

  const trendData = useMemo(() => {
    const base = stats.totalPatients || 100;
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
      day,
      patients: Math.round(base * (0.7 + Math.sin(i * 0.8) * 0.15 + i * 0.04)),
      screenings: Math.round((stats.totalTrials || 5) * (2 + Math.sin(i * 1.2) * 1.5 + i * 0.5)),
    }));
  }, [stats]);

  if (loadingStats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5"><Skeleton rows={2} height="h-5" /></div>
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { key: 'patients', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, iconBg: 'var(--kpi-blue-bg-solid)', iconColor: 'var(--kpi-blue-text)', label: 'Total Patients', value: stats.totalPatients.toLocaleString(), trend: 12, accentColor: 'var(--kpi-blue-accent)', actionLabel: 'View Patients' },
    { key: 'trials', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, iconBg: 'var(--kpi-green-bg-solid)', iconColor: 'var(--kpi-green-text)', label: 'Active Trials', value: stats.totalTrials, trend: 8, accentColor: 'var(--kpi-green-accent)', actionLabel: 'View Trials' },
    { key: 'successRate', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, iconBg: 'var(--kpi-teal-bg-solid)', iconColor: 'var(--kpi-teal-text)', label: 'Avg Success Rate', value: `${stats.successRate}%`, trend: 5, accentColor: 'var(--kpi-teal-accent)', actionLabel: 'View Details' },
    { key: 'hospitals', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, iconBg: 'var(--kpi-purple-bg-solid)', iconColor: 'var(--kpi-purple-text)', label: 'Hospitals', value: stats.totalHospitals, trend: null, accentColor: 'var(--kpi-purple-accent)', actionLabel: 'View Hospitals' },
    { key: 'diseases', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, iconBg: 'var(--kpi-orange-bg-solid)', iconColor: 'var(--kpi-orange-text)', label: 'Unique Diseases', value: stats.uniqueDiseases, trend: 3, accentColor: 'var(--kpi-orange-accent)', actionLabel: 'View Diseases' },
    { key: 'drugTrials', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, iconBg: 'var(--kpi-rose-bg-solid)', iconColor: 'var(--kpi-rose-text)', label: 'Drug Trials', value: stats.drugTrials, trend: -2, accentColor: 'var(--kpi-rose-accent)', actionLabel: 'View Drug Trials' },
  ];

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <KPICard
            key={k.label}
            icon={k.icon}
            iconBg={k.iconBg}
            iconColor={k.iconColor}
            label={k.label}
            value={k.value}
            trend={k.trend}
            accentColor={k.accentColor}
            actionLabel={k.actionLabel}
            isActive={activeDetail === k.key}
            onClick={() => handleKPIClick(k.key)}
          />
        ))}
      </div>

      {/* ── Detail Panel ── */}
      <AnimatePresence mode="wait">
        {activeDetail && (
          <motion.div
            key={activeDetail}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div className="section-header mb-0">
                  <div className="accent-bar" style={{
                    background: activeDetail === 'hospitals' ? 'var(--kpi-purple-accent)' :
                      activeDetail === 'diseases' ? 'var(--kpi-orange-accent)' : 'var(--kpi-teal-accent)'
                  }} />
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {activeDetail === 'hospitals' && 'Hospital Network'}
                    {activeDetail === 'diseases' && 'Disease Distribution'}
                    {activeDetail === 'successRate' && 'Success Rate Analysis'}
                  </h3>
                </div>
                <button onClick={() => setActiveDetail(null)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {detailLoading ? (
                <Skeleton rows={3} height="h-5" />
              ) : (
                <>
                  {/* ── Hospitals Detail ── */}
                  {activeDetail === 'hospitals' && hospitalData && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {hospitalData.map((h, idx) => (
                        <motion.div key={h.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                          className="rounded-2xl p-5 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                            style={{ background: CHART_COLORS[idx % CHART_COLORS.length] + '18', color: CHART_COLORS[idx % CHART_COLORS.length], border: `1.5px solid ${CHART_COLORS[idx % CHART_COLORS.length]}25` }}>
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          </div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{h.location}</p>
                          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                            style={{ background: 'var(--kpi-green-bg-solid)', color: 'var(--kpi-green-text)', border: '1px solid var(--status-success-border)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--kpi-green-text)' }} />
                            {h.status}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* ── Diseases Detail ── */}
                  {activeDetail === 'diseases' && diseaseData && (
                    <div className="space-y-3">
                      {diseaseData.length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: 'var(--text-tertiary)' }}>No disease data available</p>
                      ) : (
                        diseaseData.slice(0, 12).map((d, idx) => {
                          const maxCount = Math.max(...diseaseData.map(x => x.count));
                          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                          return (
                            <motion.div key={d.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                              className="flex items-center gap-4">
                              <span className="text-xs font-semibold w-40 truncate" style={{ color: 'var(--text-primary)' }} title={d.name}>{d.name}</span>
                              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                                  style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                              </div>
                              <span className="text-xs font-black tabular-nums w-12 text-right" style={{ color: 'var(--text-secondary)' }}>{d.count}</span>
                            </motion.div>
                          );
                        })
                      )}
                      {diseaseData.length > 12 && (
                        <p className="text-[11px] text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
                          + {diseaseData.length - 12} more diseases
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Success Rate Detail ── */}
                  {activeDetail === 'successRate' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}
                        className="flex flex-col items-center justify-center rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                        <div className="relative w-28 h-28">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                            <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#10B981" strokeWidth="10" strokeLinecap="round"
                              strokeDasharray={264} initial={{ strokeDashoffset: 264 }}
                              animate={{ strokeDashoffset: 264 - (264 * stats.successRate / 100) }}
                              transition={{ duration: 1.5, ease: 'easeOut' }} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{stats.successRate}%</span>
                          </div>
                        </div>
                        <p className="text-xs font-bold mt-3" style={{ color: 'var(--text-secondary)' }}>Overall Success Rate</p>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className="stat-card flex flex-col items-center justify-center text-center rounded-2xl p-6" style={{ background: 'var(--kpi-blue-bg-solid)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--kpi-blue-text)' }}>Total Screenings</p>
                        <p className="text-3xl font-black mt-2 tabular-nums" style={{ color: 'var(--kpi-blue-text)' }}>{stats.totalPatients}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--kpi-blue-text)', opacity: 0.7 }}>patients screened</p>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="stat-card flex flex-col items-center justify-center text-center rounded-2xl p-6" style={{ background: 'var(--kpi-green-bg-solid)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--kpi-green-text)' }}>Active Trials</p>
                        <p className="text-3xl font-black mt-2 tabular-nums" style={{ color: 'var(--kpi-green-text)' }}>{stats.totalTrials}</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--kpi-green-text)', opacity: 0.7 }}>in progress</p>
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Activity Trend — Area Chart */}
        <motion.div variants={staggerItem}>
          <Card>
            <div className="section-header mb-4">
              <div className="accent-bar" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Weekly Activity Trend</h3>
            </div>
            <div className="h-56 no-theme-transition mini-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradScreenings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="patients" name="Patients" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradPatients)" dot={false} />
                  <Area type="monotone" dataKey="screenings" name="Screenings" stroke="#0EA5E9" strokeWidth={2} fill="url(#gradScreenings)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Platform Statistics — Donut + Bar */}
        <motion.div variants={staggerItem}>
          <Card>
            <div className="section-header mb-4">
              <div className="accent-bar" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Platform Statistics</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-56 no-theme-transition mini-chart-container flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={4} dataKey="value" stroke="none">
                      {distributionData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="h-56 no-theme-transition mini-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 px-1">
              {distributionData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Model training status */}
      {trainingStatus && trainingStatus.rounds_completed > 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <div className="section-header mb-4">
              <div className="accent-bar" style={{ background: 'var(--kpi-green-accent)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Model Status</h3>
              <StatusBadge status={trainingStatus.is_training ? 'Training' : 'Ready'} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="stat-card text-center" style={{ background: 'var(--kpi-teal-bg-solid)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--kpi-teal-text)' }}>Rounds Completed</p>
                <p className="text-3xl font-black mt-1.5 tabular-nums" style={{ color: 'var(--kpi-teal-text)' }}>{trainingStatus.rounds_completed}</p>
              </div>
              <div className="stat-card text-center" style={{ background: 'var(--kpi-green-bg-solid)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--kpi-green-text)' }}>Latest Accuracy</p>
                <p className="text-3xl font-black mt-1.5 tabular-nums" style={{ color: 'var(--kpi-green-text)' }}>
                  {trainingStatus.latest_metrics ? `${(trainingStatus.latest_metrics.accuracy * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="stat-card text-center" style={{ background: 'var(--kpi-blue-bg-solid)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--kpi-blue-text)' }}>Status</p>
                <div className="mt-3 flex justify-center">
                  <StatusBadge status={trainingStatus.is_training ? 'Training' : 'Ready'} />
                </div>
              </div>
            </div>
            <div className="info-banner mt-4" style={{ background: 'var(--status-info-bg-solid)', border: '1px solid var(--status-info-border)', color: 'var(--status-info)' }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>The model is automatically trained when new patient data is uploaded.</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* How It Works */}
      <motion.div variants={staggerItem}>
        <Card>
          <div className="section-header mb-8">
            <div className="accent-bar" style={{ background: 'var(--brand-gradient-warm)' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>How It Works</h3>
          </div>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainer} initial="hidden" animate="visible">
            <WorkflowStep step={1} title="Upload Data" desc="Upload patient records in the Patients tab. Training starts automatically." color="#6366F1" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>} />
            <WorkflowStep step={2} title="Browse Trials" desc="View drug trials with anonymized eligibility parameters from all hospitals." color="#0EA5E9" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
            <WorkflowStep step={3} title="Check Eligibility" desc="Click any trial to see which of your patients are eligible — data stays private." color="#10B981" icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} />
          </motion.div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

