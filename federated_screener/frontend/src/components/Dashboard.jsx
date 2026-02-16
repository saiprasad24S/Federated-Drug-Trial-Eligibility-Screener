import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, StatusBadge, Skeleton } from './ui';
import { useThemeStore } from '../stores/themeStore';
import { staggerContainer, staggerItem } from '../utils/motionVariants';

const KPI = memo(function KPI({ label, value, sub }) {
  return (
    <motion.div variants={staggerItem}>
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <div className="flex items-baseline gap-3 mt-1.5">
          <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {sub && <StatusBadge status={sub} />}
        </div>
      </Card>
    </motion.div>
  );
});

const Dashboard = memo(function Dashboard({ trainingLogs = [], isLoading = false, isTraining = false, error = null }) {
  const theme = useThemeStore((s) => s.theme);
  const chartData = Array.isArray(trainingLogs)
    ? trainingLogs.map((log, idx) => ({ round: idx + 1, accuracy: log.accuracy, loss: log.loss }))
    : [];

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return (
    <motion.section className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="Latest Accuracy" value={latest ? `${(latest.accuracy * 100).toFixed(2)}%` : '—'} sub={isTraining ? 'Training' : 'Idle'} />
        <KPI label="Latest Loss" value={latest ? Number(latest.loss).toFixed(4) : '—'} />
        <KPI label="Rounds" value={chartData.length || 0} />
      </div>

      <motion.div variants={staggerItem}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full" style={{ background: 'var(--brand-primary)' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Training Progress</h2>
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              {isLoading ? 'Updating…' : error ? 'Error' : `Updated ${new Date().toLocaleTimeString()}`}
            </span>
          </div>

          {chartData.length === 0 ? (
            <Skeleton rows={1} height="h-64" />
          ) : (
            <div className="h-64 no-theme-transition">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="round" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--chart-line-1)" strokeWidth={2} dot={false} animationDuration={800} />
                  <Line type="monotone" dataKey="loss" stroke="var(--chart-line-2)" strokeWidth={2} dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.section>
  );
});

export default Dashboard;