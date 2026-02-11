import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const KPI = ({ label, value, sub }) => (
  <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <div className="flex items-baseline gap-3">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <span className="text-sm text-gray-500">{sub}</span>}
    </div>
  </div>
);

const Dashboard = ({ trainingLogs = [], isLoading = false, isTraining = false, error = null }) => {
  const chartData = Array.isArray(trainingLogs)
    ? trainingLogs.map((log, idx) => ({ round: idx + 1, accuracy: log.accuracy, loss: log.loss }))
    : [];

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="Latest Accuracy" value={latest ? `${(latest.accuracy * 100).toFixed(2)}%` : '—'} sub={isTraining ? 'Training' : 'Idle'} />
        <KPI label="Latest Loss" value={latest ? Number(latest.loss).toFixed(4) : '—'} />
        <KPI label="Rounds" value={chartData.length || 0} />
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Training Progress</h2>
          <div className="text-sm text-gray-500">{isLoading ? 'Updating…' : error ? 'Error' : `Last update: ${new Date().toLocaleTimeString()}`}</div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="round" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip wrapperStyle={{ borderRadius: 6 }} />
              <Line type="monotone" dataKey="accuracy" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="loss" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;